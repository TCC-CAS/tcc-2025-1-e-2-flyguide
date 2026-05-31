package com.TCC.FlyGuide.resources;

import com.TCC.FlyGuide.services.ComentarioLikeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/roteiros/{idRoteiro}/avaliacoes/{idAvaliacao}/likes")
public class ComentarioLikeResource {

    @Autowired
    private ComentarioLikeService service;

    @GetMapping("/{idUsuario}")
    public ResponseEntity<Boolean> jaCurtiu(
            @PathVariable Long idAvaliacao,
            @PathVariable Long idUsuario) {
        return ResponseEntity.ok(service.jaCurtiu(idAvaliacao, idUsuario));
    }

    @GetMapping("/count")
    public ResponseEntity<Long> count(@PathVariable Long idAvaliacao) {
        return ResponseEntity.ok(service.countLikes(idAvaliacao));
    }

    @PostMapping("/{idUsuario}")
    public ResponseEntity<Void> like(
            @PathVariable Long idAvaliacao,
            @PathVariable Long idUsuario) {
        service.like(idAvaliacao, idUsuario);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{idUsuario}")
    public ResponseEntity<Void> unlike(
            @PathVariable Long idAvaliacao,
            @PathVariable Long idUsuario) {
        service.unlike(idAvaliacao, idUsuario);
        return ResponseEntity.noContent().build();
    }
}
