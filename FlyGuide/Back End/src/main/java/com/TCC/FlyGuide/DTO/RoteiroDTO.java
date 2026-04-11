package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

import com.TCC.FlyGuide.entities.Roteiro;

public class RoteiroDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idRoteiro;
    private Long idUsuario;

    // Imagem de capa
    private Long   idImagem;
    private String imagemUrl;
    private String imagemChave;

    private String titulo;
    private String cidade;
    private String tipoRoteiro;
    private String statusRoteiro;
    private String visibilidadeRoteiro;

    private LocalDate dataInicio;
    private LocalDate dataFim;

    private Integer diasTotais;
    private BigDecimal orcamento;
    private String observacoes;
    private LocalDateTime dataCriacao;
    private Long totalLikes;
    private Long totalComentarios;
    private Double mediaAvaliacao;
    private Long totalAvaliacoes;

    // Dados do autor (para exibição no feed)
    private String emailUsuario;

    public RoteiroDTO() {}

    public RoteiroDTO(Roteiro entity) {
        this.idRoteiro           = entity.getIdRoteiro();
        this.idUsuario           = (entity.getUsuario() != null) ? entity.getUsuario().getIdUsuario() : null;
        this.titulo              = entity.getTitulo();
        this.cidade              = entity.getCidade();
        this.tipoRoteiro         = entity.getTipoRoteiro();
        this.statusRoteiro       = entity.getStatusRoteiro();
        this.visibilidadeRoteiro = entity.getVisibilidadeRoteiro();
        this.dataInicio          = entity.getDataInicio();
        this.dataFim             = entity.getDataFim();
        this.observacoes         = entity.getObservacoes();
        this.diasTotais          = entity.getDiasTotais();
        this.orcamento           = entity.getOrcamento();

        // Imagem
        if (entity.getImagem() != null) {
            this.idImagem    = entity.getImagem().getIdImagem();
            this.imagemUrl   = entity.getImagem().getUrl();
            this.imagemChave = entity.getImagem().getChave();
        }

        this.dataCriacao = entity.getDataCriacao();

        // Dados do autor
        if (entity.getUsuario() != null) {
            this.emailUsuario = entity.getUsuario().getEmail();
        }
    }

    public Long getIdRoteiro()                            { return idRoteiro; }
    public void setIdRoteiro(Long idRoteiro)              { this.idRoteiro = idRoteiro; }

    public Long getIdUsuario()                            { return idUsuario; }
    public void setIdUsuario(Long idUsuario)              { this.idUsuario = idUsuario; }

    public Long getIdImagem()                             { return idImagem; }
    public void setIdImagem(Long idImagem)                { this.idImagem = idImagem; }

    public String getImagemUrl()                          { return imagemUrl; }
    public void setImagemUrl(String imagemUrl)            { this.imagemUrl = imagemUrl; }

    public String getImagemChave()                        { return imagemChave; }
    public void setImagemChave(String imagemChave)        { this.imagemChave = imagemChave; }

    public String getTitulo()                             { return titulo; }
    public void setTitulo(String titulo)                  { this.titulo = titulo; }

    public String getCidade()                             { return cidade; }
    public void setCidade(String cidade)                  { this.cidade = cidade; }

    public String getTipoRoteiro()                        { return tipoRoteiro; }
    public void setTipoRoteiro(String tipoRoteiro)        { this.tipoRoteiro = tipoRoteiro; }

    public String getStatusRoteiro()                      { return statusRoteiro; }
    public void setStatusRoteiro(String statusRoteiro)    { this.statusRoteiro = statusRoteiro; }

    public String getVisibilidadeRoteiro()                { return visibilidadeRoteiro; }
    public void setVisibilidadeRoteiro(String v)          { this.visibilidadeRoteiro = v; }

    public LocalDate getDataInicio()                      { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio)       { this.dataInicio = dataInicio; }

    public LocalDate getDataFim()                         { return dataFim; }
    public void setDataFim(LocalDate dataFim)             { this.dataFim = dataFim; }

    public String getObservacoes()                        { return observacoes; }
    public void setObservacoes(String observacoes)        { this.observacoes = observacoes; }

    public Integer getDiasTotais()                        { return diasTotais; }
    public void setDiasTotais(Integer diasTotais)         { this.diasTotais = diasTotais; }

    public BigDecimal getOrcamento()                      { return orcamento; }
    public void setOrcamento(BigDecimal orcamento)        { this.orcamento = orcamento; }

    public LocalDateTime getDataCriacao()                        { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao)        { this.dataCriacao = dataCriacao; }

    public Long getTotalLikes()                                    { return totalLikes; }
    public void setTotalLikes(Long totalLikes)                     { this.totalLikes = totalLikes; }

    public Long getTotalComentarios()                              { return totalComentarios; }
    public void setTotalComentarios(Long totalComentarios)         { this.totalComentarios = totalComentarios; }

    public Double getMediaAvaliacao()                              { return mediaAvaliacao; }
    public void setMediaAvaliacao(Double mediaAvaliacao)           { this.mediaAvaliacao = mediaAvaliacao; }

    public Long getTotalAvaliacoes()                               { return totalAvaliacoes; }
    public void setTotalAvaliacoes(Long totalAvaliacoes)           { this.totalAvaliacoes = totalAvaliacoes; }

    public String getEmailUsuario()                          { return emailUsuario; }
    public void setEmailUsuario(String emailUsuario)         { this.emailUsuario = emailUsuario; }
}