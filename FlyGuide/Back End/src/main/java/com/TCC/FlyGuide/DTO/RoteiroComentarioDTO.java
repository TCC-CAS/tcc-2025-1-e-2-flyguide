package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.TCC.FlyGuide.entities.RoteiroComentario;

public class RoteiroComentarioDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idComentario;
    private Long idRoteiro;
    private Long idUsuario;
    private String emailUsuario;
    private String nomeExibicao;
    private String texto;
    private LocalDateTime criadoEm;
    private LocalDateTime editadoEm;

    public RoteiroComentarioDTO() {}

    public RoteiroComentarioDTO(RoteiroComentario entity) {
        this.idComentario = entity.getIdComentario();
        this.idRoteiro    = entity.getRoteiro() != null ? entity.getRoteiro().getIdRoteiro() : null;
        this.idUsuario    = entity.getUsuario() != null ? entity.getUsuario().getIdUsuario() : null;
        this.emailUsuario = entity.getUsuario() != null ? entity.getUsuario().getEmail() : null;
        this.texto        = entity.getTexto();
        this.criadoEm     = entity.getCriadoEm();
        this.editadoEm    = entity.getEditadoEm();
    }

    public Long getIdComentario()                           { return idComentario; }
    public void setIdComentario(Long idComentario)          { this.idComentario = idComentario; }

    public Long getIdRoteiro()                              { return idRoteiro; }
    public void setIdRoteiro(Long idRoteiro)                { this.idRoteiro = idRoteiro; }

    public Long getIdUsuario()                              { return idUsuario; }
    public void setIdUsuario(Long idUsuario)                { this.idUsuario = idUsuario; }

    public String getEmailUsuario()                         { return emailUsuario; }
    public void setEmailUsuario(String emailUsuario)        { this.emailUsuario = emailUsuario; }

    public String getNomeExibicao()                         { return nomeExibicao; }
    public void setNomeExibicao(String nomeExibicao)        { this.nomeExibicao = nomeExibicao; }

    public String getTexto()                                { return texto; }
    public void setTexto(String texto)                      { this.texto = texto; }

    public LocalDateTime getCriadoEm()                      { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)         { this.criadoEm = criadoEm; }

    public LocalDateTime getEditadoEm()                     { return editadoEm; }
    public void setEditadoEm(LocalDateTime editadoEm)       { this.editadoEm = editadoEm; }
}
