package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import jakarta.persistence.Column;

@Entity
@Table(name = "tb_roteiro")
public class Roteiro implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idRoteiro;

    // FK -> tb_user.idUsuario
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    private String titulo;
    private String cidade;
    private String tipoRoteiro;
    private String statusRoteiro;
    private String visibilidadeRoteiro;

    private LocalDate dataInicio;
    private LocalDate dataFim;

    private Integer diasTotais;

    @Column(precision = 12, scale = 2)
    private BigDecimal orcamento;

    private String observacoes;

    public Roteiro() {
    }

    public Roteiro(
            Long idRoteiro,
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

    public Long getIdRoteiro() {
        return idRoteiro;
    }

    public void setIdRoteiro(Long idRoteiro) {
        this.idRoteiro = idRoteiro;
    }

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
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

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((idRoteiro == null) ? 0 : idRoteiro.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Roteiro other = (Roteiro) obj;
        if (idRoteiro == null) {
            if (other.idRoteiro != null)
                return false;
        } else if (!idRoteiro.equals(other.idRoteiro))
            return false;
        return true;
    }


}