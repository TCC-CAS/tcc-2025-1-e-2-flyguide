package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_roteiro_comentario")
public class RoteiroComentario implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idComentario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_roteiro")
    private Roteiro roteiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    @Column(nullable = false, length = 1000)
    private String texto;

    private LocalDateTime criadoEm;
    private LocalDateTime editadoEm;

    public RoteiroComentario() {}

    public RoteiroComentario(Roteiro roteiro, User usuario, String texto, LocalDateTime criadoEm) {
        this.roteiro  = roteiro;
        this.usuario  = usuario;
        this.texto    = texto;
        this.criadoEm = criadoEm;
    }

    public Long getIdComentario()                          { return idComentario; }
    public void setIdComentario(Long idComentario)         { this.idComentario = idComentario; }

    public Roteiro getRoteiro()                            { return roteiro; }
    public void setRoteiro(Roteiro roteiro)                { this.roteiro = roteiro; }

    public User getUsuario()                               { return usuario; }
    public void setUsuario(User usuario)                   { this.usuario = usuario; }

    public String getTexto()                               { return texto; }
    public void setTexto(String texto)                     { this.texto = texto; }

    public LocalDateTime getCriadoEm()                    { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)        { this.criadoEm = criadoEm; }

    public LocalDateTime getEditadoEm()                   { return editadoEm; }
    public void setEditadoEm(LocalDateTime editadoEm)      { this.editadoEm = editadoEm; }
}
