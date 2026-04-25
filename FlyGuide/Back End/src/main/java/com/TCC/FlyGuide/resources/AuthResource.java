package com.TCC.FlyGuide.resources;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.DTO.LoginResponseDTO;
import com.TCC.FlyGuide.DTO.VerificarLoginDTO;
import com.TCC.FlyGuide.services.AuthService;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@RestController
@RequestMapping("/auth")
public class AuthResource {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO req) {
        try {
            authService.login(req);
            return ResponseEntity.ok(Map.of("message", "Codigo de acesso enviado para o seu e-mail"));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body(Map.of("message", "login ou senha invalida"));
        }
    }

    @PostMapping("/login/verificar")
    public ResponseEntity<?> verificarLogin(@RequestBody VerificarLoginDTO req) {
        try {
            LoginResponseDTO response = authService.verificarLogin(req.getEmail(), req.getCodigo());
            return ResponseEntity.ok(response);
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            authService.logout(header.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Logout realizado com sucesso"));
    }
}