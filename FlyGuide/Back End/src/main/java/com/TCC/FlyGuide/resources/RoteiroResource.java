package com.TCC.FlyGuide.resources;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;
import com.TCC.FlyGuide.services.RoteiroService;
import com.TCC.FlyGuide.services.PdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping(value = "/roteiros")
public class RoteiroResource {

    @Autowired
    private RoteiroService service;

    @Autowired
    private PdfService pdfService;

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

    // Feed: roteiros públicos com filtros, ordenação e paginação
    @GetMapping(value = "/publicos")
    public ResponseEntity<Page<RoteiroDTO>> findPublicos(
            @RequestParam(required = false) String cidade,
            @RequestParam(required = false) String tipoRoteiro,
            @RequestParam(required = false) BigDecimal orcamentoMax,
            @RequestParam(required = false, defaultValue = "recente") String ordenacao,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Integer diasMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<RoteiroDTO> result = service.findPublicos(cidade, tipoRoteiro, orcamentoMax, ordenacao, busca, diasMax,
                PageRequest.of(page, size));
        return ResponseEntity.ok(result);
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

    @PatchMapping(value = "/{id}/status")
    public ResponseEntity<Void> atualizarStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        String novoStatus = body.get("statusRoteiro");
        if (novoStatus != null) service.atualizarStatus(id, novoStatus);
        return ResponseEntity.noContent().build();
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
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam Long idUsuario) {
        service.delete(id, idUsuario);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/{id}/completo")
    public ResponseEntity<RoteiroCompletoDTO> findCompletoById(@PathVariable Long id) {
        RoteiroCompletoDTO dto = service.findCompletoById(id);
        return ResponseEntity.ok().body(dto);
    }

    @GetMapping(value = "/{id}/exportar", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportarPdf(@PathVariable Long id) throws Exception {
        byte[] pdf = pdfService.gerarPdf(id);

        String nomeArquivo = "roteiro-" + id + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomeArquivo + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}