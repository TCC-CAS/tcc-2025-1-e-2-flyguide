package com.TCC.FlyGuide.resources;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.TCC.FlyGuide.DTO.RoteiroDTO;
import com.TCC.FlyGuide.services.RoteiroService;

@RestController
@RequestMapping(value = "/roteiros")
public class RoteiroResources {

    @Autowired
    private RoteiroService service;

    @GetMapping
    public ResponseEntity<List<RoteiroDTO>> findAll() {
        List<RoteiroDTO> list = service.findAll();
        return ResponseEntity.ok().body(list);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<RoteiroDTO> findById(@PathVariable Long id) {
        RoteiroDTO dto = service.findById(id);
        return ResponseEntity.ok().body(dto);
    }

    // Meus Roteiros: lista por usuário
    @GetMapping(value = "/usuario/{idUsuario}")
    public ResponseEntity<List<RoteiroDTO>> findByUsuario(@PathVariable Long idUsuario) {
        List<RoteiroDTO> list = service.findByUsuario(idUsuario);
        return ResponseEntity.ok().body(list);
    }

    @PostMapping
    public ResponseEntity<RoteiroDTO> insert(@RequestBody RoteiroDTO dto) {
        RoteiroDTO created = service.insert(dto);

        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getIdRoteiro())
                .toUri();

        return ResponseEntity.created(uri).body(created);
    }

    @PutMapping(value = "/{id}")
    public ResponseEntity<RoteiroDTO> update(@PathVariable Long id, @RequestBody RoteiroDTO dto) {
        RoteiroDTO updated = service.update(id, dto);
        return ResponseEntity.ok().body(updated);
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}