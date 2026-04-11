package com.TCC.FlyGuide.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.RoteiroLike;

public interface RoteiroLikeRepository extends JpaRepository<RoteiroLike, Long> {

    long countByRoteiro_IdRoteiro(Long idRoteiro);

    boolean existsByRoteiro_IdRoteiroAndUsuario_IdUsuario(Long idRoteiro, Long idUsuario);

    void deleteByRoteiro_IdRoteiroAndUsuario_IdUsuario(Long idRoteiro, Long idUsuario);

    void deleteByRoteiro_IdRoteiro(Long idRoteiro);
}
