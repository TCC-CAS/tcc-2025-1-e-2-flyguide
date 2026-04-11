package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroLike;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.RoteiroLikeRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

@Service
public class RoteiroLikeService {

    @Autowired
    private RoteiroLikeRepository likeRepository;

    @Autowired
    private RoteiroRepository roteiroRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public void like(Long idRoteiro, Long idUsuario) {
        if (likeRepository.existsByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario)) {
            return; // já curtiu, ignora silenciosamente
        }

        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        User usuario = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        likeRepository.save(new RoteiroLike(roteiro, usuario, LocalDateTime.now()));
    }

    @Transactional
    public void unlike(Long idRoteiro, Long idUsuario) {
        likeRepository.deleteByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario);
    }

    public boolean jaCurtiu(Long idRoteiro, Long idUsuario) {
        return likeRepository.existsByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario);
    }

    public long countLikes(Long idRoteiro) {
        return likeRepository.countByRoteiro_IdRoteiro(idRoteiro);
    }
}
