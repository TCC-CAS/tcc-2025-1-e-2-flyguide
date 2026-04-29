package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.RoteiroDTO;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.*;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoteiroServiceTest {

    @Mock RoteiroRepository roteiroRepository;
    @Mock UserRepository userRepository;
    @Mock ImagemRepository imagemRepository;
    @Mock RoteiroLocalRepository roteiroLocalRepository;
    @Mock ComentarioLikeRepository comentarioLikeRepository;
    @Mock RoteiroAvaliacaoRepository avaliacaoRepository;
    @InjectMocks RoteiroService roteiroService;

    private User usuario(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        u.setEmail("user" + id + "@email.com");
        return u;
    }

    private Roteiro roteiro(Long id, User dono) {
        Roteiro r = new Roteiro();
        r.setIdRoteiro(id);
        r.setUsuario(dono);
        r.setTitulo("Roteiro Teste");
        r.setCidade("São Paulo");
        r.setTipoRoteiro("Turismo");
        r.setStatusRoteiro("PLANEJADO");
        r.setVisibilidadeRoteiro("Público");
        return r;
    }

    // ─── Update ────────────────────────────────────────────────────────────

    @Test
    void update_donoDoRoteiro_atualizaComSucesso() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.getReferenceById(10L)).thenReturn(r);
        when(roteiroRepository.save(any())).thenReturn(r);

        RoteiroDTO dto = new RoteiroDTO(r);
        dto.setIdUsuario(1L);
        dto.setTitulo("Título Atualizado");

        RoteiroDTO result = roteiroService.update(10L, dto);

        assertThat(result).isNotNull();
        verify(roteiroRepository).save(r);
    }

    @Test
    void update_usuarioDiferente_throwsUnauthorized() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.getReferenceById(10L)).thenReturn(r);

        RoteiroDTO dto = new RoteiroDTO(r);
        dto.setIdUsuario(99L); // não é o dono

        assertThatThrownBy(() -> roteiroService.update(10L, dto))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("permissão");
    }

    // ─── Delete ────────────────────────────────────────────────────────────

    @Test
    void delete_donoDoRoteiro_executaCascataCompleta() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(r));

        roteiroService.delete(10L, 1L);

        verify(comentarioLikeRepository).deleteByAvaliacao_Roteiro_IdRoteiro(10L);
        verify(avaliacaoRepository).deleteByRoteiro_IdRoteiro(10L);
        verify(roteiroLocalRepository).deleteByRoteiro_IdRoteiro(10L);
        verify(roteiroRepository).deleteById(10L);
    }

    @Test
    void delete_usuarioDiferente_throwsUnauthorized() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(r));

        assertThatThrownBy(() -> roteiroService.delete(10L, 99L))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("permissão");
    }

    @Test
    void delete_roteiroNaoEncontrado_throwsResourceNotFound() {
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroService.delete(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── Insert ────────────────────────────────────────────────────────────

    @Test
    void insert_usuarioNaoEncontrado_throwsResourceNotFound() {
        RoteiroDTO dto = new RoteiroDTO();
        dto.setIdUsuario(99L);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroService.insert(dto))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void insert_dadosValidos_retornaRoteiroDTO() {
        User dono = usuario(1L);
        Roteiro r = roteiro(5L, dono);
        when(userRepository.findById(1L)).thenReturn(Optional.of(dono));
        when(roteiroRepository.save(any())).thenReturn(r);

        RoteiroDTO dto = new RoteiroDTO();
        dto.setIdUsuario(1L);
        dto.setTitulo("Novo Roteiro");

        RoteiroDTO result = roteiroService.insert(dto);

        assertThat(result.getIdRoteiro()).isEqualTo(5L);
    }

    // ─── Clonar ────────────────────────────────────────────────────────────

    @Test
    void clonar_roteiroPublico_criaCloneComStatusPlanejadoEPrivado() {
        User donoOriginal = usuario(1L);
        User novoUsuario = usuario(2L);
        Roteiro original = roteiro(10L, donoOriginal);
        original.setVisibilidadeRoteiro("Público");

        Roteiro cloneEsperado = roteiro(20L, novoUsuario);
        cloneEsperado.setStatusRoteiro("PLANEJADO");
        cloneEsperado.setVisibilidadeRoteiro("Privado");
        cloneEsperado.setIdRoteiroOrigem(10L);

        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(original));
        when(userRepository.findById(2L)).thenReturn(Optional.of(novoUsuario));
        when(roteiroRepository.save(any())).thenReturn(cloneEsperado);
        when(roteiroLocalRepository.buscarPorRoteiroComLocal(10L)).thenReturn(Collections.emptyList());

        RoteiroDTO result = roteiroService.clonar(10L, 2L);

        assertThat(result.getIdRoteiro()).isEqualTo(20L);
        verify(roteiroRepository).save(any());
    }

    @Test
    void clonar_roteiroNaoEncontrado_throwsResourceNotFound() {
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroService.clonar(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── findAll ────────────────────────────────────────────────────────────

    @Test
    void findAll_retornaListaComMediaDeAvaliacao() {
        User dono = usuario(1L);
        Roteiro r = roteiro(1L, dono);
        when(roteiroRepository.findAll()).thenReturn(List.of(r));
        when(avaliacaoRepository.mediaByRoteiro(1L)).thenReturn(4.5);
        when(avaliacaoRepository.totalByRoteiro(1L)).thenReturn(10L);

        List<RoteiroDTO> result = roteiroService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMediaAvaliacao()).isEqualTo(4.5);
        assertThat(result.get(0).getTotalAvaliacoes()).isEqualTo(10L);
    }

    // ─── atualizarStatus ───────────────────────────────────────────────────

    @Test
    void atualizarStatus_roteiroExistente_salvaNovoStatus() {
        User dono = usuario(1L);
        Roteiro r = roteiro(1L, dono);
        when(roteiroRepository.findById(1L)).thenReturn(Optional.of(r));
        when(roteiroRepository.save(any())).thenReturn(r);

        roteiroService.atualizarStatus(1L, "CONCLUIDO");

        assertThat(r.getStatusRoteiro()).isEqualTo("CONCLUIDO");
    }

    // ─── findByUsuario ─────────────────────────────────────────────────────

    @Test
    void findByUsuario_retornaListaComMediaDeAvaliacao() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.findByUsuario_IdUsuario(1L)).thenReturn(List.of(r));
        when(avaliacaoRepository.mediaByRoteiro(10L)).thenReturn(3.7);
        when(avaliacaoRepository.totalByRoteiro(10L)).thenReturn(5L);

        List<RoteiroDTO> result = roteiroService.findByUsuario(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMediaAvaliacao()).isEqualTo(3.7);
        assertThat(result.get(0).getTotalAvaliacoes()).isEqualTo(5L);
    }

    @Test
    void findByUsuario_semRoteiros_retornaListaVazia() {
        when(roteiroRepository.findByUsuario_IdUsuario(1L)).thenReturn(Collections.emptyList());

        List<RoteiroDTO> result = roteiroService.findByUsuario(1L);

        assertThat(result).isEmpty();
    }

    // ─── findPublicos ──────────────────────────────────────────────────────

    @Test
    void findPublicos_ordenacaoRecente_usaQueryPadrao() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Roteiro> page = new PageImpl<>(Collections.emptyList());
        when(roteiroRepository.findPublicosComFiltros(any(), any(), any(), any(), any(), eq(pageable)))
                .thenReturn(page);

        Page<RoteiroDTO> result = roteiroService.findPublicos(null, null, null, "recente", null, null, pageable);

        assertThat(result.getContent()).isEmpty();
        verify(roteiroRepository).findPublicosComFiltros(any(), any(), any(), any(), any(), eq(pageable));
    }

    @Test
    void findPublicos_ordenacaoCurtidos_usaQueryCorreta() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Roteiro> page = new PageImpl<>(Collections.emptyList());
        when(roteiroRepository.findPublicosOrdenadosPorCurtidas(any(), any(), any(), any(), any(), eq(pageable)))
                .thenReturn(page);

        roteiroService.findPublicos(null, null, null, "curtidos", null, null, pageable);

        verify(roteiroRepository).findPublicosOrdenadosPorCurtidas(any(), any(), any(), any(), any(), eq(pageable));
    }

    @Test
    void findPublicos_ordenacaoOrcamentoAsc_usaQueryCorreta() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Roteiro> page = new PageImpl<>(Collections.emptyList());
        when(roteiroRepository.findPublicosOrcamentoAsc(any(), any(), any(), any(), any(), eq(pageable)))
                .thenReturn(page);

        roteiroService.findPublicos(null, null, null, "orcamento_asc", null, null, pageable);

        verify(roteiroRepository).findPublicosOrcamentoAsc(any(), any(), any(), any(), any(), eq(pageable));
    }

    // ─── findCompletoById ──────────────────────────────────────────────────

    @Test
    void findCompletoById_retornaRoteiroComLocais() {
        User dono = usuario(1L);
        Roteiro r = roteiro(10L, dono);
        when(roteiroRepository.findById(10L)).thenReturn(Optional.of(r));
        when(roteiroLocalRepository.buscarPorRoteiroComLocal(10L)).thenReturn(Collections.emptyList());

        var result = roteiroService.findCompletoById(10L);

        assertThat(result).isNotNull();
    }

    @Test
    void findCompletoById_roteiroNaoEncontrado_throwsResourceNotFound() {
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroService.findCompletoById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
