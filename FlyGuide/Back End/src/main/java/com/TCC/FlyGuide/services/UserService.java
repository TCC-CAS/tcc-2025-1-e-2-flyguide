package com.TCC.FlyGuide.services;

import java.time.LocalDate;

import com.TCC.FlyGuide.DTO.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.entities.PessoaFisica;
import com.TCC.FlyGuide.entities.PessoaJuridica;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public User cadastrarPessoaFisica(CadastroPessoaFisicaDTO dto) {

        String email = normalizarEmail(dto.getEmail());
        String cpf = normalizarDocumento(dto.getCpf());

        if (email != null && userRepository.existsByEmail(email)) {
            throw new DatabaseException("E-mail já cadastrado.");
        }

        if (cpf != null && pessoaFisicaRepository.existsByCpf(cpf)) {
            throw new DatabaseException("CPF já cadastrado.");
        }

        User user = new User();
        user.setTipoPessoa("PF");
        user.setEmail(email);
        user.setSenha(passwordEncoder.encode(dto.getSenha()));
        user.setCep(dto.getCep());
        user.setEndereco(dto.getEndereco());
        user.setCidade(dto.getCidade());
        user.setPais(dto.getPais());
        user.setTipoConta(dto.getTipoConta());
        user.setDataCadastro(LocalDate.now());

        user = userRepository.save(user);

        PessoaFisica pf = new PessoaFisica();
        pf.setUsuario(user); // @MapsId usa o id do user
        pf.setPrimeiroNome(dto.getPrimeiroNome());
        pf.setUltimoNome(dto.getUltimoNome());
        pf.setCpf(cpf);

        pessoaFisicaRepository.save(pf);

        return user;
    }

    @Transactional
    public User cadastrarPessoaJuridica(CadastroPessoaJuridicaDTO dto) {

        String email = normalizarEmail(dto.getEmail());
        String cnpj = normalizarDocumento(dto.getCnpj());

        if (email != null && userRepository.existsByEmail(email)) {
            throw new DatabaseException("E-mail já cadastrado.");
        }

        if (cnpj != null && pessoaJuridicaRepository.existsByCnpj(cnpj)) {
            throw new DatabaseException("CNPJ já cadastrado.");
        }

        User user = new User();
        user.setTipoPessoa("PJ");
        user.setEmail(email);
        user.setSenha(passwordEncoder.encode(dto.getSenha()));
        user.setCep(dto.getCep());
        user.setEndereco(dto.getEndereco());
        user.setCidade(dto.getCidade());
        user.setPais(dto.getPais());
        user.setTipoConta(dto.getTipoConta());
        user.setDataCadastro(LocalDate.now());

        user = userRepository.save(user);

        PessoaJuridica pj = new PessoaJuridica();
        pj.setUsuario(user); // @MapsId usa o id do user
        pj.setCnpj(cnpj);
        pj.setRazaoSocial(dto.getRazaoSocial());
        pj.setNomeFantasia(dto.getNomeFantasia());

        pessoaJuridicaRepository.save(pj);

        return user;
    }

    // ===== CRUD do User (Conta) =====
    public java.util.List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException(id));
    }

    public void delete(Long id) {
        try {
            userRepository.deleteById(id);
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }

    public User update(Long id, User obj) {
        try {
            User entity = userRepository.getReferenceById(id);
            updateData(entity, obj);
            return userRepository.save(entity);
        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(User entity, User obj) {
        entity.setCep(obj.getCep());
        entity.setEndereco(obj.getEndereco());
        entity.setCidade(obj.getCidade());
        entity.setPais(obj.getPais());
        entity.setTipoConta(obj.getTipoConta());

        // só troca senha se vier uma nova
        if (obj.getSenha() != null && !obj.getSenha().isBlank()) {
            entity.setSenha(passwordEncoder.encode(obj.getSenha()));
        }
    }

    private String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String normalizarDocumento(String doc) {
        return doc == null ? null : doc.replaceAll("\\D", "");
    }

    public UserCompleteDTO findCompletoById(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(id));

        PessoaFisica pf = pessoaFisicaRepository.findById(id).orElse(null);
        PessoaJuridica pj = pessoaJuridicaRepository.findById(id).orElse(null);

        return new UserCompleteDTO(
                pf != null ? new PessoaFisicaDTO(pf) : null,
                pj != null ? new PessoaJuridicaDTO(pj) : null,
                new UserDTO(user)
        );
    }
}