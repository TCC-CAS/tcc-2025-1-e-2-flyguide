package com.TCC.FlyGuide.resources;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.TCC.FlyGuide.DTO.AssinaturaStatusDTO;
import com.TCC.FlyGuide.DTO.CartaoCreditoDTO;
import com.TCC.FlyGuide.services.AssinaturaService;

/**
 * ════════════════════════════════════════════════════════════════════
 *  ENDPOINTS DE ASSINATURA — Guia de integração para o Frontend
 * ════════════════════════════════════════════════════════════════════
 *
 *  Todos os endpoints exigem o header:
 *    Authorization: Bearer <token_jwt>
 *
 * ────────────────────────────────────────────────────────────────────
 *  1. ASSINAR (realizar pagamento e ativar premium)
 *     POST /assinatura/assinar/{userId}
 *
 *     Body (JSON):
 *     {
 *       "numeroCartao":  "4111 1111 1111 1111",
 *       "nomeTitular":   "JOAO DA SILVA",
 *       "mesExpiracao":  12,
 *       "anoExpiracao":  2029,
 *       "cvv":           "123"
 *     }
 *
 *     Sucesso (200):
 *     {
 *       "status":            "ACTIVE",
 *       "cartaoBandeira":    "VISA",
 *       "cartaoUltimos4":    "1111",
 *       "dataInicio":        "2026-04-19",
 *       "proximoVencimento": "2026-05-19"
 *     }
 *
 *     Erro (422): { "message": "<motivo>" }
 *
 * ────────────────────────────────────────────────────────────────────
 *  2. CONSULTAR STATUS
 *     GET /assinatura/status/{userId}
 *
 *     Sucesso (200): mesmo body de resposta do endpoint assinar
 *     Erro (404): assinatura não encontrada
 *
 * ────────────────────────────────────────────────────────────────────
 *  3. CANCELAR ASSINATURA
 *     DELETE /assinatura/cancelar/{userId}
 *
 *     Sucesso (204): sem body
 *     Erro (422): "Assinatura já está cancelada."
 *     Erro (404): assinatura não encontrada
 *
 * ════════════════════════════════════════════════════════════════════
 *  CARTÕES DE TESTE
 *
 *  Número                 Bandeira      Resultado
 *  4111 1111 1111 1111    VISA          ✅ Aprovado
 *  5500 0000 0000 0004    MASTERCARD    ✅ Aprovado
 *  3782 8224 6310 005     AMEX          ✅ Aprovado (CVV: 4 dígitos)
 *  6062 8283 0000 0001    HIPERCARD     ✅ Aprovado
 *  4000 0000 0000 0002    VISA          ❌ Recusado (simula recusa da operadora)
 * ════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/assinatura")
public class AssinaturaResource {

    @Autowired
    private AssinaturaService service;

    @PostMapping("/assinar/{userId}")
    public ResponseEntity<AssinaturaStatusDTO> assinar(
            @PathVariable Long userId,
            @RequestBody CartaoCreditoDTO cartao) {
        return ResponseEntity.ok(service.assinar(userId, cartao));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<AssinaturaStatusDTO> status(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getStatus(userId));
    }

    @DeleteMapping("/cancelar/{userId}")
    public ResponseEntity<Void> cancelar(@PathVariable Long userId) {
        service.cancelarAssinatura(userId);
        return ResponseEntity.noContent().build();
    }
}