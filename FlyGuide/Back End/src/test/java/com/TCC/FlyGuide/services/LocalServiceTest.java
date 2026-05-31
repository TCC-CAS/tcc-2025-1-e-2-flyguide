package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.LocalBuscaDTO;
import com.TCC.FlyGuide.DTO.LocalDTO;
import com.TCC.FlyGuide.entities.Local;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.LocalRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
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
class LocalServiceTest {

    @Mock LocalRepository repository;
    @Mock UserRepository userRepository;
    @Mock GooglePlacesService googlePlacesService;
    @InjectMocks LocalService localService;

    private User usuarioPremium(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        u.setTipoConta("Premium");
        return u;
    }

    private User usuarioFree(Long id) {
        User u = new User();
        u.setIdUsuario(id);
        u.setTipoConta("FREE");
        return u;
    }

    private Local localEntidade(Long id, String placeId) {
        Local l = new Local();
        l.setIdLocal(id);
        l.setPlaceId(placeId);
        l.setNome("Local Teste");
        l.setEndereco("Rua Teste, 123");
        l.setTipo("restaurant");
        return l;
    }

    private LocalBuscaDTO localBusca(String placeId, Double rating, Integer priceLevel, Boolean openNow) {
        LocalBuscaDTO dto = new LocalBuscaDTO();
        dto.setPlaceId(placeId);
        dto.setNome("Local " + placeId);
        dto.setRating(rating);
        dto.setPriceLevel(priceLevel);
        dto.setOpenNow(openNow);
        return dto;
    }

    // ─── buscar ───────────────────────────────────────────────────────────

    @Test
    void buscar_usuarioFreeComFiltroPremium_throwsResponseStatus() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuarioFree(1L)));

        assertThatThrownBy(() -> localService.buscar(1L, "café", 4.0, null, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Premium");
    }

    @Test
    void buscar_usuarioFree_ocultaCamposPremium() {
        LocalBuscaDTO resultado = localBusca("place-1", 4.5, 2, true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuarioFree(1L)));
        when(googlePlacesService.buscarLocais("café")).thenReturn(List.of(resultado));

        List<LocalBuscaDTO> result = localService.buscar(1L, "café", null, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRating()).isNull();
        assertThat(result.get(0).getPriceLevel()).isNull();
        assertThat(result.get(0).getOpenNow()).isNull();
    }

    @Test
    void buscar_usuarioPremiumSemFiltros_retornaCamposCompletos() {
        LocalBuscaDTO resultado = localBusca("place-1", 4.5, 2, true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuarioPremium(1L)));
        when(googlePlacesService.buscarLocais("café")).thenReturn(List.of(resultado));

        List<LocalBuscaDTO> result = localService.buscar(1L, "café", null, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRating()).isEqualTo(4.5);
    }

    @Test
    void buscar_usuarioPremiumComFiltroAvaliacaoMin_filtraResultados() {
        LocalBuscaDTO alto = localBusca("place-1", 4.5, 1, true);
        LocalBuscaDTO baixo = localBusca("place-2", 2.0, 1, true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuarioPremium(1L)));
        when(googlePlacesService.buscarLocais("café")).thenReturn(List.of(alto, baixo));

        List<LocalBuscaDTO> result = localService.buscar(1L, "café", 4.0, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPlaceId()).isEqualTo("place-1");
    }

    @Test
    void buscar_usuarioPremiumFiltroApenasAbertos_filtraFechados() {
        LocalBuscaDTO aberto = localBusca("place-1", 4.0, 1, true);
        LocalBuscaDTO fechado = localBusca("place-2", 4.0, 1, false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(usuarioPremium(1L)));
        when(googlePlacesService.buscarLocais("café")).thenReturn(List.of(aberto, fechado));

        List<LocalBuscaDTO> result = localService.buscar(1L, "café", null, null, true, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPlaceId()).isEqualTo("place-1");
    }

    // ─── findAll ──────────────────────────────────────────────────────────

    @Test
    void findAll_retornaListaDeLocais() {
        when(repository.findAll()).thenReturn(List.of(
                localEntidade(1L, "place-1"),
                localEntidade(2L, "place-2")
        ));

        List<LocalDTO> result = localService.findAll();

        assertThat(result).hasSize(2);
    }

    // ─── findById ─────────────────────────────────────────────────────────

    @Test
    void findById_encontrado_retornaDTO() {
        when(repository.findById(1L)).thenReturn(Optional.of(localEntidade(1L, "place-1")));

        LocalDTO result = localService.findById(1L);

        assertThat(result.getIdLocal()).isEqualTo(1L);
        assertThat(result.getPlaceId()).isEqualTo("place-1");
    }

    @Test
    void findById_naoEncontrado_throwsResourceNotFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> localService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── findByPlaceId ────────────────────────────────────────────────────

    @Test
    void findByPlaceId_encontrado_retornaDTO() {
        when(repository.findByPlaceId("place-1")).thenReturn(Optional.of(localEntidade(1L, "place-1")));

        LocalDTO result = localService.findByPlaceId("place-1");

        assertThat(result.getPlaceId()).isEqualTo("place-1");
    }

    @Test
    void findByPlaceId_naoEncontrado_throwsResourceNotFound() {
        when(repository.findByPlaceId("inexistente")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> localService.findByPlaceId("inexistente"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── insert ───────────────────────────────────────────────────────────

    @Test
    void insert_placeIdNulo_throwsDatabaseException() {
        LocalDTO dto = new LocalDTO();
        dto.setPlaceId(null);

        assertThatThrownBy(() -> localService.insert(dto))
                .isInstanceOf(DatabaseException.class)
                .hasMessageContaining("placeId");
    }

    @Test
    void insert_placeIdVazio_throwsDatabaseException() {
        LocalDTO dto = new LocalDTO();
        dto.setPlaceId("   ");

        assertThatThrownBy(() -> localService.insert(dto))
                .isInstanceOf(DatabaseException.class);
    }

    @Test
    void insert_localNovo_criaNoBanco() {
        LocalDTO dto = new LocalDTO();
        dto.setPlaceId("novo-place");
        dto.setNome("Novo Local");

        when(repository.findByPlaceId("novo-place")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> {
            Local l = inv.getArgument(0);
            l.setIdLocal(1L);
            return l;
        });

        LocalDTO result = localService.insert(dto);

        assertThat(result.getPlaceId()).isEqualTo("novo-place");
        verify(repository).save(any(Local.class));
    }

    @Test
    void insert_localExistente_atualizaCacheExistente() {
        LocalDTO dto = new LocalDTO();
        dto.setPlaceId("place-existente");
        dto.setNome("Nome Atualizado");

        Local existente = localEntidade(1L, "place-existente");
        when(repository.findByPlaceId("place-existente")).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenReturn(existente);

        localService.insert(dto);

        assertThat(existente.getNome()).isEqualTo("Nome Atualizado");
        verify(repository).save(existente);
    }

    // ─── delete ───────────────────────────────────────────────────────────

    @Test
    void delete_local_chamadaDeleteById() {
        localService.delete(1L);
        verify(repository).deleteById(1L);
    }

    // ─── update ───────────────────────────────────────────────────────────

    @Test
    void update_localExistente_atualizaERetorna() {
        Local existente = localEntidade(1L, "place-1");
        when(repository.getReferenceById(1L)).thenReturn(existente);
        when(repository.save(any())).thenReturn(existente);

        LocalDTO dto = new LocalDTO();
        dto.setNome("Nome Novo");
        dto.setEndereco("Endereço Novo");

        LocalDTO result = localService.update(1L, dto);

        assertThat(existente.getNome()).isEqualTo("Nome Novo");
        assertThat(result).isNotNull();
    }
}
