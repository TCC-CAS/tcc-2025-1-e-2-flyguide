package com.TCC.FlyGuide.services;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.DTO.AssinaturaStatusDTO;
import com.TCC.FlyGuide.DTO.CartaoCreditoDTO;
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

@Service
public class AssinaturaService {

    // Números que simulam recusa da operadora (para testes no frontend)
    private static final List<String> CARTOES_RECUSADOS = List.of(
            "4000000000000002",
            "4000000000000069",
            "4000000000000127"
    );

    // Prefixos Elo reconhecidos
    private static final List<String> ELO_PREFIXOS = List.of(
            "4011", "4312", "4389", "4514", "4576",
            "5041", "5066", "5067",
            "6277", "6362", "6363",
            "6504", "6505", "6516", "6550"
    );

    @Autowired
    private AssinaturaPremiumRepository assinaturaRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    @Transactional
    public AssinaturaStatusDTO assinar(Long userId, CartaoCreditoDTO cartao) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(userId));

        verificarPropriedade(user);

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
            user.setTipoConta("FREE");
            userRepository.save(user);
        }

        String numeroLimpo = cartao.getNumeroCartao() == null ? ""
                : cartao.getNumeroCartao().replaceAll("[\\s\\-]", "");

        validarNomeTitular(cartao.getNomeTitular());
        String bandeira = validarNumeroCartao(numeroLimpo);
        validarValidade(cartao.getMesExpiracao(), cartao.getAnoExpiracao());
        validarCvv(cartao.getCvv(), bandeira);

        if (CARTOES_RECUSADOS.contains(numeroLimpo)) {
            throw new DatabaseException("Pagamento recusado pela operadora do cartão.");
        }

        Optional<AssinaturaPremium> existente = assinaturaRepository.findByUsuario_IdUsuario(userId);
        AssinaturaPremium assinatura = existente.orElse(new AssinaturaPremium());

        assinatura.setUsuario(user);
        assinatura.setCartaoUltimos4(numeroLimpo.substring(numeroLimpo.length() - 4));
        assinatura.setCartaoBandeira(bandeira);
        assinatura.setStatus("ACTIVE");
        assinatura.setDataInicio(LocalDate.now());
        assinatura.setProximoVencimento(LocalDate.now().plusMonths(1));
        assinaturaRepository.save(assinatura);

        user.setTipoConta("PREMIUM");
        userRepository.save(user);

        return new AssinaturaStatusDTO(assinatura);
    }

    @Transactional
    public void cancelarAssinatura(Long userId) {
        AssinaturaPremium assinatura = assinaturaRepository.findByUsuario_IdUsuario(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assinatura não encontrada para o usuário " + userId));

        verificarPropriedade(assinatura.getUsuario());

        if ("CANCELLED".equalsIgnoreCase(assinatura.getStatus())) {
            throw new DatabaseException("Assinatura já está cancelada.");
        }

        assinatura.setStatus("CANCELLED");
        assinaturaRepository.save(assinatura);

        User user = assinatura.getUsuario();
        user.setTipoConta("FREE");
        userRepository.save(user);
    }

    public AssinaturaStatusDTO getStatus(Long userId) {
        AssinaturaPremium assinatura = assinaturaRepository.findByUsuario_IdUsuario(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assinatura não encontrada para o usuário " + userId));

        verificarPropriedade(assinatura.getUsuario());

        return new AssinaturaStatusDTO(assinatura);
    }

    // ─── Segurança ───────────────────────────────────────────────────────────

    private void verificarPropriedade(User user) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !user.getIdUsuario().equals(auth.getPrincipal())) {
            throw new UnauthorizedException("Acesso negado.");
        }
    }

    // ─── Validações ──────────────────────────────────────────────────────────

    private String validarNumeroCartao(String numero) {
        if (!numero.matches("\\d{13,19}")) {
            throw new DatabaseException("Número de cartão inválido: deve conter entre 13 e 19 dígitos.");
        }
        if (!luhn(numero)) {
            throw new DatabaseException("Número de cartão inválido.");
        }
        String bandeira = detectarBandeira(numero);
        if (bandeira == null) {
            throw new DatabaseException("Bandeira não reconhecida. Aceitamos: Visa, Mastercard, Amex, Elo e Hipercard.");
        }
        return bandeira;
    }

    private void validarNomeTitular(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            throw new DatabaseException("Nome do titular é obrigatório.");
        }
        if (nome.trim().split("\\s+").length < 2) {
            throw new DatabaseException("Informe o nome completo do titular (nome e sobrenome).");
        }
        if (!nome.matches("[a-zA-ZÀ-ÿ\\s]+")) {
            throw new DatabaseException("Nome do titular deve conter apenas letras.");
        }
    }

    private void validarValidade(int mes, int ano) {
        if (mes < 1 || mes > 12) {
            throw new DatabaseException("Mês de expiração inválido (1–12).");
        }
        if (YearMonth.of(ano, mes).isBefore(YearMonth.now())) {
            throw new DatabaseException("Cartão expirado.");
        }
    }

    private void validarCvv(String cvv, String bandeira) {
        if (cvv == null || !cvv.matches("\\d+")) {
            throw new DatabaseException("CVV inválido: deve conter apenas números.");
        }
        int tamanhoEsperado = "AMEX".equals(bandeira) ? 4 : 3;
        if (cvv.length() != tamanhoEsperado) {
            throw new DatabaseException("AMEX".equals(bandeira)
                    ? "CVV inválido: American Express utiliza CVV de 4 dígitos."
                    : "CVV inválido: CVV deve ter 3 dígitos.");
        }
    }

    // Algoritmo de Luhn — validação matemática padrão de cartões
    private boolean luhn(String numero) {
        int soma = 0;
        boolean alternar = false;
        for (int i = numero.length() - 1; i >= 0; i--) {
            int digito = Character.getNumericValue(numero.charAt(i));
            if (alternar) {
                digito *= 2;
                if (digito > 9) digito -= 9;
            }
            soma += digito;
            alternar = !alternar;
        }
        return soma % 10 == 0;
    }

    private String detectarBandeira(String numero) {
        // Visa: começa com 4, 13 ou 16 dígitos
        if (numero.matches("^4[0-9]{12}$") || numero.matches("^4[0-9]{15}$")) return "VISA";

        // Mastercard: 51–55 ou range 2221–2720, 16 dígitos
        if (numero.matches("^5[1-5][0-9]{14}$")) return "MASTERCARD";
        if (numero.matches("^2(2[2-9][1-9]|[3-6][0-9]{2}|7[01][0-9]|720)[0-9]{12}$")) return "MASTERCARD";

        // American Express: começa com 34 ou 37, 15 dígitos
        if (numero.matches("^3[47][0-9]{13}$")) return "AMEX";

        // Elo: prefixos específicos, 16 dígitos
        if (numero.length() == 16) {
            String prefixo4 = numero.substring(0, 4);
            if (ELO_PREFIXOS.contains(prefixo4)) return "ELO";
        }

        // Hipercard: começa com 606282, 16 dígitos
        if (numero.matches("^606282[0-9]{10}$")) return "HIPERCARD";

        return null;
    }
}