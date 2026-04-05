package com.TCC.FlyGuide.entities;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tb_pessoa_juridica")
public class PessoaJuridica implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    private Long idUsuario;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id_usuario")
    private User usuario;

    @Column(length = 14, nullable = false, unique = true)
    private String cnpj;

    @Column(nullable = false, length = 200)
    private String razaoSocial;

    @Column(length = 200)
    private String nomeFantasia;


    public PessoaJuridica() {
    }

    public PessoaJuridica(Long idUsuario, User usuario, String cnpj, String razaoSocial, String nomeFantasia) {
        super();
        this.idUsuario = idUsuario;
        this.usuario = usuario;
        this.cnpj = cnpj;
        this.razaoSocial = razaoSocial;
        this.nomeFantasia = nomeFantasia;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Long idUsuario) {
        this.idUsuario = idUsuario;
    }

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
    }

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public String getRazaoSocial() {
        return razaoSocial;
    }

    public void setRazaoSocial(String razaoSocial) {
        this.razaoSocial = razaoSocial;
    }

    public String getNomeFantasia() {
        return nomeFantasia;
    }

    public void setNomeFantasia(String nomeFantasia) {
        this.nomeFantasia = nomeFantasia;
    }


    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((idUsuario == null) ? 0 : idUsuario.hashCode());
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
        PessoaJuridica other = (PessoaJuridica) obj;
        if (idUsuario == null) {
            if (other.idUsuario != null)
                return false;
        } else if (!idUsuario.equals(other.idUsuario))
            return false;
        return true;
    }
}