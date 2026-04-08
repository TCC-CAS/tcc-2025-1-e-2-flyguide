package com.TCC.FlyGuide.resources;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.DTO.LoginResponseDTO;
import com.TCC.FlyGuide.services.AuthService;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@RestController
@RequestMapping("/auth")
public class AuthResource {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO req) {
        try {
            LoginResponseDTO response = authService.login(req);
            return ResponseEntity.ok(response);
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body(Map.of("message", "login ou senha invalida"));
        }
    }
}