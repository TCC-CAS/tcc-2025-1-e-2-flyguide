package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroAvaliacao;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.RoteiroAvaliacaoRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

@Service
public class RoteiroAvaliacaoService {

    @Autowired private RoteiroAvaliacaoRepository avaliacaoRepository;
    @Autowired private RoteiroRepository roteiroRepository;
    @Autowired private UserRepository userRepository;

    @Transactional
    public void avaliar(Long idRoteiro, Long idUsuario, Integer nota) {
        if (nota < 1 || nota > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nota deve ser entre 1 e 5.");
        }

        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));
        User usuario = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        Optional<RoteiroAvaliacao> existente =
                avaliacaoRepository.findByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario);

        RoteiroAvaliacao avaliacao = existente.orElseGet(RoteiroAvaliacao::new);
        avaliacao.setRoteiro(roteiro);
        avaliacao.setUsuario(usuario);
        avaliacao.setNota(nota);

        if (avaliacao.getCriadoEm() == null) avaliacao.setCriadoEm(LocalDateTime.now());
        avaliacao.setAtualizadoEm(LocalDateTime.now());

        avaliacaoRepository.save(avaliacao);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMedia(Long idRoteiro) {
        Double media = avaliacaoRepository.mediaByRoteiro(idRoteiro);
        Long total   = avaliacaoRepository.totalByRoteiro(idRoteiro);
        return Map.of(
                "media", media != null ? Math.round(media * 10.0) / 10.0 : 0.0,
                "total", total != null ? total : 0L
        );
    }

    @Transactional(readOnly = true)
    public Integer getNotaUsuario(Long idRoteiro, Long idUsuario) {
        return avaliacaoRepository
                .findByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario)
                .map(RoteiroAvaliacao::getNota)
                .orElse(0);
    }
}