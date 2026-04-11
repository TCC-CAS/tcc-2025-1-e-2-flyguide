package com.TCC.FlyGuide.resources;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.services.BlacklistService;
import com.TCC.FlyGuide.services.PerspectiveService;

@RestController
@RequestMapping("/validar")
public class ValidacaoResource {

    @Autowired private BlacklistService blacklistService;
    @Autowired private PerspectiveService perspectiveService;

    @PostMapping("/texto")
    public ResponseEntity<Map<String, Object>> validar(@RequestBody Map<String, String> body) {
        String texto = body.get("texto");

        if (texto == null || texto.isBlank()) {
            return ResponseEntity.ok(Map.of("valido", true));
        }

        if (blacklistService.contemPalavraProibida(texto)) {
            return ResponseEntity.ok(Map.of("valido", false, "motivo", "blacklist"));
        }

        if (perspectiveService.ehToxico(texto)) {
            return ResponseEntity.ok(Map.of("valido", false, "motivo", "openai"));
        }

        return ResponseEntity.ok(Map.of("valido", true));
    }
}