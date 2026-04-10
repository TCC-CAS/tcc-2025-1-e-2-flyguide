package com.TCC.FlyGuide.resources;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.TCC.FlyGuide.DTO.RoteiroComentarioDTO;
import com.TCC.FlyGuide.services.RoteiroComentarioService;

@RestController
@RequestMapping(value = "/roteiros/{idRoteiro}/comentarios")
public class RoteiroComentarioResource {

    @Autowired
    private RoteiroComentarioService service;

    @GetMapping
    public ResponseEntity<List<RoteiroComentarioDTO>> findByRoteiro(@PathVariable Long idRoteiro) {
        List<RoteiroComentarioDTO> list = service.findByRoteiro(idRoteiro);
        return ResponseEntity.ok().body(list);
    }

    @PostMapping
    public ResponseEntity<RoteiroComentarioDTO> insert(
            @PathVariable Long idRoteiro,
            @RequestBody RoteiroComentarioDTO dto) {

        RoteiroComentarioDTO created = service.insert(idRoteiro, dto);

        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getIdComentario())
                .toUri();

        return ResponseEntity.created(uri).body(created);
    }

    @DeleteMapping("/{idComentario}")
    public ResponseEntity<Void> delete(
            @PathVariable Long idRoteiro,
            @PathVariable Long idComentario) {

        service.delete(idComentario);
        return ResponseEntity.noContent().build();
    }
}
