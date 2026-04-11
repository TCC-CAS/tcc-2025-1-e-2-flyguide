package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_roteiro_like",
       uniqueConstraints = @UniqueConstraint(columnNames = {"id_roteiro", "id_usuario"}))
public class RoteiroLike implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idLike;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_roteiro")
    private Roteiro roteiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    private LocalDateTime criadoEm;

    public RoteiroLike() {}

    public RoteiroLike(Roteiro roteiro, User usuario, LocalDateTime criadoEm) {
        this.roteiro  = roteiro;
        this.usuario  = usuario;
        this.criadoEm = criadoEm;
    }

    public Long getIdLike()                            { return idLike; }
    public void setIdLike(Long idLike)                 { this.idLike = idLike; }

    public Roteiro getRoteiro()                        { return roteiro; }
    public void setRoteiro(Roteiro roteiro)            { this.roteiro = roteiro; }

    public User getUsuario()                           { return usuario; }
    public void setUsuario(User usuario)               { this.usuario = usuario; }

    public LocalDateTime getCriadoEm()                { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)   { this.criadoEm = criadoEm; }
}
