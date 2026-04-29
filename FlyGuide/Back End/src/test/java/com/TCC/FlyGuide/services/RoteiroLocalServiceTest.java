package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.entities.Local;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroLocal;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.LocalRepository;
import com.TCC.FlyGuide.repositories.RoteiroLocalRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoteiroLocalServiceTest {

    @Mock RoteiroLocalRepository roteiroLocalRepository;
    @Mock RoteiroRepository roteiroRepository;
    @Mock LocalRepository localRepository;
    @InjectMocks RoteiroLocalService roteiroLocalService;

    private User usuario(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        return u;
    }

    private Roteiro roteiro(Long id, User dono) {
        Roteiro r = new Roteiro();
        r.setIdRoteiro(id);
        r.setUsuario(dono);
        return r;
    }

    private Local local(Long id) {
        Local l = new Local();
        l.setIdLocal(id);
        l.setPlaceId("place-" + id);
        l.setNome("Local " + id);
        return l;
    }

    private RoteiroLocal vinculo(Roteiro r, Local l) {
        RoteiroLocal rl = new RoteiroLocal();
        rl.setRoteiro(r);
        rl.setLocal(l);
        rl.setStatus("PENDENTE");
        return rl;
    }

    // ─── findByRoteiro ────────────────────────────────────────────────────

    @Test
    void findByRoteiro_roteiroNaoEncontrado_throwsResourceNotFound() {
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroLocalService.findByRoteiro(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findByRoteiro_semLocais_retornaListaVazia() {
        User dono = usuario(1L);
        when(roteiroRepository.findById(1L)).thenReturn(Optional.of(roteiro(1L, dono)));
        when(roteiroLocalRepository.findByRoteiro_IdRoteiro(1L)).thenReturn(Collections.emptyList());

        List<RoteiroLocalDTO> result = roteiroLocalService.findByRoteiro(1L);

        assertThat(result).isEmpty();
    }

    // ─── insert ───────────────────────────────────────────────────────────

    @Test
    void insert_idLocalNulo_throwsDatabaseException() {
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(null);

        assertThatThrownBy(() -> roteiroLocalService.insert(1L, dto, 1L))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("idLocal");
    }

    @Test
    void insert_roteiroNaoEncontrado_throwsResourceNotFound() {
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(10L);
        when(roteiroRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroLocalService.insert(99L, dto, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void insert_usuarioDiferenteDoDono_throwsUnauthorized() {
        User dono = usuario(1L);
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(10L);
        when(roteiroRepository.findById(5L)).thenReturn(Optional.of(roteiro(5L, dono)));

        assertThatThrownBy(() -> roteiroLocalService.insert(5L, dto, 99L))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void insert_localNaoEncontrado_throwsResourceNotFound() {
        User dono = usuario(1L);
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(99L);
        when(roteiroRepository.findById(5L)).thenReturn(Optional.of(roteiro(5L, dono)));
        when(localRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroLocalService.insert(5L, dto, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void insert_limite15LocaisAtingido_throwsResponseStatus() {
        User dono = usuario(1L);
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(10L);
        when(roteiroRepository.findById(5L)).thenReturn(Optional.of(roteiro(5L, dono)));
        when(localRepository.findById(10L)).thenReturn(Optional.of(local(10L)));
        when(roteiroLocalRepository.countByRoteiro_IdRoteiro(5L)).thenReturn(15L);

        assertThatThrownBy(() -> roteiroLocalService.insert(5L, dto, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("15");
    }

    @Test
    void insert_dadosValidos_salvaERetornaDTO() {
        User dono = usuario(1L);
        Roteiro r = roteiro(5L, dono);
        Local l = local(10L);
        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setIdLocal(10L);
        dto.setStatus("PENDENTE");

        when(roteiroRepository.findById(5L)).thenReturn(Optional.of(r));
        when(localRepository.findById(10L)).thenReturn(Optional.of(l));
        when(roteiroLocalRepository.countByRoteiro_IdRoteiro(5L)).thenReturn(0L);
        when(roteiroLocalRepository.save(any())).thenAnswer(inv -> {
            RoteiroLocal rl = inv.getArgument(0);
            rl.setIdRoteiroLocal(100L);
            return rl;
        });

        RoteiroLocalDTO result = roteiroLocalService.insert(5L, dto, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getIdLocal()).isEqualTo(10L);
        verify(roteiroLocalRepository).save(any(RoteiroLocal.class));
    }

    // ─── update ───────────────────────────────────────────────────────────

    @Test
    void update_vinculoNaoEncontrado_throwsResourceNotFound() {
        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroLocalService.update(5L, 10L, new RoteiroLocalDTO(), 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_usuarioDiferenteDoDono_throwsUnauthorized() {
        User dono = usuario(1L);
        Roteiro r = roteiro(5L, dono);
        RoteiroLocal rl = vinculo(r, local(10L));
        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.of(rl));

        assertThatThrownBy(() -> roteiroLocalService.update(5L, 10L, new RoteiroLocalDTO(), 99L))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void update_donoDoRoteiro_atualizaCampos() {
        User dono = usuario(1L);
        Roteiro r = roteiro(5L, dono);
        Local l = local(10L);
        RoteiroLocal rl = vinculo(r, l);

        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.of(rl));
        when(roteiroLocalRepository.save(any())).thenReturn(rl);

        RoteiroLocalDTO dto = new RoteiroLocalDTO();
        dto.setStatus("VISITADO");
        dto.setDia(2);

        RoteiroLocalDTO result = roteiroLocalService.update(5L, 10L, dto, 1L);

        assertThat(result).isNotNull();
        assertThat(rl.getStatus()).isEqualTo("VISITADO");
        assertThat(rl.getDia()).isEqualTo(2);
    }

    // ─── delete ───────────────────────────────────────────────────────────

    @Test
    void delete_vinculoNaoEncontrado_throwsResourceNotFound() {
        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> roteiroLocalService.delete(5L, 10L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_usuarioDiferenteDoDono_throwsUnauthorized() {
        User dono = usuario(1L);
        RoteiroLocal rl = vinculo(roteiro(5L, dono), local(10L));
        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.of(rl));

        assertThatThrownBy(() -> roteiroLocalService.delete(5L, 10L, 99L))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void delete_donoDoRoteiro_deletaVinculo() {
        User dono = usuario(1L);
        RoteiroLocal rl = vinculo(roteiro(5L, dono), local(10L));
        when(roteiroLocalRepository.findByRoteiro_IdRoteiroAndLocal_IdLocal(5L, 10L))
                .thenReturn(Optional.of(rl));

        roteiroLocalService.delete(5L, 10L, 1L);

        verify(roteiroLocalRepository).delete(rl);
    }
}
