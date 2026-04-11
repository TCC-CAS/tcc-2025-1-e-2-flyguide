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

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    public void solicitarResetSenha(String email) {
        String emailNormalizado = email.trim().toLowerCase();

        userRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ResourceNotFoundException("Nenhuma conta encontrada com este e-mail"));

        String codigo = gerarCodigo();
        LocalDateTime expiracao = LocalDateTime.now().plusMinutes(EXPIRACAO_MINUTOS);

        OtpCode otp = new OtpCode(emailNormalizado, codigo, expiracao, TIPO_RESET_SENHA);
        otpRepository.save(otp);

        emailService.enviarOtpResetSenha(emailNormalizado, codigo);
    }

    public void resetarSenha(String email, String codigo, String novaSenha) {
        String emailNormalizado = email.trim().toLowerCase();

        OtpCode otp = otpRepository
                .findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(emailNormalizado, TIPO_RESET_SENHA)
                .orElseThrow(() -> new UnauthorizedException("Código inválido ou expirado"));

        if (LocalDateTime.now().isAfter(otp.getExpiracao())) {
            throw new UnauthorizedException("Código expirado");
        }

        if (!otp.getCodigo().equals(codigo)) {
            throw new UnauthorizedException("Código inválido");
        }

        User user = userRepository.findByEmail(emailNormalizado)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        user.setSenha(passwordEncoder.encode(novaSenha));
        userRepository.save(user);

        otp.setUsado(true);
        otpRepository.save(otp);
    }

    public void gerarOtpLogin(String email) {
        String codigo = gerarCodigo();
        LocalDateTime expiracao = LocalDateTime.now().plusMinutes(EXPIRACAO_MINUTOS);
        OtpCode otp = new OtpCode(email, codigo, expiracao, TIPO_LOGIN);
        otpRepository.save(otp);
        emailService.enviarOtpLogin(email, codigo);
    }

    public void validarOtpLogin(String email, String codigo) {
        OtpCode otp = otpRepository
                .findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(email, TIPO_LOGIN)
                .orElseThrow(() -> new UnauthorizedException("Código inválido ou expirado"));

        if (LocalDateTime.now().isAfter(otp.getExpiracao())) {
            throw new UnauthorizedException("Código expirado");
        }

        if (!otp.getCodigo().equals(codigo)) {
            throw new UnauthorizedException("Código inválido");
        }

        otp.setUsado(true);
        otpRepository.save(otp);
    }

    private String gerarCodigo() {
        SecureRandom random = new SecureRandom();
        int numero = random.nextInt(900000) + 100000;
        return String.valueOf(numero);
    }
}