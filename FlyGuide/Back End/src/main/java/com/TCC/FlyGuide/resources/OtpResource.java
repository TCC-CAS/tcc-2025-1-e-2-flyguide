package com.TCC.FlyGuide.resources;

import com.TCC.FlyGuide.DTO.ResetSenhaDTO;
import com.TCC.FlyGuide.DTO.SolicitarOtpDTO;
import com.TCC.FlyGuide.services.OtpService;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/senha")
public class OtpResource {

    @Autowired
    private OtpService otpService;

    @PostMapping("/solicitar")
    public ResponseEntity<?> solicitar(@RequestBody SolicitarOtpDTO req) {
        try {
            otpService.solicitarResetSenha(req.getEmail());
            return ResponseEntity.ok(Map.of("message", "Código enviado para o e-mail informado"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/resetar")
    public ResponseEntity<?> resetar(@RequestBody ResetSenhaDTO req) {
        try {
            otpService.resetarSenha(req.getEmail(), req.getCodigo(), req.getNovaSenha());
            return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }
}