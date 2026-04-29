package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.DTO.LoginResponseDTO;
import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
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
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PessoaFisicaRepository pessoaFisicaRepository;
    @Mock PessoaJuridicaRepository pessoaJuridicaRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock OtpService otpService;
    @Mock JwtService jwtService;
    @Mock SessaoService sessaoService;
    @InjectMocks AuthService authService;

    private User userPadrao() {
        User u = new User();
        u.setIdUsuario(1L);
        u.setEmail("teste@email.com");
        u.setSenha("$2a$encoded");
        u.setTipoPessoa("PF");
        u.setTipoConta("FREE");
        return u;
    }

    @Test
    void login_credenciaisCorretas_resetaTentativasEGeraOtp() {
        User user = userPadrao();
        user.setTentativasFalhasLogin(2);
        when(userRepository.findByEmail("teste@email.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Senha@123", user.getSenha())).thenReturn(true);
        when(userRepository.save(any())).thenReturn(user);

        authService.login(new LoginRequestDTO("teste@email.com", "Senha@123"));

        assertThat(user.getTentativasFalhasLogin()).isZero();
        assertThat(user.getBloqueadoAte()).isNull();
        verify(otpService).gerarOtpLogin("teste@email.com");
    }

    @Test
    void login_emailNaoEncontrado_throwsUnauthorized() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequestDTO("x@x.com", "123")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void login_contaBloqueada_throwsUnauthorizedComMensagem() {
        User user = userPadrao();
        user.setBloqueadoAte(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequestDTO("teste@email.com", "Senha@123")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("bloqueada");
    }

    @Test
    void login_senhaErrada_incrementaTentativas() {
        User user = userPadrao();
        user.setTentativasFalhasLogin(2);
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(any(), any())).thenReturn(false);
        when(userRepository.save(any())).thenReturn(user);

        assertThatThrownBy(() -> authService.login(new LoginRequestDTO("teste@email.com", "errada")))
                .isInstanceOf(UnauthorizedException.class);

        assertThat(user.getTentativasFalhasLogin()).isEqualTo(3);
    }

    @Test
    void login_quintaTentativaFalha_bloqueiaContaEResetaTentativas() {
        User user = userPadrao();
        user.setTentativasFalhasLogin(4);
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(any(), any())).thenReturn(false);
        when(userRepository.save(any())).thenReturn(user);

        assertThatThrownBy(() -> authService.login(new LoginRequestDTO("teste@email.com", "errada")))
                .isInstanceOf(UnauthorizedException.class);

        assertThat(user.getBloqueadoAte()).isNotNull();
        assertThat(user.getBloqueadoAte()).isAfter(LocalDateTime.now());
        assertThat(user.getTentativasFalhasLogin()).isZero();
    }

    @Test
    void login_normalizaEmailComEspacosEMaiusculas() {
        User user = userPadrao();
        when(userRepository.findByEmail("teste@email.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(any(), any())).thenReturn(true);
        when(userRepository.save(any())).thenReturn(user);

        authService.login(new LoginRequestDTO("  TESTE@EMAIL.COM  ", "Senha@123"));

        verify(userRepository).findByEmail("teste@email.com");
    }

    @Test
    void verificarLogin_pessoaFisica_retornaResponseComNomeCompleto() {
        User user = userPadrao();
        PessoaFisica pf = new PessoaFisica();
        pf.setPrimeiroNome("João");
        pf.setUltimoNome("Silva");

        when(userRepository.findByEmail("teste@email.com")).thenReturn(Optional.of(user));
        when(pessoaFisicaRepository.findById(1L)).thenReturn(Optional.of(pf));
        when(jwtService.gerarToken(1L)).thenReturn("mock-token");
        when(jwtService.extrairExpiracao("mock-token")).thenReturn(LocalDateTime.now().plusHours(1));

        LoginResponseDTO response = authService.verificarLogin("teste@email.com", "123456");

        assertThat(response.getToken()).isEqualTo("mock-token");
        assertThat(response.getNomeExibicao()).isEqualTo("João Silva");
        verify(sessaoService).salvar(eq("mock-token"), eq(1L), any());
    }

    @Test
    void verificarLogin_pessoaJuridica_retornaNomeFantasia() {
        User user = new User();
        user.setIdUsuario(2L);
        user.setEmail("pj@empresa.com");
        user.setTipoPessoa("PJ");
        user.setTipoConta("PREMIUM");

        PessoaJuridica pj = new PessoaJuridica();
        pj.setNomeFantasia("Empresa XYZ");

        when(userRepository.findByEmail("pj@empresa.com")).thenReturn(Optional.of(user));
        when(pessoaFisicaRepository.findById(2L)).thenReturn(Optional.empty());
        when(pessoaJuridicaRepository.findById(2L)).thenReturn(Optional.of(pj));
        when(jwtService.gerarToken(2L)).thenReturn("token-pj");
        when(jwtService.extrairExpiracao("token-pj")).thenReturn(LocalDateTime.now().plusHours(1));

        LoginResponseDTO response = authService.verificarLogin("pj@empresa.com", "654321");

        assertThat(response.getNomeExibicao()).isEqualTo("Empresa XYZ");
    }

    @Test
    void logout_delegaParaSessaoService() {
        authService.logout("some-token");
        verify(sessaoService).invalidar("some-token");
    }
}
