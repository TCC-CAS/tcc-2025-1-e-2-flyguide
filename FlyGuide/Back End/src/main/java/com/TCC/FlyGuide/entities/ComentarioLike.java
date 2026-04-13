package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_avaliacao_like",
       uniqueConstraints = @UniqueConstraint(columnNames = {"id_avaliacao", "id_usuario"}))
public class ComentarioLike implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idLike;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_avaliacao")
    private RoteiroAvaliacao avaliacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario")
    private User usuario;

    private LocalDateTime criadoEm;

    public ComentarioLike() {}

    public ComentarioLike(RoteiroAvaliacao avaliacao, User usuario, LocalDateTime criadoEm) {
        this.avaliacao = avaliacao;
        this.usuario   = usuario;
        this.criadoEm  = criadoEm;
    }

    public Long getIdLike()                                  { return idLike; }
    public void setIdLike(Long idLike)                       { this.idLike = idLike; }

    public RoteiroAvaliacao getAvaliacao()                   { return avaliacao; }
    public void setAvaliacao(RoteiroAvaliacao avaliacao)     { this.avaliacao = avaliacao; }

    public User getUsuario()                                 { return usuario; }
    public void setUsuario(User usuario)                     { this.usuario = usuario; }

    public LocalDateTime getCriadoEm()                      { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)          { this.criadoEm = criadoEm; }
}
