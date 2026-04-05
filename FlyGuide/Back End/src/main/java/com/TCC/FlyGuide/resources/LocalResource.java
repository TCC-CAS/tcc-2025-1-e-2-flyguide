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

import com.TCC.FlyGuide.DTO.LocalDTO;
import com.TCC.FlyGuide.services.LocalService;

@RestController
@RequestMapping(value = "/locais")
public class LocalResource {

    @Autowired
    private LocalService service;

    @GetMapping
    public ResponseEntity<List<LocalDTO>> findAll() {
        List<LocalDTO> list = service.findAll();
        return ResponseEntity.ok().body(list);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<LocalDTO> findById(@PathVariable Long id) {
        LocalDTO dto = service.findById(id);
        return ResponseEntity.ok().body(dto);
    }

    @GetMapping(value = "/place/{placeId}")
    public ResponseEntity<LocalDTO> findByPlaceId(@PathVariable String placeId) {
        LocalDTO dto = service.findByPlaceId(placeId);
        return ResponseEntity.ok().body(dto);
    }

    @PostMapping
    public ResponseEntity<LocalDTO> insert(@RequestBody LocalDTO dto) {
        LocalDTO created = service.insert(dto);

        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getIdLocal())
                .toUri();

        return ResponseEntity.created(uri).body(created);
    }

    @PutMapping(value = "/{id}")
    public ResponseEntity<LocalDTO> update(@PathVariable Long id, @RequestBody LocalDTO dto) {
        LocalDTO updated = service.update(id, dto);
        return ResponseEntity.ok().body(updated);
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}