package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDate;
import java.math.BigDecimal;

import com.TCC.FlyGuide.entities.Roteiro;

public class RoteiroDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idRoteiro;
    private Long idUsuario;

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

    public RoteiroDTO() {
    }

    public RoteiroDTO(
            Long idRoteiro,
            Long idUsuario,
            String titulo,
            String cidade,
            String tipoRoteiro,
            String statusRoteiro,
            String visibilidadeRoteiro,
            LocalDate dataInicio,
            LocalDate dataFim,
            String observacoes,
            Integer diasTotais,
            BigDecimal orcamento
    ) {
        this.idRoteiro = idRoteiro;
        this.idUsuario = idUsuario;
        this.titulo = titulo;
        this.cidade = cidade;
        this.tipoRoteiro = tipoRoteiro;
        this.statusRoteiro = statusRoteiro;
        this.visibilidadeRoteiro = visibilidadeRoteiro;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.observacoes = observacoes;
        this.diasTotais = diasTotais;
        this.orcamento = orcamento;

    }

    // Construtor auxiliar: Entity -> DTO
    public RoteiroDTO(Roteiro entity) {
        this.idRoteiro = entity.getIdRoteiro();
        this.idUsuario = (entity.getUsuario() != null) ? entity.getUsuario().getIdUsuario() : null;
        this.titulo = entity.getTitulo();
        this.cidade = entity.getCidade();
        this.tipoRoteiro = entity.getTipoRoteiro();
        this.statusRoteiro = entity.getStatusRoteiro();
        this.visibilidadeRoteiro = entity.getVisibilidadeRoteiro();
        this.dataInicio = entity.getDataInicio();
        this.dataFim = entity.getDataFim();
        this.observacoes = entity.getObservacoes();
        this.diasTotais = entity.getDiasTotais();
        this.orcamento = entity.getOrcamento();
    }

    public Long getIdRoteiro() {
        return idRoteiro;
    }

    public void setIdRoteiro(Long idRoteiro) {
        this.idRoteiro = idRoteiro;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Long idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getTipoRoteiro() {
        return tipoRoteiro;
    }

    public void setTipoRoteiro(String tipoRoteiro) {
        this.tipoRoteiro = tipoRoteiro;
    }

    public String getStatusRoteiro() {
        return statusRoteiro;
    }

    public void setStatusRoteiro(String statusRoteiro) {
        this.statusRoteiro = statusRoteiro;
    }

    public String getVisibilidadeRoteiro() {
        return visibilidadeRoteiro;
    }

    public void setVisibilidadeRoteiro(String visibilidadeRoteiro) {
        this.visibilidadeRoteiro = visibilidadeRoteiro;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public LocalDate getDataFim() {
        return dataFim;
    }

    public void setDataFim(LocalDate dataFim) {
        this.dataFim = dataFim;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }

    public Integer getDiasTotais() {
        return diasTotais;
    }

    public void setDiasTotais(Integer diasTotais) {
        this.diasTotais = diasTotais;
    }

    public BigDecimal getOrcamento() {
        return orcamento;
    }

    public void setOrcamento(BigDecimal orcamento) {
        this.orcamento = orcamento;
    }
}