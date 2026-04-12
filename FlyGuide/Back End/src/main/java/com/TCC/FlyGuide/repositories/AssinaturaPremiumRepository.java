package com.TCC.FlyGuide.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.AssinaturaPremium;

public interface AssinaturaPremiumRepository extends JpaRepository<AssinaturaPremium, Long> {

    Optional<AssinaturaPremium> findByUsuario_IdUsuario(Long idUsuario);

    Optional<AssinaturaPremium> findByAsaasSubscriptionId(String asaasSubscriptionId);
}
