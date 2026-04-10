package com.TCC.FlyGuide.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.entities.RoteiroLocal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoteiroLocalRepository extends JpaRepository<RoteiroLocal, Long> {

    List<RoteiroLocal> findByRoteiro_IdRoteiro(Long idRoteiro);

    @Transactional
    void deleteByRoteiro_IdRoteiro(Long idRoteiro);

    boolean existsByRoteiro_IdRoteiroAndLocal_IdLocal(Long idRoteiro, Long idLocal);

    Optional<RoteiroLocal> findByRoteiro_IdRoteiroAndLocal_IdLocal(Long idRoteiro, Long idLocal);

    @Query("SELECT rl FROM RoteiroLocal rl JOIN FETCH rl.local WHERE rl.roteiro.idRoteiro = :idRoteiro")
    List<RoteiroLocal> buscarPorRoteiroComLocal(@Param("idRoteiro") Long idRoteiro);
}