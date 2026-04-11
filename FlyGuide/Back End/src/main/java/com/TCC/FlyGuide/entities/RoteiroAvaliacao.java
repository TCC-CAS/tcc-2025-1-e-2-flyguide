package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "tb_roteiro_avaliacao",
        uniqueConstraints = @UniqueConstraint(columnNames = {"id_roteiro", "id_usuario"}))
public class RoteiroAvaliacao implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAvaliacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_roteiro")
    private Roteiro roteiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    @Column(nullable = false)
    private Integer nota; // 1 a 5

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public RoteiroAvaliacao() {}

    public Long getIdAvaliacao()                            { return idAvaliacao; }
    public void setIdAvaliacao(Long idAvaliacao)            { this.idAvaliacao = idAvaliacao; }

    public Roteiro getRoteiro()                             { return roteiro; }
    public void setRoteiro(Roteiro roteiro)                 { this.roteiro = roteiro; }

    public User getUsuario()                                { return usuario; }
    public void setUsuario(User usuario)                    { this.usuario = usuario; }

    public Integer getNota()                                { return nota; }
    public void setNota(Integer nota)                       { this.nota = nota; }

    public LocalDateTime getCriadoEm()                      { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)         { this.criadoEm = criadoEm; }

    public LocalDateTime getAtualizadoEm()                  { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}