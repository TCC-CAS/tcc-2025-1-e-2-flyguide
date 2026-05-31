package com.TCC.FlyGuide.repositories;

import com.TCC.FlyGuide.entities.Imagem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ImagemRepository extends JpaRepository<Imagem, Long> {
    Optional<Imagem> findByChave(String chave);
}