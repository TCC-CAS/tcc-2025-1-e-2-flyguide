package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.TCC.FlyGuide.entities.Roteiro;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class RoteiroDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idRoteiro;
    private Long idUsuario;

    // Imagem de capa
    private Long   idImagem;
    private String imagemUrl;
    private String imagemChave;

    private String titulo;
    private String pais;
    private String cidade;
    private String stateCode;
    private String tipoRoteiro;
    private String statusRoteiro;
    private String visibilidadeRoteiro;

    private LocalDate dataInicio;
    private LocalDate dataFim;

    private Integer diasTotais;
    private BigDecimal orcamento;
    private String observacoes;
    private LocalDateTime dataCriacao;
    private Double mediaAvaliacao;
    private Long totalAvaliacoes;

    private Double latDestino;
    private Double lngDestino;

    private List<Map<String, Object>> sugestoes;
    private Map<String, String> aiStatus;

    // Dados do autor (para exibição no feed)
    private String emailUsuario;
    private String nomeUsuario;

    public RoteiroDTO() {}

    public RoteiroDTO(Roteiro entity) {
        this.idRoteiro           = entity.getIdRoteiro();
        this.idUsuario           = (entity.getUsuario() != null) ? entity.getUsuario().getIdUsuario() : null;
        this.titulo              = entity.getTitulo();
        this.pais                = entity.getPais();
        this.cidade              = entity.getCidade();
        this.stateCode           = entity.getStateCode();
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

        this.dataCriacao  = entity.getDataCriacao();
        this.latDestino   = entity.getLatDestino();
        this.lngDestino   = entity.getLngDestino();

        // Deserializar sugestões do JSON
        if (entity.getSugestoesJson() != null && !entity.getSugestoesJson().isBlank()) {
            try {
                this.sugestoes = new ObjectMapper().readValue(
                    entity.getSugestoesJson(),
                    new TypeReference<List<Map<String, Object>>>() {}
                );
            } catch (Exception ignored) {}
        }

        // Deserializar status IA do JSON
        if (entity.getAiStatusJson() != null && !entity.getAiStatusJson().isBlank()) {
            try {
                this.aiStatus = new ObjectMapper().readValue(
                    entity.getAiStatusJson(),
                    new TypeReference<Map<String, String>>() {}
                );
            } catch (Exception ignored) {}
        }

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

    public String getPais()                               { return pais; }
    public void setPais(String pais)                      { this.pais = pais; }

    public String getCidade()                             { return cidade; }
    public void setCidade(String cidade)                  { this.cidade = cidade; }

    public String getStateCode()                          { return stateCode; }
    public void setStateCode(String stateCode)            { this.stateCode = stateCode; }

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

    public Double getMediaAvaliacao()                              { return mediaAvaliacao; }
    public void setMediaAvaliacao(Double mediaAvaliacao)           { this.mediaAvaliacao = mediaAvaliacao; }

    public Long getTotalAvaliacoes()                               { return totalAvaliacoes; }
    public void setTotalAvaliacoes(Long totalAvaliacoes)           { this.totalAvaliacoes = totalAvaliacoes; }

    public List<Map<String, Object>> getSugestoes()                  { return sugestoes; }
    public void setSugestoes(List<Map<String, Object>> sugestoes)    { this.sugestoes = sugestoes; }

    public Map<String, String> getAiStatus()                         { return aiStatus; }
    public void setAiStatus(Map<String, String> aiStatus)            { this.aiStatus = aiStatus; }

    public String getEmailUsuario()                          { return emailUsuario; }
    public void setEmailUsuario(String emailUsuario)         { this.emailUsuario = emailUsuario; }

    public String getNomeUsuario()                           { return nomeUsuario; }
    public void setNomeUsuario(String nomeUsuario)           { this.nomeUsuario = nomeUsuario; }

    public Double getLatDestino()                            { return latDestino; }
    public void setLatDestino(Double latDestino)             { this.latDestino = latDestino; }

    public Double getLngDestino()                            { return lngDestino; }
    public void setLngDestino(Double lngDestino)             { this.lngDestino = lngDestino; }
}
