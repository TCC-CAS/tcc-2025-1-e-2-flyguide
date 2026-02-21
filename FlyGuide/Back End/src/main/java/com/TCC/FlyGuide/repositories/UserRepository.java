package com.TCC.FlyGuide.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

}
