package com.TCC.FlyGuide.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    private JwtService jwtService;

    // Chave com pelo menos 32 bytes para HMAC-SHA256
    private static final String SECRET = "flyguide-test-secret-key-2024-must-be-long-enough";
    private static final long EXPIRACAO_MS = 3_600_000L; // 1 hora

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expiracao", EXPIRACAO_MS);
    }

    @Test
    void gerarToken_retornaStringNaoNula() {
        String token = jwtService.gerarToken(1L);
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void extrairUserId_retornaIdCorreto() {
        String token = jwtService.gerarToken(42L);
        Long userId = jwtService.extrairUserId(token);
        assertThat(userId).isEqualTo(42L);
    }

    @Test
    void extrairExpiracao_retornaDataFutura() {
        String token = jwtService.gerarToken(1L);
        LocalDateTime expiracao = jwtService.extrairExpiracao(token);
        assertThat(expiracao).isAfter(LocalDateTime.now());
    }

    @Test
    void tokenValido_tokenCorreto_retornaTrue() {
        String token = jwtService.gerarToken(1L);
        assertThat(jwtService.tokenValido(token)).isTrue();
    }

    @Test
    void tokenValido_tokenMalformado_retornaFalse() {
        assertThat(jwtService.tokenValido("token.invalido.aqui")).isFalse();
    }

    @Test
    void tokenValido_tokenComAssinaturaAlterada_retornaFalse() {
        String token = jwtService.gerarToken(1L);
        String tokenAlterado = token.substring(0, token.length() - 5) + "XXXXX";
        assertThat(jwtService.tokenValido(tokenAlterado)).isFalse();
    }

    @Test
    void gerarToken_usuariosDiferentes_geramTokensDiferentes() {
        String token1 = jwtService.gerarToken(1L);
        String token2 = jwtService.gerarToken(2L);
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    void tokenExpirado_retornaFalse() {
        JwtService serviceComExpiracao = new JwtService();
        ReflectionTestUtils.setField(serviceComExpiracao, "secret", SECRET);
        ReflectionTestUtils.setField(serviceComExpiracao, "expiracao", -1000L); // já expirado

        String token = serviceComExpiracao.gerarToken(1L);
        assertThat(serviceComExpiracao.tokenValido(token)).isFalse();
    }
}
