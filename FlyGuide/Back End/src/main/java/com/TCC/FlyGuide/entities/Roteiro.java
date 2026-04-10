package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDate;
import java.math.BigDecimal;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_roteiro")
public class Roteiro implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idRoteiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    // FK para a imagem de capa escolhida
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_imagem")
    private Imagem imagem;

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

    public Roteiro() {}

    public Roteiro(Long idRoteiro, String titulo, String cidade, String tipoRoteiro,
                   String statusRoteiro, String visibilidadeRoteiro,
                   LocalDate dataInicio, LocalDate dataFim, String observacoes,
                   Integer diasTotais, BigDecimal orcamento) {
        this.idRoteiro           = idRoteiro;
        this.titulo              = titulo;
        this.cidade              = cidade;
        this.tipoRoteiro         = tipoRoteiro;
        this.statusRoteiro       = statusRoteiro;
        this.visibilidadeRoteiro = visibilidadeRoteiro;
        this.dataInicio          = dataInicio;
        this.dataFim             = dataFim;
        this.observacoes         = observacoes;
        this.diasTotais          = diasTotais;
        this.orcamento           = orcamento;
    }

    public Long getIdRoteiro()                        { return idRoteiro; }
    public void setIdRoteiro(Long idRoteiro)          { this.idRoteiro = idRoteiro; }

    public User getUsuario()                          { return usuario; }
    public void setUsuario(User usuario)              { this.usuario = usuario; }

    public Imagem getImagem()                         { return imagem; }
    public void setImagem(Imagem imagem)              { this.imagem = imagem; }

    public String getTitulo()                         { return titulo; }
    public void setTitulo(String titulo)              { this.titulo = titulo; }

    public String getCidade()                         { return cidade; }
    public void setCidade(String cidade)              { this.cidade = cidade; }

    public String getTipoRoteiro()                    { return tipoRoteiro; }
    public void setTipoRoteiro(String tipoRoteiro)    { this.tipoRoteiro = tipoRoteiro; }

    public String getStatusRoteiro()                  { return statusRoteiro; }
    public void setStatusRoteiro(String s)            { this.statusRoteiro = s; }

    public String getVisibilidadeRoteiro()            { return visibilidadeRoteiro; }
    public void setVisibilidadeRoteiro(String v)      { this.visibilidadeRoteiro = v; }

    public LocalDate getDataInicio()                  { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio)   { this.dataInicio = dataInicio; }

    public LocalDate getDataFim()                     { return dataFim; }
    public void setDataFim(LocalDate dataFim)         { this.dataFim = dataFim; }

    public String getObservacoes()                    { return observacoes; }
    public void setObservacoes(String observacoes)    { this.observacoes = observacoes; }

    public Integer getDiasTotais()                    { return diasTotais; }
    public void setDiasTotais(Integer diasTotais)     { this.diasTotais = diasTotais; }

    public BigDecimal getOrcamento()                  { return orcamento; }
    public void setOrcamento(BigDecimal orcamento)    { this.orcamento = orcamento; }

    @Override
    public int hashCode() {
        return (idRoteiro == null) ? 0 : idRoteiro.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Roteiro other = (Roteiro) obj;
        if (idRoteiro == null) return other.idRoteiro == null;
        return idRoteiro.equals(other.idRoteiro);
    }
}