package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.TCC.FlyGuide.DTO.LoginRequestDTO;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public void login(LoginRequestDTO req) {

        String email = req.getEmail() == null ? null : req.getEmail().trim().toLowerCase();
        String senha = req.getSenha();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("login ou senha invalida"));

        // evita NPE e também bloqueia contas antigas com senha nula
        if (user.getSenha() == null || senha == null) {
            throw new UnauthorizedException("login ou senha invalida");
        }

        if (!passwordEncoder.matches(senha, user.getSenha())) {
            throw new UnauthorizedException("login ou senha invalida");
        }
    }
}
