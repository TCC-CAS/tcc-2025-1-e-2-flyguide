package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDate;

import com.TCC.FlyGuide.entities.User;

public class UserDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idUsuario;
    private String tipoPessoa; // PF / PJ
    private String email;

    private String cep;
    private String endereco;
    private String cidade;
    private String pais;

    private LocalDate dataCadastro;
    private String tipoConta;

    public UserDTO() {}

    public UserDTO(User user) {
        this.idUsuario = user.getIdUsuario();
        this.email = user.getEmail();
        this.cep = user.getCep();
        this.endereco = user.getEndereco();
        this.cidade = user.getCidade();
        this.pais = user.getPais();
        this.dataCadastro = user.getDataCadastro();
        this.tipoConta = user.getTipoConta();
        this.tipoPessoa = user.getTipoPessoa();
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }

    public String getTipoPessoa() { return tipoPessoa; }
    public void setTipoPessoa(String tipoPessoa) { this.tipoPessoa = tipoPessoa; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getPais() { return pais; }
    public void setPais(String pais) { this.pais = pais; }

    public LocalDate getDataCadastro() { return dataCadastro; }
    public void setDataCadastro(LocalDate dataCadastro) { this.dataCadastro = dataCadastro; }

    public String getTipoConta() { return tipoConta; }
    public void setTipoConta(String tipoConta) { this.tipoConta = tipoConta; }
}