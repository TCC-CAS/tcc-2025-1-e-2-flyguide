package com.TCC.FlyGuide.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class UserService {

    @Autowired
    private UserRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;


    public List<User> findAll() {
        return repository.findAll();
    }

    public User findById(Long id) {
        Optional<User> obj = repository.findById(id);
        return obj.orElseThrow(() -> new ResourceNotFoundException(id));
    }

    public User insert(User obj) {
        obj.setSenha(passwordEncoder.encode(obj.getSenha())); // hash aqui
        return repository.save(obj);
    }

    public void delete(Long id) {
        try {
            repository.deleteById(id);
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }

    public User update(Long id, User obj) {
        try {
            User entity = repository.getReferenceById(id);
            updateData(entity, obj);
            return repository.save(entity);
        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(User entity, User obj) {
        entity.setPrimeiroNome(obj.getPrimeiroNome());
        entity.setUltimoNome(obj.getUltimoNome());
        entity.setEmail(obj.getEmail());

        entity.setCep(obj.getCep());
        entity.setEndereco(obj.getEndereco());
        entity.setCidade(obj.getCidade());
        entity.setPais(obj.getPais());

        entity.setDataCadastro(obj.getDataCadastro());
        entity.setTipoConta(obj.getTipoConta());

        // só troca senha se vier uma nova
        if (obj.getSenha() != null && !obj.getSenha().isBlank()) {
            entity.setSenha(passwordEncoder.encode(obj.getSenha()));
        }
    }

}
