package com.TCC.FlyGuide.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.PessoaFisica;

public interface PessoaFisicaRepository extends JpaRepository<PessoaFisica, Long> {

    Optional<PessoaFisica> findByCpf(String cpf);

    boolean existsByCpf(String cpf);
}