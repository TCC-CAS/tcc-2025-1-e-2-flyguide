package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.AssinaturaStatusDTO;
import com.TCC.FlyGuide.DTO.CartaoCreditoDTO;
import com.TCC.FlyGuide.entities.AssinaturaPremium;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.AssinaturaPremiumRepository;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssinaturaServiceTest {

    @Mock AssinaturaPremiumRepository assinaturaRepository;
    @Mock UserRepository userRepository;
    @Mock PessoaFisicaRepository pessoaFisicaRepository;
    @Mock PessoaJuridicaRepository pessoaJuridicaRepository;
    @InjectMocks AssinaturaService assinaturaService;

    private static final Long USER_ID = 1L;

    // Cartões de teste que passam Luhn (números padrão da indústria)
    private static final String VISA_VALIDO         = "4111111111111111";
    private static final String MASTERCARD_VALIDO   = "5500000000000004";
    private static final String AMEX_VALIDO         = "378282246310005";
    private static final String HIPERCARD_VALIDO    = "6062828300000001"; // pattern ^606282[0-9]{10}$
    private static final String CARTAO_RECUSADO     = "4000000000000002";

    @BeforeEach
    void configurarSecurityContext() {
        Authentication auth = mock(Authentication.class);
        lenient().when(auth.getPrincipal()).thenReturn(USER_ID);
        SecurityContext context = mock(SecurityContext.class);
        lenient().when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void limparSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private User userFree() {
        User u = new User();
        u.setIdUsuario(USER_ID);
        u.setEmail("user@email.com");
        u.setTipoConta("FREE");
        return u;
    }

    private CartaoCreditoDTO cartaoValido(String numero) {
        CartaoCreditoDTO c = new CartaoCreditoDTO();
        c.setNumeroCartao(numero);
        c.setNomeTitular("João Silva");
        c.setMesExpiracao(12);
        c.setAnoExpiracao(YearMonth.now().getYear() + 2);
        c.setCvv("123");
        return c;
    }

    // ─── Assinar ──────────────────────────────────────────────────────────

    @Test
    void assinar_cartaoVisaValido_retornaStatusActive() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.empty());
        when(assinaturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenReturn(user);

        AssinaturaStatusDTO result = assinaturaService.assinar(USER_ID, cartaoValido(VISA_VALIDO));

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getCartaoBandeira()).isEqualTo("VISA");
        assertThat(result.getCartaoUltimos4()).isEqualTo("1111");
    }

    @Test
    void assinar_cartaoMastercardValido_detectaBandeiraCorreta() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.empty());
        when(assinaturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenReturn(user);

        AssinaturaStatusDTO result = assinaturaService.assinar(USER_ID, cartaoValido(MASTERCARD_VALIDO));

        assertThat(result.getCartaoBandeira()).isEqualTo("MASTERCARD");
    }

    @Test
    void assinar_cartaoAmexComCvv4Digitos_aprovado() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.empty());
        when(assinaturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any())).thenReturn(user);

        CartaoCreditoDTO cartao = cartaoValido(AMEX_VALIDO);
        cartao.setCvv("1234"); // AmEx usa 4 dígitos

        AssinaturaStatusDTO result = assinaturaService.assinar(USER_ID, cartao);

        assertThat(result.getCartaoBandeira()).isEqualTo("AMEX");
    }

    @Test
    void assinar_contaJaPremium_throwsDatabaseException() {
        User user = userFree();
        user.setTipoConta("PREMIUM");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartaoValido(VISA_VALIDO)))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("premium");
    }

    @Test
    void assinar_trialAindaAtivo_throwsDatabaseException() {
        User user = userFree();
        user.setTipoConta("TRIAL");
        user.setDataExpiracaoTrial(LocalDate.now().plusDays(10));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartaoValido(VISA_VALIDO)))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("trial");
    }

    @Test
    void assinar_trialExpirado_converteFreeEAssina() {
        User user = userFree();
        user.setTipoConta("TRIAL");
        user.setDataExpiracaoTrial(LocalDate.now().minusDays(1));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.empty());
        when(assinaturaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AssinaturaStatusDTO result = assinaturaService.assinar(USER_ID, cartaoValido(VISA_VALIDO));

        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void assinar_numeroCartaoLuhnInvalido_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CartaoCreditoDTO cartao = cartaoValido("4111111111111112"); // Luhn inválido

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartao))
                .isInstanceOf(DatabaseException.class);
    }

    @Test
    void assinar_cartaoRecusado_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartaoValido(CARTAO_RECUSADO)))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("recusado");
    }

    @Test
    void assinar_nomeSemSobrenome_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CartaoCreditoDTO cartao = cartaoValido(VISA_VALIDO);
        cartao.setNomeTitular("SomenteUmNome");

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartao))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("sobrenome");
    }

    @Test
    void assinar_cartaoExpirado_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CartaoCreditoDTO cartao = cartaoValido(VISA_VALIDO);
        cartao.setMesExpiracao(1);
        cartao.setAnoExpiracao(2020); // data no passado

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartao))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("expirado");
    }

    @Test
    void assinar_cvvComLetras_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CartaoCreditoDTO cartao = cartaoValido(VISA_VALIDO);
        cartao.setCvv("12A");

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartao))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("CVV");
    }

    @Test
    void assinar_cvvAmexCom3Digitos_throwsDatabaseException() {
        User user = userFree();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CartaoCreditoDTO cartao = cartaoValido(AMEX_VALIDO);
        cartao.setCvv("123"); // AmEx exige 4

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartao))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("4 dígitos");
    }

    @Test
    void assinar_usuarioDiferente_throwsUnauthorized() {
        User userOutro = new User();
        userOutro.setIdUsuario(99L); // ID diferente do principal (1L)
        userOutro.setTipoConta("FREE");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userOutro));

        assertThatThrownBy(() -> assinaturaService.assinar(USER_ID, cartaoValido(VISA_VALIDO)))
                .isInstanceOf(UnauthorizedException.class);
    }

    // ─── Cancelar assinatura ───────────────────────────────────────────────

    @Test
    void cancelarAssinatura_ativa_setaCancelledEDowngradeFree() {
        User user = userFree();
        user.setTipoConta("PREMIUM");
        AssinaturaPremium assinatura = new AssinaturaPremium();
        assinatura.setUsuario(user);
        assinatura.setStatus("ACTIVE");

        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.of(assinatura));
        when(assinaturaRepository.save(any())).thenReturn(assinatura);
        when(userRepository.save(any())).thenReturn(user);

        assinaturaService.cancelarAssinatura(USER_ID);

        assertThat(assinatura.getStatus()).isEqualTo("CANCELLED");
        assertThat(user.getTipoConta()).isEqualTo("FREE");
    }

    @Test
    void cancelarAssinatura_jaCancelada_throwsDatabaseException() {
        User user = userFree();
        AssinaturaPremium assinatura = new AssinaturaPremium();
        assinatura.setUsuario(user);
        assinatura.setStatus("CANCELLED");

        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.of(assinatura));

        assertThatThrownBy(() -> assinaturaService.cancelarAssinatura(USER_ID))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("cancelada");
    }

    @Test
    void cancelarAssinatura_naoEncontrada_throwsResourceNotFound() {
        when(assinaturaRepository.findByUsuario_IdUsuario(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assinaturaService.cancelarAssinatura(USER_ID))
                .isInstanceOf(com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException.class);
    }
}
