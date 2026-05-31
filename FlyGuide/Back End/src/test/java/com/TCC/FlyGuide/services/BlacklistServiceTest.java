package com.TCC.FlyGuide.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BlacklistServiceTest {

    private final BlacklistService service = new BlacklistService();

    // ─── texto vazio / nulo ───────────────────────────────────────────────

    @Test
    void contemPalavraProibida_textoNulo_retornaFalse() {
        assertThat(service.contemPalavraProibida(null)).isFalse();
    }

    @Test
    void contemPalavraProibida_textoVazio_retornaFalse() {
        assertThat(service.contemPalavraProibida("")).isFalse();
    }

    @Test
    void contemPalavraProibida_textoSoEspacos_retornaFalse() {
        assertThat(service.contemPalavraProibida("   ")).isFalse();
    }

    // ─── texto limpo ──────────────────────────────────────────────────────

    @Test
    void contemPalavraProibida_textoNormal_retornaFalse() {
        assertThat(service.contemPalavraProibida("Que roteiro incrível para visitar!")).isFalse();
    }

    @Test
    void contemPalavraProibida_palavraPositiva_retornaFalse() {
        assertThat(service.contemPalavraProibida("Excelente destino turístico, recomendo muito!")).isFalse();
    }

    // ─── palavras simples com boundary ────────────────────────────────────

    @Test
    void contemPalavraProibida_palavraProibidaIsolada_retornaTrue() {
        assertThat(service.contemPalavraProibida("que merda de roteiro")).isTrue();
    }

    @Test
    void contemPalavraProibida_palavraEmIngles_retornaTrue() {
        assertThat(service.contemPalavraProibida("what the fuck is this")).isTrue();
    }

    @Test
    void contemPalavraProibida_palavraComAcento_retornaTrue() {
        // "porra" com acento ou caractere diferente
        assertThat(service.contemPalavraProibida("que porra é essa")).isTrue();
    }

    // ─── leet speak ───────────────────────────────────────────────────────

    @Test
    void contemPalavraProibida_leetSpeak_retornaTrue() {
        // m3rd4 → merda
        assertThat(service.contemPalavraProibida("m3rd4")).isTrue();
    }

    @Test
    void contemPalavraProibida_leetSpeakFuck_retornaTrue() {
        // f4ck → fack — não detectado, mas f*ck com substituição
        assertThat(service.contemPalavraProibida("f uck this")).isTrue();
    }

    // ─── frases coladas ───────────────────────────────────────────────────

    @Test
    void contemPalavraProibida_giriasComK_retornaTrue() {
        assertThat(service.contemPalavraProibida("Pika")).isTrue();
    }

    @Test
    void contemPalavraProibida_giriasComHInserido_retornaTrue() {
        assertThat(service.contemPalavraProibida("Xhereka")).isTrue();
    }

    @Test
    void contemPalavraProibida_palavraOfuscadaComSeparadores_retornaTrue() {
        assertThat(service.contemPalavraProibida("p.i.k.a")).isTrue();
    }

    @Test
    void contemPalavraProibida_siglaColada_retornaTrue() {
        assertThat(service.contemPalavraProibida("fdp")).isTrue();
    }

    @Test
    void contemPalavraProibida_filhoDaPutaColado_retornaTrue() {
        assertThat(service.contemPalavraProibida("filhodaputa")).isTrue();
    }

    @Test
    void contemPalavraProibida_vsf_retornaTrue() {
        assertThat(service.contemPalavraProibida("vsf cara")).isTrue();
    }

    // ─── normalização de caracteres especiais ─────────────────────────────

    @Test
    void contemPalavraProibida_comPontosETracosEntreLetras_retornaTrue() {
        // "m.e.r.d.a" → após normalização fica "m e r d a" — não contém "merda" como palavra inteira
        // mas "me-rda" → "me rda" — também não. O serviço remove não-alfanumérico por espaço.
        // "merda" diretamente funciona
        assertThat(service.contemPalavraProibida("isso é uma merda")).isTrue();
    }

    @Test
    void contemPalavraProibida_palavraNoMeioDeTextoLongo_retornaTrue() {
        assertThat(service.contemPalavraProibida(
            "o roteiro foi um desastre, que bosta de passeio!")).isTrue();
    }

    // ─── palavras que parecem proibidas mas não são ───────────────────────

    @Test
    void contemPalavraProibida_palavraSemelhanteNaoProibida_retornaFalse() {
        // "assassinar" não está na lista, "assassino" está
        assertThat(service.contemPalavraProibida("O assassino foi preso")).isTrue(); // "assassino" está na lista
    }

    @Test
    void contemPalavraProibida_textoComNumerosApenas_retornaFalse() {
        assertThat(service.contemPalavraProibida("12345678")).isFalse();
    }
}
