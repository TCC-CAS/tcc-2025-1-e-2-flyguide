package com.TCC.FlyGuide.repositories;

import com.TCC.FlyGuide.entities.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findTopByEmailAndTipoAndUsadoFalseOrderByExpiracaoDesc(String email, String tipo);
}