package com.TCC.FlyGuide.services;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;

import com.TCC.FlyGuide.DTO.AsaasWebhookDTO;
import com.TCC.FlyGuide.DTO.AssinaturaStatusDTO;
import com.TCC.FlyGuide.entities.AssinaturaPremium;
import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.AssinaturaPremiumRepository;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@Service
public class AssinaturaService {

    @Autowired
    private AsaasService asaasService;

    @Autowired
    private AssinaturaPremiumRepository assinaturaRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    @Value("${asaas.webhook.token}")
    private String webhookToken;

    /**
     * Inicia o processo de assinatura premium para o usuário.
     * Cria o cliente e a assinatura no Asaas (caso não existam),
     * salva os dados localmente com status PENDING e retorna a URL de pagamento.
     *
     * @return URL do checkout Asaas para ser aberta no frontend
     */
    @Transactional
    public String iniciarAssinatura(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(userId));

        if ("PREMIUM".equalsIgnoreCase(user.getTipoConta())) {
            throw new DatabaseException("Usuário já possui conta premium.");
        }

        if ("TRIAL".equalsIgnoreCase(user.getTipoConta())) {
            LocalDate expiracao = user.getDataExpiracaoTrial();
            if (expiracao != null && !LocalDate.now().isAfter(expiracao)) {
                long diasRestantes = ChronoUnit.DAYS.between(LocalDate.now(), expiracao);
                throw new DatabaseException(
                        "Você ainda possui " + diasRestantes + " dia(s) de trial gratuito. " +
                        "A assinatura ficará disponível após o término do período de teste.");
            }
            // Trial expirado: atualiza para FREE antes de prosseguir com a assinatura
            user.setTipoConta("FREE");
            userRepository.save(user);
        }

        Optional<AssinaturaPremium> existente = assinaturaRepository.findByUsuario_IdUsuario(userId);

        // Reutiliza o customerId Asaas caso já exista registro anterior
        String customerId = existente
                .map(AssinaturaPremium::getAsaasCustomerId)
                .orElse(null);

        if (customerId == null) {
            String nome;
            String cpfCnpj;

            if ("PF".equalsIgnoreCase(user.getTipoPessoa())) {
                PessoaFisica pf = pessoaFisicaRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException(userId));
                nome = pf.getPrimeiroNome() + " " + pf.getUltimoNome();
                cpfCnpj = pf.getCpf();
            } else {
                PessoaJuridica pj = pessoaJuridicaRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException(userId));
                nome = pj.getRazaoSocial();
                cpfCnpj = pj.getCnpj();
            }

            customerId = asaasService.criarCliente(nome, cpfCnpj, user.getEmail());
        }

        String subscriptionId = asaasService.criarAssinatura(customerId);
        String paymentUrl = asaasService.buscarUrlPagamento(subscriptionId);

        AssinaturaPremium assinatura = existente.orElse(new AssinaturaPremium());
        assinatura.setUsuario(user);
        assinatura.setAsaasCustomerId(customerId);
        assinatura.setAsaasSubscriptionId(subscriptionId);
        assinatura.setStatus("PENDING");
        assinatura.setDataInicio(LocalDate.now());
        assinatura.setProximoVencimento(LocalDate.now().plusMonths(1));
        assinaturaRepository.save(assinatura);

        return paymentUrl;
    }

    /**
     * Processa os eventos recebidos pelo webhook do Asaas.
     * Valida o token de autenticação antes de qualquer ação.
     *
     * Eventos tratados:
     * - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → status ACTIVE, conta → PREMIUM
     * - PAYMENT_OVERDUE                      → status OVERDUE,  conta → FREE
     */
    @Transactional
    public void processarWebhook(AsaasWebhookDTO payload, String tokenRecebido) {
        if (!webhookToken.equals(tokenRecebido)) {
            throw new UnauthorizedException("Token de webhook inválido.");
        }

        String subscriptionId = payload.getPayment() != null
                ? payload.getPayment().getSubscription()
                : null;

        if (subscriptionId == null) return;

        AssinaturaPremium assinatura = assinaturaRepository
                .findByAsaasSubscriptionId(subscriptionId)
                .orElse(null);

        if (assinatura == null) return;

        User user = assinatura.getUsuario();

        switch (payload.getEvent()) {
            case "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED" -> {
                assinatura.setStatus("ACTIVE");
                assinatura.setProximoVencimento(LocalDate.now().plusMonths(1));
                user.setTipoConta("PREMIUM");
            }
            case "PAYMENT_OVERDUE" -> {
                assinatura.setStatus("OVERDUE");
                user.setTipoConta("FREE");
            }
        }

        assinaturaRepository.save(assinatura);
        userRepository.save(user);
    }

    /**
     * Cancela a assinatura no Asaas, interrompe cobranças futuras
     * e faz o downgrade da conta para FREE.
     */
    @Transactional
    public void cancelarAssinatura(Long userId) {
        AssinaturaPremium assinatura = assinaturaRepository.findByUsuario_IdUsuario(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assinatura não encontrada para o usuário " + userId));

        asaasService.cancelarAssinatura(assinatura.getAsaasSubscriptionId());

        assinatura.setStatus("CANCELLED");
        assinaturaRepository.save(assinatura);

        User user = assinatura.getUsuario();
        user.setTipoConta("FREE");
        userRepository.save(user);
    }

    /**
     * Retorna o status atual da assinatura do usuário.
     */
    public AssinaturaStatusDTO getStatus(Long userId) {
        return assinaturaRepository.findByUsuario_IdUsuario(userId)
                .map(AssinaturaStatusDTO::new)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assinatura não encontrada para o usuário " + userId));
    }
}
