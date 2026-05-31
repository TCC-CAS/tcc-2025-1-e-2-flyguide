package com.TCC.FlyGuide.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Integração com a OpenAI Moderation API para detecção de conteúdo inapropriado.
 * Se a chave não estiver configurada, a verificação é ignorada silenciosamente.
 */
@Service
public class PerspectiveService {

    private static final String OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";

    @Value("${openai.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Retorna true se o texto for sinalizado pela OpenAI Moderation API.
     * Retorna false caso a chave não esteja configurada ou ocorra qualquer erro.
     */
    public boolean ehToxico(String texto) {
        if (apiKey == null || apiKey.isBlank()) {
            return false; // API não configurada — ignora
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of("input", texto);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            Map<?, ?> response = restTemplate.postForObject(
                    OPENAI_MODERATION_URL, request, Map.class);

            if (response == null) return false;

            // Estrutura: { "results": [ { "flagged": true/false, ... } ] }
            var results = (java.util.List<?>) response.get("results");
            if (results == null || results.isEmpty()) return false;

            Map<?, ?> result = (Map<?, ?>) results.get(0);
            return Boolean.TRUE.equals(result.get("flagged"));

        } catch (Exception e) {
            // Falha na API não bloqueia o comentário — blacklist já cobre os casos óbvios
            return false;
        }
    }
}
