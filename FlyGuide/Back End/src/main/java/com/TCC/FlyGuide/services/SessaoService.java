package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.Sessao;
import com.TCC.FlyGuide.repositories.SessaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SessaoService {

    @Autowired
    private SessaoRepository sessaoRepository;

    public void salvar(String token, Long userId, LocalDateTime dataExpiracao) {
        sessaoRepository.save(new Sessao(token, userId, dataExpiracao));
    }

    public void invalidar(String token) {
        sessaoRepository.findByToken(token).ifPresent(s -> {
            s.setAtivo(false);
            sessaoRepository.save(s);
        });
    }

    public boolean isAtiva(String token) {
        return sessaoRepository.findByToken(token)
                .map(s -> s.isAtivo() && s.getDataExpiracao().isAfter(LocalDateTime.now()))
                .orElse(false);
    }
}