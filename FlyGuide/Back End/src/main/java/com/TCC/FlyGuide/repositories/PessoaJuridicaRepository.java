package com.TCC.FlyGuide.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.TCC.FlyGuide.entities.PessoaJuridica;

public interface PessoaJuridicaRepository extends JpaRepository<PessoaJuridica, Long> {

    Optional<PessoaJuridica> findByCnpj(String cnpj);

    boolean existsByCnpj(String cnpj);

    boolean existsByIe(String ie);
}