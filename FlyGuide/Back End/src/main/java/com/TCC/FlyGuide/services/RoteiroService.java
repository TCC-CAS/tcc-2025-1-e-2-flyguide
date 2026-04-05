package com.TCC.FlyGuide.services;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;
import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.entities.RoteiroLocal;
import com.TCC.FlyGuide.repositories.RoteiroLocalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.DTO.RoteiroDTO;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class RoteiroService {

    @Autowired
    private RoteiroRepository roteiroRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoteiroLocalRepository roteiroLocalRepository;

    public List<RoteiroDTO> findAll() {
        List<Roteiro> list = roteiroRepository.findAll();
        return list.stream().map(RoteiroDTO::new).collect(Collectors.toList());
    }

    public RoteiroDTO findById(Long id) {
        Optional<Roteiro> obj = roteiroRepository.findById(id);
        Roteiro entity = obj.orElseThrow(() -> new ResourceNotFoundException(id));
        return new RoteiroDTO(entity);
    }

    // "Meus Roteiros"
    public List<RoteiroDTO> findByUsuario(Long idUsuario) {
        List<Roteiro> list = roteiroRepository.findByUsuario_IdUsuario(idUsuario);
        return list.stream().map(RoteiroDTO::new).collect(Collectors.toList());
    }

    public RoteiroDTO insert(RoteiroDTO dto) {
        // valida usuário dono
        User usuario = userRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException(dto.getIdUsuario()));

        Roteiro entity = new Roteiro();
        entity.setUsuario(usuario);
        updateData(entity, dto);

        entity = roteiroRepository.save(entity);
        return new RoteiroDTO(entity);
    }

    public void delete(Long id) {
        try {
            roteiroRepository.deleteById(id);
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }

    public RoteiroDTO update(Long id, RoteiroDTO dto) {
        try {
            Roteiro entity = roteiroRepository.getReferenceById(id);

            // Não troca o dono no update (mesmo que venha idUsuario)
            updateData(entity, dto);

            entity = roteiroRepository.save(entity);
            return new RoteiroDTO(entity);

        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(Roteiro entity, RoteiroDTO dto) {
        entity.setTitulo(dto.getTitulo());
        entity.setCidade(dto.getCidade());
        entity.setTipoRoteiro(dto.getTipoRoteiro());
        entity.setStatusRoteiro(dto.getStatusRoteiro());
        entity.setVisibilidadeRoteiro(dto.getVisibilidadeRoteiro());
        entity.setDataInicio(dto.getDataInicio());
        entity.setDataFim(dto.getDataFim());
        entity.setObservacoes(dto.getObservacoes());
        entity.setDiasTotais(dto.getDiasTotais());
        entity.setOrcamento(dto.getOrcamento());
    }

    @Transactional(readOnly = true)
    public RoteiroCompletoDTO findCompletoById(Long idRoteiro) {

        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        List<RoteiroLocal> vinculos = roteiroLocalRepository.buscarPorRoteiroComLocal(idRoteiro);

        List<RoteiroLocalDTO> locaisDTO = vinculos.stream()
                .map(RoteiroLocalDTO::new)
                .collect(Collectors.toList());

        return new RoteiroCompletoDTO(new RoteiroDTO(roteiro), locaisDTO);
    }

}