package com.TCC.FlyGuide.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.User;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByTipoContaIgnoreCaseAndDataExpiracaoTrialBefore(String tipoConta, LocalDate data);
}
