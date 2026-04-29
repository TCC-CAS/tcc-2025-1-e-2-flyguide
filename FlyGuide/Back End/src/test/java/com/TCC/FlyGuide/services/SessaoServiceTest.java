package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.Sessao;
import com.TCC.FlyGuide.repositories.SessaoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessaoServiceTest {

    @Mock SessaoRepository sessaoRepository;
    @InjectMocks SessaoService sessaoService;

    @Test
    void salvar_persisteSessaoComDadosCorretos() {
        LocalDateTime expiracao = LocalDateTime.now().plusHours(1);

        sessaoService.salvar("meu-token", 1L, expiracao);

        verify(sessaoRepository).save(any(Sessao.class));
    }

    @Test
    void invalidar_sessaoEncontrada_marcaComoInativa() {
        Sessao sessao = new Sessao("token-abc", 1L, LocalDateTime.now().plusHours(1));
        when(sessaoRepository.findByToken("token-abc")).thenReturn(Optional.of(sessao));

        sessaoService.invalidar("token-abc");

        assertThat(sessao.isAtivo()).isFalse();
        verify(sessaoRepository).save(sessao);
    }

    @Test
    void invalidar_sessaoNaoEncontrada_naoFazNada() {
        when(sessaoRepository.findByToken(any())).thenReturn(Optional.empty());

        assertThatCode(() -> sessaoService.invalidar("token-inexistente"))
                .doesNotThrowAnyException();

        verify(sessaoRepository, never()).save(any());
    }

    @Test
    void isAtiva_sessaoAtivaENaoExpirada_retornaTrue() {
        Sessao sessao = new Sessao("token", 1L, LocalDateTime.now().plusHours(1));
        when(sessaoRepository.findByToken("token")).thenReturn(Optional.of(sessao));

        assertThat(sessaoService.isAtiva("token")).isTrue();
    }

    @Test
    void isAtiva_sessaoInativa_retornaFalse() {
        Sessao sessao = new Sessao("token", 1L, LocalDateTime.now().plusHours(1));
        sessao.setAtivo(false);
        when(sessaoRepository.findByToken("token")).thenReturn(Optional.of(sessao));

        assertThat(sessaoService.isAtiva("token")).isFalse();
    }

    @Test
    void isAtiva_sessaoExpirada_retornaFalse() {
        Sessao sessao = new Sessao("token", 1L, LocalDateTime.now().minusMinutes(5));
        when(sessaoRepository.findByToken("token")).thenReturn(Optional.of(sessao));

        assertThat(sessaoService.isAtiva("token")).isFalse();
    }

    @Test
    void isAtiva_tokenNaoEncontrado_retornaFalse() {
        when(sessaoRepository.findByToken(any())).thenReturn(Optional.empty());

        assertThat(sessaoService.isAtiva("token-fantasma")).isFalse();
    }
}
