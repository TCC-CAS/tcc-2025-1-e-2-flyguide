package com.TCC.FlyGuide.resources;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.DTO.RoteiroAvaliacaoDTO;
import com.TCC.FlyGuide.services.RoteiroAvaliacaoService;

@RestController
@RequestMapping("/roteiros/{idRoteiro}/avaliacoes")
public class RoteiroAvaliacaoResource {

    @Autowired
    private RoteiroAvaliacaoService service;

    // Lista todas as avaliações do roteiro (nota + comentário + likes)
    @GetMapping
    public ResponseEntity<List<RoteiroAvaliacaoDTO>> findByRoteiro(@PathVariable Long idRoteiro) {
        return ResponseEntity.ok(service.findByRoteiro(idRoteiro));
    }

    // Retorna média e total de avaliações
    @GetMapping("/media")
    public ResponseEntity<Map<String, Object>> getMedia(@PathVariable Long idRoteiro) {
        return ResponseEntity.ok(service.getMedia(idRoteiro));
    }

    // Retorna a avaliação completa do usuário (nota + comentário), null se não avaliou
    @GetMapping("/{idUsuario}")
    public ResponseEntity<RoteiroAvaliacaoDTO> getAvaliacaoUsuario(
            @PathVariable Long idRoteiro,
            @PathVariable Long idUsuario) {
        RoteiroAvaliacaoDTO dto = service.getAvaliacaoUsuario(idRoteiro, idUsuario);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    // Remove a avaliação do próprio usuário
    @DeleteMapping("/{idUsuario}")
    public ResponseEntity<Void> deletar(
            @PathVariable Long idRoteiro,
            @PathVariable Long idUsuario) {
        service.deletar(idRoteiro, idUsuario);
        return ResponseEntity.noContent().build();
    }

    // Cria ou atualiza avaliação — nota obrigatória, texto opcional
    @PostMapping("/{idUsuario}")
    public ResponseEntity<RoteiroAvaliacaoDTO> avaliar(
            @PathVariable Long idRoteiro,
            @PathVariable Long idUsuario,
            @RequestBody Map<String, Object> body) {

        Integer nota = (Integer) body.get("nota");
        String texto = (String) body.get("texto");

        RoteiroAvaliacaoDTO dto = service.avaliar(idRoteiro, idUsuario, nota, texto);
        return ResponseEntity.ok(dto);
    }
}
