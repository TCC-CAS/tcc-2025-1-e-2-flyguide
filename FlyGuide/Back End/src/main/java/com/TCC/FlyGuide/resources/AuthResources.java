package com.TCC.FlyGuide.resources;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.services.AuthService;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@RestController
@RequestMapping("/auth")
public class AuthResources {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequestDTO req) {
        try {
            authService.login(req);
            return ResponseEntity.ok(Map.of("message", "usuario logado com sucesso"));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body(Map.of("message", "login ou senha invalida"));
        }
    }
}
