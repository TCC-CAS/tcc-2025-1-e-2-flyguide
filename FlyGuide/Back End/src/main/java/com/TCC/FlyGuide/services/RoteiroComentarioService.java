package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.TCC.FlyGuide.DTO.RoteiroComentarioDTO;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroComentario;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.RoteiroComentarioRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

@Service
public class RoteiroComentarioService {

    @Autowired
    private RoteiroComentarioRepository comentarioRepository;

    @Autowired
    private RoteiroRepository roteiroRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlacklistService blacklistService;

    @Autowired
    private PerspectiveService perspectiveService;

    @Autowired
    private PessoaFisicaRepository pessoaFisicaRepository;

    @Autowired
    private PessoaJuridicaRepository pessoaJuridicaRepository;

    private String resolverNome(User user) {
        if (user == null) return "Usuário";
        if ("PF".equals(user.getTipoPessoa())) {
            return pessoaFisicaRepository.findById(user.getIdUsuario())
                    .map(pf -> (pf.getPrimeiroNome() + " " + pf.getUltimoNome()).trim())
                    .orElse(user.getEmail());
        } else {
            return pessoaJuridicaRepository.findById(user.getIdUsuario())
                    .map(pj -> pj.getNomeFantasia() != null && !pj.getNomeFantasia().isBlank()
                            ? pj.getNomeFantasia() : pj.getRazaoSocial())
                    .orElse(user.getEmail());
        }
    }

    @Transactional(readOnly = true)
    public List<RoteiroComentarioDTO> findByRoteiro(Long idRoteiro) {
        return comentarioRepository
                .findByRoteiro_IdRoteiroOrderByCriadoEmDesc(idRoteiro)
                .stream()
                .map(c -> {
                    RoteiroComentarioDTO dto = new RoteiroComentarioDTO(c);
                    dto.setNomeExibicao(resolverNome(c.getUsuario()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public RoteiroComentarioDTO insert(Long idRoteiro, RoteiroComentarioDTO dto) {
        String texto = dto.getTexto();

        if (texto == null || texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O comentário não pode estar vazio.");
        }

        // 1ª barreira: blacklist local
        if (blacklistService.contemPalavraProibida(texto)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Comentário contém linguagem inapropriada.");
        }

        // 2ª barreira: Perspective API
        if (perspectiveService.ehToxico(texto)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Comentário contém linguagem inapropriada.");
        }

        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        User usuario = userRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException(dto.getIdUsuario()));

        RoteiroComentario entity = new RoteiroComentario(roteiro, usuario, texto, LocalDateTime.now());
        entity = comentarioRepository.save(entity);

        RoteiroComentarioDTO result = new RoteiroComentarioDTO(entity);
        result.setNomeExibicao(resolverNome(usuario));
        return result;
    }

    @Transactional
    public RoteiroComentarioDTO update(Long idRoteiro, Long idComentario, RoteiroComentarioDTO dto) {
        String texto = dto.getTexto();

        if (texto == null || texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O comentário não pode estar vazio.");
        }

        if (blacklistService.contemPalavraProibida(texto)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Comentário contém linguagem inapropriada.");
        }

        if (perspectiveService.ehToxico(texto)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Comentário contém linguagem inapropriada.");
        }

        RoteiroComentario entity = comentarioRepository.findById(idComentario)
                .orElseThrow(() -> new ResourceNotFoundException(idComentario));

        entity.setTexto(texto);
        entity.setEditadoEm(LocalDateTime.now());
        entity = comentarioRepository.save(entity);

        RoteiroComentarioDTO result = new RoteiroComentarioDTO(entity);
        result.setNomeExibicao(resolverNome(entity.getUsuario()));
        return result;
    }

    @Transactional
    public void delete(Long idComentario) {
        if (!comentarioRepository.existsById(idComentario)) {
            throw new ResourceNotFoundException(idComentario);
        }
        comentarioRepository.deleteById(idComentario);
    }
}
