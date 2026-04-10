package com.TCC.FlyGuide.resources;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.services.RoteiroLikeService;

@RestController
@RequestMapping(value = "/roteiros/{idRoteiro}/likes")
public class RoteiroLikeResource {

    @Autowired
    private RoteiroLikeService service;

    @PostMapping("/{idUsuario}")
    public ResponseEntity<Void> like(@PathVariable Long idRoteiro, @PathVariable Long idUsuario) {
        service.like(idRoteiro, idUsuario);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{idUsuario}")
    public ResponseEntity<Void> unlike(@PathVariable Long idRoteiro, @PathVariable Long idUsuario) {
        service.unlike(idRoteiro, idUsuario);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Long> count(@PathVariable Long idRoteiro) {
        return ResponseEntity.ok(service.countLikes(idRoteiro));
    }
}
