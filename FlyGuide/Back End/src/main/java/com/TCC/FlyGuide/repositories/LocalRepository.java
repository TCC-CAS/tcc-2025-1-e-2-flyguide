package com.TCC.FlyGuide.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.Local;

public interface LocalRepository extends JpaRepository<Local, Long> {

    Optional<Local> findByPlaceId(String placeId);

    boolean existsByPlaceId(String placeId);
}