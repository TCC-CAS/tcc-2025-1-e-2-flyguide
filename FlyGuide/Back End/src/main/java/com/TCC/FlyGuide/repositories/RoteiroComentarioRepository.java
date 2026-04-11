package com.TCC.FlyGuide.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.entities.RoteiroComentario;

public interface RoteiroComentarioRepository extends JpaRepository<RoteiroComentario, Long> {

    List<RoteiroComentario> findByRoteiro_IdRoteiroOrderByCriadoEmDesc(Long idRoteiro);

    long countByRoteiro_IdRoteiro(Long idRoteiro);

    @Modifying
    @Transactional
    void deleteByRoteiro_IdRoteiro(Long idRoteiro);
}
