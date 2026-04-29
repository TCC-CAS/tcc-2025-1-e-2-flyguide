package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.entities.ComentarioLike;
import com.TCC.FlyGuide.entities.RoteiroAvaliacao;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.ComentarioLikeRepository;
import com.TCC.FlyGuide.repositories.RoteiroAvaliacaoRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ComentarioLikeService {

    @Autowired
    private ComentarioLikeRepository likeRepository;

    @Autowired
    private RoteiroAvaliacaoRepository avaliacaoRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public void like(Long idAvaliacao, Long idUsuario) {
        if (likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(idAvaliacao, idUsuario)) {
            return;
        }

        RoteiroAvaliacao avaliacao = avaliacaoRepository.findById(idAvaliacao)
                .orElseThrow(() -> new ResourceNotFoundException(idAvaliacao));

        User usuario = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        likeRepository.save(new ComentarioLike(avaliacao, usuario, LocalDateTime.now()));
    }

    @Transactional
    public void unlike(Long idAvaliacao, Long idUsuario) {
        likeRepository.deleteByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(idAvaliacao, idUsuario);
    }

    public boolean jaCurtiu(Long idAvaliacao, Long idUsuario) {
        return likeRepository.existsByAvaliacao_IdAvaliacaoAndUsuario_IdUsuario(idAvaliacao, idUsuario);
    }

    public long countLikes(Long idAvaliacao) {
        return likeRepository.countByAvaliacao_IdAvaliacao(idAvaliacao);
    }
}
