package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.RoteiroAvaliacao;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.ComentarioLikeRepository;
import com.TCC.FlyGuide.repositories.RoteiroAvaliacaoRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComentarioLikeServiceTest {

    @Mock ComentarioLikeRepository likeRepository;
    @Mock RoteiroAvaliacaoRepository avaliacaoRepository;
    @Mock UserRepository userRepository;
    @InjectMocks ComentarioLikeService comentarioLikeService;

    private User usuario(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        u.setEmail("user@email.com");
        return u;
    }

    private RoteiroAvaliacao avaliacao(Long id) {
        RoteiroAvaliacao a = new RoteiroAvaliacao();
        a.setIdAvaliacao(id);
        return a;
    }

    // ─── like ─────────────────────────────────────────────────────────────

    @Test
    void like_naoExistente_salvaLike() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(1L, 2L)).thenReturn(false);
        when(avaliacaoRepository.findById(1L)).thenReturn(Optional.of(avaliacao(1L)));
        when(userRepository.findById(2L)).thenReturn(Optional.of(usuario(2L)));

        comentarioLikeService.like(1L, 2L);

        verify(likeRepository).save(any());
    }

    @Test
    void like_jaExistente_naoSalvaDuplicata() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(1L, 2L)).thenReturn(true);

        comentarioLikeService.like(1L, 2L);

        verify(likeRepository, never()).save(any());
        verify(avaliacaoRepository, never()).findById(any());
    }

    @Test
    void like_avaliacaoNaoEncontrada_throwsResourceNotFound() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(any(), any())).thenReturn(false);
        when(avaliacaoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> comentarioLikeService.like(99L, 2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void like_usuarioNaoEncontrado_throwsResourceNotFound() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(any(), any())).thenReturn(false);
        when(avaliacaoRepository.findById(1L)).thenReturn(Optional.of(avaliacao(1L)));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> comentarioLikeService.like(1L, 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── unlike ───────────────────────────────────────────────────────────

    @Test
    void unlike_chamadaDeletePorChaveComposta() {
        comentarioLikeService.unlike(1L, 2L);
        verify(likeRepository).deleteByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(1L, 2L);
    }

    // ─── jaCurtiu ─────────────────────────────────────────────────────────

    @Test
    void jaCurtiu_existente_retornaTrue() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(1L, 2L)).thenReturn(true);
        assertThat(comentarioLikeService.jaCurtiu(1L, 2L)).isTrue();
    }

    @Test
    void jaCurtiu_naoExistente_retornaFalse() {
        when(likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(1L, 2L)).thenReturn(false);
        assertThat(comentarioLikeService.jaCurtiu(1L, 2L)).isFalse();
    }

    // ─── countLikes ───────────────────────────────────────────────────────

    @Test
    void countLikes_retornaContagemCorreta() {
        when(likeRepository.countByAvaliacao_IdAvaliacao(1L)).thenReturn(5L);
        assertThat(comentarioLikeService.countLikes(1L)).isEqualTo(5L);
    }
}
