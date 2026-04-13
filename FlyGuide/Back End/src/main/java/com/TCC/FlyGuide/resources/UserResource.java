package com.TCC.FlyGuide.resources;

import java.net.URI;
import java.util.List;

import com.TCC.FlyGuide.DTO.*;
import com.TCC.FlyGuide.DTO.TrialStatusDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.services.UserService;
import com.TCC.FlyGuide.DTO.AtualizarPessoaFisicaDTO;
import com.TCC.FlyGuide.DTO.AtualizarPessoaJuridicaDTO;

@RestController
@RequestMapping(value = "/users")
public class UserResource {

    @Autowired
    private UserService service;

    @GetMapping(value = "/search")
    public ResponseEntity<List<User>> findAll() {
        List<User> list = service.findAll();
        return ResponseEntity.ok().body(list);
    }

    @GetMapping(value = "/search/{id}")
    public ResponseEntity<User> findById(@PathVariable Long id) {
        User obj = service.findById(id);
        return ResponseEntity.ok().body(obj);
    }

    @PostMapping(value = "/insert/pf")
    public ResponseEntity<User> insertPessoaFisica(@RequestBody CadastroPessoaFisicaDTO dto) {
        User created = service.cadastrarPessoaFisica(dto);

        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getIdUsuario())
                .toUri();

        return ResponseEntity.created(uri).body(created);
    }

    @PostMapping(value = "/insert/pj")
    public ResponseEntity<User> insertPessoaJuridica(@RequestBody CadastroPessoaJuridicaDTO dto) {
        User created = service.cadastrarPessoaJuridica(dto);
        URI uri = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getIdUsuario())
                .toUri();
        return ResponseEntity.created(uri).body(created);
    }

    @DeleteMapping(value = "/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/update/pf/{id}")
    public ResponseEntity<Void> updatePF(@PathVariable Long id, @RequestBody AtualizarPessoaFisicaDTO dto) {
        service.updatePF(id, dto);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/update/pj/{id}")
    public ResponseEntity<Void> updatePJ(@PathVariable Long id, @RequestBody AtualizarPessoaJuridicaDTO dto) {
        service.updatePJ(id, dto);
        return ResponseEntity.noContent().build();
    }


    @PatchMapping(value = "/upgrade-premium/{id}")
    public ResponseEntity<Void> upgradePremium(@PathVariable Long id) {
        service.upgradePremium(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping(value = "/downgrade-free/{id}")
    public ResponseEntity<Void> downgradeFree(@PathVariable Long id) {
        service.downgradeFree(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/search-completo/{id}")
    public ResponseEntity<UserCompleteDTO> findCompletoById(@PathVariable Long id) {
        UserCompleteDTO dto = service.findCompletoById(id);
        return ResponseEntity.ok().body(dto);
    }

    /**
     * Retorna o status do trial gratuito de um usuário PJ.
     * Aplica expiração automaticamente se os 30 dias já passaram.
     *
     * Uso no frontend: chamar após login para decidir se libera ou bloqueia o acesso.
     *
     * Resposta:
     * {
     *   "emTrial": true/false,
     *   "expirado": true/false,
     *   "diasRestantes": 25,
     *   "dataExpiracao": "2026-05-12",
     *   "tipoConta": "TRIAL" | "FREE" | "PREMIUM"
     * }
     */
    @GetMapping(value = "/trial-status/{id}")
    public ResponseEntity<TrialStatusDTO> trialStatus(@PathVariable Long id) {
        return ResponseEntity.ok(service.getTrialStatus(id));
    }
}