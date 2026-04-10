package com.TCC.FlyGuide.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;
import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.entities.RoteiroLocal;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import com.TCC.FlyGuide.repositories.RoteiroComentarioRepository;
import com.TCC.FlyGuide.repositories.RoteiroLikeRepository;
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
    private ImagemRepository imagemRepository;

    @Autowired
    private RoteiroLocalRepository roteiroLocalRepository;

    @Autowired
    private RoteiroLikeRepository likeRepository;

    @Autowired
    private RoteiroComentarioRepository comentarioRepository;

    public List<RoteiroDTO> findAll() {
        List<Roteiro> list = roteiroRepository.findAll();
        return list.stream().map(RoteiroDTO::new).collect(Collectors.toList());
    }

    public RoteiroDTO findById(Long id) {
        Optional<Roteiro> obj = roteiroRepository.findById(id);
        Roteiro entity = obj.orElseThrow(() -> new ResourceNotFoundException(id));
        return new RoteiroDTO(entity);
    }

    public List<RoteiroDTO> findByUsuario(Long idUsuario) {
        List<Roteiro> list = roteiroRepository.findByUsuario_IdUsuario(idUsuario);
        return list.stream().map(RoteiroDTO::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoteiroDTO> findPublicos(String cidade, String tipoRoteiro,
                                         BigDecimal orcamentoMax, String ordenacao,
                                         String busca, Integer diasMax) {
        String cidadeFiltro = (cidade != null && !cidade.isBlank()) ? cidade : null;
        String tipoFiltro   = (tipoRoteiro != null && !tipoRoteiro.isBlank()) ? tipoRoteiro : null;
        String buscaFiltro  = (busca != null && !busca.isBlank()) ? busca : null;

        List<Roteiro> list;
        switch (ordenacao == null ? "recente" : ordenacao.toLowerCase()) {
            case "curtidos"       -> list = roteiroRepository.findPublicosOrdenadosPorCurtidas(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
            case "orcamento_asc"  -> list = roteiroRepository.findPublicosOrcamentoAsc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
            case "orcamento_desc" -> list = roteiroRepository.findPublicosOrcamentoDesc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
            case "duracao_asc"    -> list = roteiroRepository.findPublicosDuracaoAsc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
            case "duracao_desc"   -> list = roteiroRepository.findPublicosDuracaoDesc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
            default               -> list = roteiroRepository.findPublicosComFiltros(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax);
        }

        return list.stream().map(r -> {
            RoteiroDTO dto = new RoteiroDTO(r);
            dto.setTotalLikes(likeRepository.countByRoteiro_IdRoteiro(r.getIdRoteiro()));
            dto.setTotalComentarios(comentarioRepository.countByRoteiro_IdRoteiro(r.getIdRoteiro()));
            return dto;
        }).collect(Collectors.toList());
    }

    public RoteiroDTO insert(RoteiroDTO dto) {
        User usuario = userRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException(dto.getIdUsuario()));

        Roteiro entity = new Roteiro();
        entity.setUsuario(usuario);
        entity.setDataCriacao(LocalDateTime.now());
        updateData(entity, dto);

        entity = roteiroRepository.save(entity);
        return new RoteiroDTO(entity);
    }

    public void delete(Long id) {
        try {
            // Remove os locais vinculados antes de deletar o roteiro
            roteiroLocalRepository.deleteByRoteiro_IdRoteiro(id);
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

        // Vincula a imagem de capa se enviada
        if (dto.getIdImagem() != null) {
            Imagem imagem = imagemRepository.findById(dto.getIdImagem())
                    .orElse(null);
            entity.setImagem(imagem);
        }
    }

    @Transactional(readOnly = true)
    public RoteiroCompletoDTO findCompletoById(Long idRoteiro) {
        Roteiro roteiro = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        List<RoteiroLocal> vinculos = roteiroLocalRepository.buscarPorRoteiroComLocal(idRoteiro);

        List<RoteiroLocalDTO> locaisDTO = vinculos.stream()
                .map(RoteiroLocalDTO::new)
                .collect(Collectors.toList());

        RoteiroDTO roteiroDTO = new RoteiroDTO(roteiro);
        roteiroDTO.setTotalLikes(likeRepository.countByRoteiro_IdRoteiro(idRoteiro));

        return new RoteiroCompletoDTO(roteiroDTO, locaisDTO);
    }
}