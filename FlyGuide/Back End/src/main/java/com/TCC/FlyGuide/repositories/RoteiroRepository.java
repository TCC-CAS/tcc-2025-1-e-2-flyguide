package com.TCC.FlyGuide.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.Roteiro;

public interface RoteiroRepository extends JpaRepository<Roteiro, Long> {

    List<Roteiro> findByUsuario_IdUsuario(Long idUsuario);
}