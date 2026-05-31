package com.TCC.FlyGuide.repositories;

import com.TCC.FlyGuide.entities.Sessao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessaoRepository extends JpaRepository<Sessao, Long> {
    Optional<Sessao> findByToken(String token);
}