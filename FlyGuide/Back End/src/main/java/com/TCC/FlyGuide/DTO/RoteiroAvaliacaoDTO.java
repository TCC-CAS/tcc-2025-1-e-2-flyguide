package com.TCC.FlyGuide.DTO;

import com.TCC.FlyGuide.entities.RoteiroAvaliacao;

import java.time.LocalDateTime;

public class RoteiroAvaliacaoDTO {

    private Long idAvaliacao;
    private Long idRoteiro;
    private Long idUsuario;
    private String nomeExibicao;
    private Integer nota;
    private String texto;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
    private Long totalLikes;

    public RoteiroAvaliacaoDTO() {}

    public RoteiroAvaliacaoDTO(RoteiroAvaliacao entity) {
        this.idAvaliacao   = entity.getIdAvaliacao();
        this.idRoteiro     = entity.getRoteiro() != null ? entity.getRoteiro().getIdRoteiro() : null;
        this.idUsuario     = entity.getUsuario() != null ? entity.getUsuario().getIdUsuario() : null;
        this.nota          = entity.getNota();
        this.texto         = entity.getTexto();
        this.criadoEm      = entity.getCriadoEm();
        this.atualizadoEm  = entity.getAtualizadoEm();
    }

    public Long getIdAvaliacao()                             { return idAvaliacao; }
    public void setIdAvaliacao(Long idAvaliacao)             { this.idAvaliacao = idAvaliacao; }

    public Long getIdRoteiro()                               { return idRoteiro; }
    public void setIdRoteiro(Long idRoteiro)                 { this.idRoteiro = idRoteiro; }

    public Long getIdUsuario()                               { return idUsuario; }
    public void setIdUsuario(Long idUsuario)                 { this.idUsuario = idUsuario; }

    public String getNomeExibicao()                          { return nomeExibicao; }
    public void setNomeExibicao(String nomeExibicao)         { this.nomeExibicao = nomeExibicao; }

    public Integer getNota()                                 { return nota; }
    public void setNota(Integer nota)                        { this.nota = nota; }

    public String getTexto()                                 { return texto; }
    public void setTexto(String texto)                       { this.texto = texto; }

    public LocalDateTime getCriadoEm()                       { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)          { this.criadoEm = criadoEm; }

    public LocalDateTime getAtualizadoEm()                   { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm)  { this.atualizadoEm = atualizadoEm; }

    public Long getTotalLikes()                              { return totalLikes; }
    public void setTotalLikes(Long totalLikes)               { this.totalLikes = totalLikes; }
}
