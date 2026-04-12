package com.TCC.FlyGuide.services;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Responsável exclusivamente pelas chamadas HTTP à API do Asaas.
 * Toda lógica de negócio fica no AssinaturaService.
 */
@Service
public class AsaasService {

    private final RestClient restClient;

    public AsaasService(
            @Value("${asaas.api.url}") String baseUrl,
            @Value("${asaas.api.key}") String apiKey) {

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("access_token", apiKey)
                .build();
    }

    /**
     * Cria um cliente no Asaas e retorna o ID gerado (ex: cus_xxxxxxxxxxxx).
     */
    public String criarCliente(String nome, String cpfCnpj, String email) {
        Map<String, Object> body = Map.of(
                "name", nome,
                "cpfCnpj", cpfCnpj,
                "email", email
        );

        Map<?, ?> response = restClient.post()
                .uri("/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        return (String) response.get("id");
    }

    /**
     * Cria uma assinatura mensal de R$ 19,90 para o cliente informado.
     * O tipo de cobrança fica como UNDEFINED para o usuário escolher no checkout.
     * Retorna o ID da assinatura (ex: sub_xxxxxxxxxxxx).
     */
    public String criarAssinatura(String customerId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("customer", customerId);
        body.put("billingType", "UNDEFINED");
        body.put("value", 19.90);
        body.put("nextDueDate", LocalDate.now().toString());
        body.put("cycle", "MONTHLY");
        body.put("description", "Assinatura FlyGuide Premium");

        Map<?, ?> response = restClient.post()
                .uri("/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        return (String) response.get("id");
    }

    /**
     * Busca o link de pagamento (invoiceUrl) do primeiro pagamento gerado
     * automaticamente pela assinatura.
     */
    public String buscarUrlPagamento(String subscriptionId) {
        Map<?, ?> response = restClient.get()
                .uri("/subscriptions/" + subscriptionId + "/payments")
                .retrieve()
                .body(Map.class);

        List<?> data = (List<?>) response.get("data");
        if (data == null || data.isEmpty()) {
            throw new RuntimeException("Nenhum pagamento encontrado para a assinatura " + subscriptionId);
        }

        return (String) ((Map<?, ?>) data.get(0)).get("invoiceUrl");
    }

    /**
     * Cancela a assinatura no Asaas, interrompendo cobranças futuras.
     */
    public void cancelarAssinatura(String subscriptionId) {
        restClient.delete()
                .uri("/subscriptions/" + subscriptionId)
                .retrieve()
                .toBodilessEntity();
    }
}
