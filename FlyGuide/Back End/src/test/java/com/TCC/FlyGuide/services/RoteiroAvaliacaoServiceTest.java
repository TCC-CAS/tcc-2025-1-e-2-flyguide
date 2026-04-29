package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.RoteiroAvaliacaoDTO;
import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroAvaliacao;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.*;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoteiroAvaliacaoServiceTest {

    @Mock RoteiroAvaliacaoRepository avaliacaoRepository;
    @Mock RoteiroRepository roteiroRepository;
    @Mock UserRepository userRepository;
    @Mock ComentarioLikeRepository likeRepository;
    @Mock BlacklistService blacklistService;
    @Mock PerspectiveService perspectiveService;
    @Mock PessoaFisicaRepository pessoaFisicaRepository;
    @Mock PessoaJuridicaRepository pessoaJuridicaRepository;
    @InjectMocks RoteiroAvaliacaoService roteiroAvaliacaoService;

    private User usuarioPF(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        u.setEmail("user@email.com");
        u.setTipoPessoa("PF");
        return u;
    }

    private Roteiro roteiro(Long id) {
        Roteiro r = new Roteiro();
        r.setIdRoteiro(id);
        return r;
    }

    private RoteiroAvaliacao avaliacao(Long id, Roteiro r, User u) {
        RoteiroAvaliacao a = new RoteiroAvaliacao();
        a.setIdAvaliacao(id);
        a.setRoteiro(r);
        a.setUsuario(u);
        a.setNota(5);
        a.setCriadoEm(LocalDateTime.now());
        a.setAtualizadoEm(LocalDateTime.now());
        return a;
    }

    private void mockResolverNomePF(User usuario) {
        PessoaFisica pf = new PessoaFisica();
        pf.setPrimeiroNome("João");
        pf.setUltimoNome("Silva");
        when(pessoaFisicaRepository.findById(usuario.getIdUsuario())).thenReturn(Optional.of(pf));
    }

    // ─── avaliar — validações ──────────────────────────────────────────────

    @Test
    void avaliar_notaAbaixoDe1_throwsResponseStatus() {
        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(1L, 1L, 0, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("1 e 5");
    }

    @Test
    void avaliar_notaAcimaDe5_throwsResponseStatus() {
        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(1L, 1L, 6, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("1 e 5");
    }

    @Test
    void avaliar_notaNula_throwsResponseStatus() {
        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(1L, 1L, null, null))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void avaliar_textoComPalavraProibida_throwsResponseStatus() {
        when(blacklistService.contemPalavraProibida("texto ruim")).thenReturn(true);

        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(1L, 1L, 5, "texto ruim"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("inapropriada");
    }

    @Test
    void avaliar_textoToxico_throwsResponseStatus() {
        when(blacklistService.contemPalavraProibida(any())).thenReturn(false);
        when(perspectiveService.ehToxico(any())).thenReturn(true);

        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(1L, 1L, 4, "texto toxico"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("inapropriada");
    }

    @Test
    void avaliar_roteiroNaoEncontrado_throwsResourceNotFound() {
        when(blacklistService.contemPalavraProibida(any())).thenReturn(false);
        when(perspectiveService.ehToxico(any())).thenReturn(false);
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroAvaliacaoService.avaliar(99L, 1L, 5, "ótimo"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── avaliar — sucesso ─────────────────────────────────────────────────

    @Test
    void avaliar_novaAvaliacao_criaERetornaDTO() {
        User usuario = usuarioPF(1L);
        Roteiro r = roteiro(10L);
        RoteiroAvaliacao savedAvaliacao = avaliacao(50L, r, usuario);

        when(blacklistService.contemPalavraProibida(any())).thenReturn(false);
        when(perspectiveService.ehToxico(any())).thenReturn(false);
        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(r));
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(10L, 1L))
                .thenReturn(Optional.empty());
        when(avaliacaoRepository.save(any())).thenReturn(savedAvaliacao);
        when(likeRepository.countByAvaliacao_IdAvaliacao(50L)).thenReturn(0L);
        mockResolverNomePF(usuario);

        RoteiroAvaliacaoDTO result = roteiroAvaliacaoService.avaliar(10L, 1L, 5, "Excelente!");

        assertThat(result).isNotNull();
        assertThat(result.getNota()).isEqualTo(5);
        assertThat(result.getNomeExibicao()).isEqualTo("João Silva");
    }

    @Test
    void avaliar_avaliacaoExistente_atualizaEmVezDeCriar() {
        User usuario = usuarioPF(1L);
        Roteiro r = roteiro(10L);
        RoteiroAvaliacao existente = avaliacao(50L, r, usuario);
        existente.setNota(3);

        when(blacklistService.contemPalavraProibida(any())).thenReturn(false);
        when(perspectiveService.ehToxico(any())).thenReturn(false);
        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(r));
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(10L, 1L))
                .thenReturn(Optional.of(existente));
        when(avaliacaoRepository.save(any())).thenReturn(existente);
        when(likeRepository.countByAvaliacao_IdAvaliacao(50L)).thenReturn(2L);
        mockResolverNomePF(usuario);

        RoteiroAvaliacaoDTO result = roteiroAvaliacaoService.avaliar(10L, 1L, 5, "Melhorou!");

        assertThat(existente.getNota()).isEqualTo(5);
        assertThat(result.getTotalLikes()).isEqualTo(2L);
    }

    // ─── findByRoteiro ─────────────────────────────────────────────────────

    @Test
    void findByRoteiro_semAvaliacoes_retornaListaVazia() {
        when(avaliacaoRepository.findByRoteiro_IdRoteiroOrderByCriadoEmDesc(1L))
                .thenReturn(Collections.emptyList());

        List<RoteiroAvaliacaoDTO> result = roteiroAvaliacaoService.findByRoteiro(1L);

        assertThat(result).isEmpty();
    }

    @Test
    void findByRoteiro_comAvaliacoes_retornaListaComNomes() {
        User usuario = usuarioPF(1L);
        Roteiro r = roteiro(10L);
        RoteiroAvaliacao a = avaliacao(50L, r, usuario);

        when(avaliacaoRepository.findByRoteiro_IdRoteiroOrderByCriadoEmDesc(10L))
                .thenReturn(List.of(a));
        when(likeRepository.countByAvaliacao_IdAvaliacao(50L)).thenReturn(1L);
        mockResolverNomePF(usuario);

        List<RoteiroAvaliacaoDTO> result = roteiroAvaliacaoService.findByRoteiro(10L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNomeExibicao()).isEqualTo("João Silva");
        assertThat(result.get(0).getTotalLikes()).isEqualTo(1L);
    }

    // ─── getMedia ──────────────────────────────────────────────────────────

    @Test
    void getMedia_comAvaliacoes_retornaMediaETotal() {
        when(avaliacaoRepository.mediaByRoteiro(1L)).thenReturn(4.5);
        when(avaliacaoRepository.totalByRoteiro(1L)).thenReturn(10L);

        Map<String, Object> result = roteiroAvaliacaoService.getMedia(1L);

        assertThat(result.get("media")).isEqualTo(4.5);
        assertThat(result.get("total")).isEqualTo(10L);
    }

    @Test
    void getMedia_semAvaliacoes_retornaZeros() {
        when(avaliacaoRepository.mediaByRoteiro(1L)).thenReturn(null);
        when(avaliacaoRepository.totalByRoteiro(1L)).thenReturn(null);

        Map<String, Object> result = roteiroAvaliacaoService.getMedia(1L);

        assertThat(result.get("media")).isEqualTo(0.0);
        assertThat(result.get("total")).isEqualTo(0L);
    }

    // ─── deletar ───────────────────────────────────────────────────────────

    @Test
    void deletar_avaliacaoNaoEncontrada_throwsResourceNotFound() {
        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(1L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroAvaliacaoService.deletar(1L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deletar_avaliacaoEncontrada_deletaLikesEAvaliacao() {
        User usuario = usuarioPF(1L);
        Roteiro r = roteiro(10L);
        RoteiroAvaliacao a = avaliacao(50L, r, usuario);

        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(10L, 1L))
                .thenReturn(Optional.of(a));

        roteiroAvaliacaoService.deletar(10L, 1L);

        verify(likeRepository).deleteByAvaliacao_IdAvaliacao(50L);
        verify(avaliacaoRepository).delete(a);
    }

    // ─── getAvaliacaoUsuario ───────────────────────────────────────────────

    @Test
    void getAvaliacaoUsuario_naoEncontrada_retornaNull() {
        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(1L, 1L))
                .thenReturn(Optional.empty());

        RoteiroAvaliacaoDTO result = roteiroAvaliacaoService.getAvaliacaoUsuario(1L, 1L);

        assertThat(result).isNull();
    }

    @Test
    void getAvaliacaoUsuario_encontrada_retornaDTO() {
        User usuario = usuarioPF(1L);
        Roteiro r = roteiro(10L);
        RoteiroAvaliacao a = avaliacao(50L, r, usuario);

        when(avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(10L, 1L))
                .thenReturn(Optional.of(a));
        when(likeRepository.countByAvaliacao_IdAvaliacao(50L)).thenReturn(3L);
        mockResolverNomePF(usuario);

        RoteiroAvaliacaoDTO result = roteiroAvaliacaoService.getAvaliacaoUsuario(10L, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getNota()).isEqualTo(5);
        assertThat(result.getTotalLikes()).isEqualTo(3L);
    }
}
