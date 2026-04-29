package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.OtpCode;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.OtpRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock OtpRepository otpRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailService emailService;
    @InjectMocks OtpService otpService;

    private User userPadrao() {
        User u = new User();
        u.setIdUsuario(1L);
        u.setEmail("teste@email.com");
        return u;
    }

    private OtpCode otpValido(String email, String tipo) {
        return new OtpCode(email, "123456", LocalDateTime.now().plusMinutes(10), tipo);
    }

    private OtpCode otpExpirado(String email, String tipo) {
        return new OtpCode(email, "123456", LocalDateTime.now().minusMinutes(1), tipo);
    }

    // ─── Gerar OTP de login ────────────────────────────────────────────────

    @Test
    void gerarOtpLogin_semCooldown_salvaEEnviaEmail() {
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "LOGIN"))
                .thenReturn(Optional.empty());

        otpService.gerarOtpLogin("teste@email.com");

        verify(otpRepository).save(any(OtpCode.class));
        verify(emailService).enviarOtpLogin(eq("teste@email.com"), anyString());
    }

    @Test
    void gerarOtpLogin_dentroDoCooldown_throwsUnauthorized() {
        OtpCode otpRecente = otpValido("teste@email.com", "LOGIN");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "LOGIN"))
                .thenReturn(Optional.of(otpRecente));

        assertThatThrownBy(() -> otpService.gerarOtpLogin("teste@email.com"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("1 minuto");
    }

    // ─── Validar OTP de login ──────────────────────────────────────────────

    @Test
    void validarOtpLogin_codigoCorretoENaoExpirado_marcaComoUsado() {
        OtpCode otp = otpValido("teste@email.com", "LOGIN");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "LOGIN"))
                .thenReturn(Optional.of(otp));

        otpService.validarOtpLogin("teste@email.com", "123456");

        assertThat(otp.isUsado()).isTrue();
        verify(otpRepository).save(otp);
    }

    @Test
    void validarOtpLogin_semOtpDisponivel_throwsUnauthorized() {
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> otpService.validarOtpLogin("teste@email.com", "123456"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void validarOtpLogin_otpExpirado_throwsUnauthorized() {
        OtpCode otp = otpExpirado("teste@email.com", "LOGIN");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(any(), any()))
                .thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.validarOtpLogin("teste@email.com", "123456"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expirado");
    }

    @Test
    void validarOtpLogin_codigoErrado_throwsUnauthorized() {
        OtpCode otp = otpValido("teste@email.com", "LOGIN");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(any(), any()))
                .thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.validarOtpLogin("teste@email.com", "000000"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("inválido");
    }

    // ─── Solicitar reset de senha ──────────────────────────────────────────

    @Test
    void solicitarResetSenha_emailNaoEncontrado_throwsResourceNotFound() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> otpService.solicitarResetSenha("naoexiste@email.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void solicitarResetSenha_dentroDoCooldown_throwsUnauthorized() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(userPadrao()));
        OtpCode otpRecente = otpValido("teste@email.com", "RESET_SENHA");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "RESET_SENHA"))
                .thenReturn(Optional.of(otpRecente));

        assertThatThrownBy(() -> otpService.solicitarResetSenha("teste@email.com"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("1 minuto");
    }

    @Test
    void solicitarResetSenha_valido_salvaOtpEEnviaEmail() {
        when(userRepository.findByEmail("teste@email.com")).thenReturn(Optional.of(userPadrao()));
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "RESET_SENHA"))
                .thenReturn(Optional.empty());

        otpService.solicitarResetSenha("teste@email.com");

        verify(otpRepository).save(any(OtpCode.class));
        verify(emailService).enviarOtpResetSenha(eq("teste@email.com"), anyString());
    }

    // ─── Resetar senha ─────────────────────────────────────────────────────

    @Test
    void resetarSenha_codigoValidoENaoExpirado_atualizaSenhaEConsomeOtp() {
        OtpCode otp = otpValido("teste@email.com", "RESET_SENHA");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc("teste@email.com", "RESET_SENHA"))
                .thenReturn(Optional.of(otp));
        when(userRepository.findByEmail("teste@email.com")).thenReturn(Optional.of(userPadrao()));
        when(passwordEncoder.encode("NovaSenha@1")).thenReturn("nova-encoded");

        otpService.resetarSenha("teste@email.com", "123456", "NovaSenha@1");

        assertThat(otp.isUsado()).isTrue();
        verify(userRepository).save(any(User.class));
        verify(otpRepository).save(otp);
    }

    @Test
    void resetarSenha_otpExpirado_throwsUnauthorized() {
        OtpCode otp = otpExpirado("teste@email.com", "RESET_SENHA");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(any(), any()))
                .thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.resetarSenha("teste@email.com", "123456", "NovaSenha@1"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expirado");
    }

    @Test
    void resetarSenha_codigoErrado_throwsUnauthorized() {
        OtpCode otp = otpValido("teste@email.com", "RESET_SENHA");
        when(otpRepository.findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(any(), any()))
                .thenReturn(Optional.of(otp));

        assertThatThrownBy(() -> otpService.resetarSenha("teste@email.com", "000000", "NovaSenha@1"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("inválido");
    }
}
