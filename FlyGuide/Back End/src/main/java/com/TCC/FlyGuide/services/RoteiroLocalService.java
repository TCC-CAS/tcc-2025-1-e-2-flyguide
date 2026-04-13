package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.entities.Local;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroLocal;
import com.TCC.FlyGuide.repositories.LocalRepository;
import com.TCC.FlyGuide.repositories.RoteiroLocalRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.services.exceptions.DatabaseException;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

@Service
public class RoteiroLocalService {

    @Autowired
    private RoteiroLocalRepository roteiroLocalRepository;

    @Autowired
    private RoteiroRepository roteiroRepository;

    @Autowired
    private LocalRepository localRepository;

    public List<RoteiroLocalDTO> findByRoteiro(Long idRoteiro) {
        roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        List<RoteiroLocal> list = roteiroLocalRepository.findByRoteiro_IdRoteiro(idRoteiro);
        return list.stream().map(RoteiroLocalDTO::new).collect(Collectors.toList());
    }

    public RoteiroLocalDTO insert(Long idRoteiro, RoteiroLocalDTO dto, Long idUsuarioLogado) {
        if (dto.getIdLocal() == null) {
            throw new DatabaseException("idLocal é obrigatório para vincular um Local ao Roteiro.");
        }

        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        if (!roteiro.getUsuario().getIdUsuario().equals(idUsuarioLogado)) {
            throw new UnauthorizedException("Você não tem permissão para modificar este roteiro.");
        }

        Local local = localRepository.findById(dto.getIdLocal())
                .orElseThrow(() -> new ResourceNotFoundException(dto.getIdLocal()));

        long totalLocais = roteiroLocalRepository.countByRoteiro_IdRoteiro(idRoteiro);
        if (totalLocais >= 15) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limite de 15 locais por roteiro atingido.");
        }

        boolean jaExiste = roteiroLocalRepository
                .existsByRoteiro_IdRoteiroAndLocal_IdLocal(idRoteiro, dto.getIdLocal());

        if (jaExiste) {
            throw new DatabaseException("Este Local já está vinculado a este Roteiro.");
        }

        RoteiroLocal entity = new RoteiroLocal();
        entity.setRoteiro(roteiro);
        entity.setLocal(local);
        entity.setStatus(dto.getStatus());
        entity.setObservacoes(dto.getObservacoes());
        entity.setDia(dto.getDia());
        entity.setOrdem(dto.getOrdem());
        entity.setHorario(dto.getHorario());
        entity.setCriadoEm(LocalDateTime.now());

        entity = roteiroLocalRepository.save(entity);
        return new RoteiroLocalDTO(entity);
    }

    public RoteiroLocalDTO update(Long idRoteiro, Long idLocal, RoteiroLocalDTO dto, Long idUsuarioLogado) {
        RoteiroLocal entity = roteiroLocalRepository
                .findByRoteiro_IdRoteiroAndLocal_IdLocal(idRoteiro, idLocal)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vínculo não encontrado para idRoteiro=" + idRoteiro + " e idLocal=" + idLocal));

        if (!entity.getRoteiro().getUsuario().getIdUsuario().equals(idUsuarioLogado)) {
            throw new UnauthorizedException("Você não tem permissão para modificar este roteiro.");
        }

        entity.setStatus(dto.getStatus());
        entity.setObservacoes(dto.getObservacoes());
        entity.setDia(dto.getDia());
        entity.setOrdem(dto.getOrdem());
        entity.setHorario(dto.getHorario());

        entity = roteiroLocalRepository.save(entity);
        return new RoteiroLocalDTO(entity);
    }

    public void delete(Long idRoteiro, Long idLocal, Long idUsuarioLogado) {
        try {
            RoteiroLocal entity = roteiroLocalRepository
                    .findByRoteiro_IdRoteiroAndLocal_IdLocal(idRoteiro, idLocal)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Vínculo não encontrado para idRoteiro=" + idRoteiro + " e idLocal=" + idLocal));

            if (!entity.getRoteiro().getUsuario().getIdUsuario().equals(idUsuarioLogado)) {
                throw new UnauthorizedException("Você não tem permissão para modificar este roteiro.");
            }

            roteiroLocalRepository.delete(entity);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException(e.getMessage());
        }
    }
}
