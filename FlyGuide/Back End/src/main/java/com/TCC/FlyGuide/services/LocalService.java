package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;

import com.TCC.FlyGuide.DTO.LocalDTO;
import com.TCC.FlyGuide.entities.Local;
import com.TCC.FlyGuide.repositories.LocalRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class LocalService {

    @Autowired
    private LocalRepository repository;

    public List<LocalDTO> findAll() {
        List<Local> list = repository.findAll();
        return list.stream().map(LocalDTO::new).collect(Collectors.toList());
    }

    public LocalDTO findById(Long id) {
        Optional<Local> obj = repository.findById(id);
        Local entity = obj.orElseThrow(() -> new ResourceNotFoundException(id));
        return new LocalDTO(entity);
    }

    public LocalDTO findByPlaceId(String placeId) {
        Local entity = repository.findByPlaceId(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("Local não encontrado para placeId: " + placeId));
        return new LocalDTO(entity);
    }

    /**
     * Salva/atualiza um Local baseado no placeId.
     * - Se já existir no banco (mesmo placeId), atualiza os dados "cache" e retorna.
     * - Se não existir, cria um novo.
     */
    public LocalDTO insert(LocalDTO dto) {
        if (dto.getPlaceId() == null || dto.getPlaceId().isBlank()) {
            throw new DatabaseException("placeId é obrigatório para salvar um Local.");
        }

        Local entity = repository.findByPlaceId(dto.getPlaceId()).orElse(null);

        if (entity == null) {
            entity = new Local();
            entity.setPlaceId(dto.getPlaceId());
        }

        updateData(entity, dto);

        // marca atualização (cache)
        entity.setAtualizadoEm(LocalDateTime.now());

        entity = repository.save(entity);
        return new LocalDTO(entity);
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

    public LocalDTO update(Long id, LocalDTO dto) {
        try {
            Local entity = repository.getReferenceById(id);

            // placeId não deve mudar no update (é o identificador do Google)
            updateData(entity, dto);

            entity.setAtualizadoEm(LocalDateTime.now());

            entity = repository.save(entity);
            return new LocalDTO(entity);

        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(Local entity, LocalDTO dto) {
        entity.setNome(dto.getNome());
        entity.setEndereco(dto.getEndereco());
        entity.setTipo(dto.getTipo());
        entity.setLatitude(dto.getLatitude());
        entity.setLongitude(dto.getLongitude());
        // atualizadoEm é controlado pelo service (LocalDateTime.now())
    }
}