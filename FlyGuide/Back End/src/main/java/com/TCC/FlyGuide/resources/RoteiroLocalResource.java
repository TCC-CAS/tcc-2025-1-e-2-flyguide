package com.TCC.FlyGuide.resources;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.services.RoteiroLocalService;

@RestController
@RequestMapping(value = "/roteiros/{idRoteiro}/locais")
public class RoteiroLocalResource {

    @Autowired
    private RoteiroLocalService service;

    private Long getUsuarioLogadoId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<RoteiroLocalDTO>> findByRoteiro(@PathVariable Long idRoteiro) {
        List<RoteiroLocalDTO> list = service.findByRoteiro(idRoteiro);
        return ResponseEntity.ok().body(list);
    }

    @PostMapping
    public ResponseEntity<RoteiroLocalDTO> insert(@PathVariable Long idRoteiro, @RequestBody RoteiroLocalDTO dto) {
        RoteiroLocalDTO created = service.insert(idRoteiro, dto, getUsuarioLogadoId());

        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{idLocal}")
                .buildAndExpand(created.getIdLocal())
                .toUri();

        return ResponseEntity.created(uri).body(created);
    }

    @PutMapping(value = "/{idLocal}")
    public ResponseEntity<RoteiroLocalDTO> update(
            @PathVariable Long idRoteiro,
            @PathVariable Long idLocal,
            @RequestBody RoteiroLocalDTO dto) {
        RoteiroLocalDTO updated = service.update(idRoteiro, idLocal, dto, getUsuarioLogadoId());
        return ResponseEntity.ok().body(updated);
    }

    @DeleteMapping(value = "/{idLocal}")
    public ResponseEntity<Void> delete(@PathVariable Long idRoteiro, @PathVariable Long idLocal) {
        service.delete(idRoteiro, idLocal, getUsuarioLogadoId());
        return ResponseEntity.noContent().build();
    }
}
