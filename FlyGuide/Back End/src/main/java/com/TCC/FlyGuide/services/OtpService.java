package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.OtpCode;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.OtpRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private static final String TIPO_RESET_SENHA = "RESET_SENHA";
    private static final String TIPO_LOGIN = "LOGIN";
    private static final int EXPIRACAO_MINUTOS = 10;
    private static final int MAX_TENTATIVAS_OTP = 5;
    private static final String REGEX_SENHA_FORTE = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$";

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    private void verificarCooldown(String email, String tipo) {
        LocalDateTime limiteExpiracao = LocalDateTime.now().plusMinutes(EXPIRACAO_MINUTOS - 1);
        otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(email, tipo)
                .ifPresent(otp -> {
                    if (otp.getExpiracao().isAfter(limiteExpiracao)) {
                        throw new UnauthorizedException("Aguarde pelo menos 1 minuto antes de solicitar um novo codigo.");
                    }
                });
    }

    public void solicitarResetSenha(String email) {
        String emailNormalizado = email.trim().toLowerCase();

        userRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ResourceNotFoundException("Nenhuma conta encontrada com este e-mail"));

        verificarCooldown(emailNormalizado, TIPO_RESET_SENHA);

        String codigo = gerarCodigo();
        LocalDateTime expiracao = LocalDateTime.now().plusMinutes(EXPIRACAO_MINUTOS);

        OtpCode otp = new OtpCode(emailNormalizado, codigo, expiracao, TIPO_RESET_SENHA);
        otpRepository.save(otp);

        emailService.enviarOtpResetSenha(emailNormalizado, codigo);
    }

    public void resetarSenha(String email, String codigo, String novaSenha) {
        String emailNormalizado = email.trim().toLowerCase();
        validarSenhaForte(novaSenha);

        OtpCode otp = otpRepository
                .findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(emailNormalizado, TIPO_RESET_SENHA)
                .orElseThrow(() -> new UnauthorizedException("Codigo invalido ou expirado"));

        if (LocalDateTime.now().isAfter(otp.getExpiracao())) {
            throw new UnauthorizedException("Codigo expirado");
        }

        if (!otp.getCodigo().equals(codigo)) {
            registrarTentativaInvalida(otp);
            throw new UnauthorizedException("Codigo invalido");
        }

        User user = userRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        user.setSenha(passwordEncoder.encode(novaSenha));
        userRepository.save(user);

        otp.setUsado(true);
        otpRepository.save(otp);
    }

    public void gerarOtpLogin(String email) {
        verificarCooldown(email, TIPO_LOGIN);
        String codigo = gerarCodigo();
        LocalDateTime expiracao = LocalDateTime.now().plusMinutes(EXPIRACAO_MINUTOS);
        OtpCode otp = new OtpCode(email, codigo, expiracao, TIPO_LOGIN);
        otpRepository.save(otp);
        emailService.enviarOtpLogin(email, codigo);
    }

    public void validarOtpLogin(String email, String codigo) {
        OtpCode otp = otpRepository
                .findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(email, TIPO_LOGIN)
                .orElseThrow(() -> new UnauthorizedException("Codigo invalido ou expirado"));

        if (LocalDateTime.now().isAfter(otp.getExpiracao())) {
            throw new UnauthorizedException("Codigo expirado");
        }

        if (!otp.getCodigo().equals(codigo)) {
            registrarTentativaInvalida(otp);
            throw new UnauthorizedException("Codigo invalido");
        }

        otp.setUsado(true);
        otpRepository.save(otp);
    }

    private String gerarCodigo() {
        SecureRandom random = new SecureRandom();
        int numero = random.nextInt(900000) + 100000;
        return String.valueOf(numero);
    }

    private void validarSenhaForte(String senha) {
        if (senha == null || !senha.matches(REGEX_SENHA_FORTE)) {
            throw new IllegalArgumentException(
                    "Senha invalida. Deve ter no minimo 8 caracteres, 1 letra maiuscula e 1 caractere especial."
            );
        }
    }

    private void registrarTentativaInvalida(OtpCode otp) {
        otp.incrementarTentativasInvalidas();
        if (otp.getTentativasInvalidas() >= MAX_TENTATIVAS_OTP) {
            otp.setUsado(true);
        }
        otpRepository.save(otp);
    }
}
