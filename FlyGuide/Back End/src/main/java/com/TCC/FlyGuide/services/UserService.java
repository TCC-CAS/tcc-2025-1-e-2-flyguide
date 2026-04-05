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
import com.TCC.FlyGuide.DTO.AtualizarUsuarioDTO;

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
        validarSenhaForte(dto.getSenha());
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
        validarSenhaForte(dto.getSenha());
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

    @Transactional
    public void delete(Long id) {
        try {
            if (pessoaFisicaRepository.existsById(id)) {
                pessoaFisicaRepository.deleteById(id);
            }
            if (pessoaJuridicaRepository.existsById(id)) {
                pessoaJuridicaRepository.deleteById(id);
            }
            userRepository.deleteById(id);

            userRepository.flush();

        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }

    public User update(Long id, AtualizarUsuarioDTO dto) {
        try {
            User entity = userRepository.getReferenceById(id);
            updateData(entity, dto);
            return userRepository.save(entity);
        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(User entity, AtualizarUsuarioDTO dto) {
        entity.setCep(dto.getCep());
        entity.setEndereco(dto.getEndereco());
        entity.setCidade(dto.getCidade());
        entity.setPais(dto.getPais());
        entity.setTipoConta(dto.getTipoConta());
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

    @Transactional
    public void updatePF(Long idUsuario, AtualizarPessoaFisicaDTO dto) {

        User user = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        if (!"PF".equalsIgnoreCase(user.getTipoPessoa())) {
            throw new DatabaseException("Este usuário não é do tipo PF.");
        }

        // tb_user (endereço)
        if (dto.getCep() != null) user.setCep(dto.getCep());
        if (dto.getEndereco() != null) user.setEndereco(dto.getEndereco());
        if (dto.getCidade() != null) user.setCidade(dto.getCidade());
        if (dto.getPais() != null) user.setPais(dto.getPais());

        userRepository.save(user);

        // tb_pessoa_fisica (nome)
        PessoaFisica pf = pessoaFisicaRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Pessoa Física não encontrada para o usuário " + idUsuario));

        if (dto.getPrimeiroNome() != null) pf.setPrimeiroNome(dto.getPrimeiroNome());
        if (dto.getUltimoNome() != null) pf.setUltimoNome(dto.getUltimoNome());

        pessoaFisicaRepository.save(pf);
    }

    @Transactional
    public void updatePJ(Long idUsuario, AtualizarPessoaJuridicaDTO dto) {

        User user = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        if (!"PJ".equalsIgnoreCase(user.getTipoPessoa())) {
            throw new DatabaseException("Este usuário não é do tipo PJ.");
        }

        // tb_user (endereço)
        if (dto.getCep() != null) user.setCep(dto.getCep());
        if (dto.getEndereco() != null) user.setEndereco(dto.getEndereco());
        if (dto.getCidade() != null) user.setCidade(dto.getCidade());
        if (dto.getPais() != null) user.setPais(dto.getPais());

        userRepository.save(user);

        // tb_pessoa_juridica
        PessoaJuridica pj = pessoaJuridicaRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Pessoa Jurídica não encontrada para o usuário " + idUsuario));

        if (dto.getRazaoSocial() != null) pj.setRazaoSocial(dto.getRazaoSocial());
        if (dto.getNomeFantasia() != null) pj.setNomeFantasia(dto.getNomeFantasia());

        pessoaJuridicaRepository.save(pj);
    }

    private static final String REGEX_SENHA_FORTE = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$";

    private void validarSenhaForte(String senha) {
        if (senha == null || !senha.matches(REGEX_SENHA_FORTE)) {
            throw new DatabaseException(
                    "Senha inválida. Deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 caractere especial."
            );
        }
    }
}