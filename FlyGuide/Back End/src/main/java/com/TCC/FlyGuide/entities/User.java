package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tb_user")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idUsuario;


    @Column(nullable = false, unique = true)
    private String email;

    private String senha;

    private String tipoPessoa;



    private String cep;
    private String endereco;
    private String cidade;
    private String pais;

    private LocalDate dataCadastro;

    private String tipoConta;

    /**
     * Preenchido apenas para PJ — data em que o trial gratuito de 30 dias expira.
     */
    private LocalDate dataExpiracaoTrial;

    @Column(nullable = false, columnDefinition = "int default 0")
    private int tentativasFalhasLogin = 0;

    private LocalDateTime bloqueadoAte;


    public User() {
    }

    public User(Long idUsuario, String email, String senha, String tipoPessoa, String cep, String endereco, String cidade,
                String pais, LocalDate dataCadastro, String tipoConta, LocalDate dataExpiracaoTrial) {
        super();
        this.idUsuario = idUsuario;
        this.email = email;
        this.senha = senha;
        this.tipoPessoa = tipoPessoa;
        this.cep = cep;
        this.endereco = endereco;
        this.cidade = cidade;
        this.pais = pais;
        this.dataCadastro = dataCadastro;
        this.tipoConta = tipoConta;
        this.dataExpiracaoTrial = dataExpiracaoTrial;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Long idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getEmail() {return email;}

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getTipoPessoa() {return tipoPessoa;}

    public void setTipoPessoa(String tipoPessoa) {this.tipoPessoa = tipoPessoa;}

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
    }

    public LocalDate getDataCadastro() {
        return dataCadastro;
    }

    public void setDataCadastro(LocalDate dataCadastro) {
        this.dataCadastro = dataCadastro;
    }

    public String getTipoConta() {
        return tipoConta;
    }

    public void setTipoConta(String tipoConta) {
        this.tipoConta = tipoConta;
    }

    public LocalDate getDataExpiracaoTrial() {
        return dataExpiracaoTrial;
    }

    public void setDataExpiracaoTrial(LocalDate dataExpiracaoTrial) {
        this.dataExpiracaoTrial = dataExpiracaoTrial;
    }

    public int getTentativasFalhasLogin() {
        return tentativasFalhasLogin;
    }

    public void setTentativasFalhasLogin(int tentativasFalhasLogin) {
        this.tentativasFalhasLogin = tentativasFalhasLogin;
    }

    public LocalDateTime getBloqueadoAte() {
        return bloqueadoAte;
    }

    public void setBloqueadoAte(LocalDateTime bloqueadoAte) {
        this.bloqueadoAte = bloqueadoAte;
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
        User other = (User) obj;
        if (idUsuario == null) {
            if (other.idUsuario != null)
                return false;
        } else if (!idUsuario.equals(other.idUsuario))
            return false;
        return true;
    }
}
