package com.TCC.FlyGuide.resources;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.services.RoteiroAvaliacaoService;

@RestController
@RequestMapping("/roteiros/{idRoteiro}/avaliacoes")
public class RoteiroAvaliacaoResource {

    @Autowired
    private RoteiroAvaliacaoService service;

    // Retorna média e total de avaliações
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMedia(@PathVariable Long idRoteiro) {
        return ResponseEntity.ok(service.getMedia(idRoteiro));
    }

    // Retorna a nota que o usuário deu (0 se não avaliou)
    @GetMapping("/{idUsuario}")
    public ResponseEntity<Integer> getNotaUsuario(
            @PathVariable Long idRoteiro,
            @PathVariable Long idUsuario) {
        return ResponseEntity.ok(service.getNotaUsuario(idRoteiro, idUsuario));
    }

    // Cria ou atualiza avaliação
    @PostMapping("/{idUsuario}")
    public ResponseEntity<Void> avaliar(
            @PathVariable Long idRoteiro,
            @PathVariable Long idUsuario,
            @RequestBody Map<String, Integer> body) {
        service.avaliar(idRoteiro, idUsuario, body.get("nota"));
        return ResponseEntity.ok().build();
    }
}