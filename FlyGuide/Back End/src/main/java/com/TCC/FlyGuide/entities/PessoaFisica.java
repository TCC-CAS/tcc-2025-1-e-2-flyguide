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
@Table(name = "tb_pessoa_fisica")
public class PessoaFisica implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    private Long idUsuario;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id_usuario")
    private User usuario;

    private String primeiroNome;
    private String ultimoNome;

    @Column(length = 11, nullable = false, unique = true)
    private String cpf;

    private String tipoPessoa;

    public PessoaFisica() {
    }

    public PessoaFisica(Long idUsuario, User usuario, String primeiroNome, String ultimoNome, String cpf, String tipoPessoa) {
        super();
        this.idUsuario = idUsuario;
        this.usuario = usuario;
        this.primeiroNome = primeiroNome;
        this.ultimoNome = ultimoNome;
        this.cpf = cpf;
        this.tipoPessoa = tipoPessoa;
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

    public String getPrimeiroNome() {
        return primeiroNome;
    }

    public void setPrimeiroNome(String primeiroNome) {
        this.primeiroNome = primeiroNome;
    }

    public String getUltimoNome() {
        return ultimoNome;
    }

    public void setUltimoNome(String ultimoNome) {
        this.ultimoNome = ultimoNome;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getTipoPessoa() {
        return tipoPessoa;
    }

    public void setTipoPessoa(String tipoPessoa) {
        this.tipoPessoa = tipoPessoa;
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
        PessoaFisica other = (PessoaFisica) obj;
        if (idUsuario == null) {
            if (other.idUsuario != null)
                return false;
        } else if (!idUsuario.equals(other.idUsuario))
            return false;
        return true;
    }
}