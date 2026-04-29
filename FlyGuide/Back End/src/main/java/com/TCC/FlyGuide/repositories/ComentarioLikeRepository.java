package com.TCC.FlyGuide.repositories;

import com.TCC.FlyGuide.entities.ComentarioLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface ComentarioLikeRepository extends JpaRepository<ComentarioLike, Long> {

    long countByAvaliacao_IdAvaliacao(Long idAvaliacao);

    boolean existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(Long idAvaliacao, Long idUsuario);

    @Modifying
    @Transactional
    void deleteByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(Long idAvaliacao, Long idUsuario);

    @Modifying
    @Transactional
    void deleteByAvaliacao_IdAvaliacao(Long idAvaliacao);

    @Modifying
    @Transactional
    void deleteByAvaliacao_Roteiro_IdRoteiro(Long idRoteiro);
}
