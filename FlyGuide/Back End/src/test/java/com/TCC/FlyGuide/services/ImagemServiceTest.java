package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.ImagemDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImagemServiceTest {

    @Mock
    ImagemRepository imagemRepository;

    @InjectMocks
    ImagemService imagemService;

    private Imagem imagem(Long id, String chave, String nome) {
        return new Imagem(id, chave, nome, "https://example.com/" + chave + ".jpg", "🖼️");
    }

    // ─── findAll ──────────────────────────────────────────────────────────

    @Test
    void findAll_semImagens_retornaListaVazia() {
        when(imagemRepository.findAll()).thenReturn(Collections.emptyList());

        List<ImagemDTO> result = imagemService.findAll();

        assertThat(result).isEmpty();
    }

    @Test
    void findAll_comImagens_retornaListaMapeada() {
        Imagem praia  = imagem(1L, "praia", "Praia");
        Imagem cidade = imagem(2L, "cidade", "Cidade");
        when(imagemRepository.findAll()).thenReturn(List.of(praia, cidade));

        List<ImagemDTO> result = imagemService.findAll();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getChave()).isEqualTo("cidade");
        assertThat(result.get(0).getNome()).isEqualTo("Cidade");
        assertThat(result.get(0).getIdImagem()).isEqualTo(2L);
        assertThat(result.get(1).getChave()).isEqualTo("praia");
    }

    @Test
    void findAll_mapeiaUrlEEmoji() {
        Imagem img = imagem(3L, "natureza", "Natureza");
        when(imagemRepository.findAll()).thenReturn(List.of(img));

        List<ImagemDTO> result = imagemService.findAll();

        assertThat(result.get(0).getUrl()).contains("natureza");
        assertThat(result.get(0).getEmoji()).isEqualTo("🖼️");
    }
}
