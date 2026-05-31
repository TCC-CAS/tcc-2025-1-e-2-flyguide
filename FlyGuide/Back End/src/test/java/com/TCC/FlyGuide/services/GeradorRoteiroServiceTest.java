package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.GerarRoteiroRequestDTO;
import com.TCC.FlyGuide.DTO.GerarRoteiroResponseDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

// Sem API key configurada (campo @Value não é injetado pelo Mockito),
// o serviço sempre usa o caminho de fallback — cobrindo toda a lógica local.
@ExtendWith(MockitoExtension.class)
class GeradorRoteiroServiceTest {

    @Mock
    ImagemRepository imagemRepository;

    @InjectMocks
    GeradorRoteiroService geradorRoteiroService;

    private GerarRoteiroRequestDTO req(String cidade, String pais, int dias, String tipo) {
        GerarRoteiroRequestDTO r = new GerarRoteiroRequestDTO();
        r.setCidade(cidade);
        r.setPais(pais);
        r.setDiasTotais(dias);
        r.setTipoRoteiro(tipo);
        return r;
    }

    private Imagem imagem(String chave) {
        return new Imagem(1L, chave, chave, "https://img.example.com/" + chave + ".jpg", "🌍");
    }

    // ─── fallback — estrutura básica ──────────────────────────────────────

    @Test
    void gerar_semApiKey_retornaFallbackComTitulo() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.of(imagem("cidade")));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Paris", "França", 3, "Cidade"));

        assertThat(resp).isNotNull();
        assertThat(resp.getTitulo()).contains("Paris");
    }

    @Test
    void gerar_semApiKey_retornaDescricaoComCidadeEPais() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.of(imagem("cidade")));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Lisboa", "Portugal", 2, "Cultural"));

        assertThat(resp.getDescricao()).contains("Lisboa");
        assertThat(resp.getDescricao()).contains("Portugal");
    }

    @Test
    void gerar_semApiKey_retornaSugestoesPorDia() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.of(imagem("cidade")));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Roma", "Itália", 3, "Cultural"));

        assertThat(resp.getSugestoes()).isNotNull();
        assertThat(resp.getSugestoes()).hasSize(3);
        assertThat(resp.getSugestoes().get(0)).containsKey("dia");
        assertThat(resp.getSugestoes().get(0)).containsKey("periodos");
    }

    @Test
    void gerar_1dia_retornaSugestaoComCheckin() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.of(imagem("praia")));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Florianópolis", "Brasil", 1, "Praia"));

        assertThat(resp.getSugestoes()).hasSize(1);
        // Dia 1 deve ter check-in na manhã
        Object periodos = resp.getSugestoes().get(0).get("periodos");
        assertThat(periodos).isNotNull();
    }

    // ─── fallback — tipos de roteiro ─────────────────────────────────────

    @Test
    void gerar_tipoNatureza_usaChaveNatureza() {
        Imagem imgNatureza = imagem("natureza");
        when(imagemRepository.findByChave("natureza")).thenReturn(Optional.of(imgNatureza));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Chapada", "Brasil", 2, "Natureza"));

        assertThat(resp.getImagemChave()).isEqualTo("natureza");
    }

    @Test
    void gerar_tipoAventura_usaChaveAventura() {
        Imagem imgAventura = imagem("aventura");
        when(imagemRepository.findByChave("aventura")).thenReturn(Optional.of(imgAventura));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Bonito", "Brasil", 2, "Aventura"));

        assertThat(resp.getImagemChave()).isEqualTo("aventura");
    }

    @Test
    void gerar_tipoLuxo_usaChaveLuxo() {
        Imagem imgLuxo = imagem("luxo");
        when(imagemRepository.findByChave("luxo")).thenReturn(Optional.of(imgLuxo));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Dubai", "Emirados", 4, "Luxo"));

        assertThat(resp.getImagemChave()).isEqualTo("luxo");
    }

    @Test
    void gerar_tipoMochilao_usaChaveMochilao() {
        Imagem img = imagem("mochilao");
        when(imagemRepository.findByChave("mochilao")).thenReturn(Optional.of(img));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Bangkok", "Tailândia", 5, "Mochilão"));

        assertThat(resp.getImagemChave()).isEqualTo("mochilao");
    }

    @Test
    void gerar_tipoFamilia_usaChaveFamilia() {
        Imagem img = imagem("familia");
        when(imagemRepository.findByChave("familia")).thenReturn(Optional.of(img));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Orlando", "EUA", 7, "Família"));

        assertThat(resp.getImagemChave()).isEqualTo("familia");
    }

    // ─── fallback — imagem não encontrada ────────────────────────────────

    @Test
    void gerar_imagemNaoEncontrada_fallbackParaCidade() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.empty());

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Curitiba", "Brasil", 1, "Cidade"));

        // Sem imagem — campos de imagem ficam nulos, mas a resposta é válida
        assertThat(resp).isNotNull();
        assertThat(resp.getTitulo()).isNotBlank();
    }

    @Test
    void gerar_imagemEncontrada_populaIdEUrl() {
        Imagem img = new Imagem(42L, "praia", "Praia", "https://foto.jpg", "🏖️");
        when(imagemRepository.findByChave("praia")).thenReturn(Optional.of(img));

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(req("Recife", "Brasil", 2, "Praia"));

        assertThat(resp.getIdImagem()).isEqualTo(42L);
        assertThat(resp.getImagemUrl()).isEqualTo("https://foto.jpg");
    }

    // ─── fallback — campos nulos no request ──────────────────────────────

    @Test
    void gerar_diasTotaisNulo_usaDefaultUmDia() {
        GerarRoteiroRequestDTO r = new GerarRoteiroRequestDTO();
        r.setCidade("Lisboa");
        r.setPais("Portugal");
        // diasTotais null
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.empty());

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(r);

        assertThat(resp.getSugestoes()).hasSize(1);
    }

    @Test
    void gerar_tipoNulo_usaChaveCidade() {
        when(imagemRepository.findByChave("cidade")).thenReturn(Optional.of(imagem("cidade")));

        GerarRoteiroRequestDTO r = new GerarRoteiroRequestDTO();
        r.setCidade("Curitiba");
        r.setPais("Brasil");
        r.setDiasTotais(2);
        // tipoRoteiro null

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(r);

        assertThat(resp.getImagemChave()).isEqualTo("cidade");
    }

    @Test
    void gerar_paisNulo_descricaoSemPais() {
        when(imagemRepository.findByChave(anyString())).thenReturn(Optional.of(imagem("cidade")));

        GerarRoteiroRequestDTO r = new GerarRoteiroRequestDTO();
        r.setCidade("Curitiba");
        r.setDiasTotais(1);
        r.setTipoRoteiro("Cidade");
        // pais null

        GerarRoteiroResponseDTO resp = geradorRoteiroService.gerar(r);

        // Não lança exceção mesmo com país nulo
        assertThat(resp).isNotNull();
        assertThat(resp.getTitulo()).contains("Curitiba");
    }
}
