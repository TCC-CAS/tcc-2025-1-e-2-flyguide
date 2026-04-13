package com.TCC.FlyGuide.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.TCC.FlyGuide.DTO.RoteiroCompletoDTO;
import com.TCC.FlyGuide.DTO.RoteiroLocalDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.entities.RoteiroLocal;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import com.TCC.FlyGuide.repositories.ComentarioLikeRepository;
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
import com.TCC.FlyGuide.services.exceptions.UnauthorizedException;

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
    private ComentarioLikeRepository comentarioLikeRepository;

    @Autowired
    private com.TCC.FlyGuide.repositories.RoteiroAvaliacaoRepository avaliacaoRepository;

    @Transactional(readOnly = true)
    public List<RoteiroDTO> findAll() {
        List<Roteiro> list = roteiroRepository.findAll();
        return list.stream().map(r -> {
            RoteiroDTO dto = new RoteiroDTO(r);
            Double media = avaliacaoRepository.mediaByRoteiro(r.getIdRoteiro());
            dto.setMediaAvaliacao(media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            dto.setTotalAvaliacoes(avaliacaoRepository.totalByRoteiro(r.getIdRoteiro()));
            return dto;
        }).collect(Collectors.toList());
    }

    public RoteiroDTO findById(Long id) {
        Optional<Roteiro> obj = roteiroRepository.findById(id);
        Roteiro entity = obj.orElseThrow(() -> new ResourceNotFoundException(id));
        return new RoteiroDTO(entity);
    }

    @Transactional(readOnly = true)
    public List<RoteiroDTO> findByUsuario(Long idUsuario) {
        List<Roteiro> list = roteiroRepository.findByUsuario_IdUsuario(idUsuario);
        return list.stream().map(r -> {
            RoteiroDTO dto = new RoteiroDTO(r);
            Double media = avaliacaoRepository.mediaByRoteiro(r.getIdRoteiro());
            dto.setMediaAvaliacao(media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            dto.setTotalAvaliacoes(avaliacaoRepository.totalByRoteiro(r.getIdRoteiro()));
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<RoteiroDTO> findPublicos(String cidade, String tipoRoteiro,
                                         BigDecimal orcamentoMax, String ordenacao,
                                         String busca, Integer diasMax, Pageable pageable) {
        String cidadeFiltro = (cidade != null && !cidade.isBlank()) ? cidade : null;
        String tipoFiltro   = (tipoRoteiro != null && !tipoRoteiro.isBlank()) ? tipoRoteiro : null;
        String buscaFiltro  = (busca != null && !busca.isBlank()) ? busca : null;

        Page<Roteiro> page;
        switch (ordenacao == null ? "recente" : ordenacao.toLowerCase()) {
            case "curtidos"       -> page = roteiroRepository.findPublicosOrdenadosPorCurtidas(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
            case "orcamento_asc"  -> page = roteiroRepository.findPublicosOrcamentoAsc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
            case "orcamento_desc" -> page = roteiroRepository.findPublicosOrcamentoDesc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
            case "duracao_asc"    -> page = roteiroRepository.findPublicosDuracaoAsc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
            case "duracao_desc"   -> page = roteiroRepository.findPublicosDuracaoDesc(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
            default               -> page = roteiroRepository.findPublicosComFiltros(cidadeFiltro, tipoFiltro, orcamentoMax, buscaFiltro, diasMax, pageable);
        }

        return page.map(r -> {
            RoteiroDTO dto = new RoteiroDTO(r);
            Double media = avaliacaoRepository.mediaByRoteiro(r.getIdRoteiro());
            dto.setMediaAvaliacao(media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            dto.setTotalAvaliacoes(avaliacaoRepository.totalByRoteiro(r.getIdRoteiro()));
            return dto;
        });
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

    public boolean jaClonou(Long idRoteiro, Long idUsuario) {
        return roteiroRepository.existsByUsuario_IdUsuarioAndIdRoteiroOrigem(idUsuario, idRoteiro);
    }

    @Transactional
    public RoteiroDTO clonar(Long idRoteiro, Long idUsuario) {
        if (roteiroRepository.existsByUsuario_IdUsuarioAndIdRoteiroOrigem(idUsuario, idRoteiro)) {
            throw new UnauthorizedException("Você já clonou este roteiro.");
        }

        Roteiro original = roteiroRepository.findById(idRoteiro)
                .orElseThrow(() -> new ResourceNotFoundException(idRoteiro));

        User usuario = userRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException(idUsuario));

        // Cria novo roteiro com os dados do original
        Roteiro clone = new Roteiro();
        clone.setUsuario(usuario);
        clone.setTitulo(original.getTitulo());
        clone.setCidade(original.getCidade());
        clone.setDataInicio(original.getDataInicio());
        clone.setDataFim(original.getDataFim());
        clone.setDiasTotais(original.getDiasTotais());
        clone.setTipoRoteiro(original.getTipoRoteiro());
        clone.setStatusRoteiro("PLANEJADO");
        clone.setVisibilidadeRoteiro("PRIVATE");
        clone.setOrcamento(original.getOrcamento());
        clone.setObservacoes(original.getObservacoes());
        clone.setImagem(original.getImagem());
        clone.setDataCriacao(LocalDateTime.now());
        clone.setIdRoteiroOrigem(idRoteiro);
        clone = roteiroRepository.save(clone);

        // Clona os locais vinculados
        final Roteiro cloneFinal = clone;
        List<RoteiroLocal> locaisOriginais = roteiroLocalRepository.buscarPorRoteiroComLocal(idRoteiro)
                .stream()
                .map(rl -> {
                    RoteiroLocal novoVinculo = new RoteiroLocal();
                    novoVinculo.setRoteiro(cloneFinal);
                    novoVinculo.setLocal(rl.getLocal());
                    novoVinculo.setStatus(rl.getStatus());
                    novoVinculo.setObservacoes(rl.getObservacoes());
                    novoVinculo.setDia(rl.getDia());
                    novoVinculo.setOrdem(rl.getOrdem());
                    novoVinculo.setHorario(rl.getHorario());
                    novoVinculo.setCriadoEm(LocalDateTime.now());
                    return novoVinculo;
                }).collect(Collectors.toList());
        roteiroLocalRepository.saveAll(locaisOriginais);

        return new RoteiroDTO(clone);
    }

    @Transactional
    public void delete(Long id, Long idUsuario) {
        try {
            Roteiro roteiro = roteiroRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException(id));

            if (!roteiro.getUsuario().getIdUsuario().equals(idUsuario)) {
                throw new UnauthorizedException("Você não tem permissão para excluir este roteiro.");
            }

            comentarioLikeRepository.deleteByAvaliacao_Roteiro_IdRoteiro(id);
            avaliacaoRepository.deleteByRoteiro_IdRoteiro(id);
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

            if (!entity.getUsuario().getIdUsuario().equals(dto.getIdUsuario())) {
                throw new UnauthorizedException("Você não tem permissão para editar este roteiro.");
            }

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
        return new RoteiroCompletoDTO(roteiroDTO, locaisDTO);
    }
}