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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.TCC.FlyGuide.DTO.RoteiroDTO;
import com.TCC.FlyGuide.services.RoteiroService;
import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;

@RestController
@RequestMapping(value = "/roteiros")
public class RoteiroResource {

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

    // Feed: roteiros públicos com filtros e ordenação opcionais
    @GetMapping(value = "/publicos")
    public ResponseEntity<List<RoteiroDTO>> findPublicos(
            @RequestParam(required = false) String cidade,
            @RequestParam(required = false) String tipoRoteiro,
            @RequestParam(required = false) BigDecimal orcamentoMax,
            @RequestParam(required = false, defaultValue = "recente") String ordenacao,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Integer diasMax) {
        List<RoteiroDTO> list = service.findPublicos(cidade, tipoRoteiro, orcamentoMax, ordenacao, busca, diasMax);
        return ResponseEntity.ok().body(list);
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

    @GetMapping(value = "/{id}/clonou")
    public ResponseEntity<Boolean> jaClonou(@PathVariable Long id, @RequestParam Long idUsuario) {
        return ResponseEntity.ok(service.jaClonou(id, idUsuario));
    }

    @PostMapping(value = "/{id}/clonar")
    public ResponseEntity<RoteiroDTO> clonar(@PathVariable Long id, @RequestParam Long idUsuario) {
        RoteiroDTO clonado = service.clonar(id, idUsuario);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .replacePath("/roteiros/{id}")
                .buildAndExpand(clonado.getIdRoteiro())
                .toUri();
        return ResponseEntity.created(uri).body(clonado);
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/{id}/completo")
    public ResponseEntity<RoteiroCompletoDTO> findCompletoById(@PathVariable Long id) {
        RoteiroCompletoDTO dto = service.findCompletoById(id);
        return ResponseEntity.ok().body(dto);
    }
}