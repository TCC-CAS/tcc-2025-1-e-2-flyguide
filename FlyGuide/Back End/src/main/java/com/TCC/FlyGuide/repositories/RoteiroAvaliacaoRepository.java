package com.TCC.FlyGuide.repositories;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.TCC.FlyGuide.entities.RoteiroAvaliacao;

public interface RoteiroAvaliacaoRepository extends JpaRepository<RoteiroAvaliacao, Long> {

    Optional<RoteiroAvaliacao> findByRoteiro_IdRoteiroAndUsuario_IdUsuario(Long idRoteiro, Long idUsuario);

    @Query("SELECT AVG(a.nota) FROM RoteiroAvaliacao a WHERE a.roteiro.idRoteiro = :idRoteiro")
    Double mediaByRoteiro(@Param("idRoteiro") Long idRoteiro);

    @Query("SELECT COUNT(a) FROM RoteiroAvaliacao a WHERE a.roteiro.idRoteiro = :idRoteiro")
    Long totalByRoteiro(@Param("idRoteiro") Long idRoteiro);

    void deleteByRoteiro_IdRoteiro(Long idRoteiro);
}