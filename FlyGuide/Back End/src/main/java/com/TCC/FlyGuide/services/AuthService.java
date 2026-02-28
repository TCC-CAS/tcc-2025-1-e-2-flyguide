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
        User user = (User) userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new UnauthorizedException("login ou senha invalida"));

        if (!passwordEncoder.matches(req.getSenha(), user.getSenha())) {
            throw new UnauthorizedException("login ou senha invalida");
        }

    }
}
