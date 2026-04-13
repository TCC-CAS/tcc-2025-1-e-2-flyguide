package com.TCC.FlyGuide.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.TCC.FlyGuide.DTO.RoteiroAvaliacaoDTO;
import com.TCC.FlyGuide.entities.Roteiro;
import com.TCC.FlyGuide.entities.RoteiroAvaliacao;
import com.TCC.FlyGuide.entities.User;
import com.TCC.FlyGuide.repositories.ComentarioLikeRepository;
import com.TCC.FlyGuide.repositories.PessoaFisicaRepository;
import com.TCC.FlyGuide.repositories.PessoaJuridicaRepository;
import com.TCC.FlyGuide.repositories.RoteiroAvaliacaoRepository;
import com.TCC.FlyGuide.repositories.RoteiroRepository;
import com.TCC.FlyGuide.repositories.UserRepository;
import com.TCC.FlyGuide.services.exceptions.ResourceNotFoundException;

@Service
public class RoteiroAvaliacaoService {

    @Autowired private RoteiroAvaliacaoRepository avaliacaoRepository;
    @Autowired private RoteiroRepository roteiroRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ComentarioLikeRepository likeRepository;
    @Autowired private BlacklistService blacklistService;
    @Autowired private PerspectiveService perspectiveService;
    @Autowired private PessoaFisicaRepository pessoaFisicaRepository;
    @Autowired private PessoaJuridicaRepository pessoaJuridicaRepository;

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

    @Transactional
    public RoteiroAvaliacaoDTO avaliar(Long idRoteiro, Long idUsuario, Integer nota, String texto) {
        if (nota == null || nota < 1 || nota > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nota deve ser entre 1 e 5.");
        }

        if (texto != null && !texto.isBlank()) {
            if (blacklistService.contemPalavraProibida(texto)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Comentário contém linguagem inapropriada.");
            }
            if (perspectiveService.ehToxico(texto)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Comentário contém linguagem inapropriada.");
            }
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
        avaliacao.setTexto(texto != null && !texto.isBlank() ? texto.trim() : null);

        if (avaliacao.getCriadoEm() == null) avaliacao.setCriadoEm(LocalDateTime.now());
        avaliacao.setAtualizadoEm(LocalDateTime.now());

        avaliacao = avaliacaoRepository.save(avaliacao);

        RoteiroAvaliacaoDTO dto = new RoteiroAvaliacaoDTO(avaliacao);
        dto.setNomeExibicao(resolverNome(usuario));
        dto.setTotalLikes(likeRepository.countByAvaliacao_IdAvaliacao(avaliacao.getIdAvaliacao()));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<RoteiroAvaliacaoDTO> findByRoteiro(Long idRoteiro) {
        return avaliacaoRepository.findByRoteiro_IdRoteiroOrderByCriadoEmDesc(idRoteiro)
                .stream()
                .map(a -> {
                    RoteiroAvaliacaoDTO dto = new RoteiroAvaliacaoDTO(a);
                    dto.setNomeExibicao(resolverNome(a.getUsuario()));
                    dto.setTotalLikes(likeRepository.countByAvaliacao_IdAvaliacao(a.getIdAvaliacao()));
                    return dto;
                })
                .collect(Collectors.toList());
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

    @Transactional
    public void deletar(Long idRoteiro, Long idUsuario) {
        RoteiroAvaliacao avaliacao = avaliacaoRepository
                .findByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        likeRepository.deleteByAvaliacao_IdAvaliacao(avaliacao.getIdAvaliacao());
        avaliacaoRepository.delete(avaliacao);
    }

    @Transactional(readOnly = true)
    public RoteiroAvaliacaoDTO getAvaliacaoUsuario(Long idRoteiro, Long idUsuario) {
        return avaliacaoRepository
                .findByRoteiro_IdRoteiroAndUsuario_IdUsuario(idRoteiro, idUsuario)
                .map(a -> {
                    RoteiroAvaliacaoDTO dto = new RoteiroAvaliacaoDTO(a);
                    dto.setNomeExibicao(resolverNome(a.getUsuario()));
                    dto.setTotalLikes(likeRepository.countByAvaliacao_IdAvaliacao(a.getIdAvaliacao()));
                    return dto;
                })
                .orElse(null);
    }
}
