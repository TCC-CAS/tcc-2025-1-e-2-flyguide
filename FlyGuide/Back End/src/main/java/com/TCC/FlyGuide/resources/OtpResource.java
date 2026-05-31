package com.TCC.FlyGuide.resources;

import com.TCC.FlyGuide.DTO.ResetSenhaDTO;
import com.TCC.FlyGuide.DTO.SolicitarOtpDTO;
import com.TCC.FlyGuide.services.OtpService;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/senha")
public class OtpResource {

    private static final Logger logger = LoggerFactory.getLogger(OtpResource.class);

    @Autowired
    private OtpService otpService;

    @PostMapping("/solicitar")
    public ResponseEntity<?> solicitar(@RequestBody SolicitarOtpDTO req) {
        try {
            otpService.solicitarResetSenha(req.getEmail());
            return ResponseEntity.ok(Map.of("message", "Codigo enviado para o e-mail informado"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("[OTP] Falha ao enviar OTP de recuperacao para: {} | Erro: {}", req.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Nao foi possivel enviar o e-mail de verificacao. Tente novamente em instantes."));
        }
    }

    @PostMapping("/resetar")
    public ResponseEntity<?> resetar(@RequestBody ResetSenhaDTO req) {
        try {
            otpService.resetarSenha(req.getEmail(), req.getCodigo(), req.getNovaSenha());
            return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
