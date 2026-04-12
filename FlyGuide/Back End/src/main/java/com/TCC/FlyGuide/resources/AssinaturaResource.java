package com.TCC.FlyGuide.resources;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.TCC.FlyGuide.DTO.AsaasWebhookDTO;
import com.TCC.FlyGuide.DTO.AssinaturaStatusDTO;
import com.TCC.FlyGuide.services.AssinaturaService;

@RestController
@RequestMapping("/assinatura")
public class AssinaturaResource {

    @Autowired
    private AssinaturaService service;

    /**
     * Inicia o processo de assinatura premium.
     *
     * Uso no frontend:
     *   POST /assinatura/iniciar/{userId}
     *   Resposta: { "paymentUrl": "https://sandbox.asaas.com/i/..." }
     *   → Redirecionar o usuário para paymentUrl ou abrir em nova aba.
     *
     * Após o pagamento o Asaas notifica o webhook e a conta é atualizada automaticamente.
     */
    @PostMapping("/iniciar/{userId}")
    public ResponseEntity<Map<String, String>> iniciar(@PathVariable Long userId) {
        String url = service.iniciarAssinatura(userId);
        return ResponseEntity.ok(Map.of("paymentUrl", url));
    }

    /**
     * Endpoint chamado automaticamente pelo Asaas ao ocorrer eventos de pagamento.
     * NÃO deve ser chamado pelo frontend — é exclusivo para o Asaas.
     *
     * Header obrigatório: asaas-access-token (validado internamente)
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody AsaasWebhookDTO payload,
            @RequestHeader("asaas-access-token") String token) {
        service.processarWebhook(payload, token);
        return ResponseEntity.ok().build();
    }

    /**
     * Retorna o status atual da assinatura do usuário.
     *
     * Uso no frontend:
     *   GET /assinatura/status/{userId}
     *   Resposta: { "status": "ACTIVE", "dataInicio": "...", "proximoVencimento": "...", "asaasSubscriptionId": "..." }
     *
     * Status possíveis:
     *   PENDING   → assinatura criada, aguardando pagamento
     *   ACTIVE    → pagamento confirmado, conta é PREMIUM
     *   OVERDUE   → pagamento venceu, conta foi revertida para FREE
     *   CANCELLED → assinatura cancelada pelo usuário
     */
    @GetMapping("/status/{userId}")
    public ResponseEntity<AssinaturaStatusDTO> status(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getStatus(userId));
    }

    /**
     * Cancela a assinatura do usuário no Asaas e faz downgrade para FREE.
     *
     * Uso no frontend:
     *   DELETE /assinatura/cancelar/{userId}
     *   Resposta: 204 No Content
     */
    @DeleteMapping("/cancelar/{userId}")
    public ResponseEntity<Void> cancelar(@PathVariable Long userId) {
        service.cancelarAssinatura(userId);
        return ResponseEntity.noContent().build();
    }
}
