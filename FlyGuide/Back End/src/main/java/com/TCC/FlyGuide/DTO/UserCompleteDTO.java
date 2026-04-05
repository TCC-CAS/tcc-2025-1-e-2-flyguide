package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({ "pessoaFisica", "pessoaJuridica", "usuario" })
public class UserCompleteDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private PessoaFisicaDTO pessoaFisica;
    private PessoaJuridicaDTO pessoaJuridica;
    private UserDTO usuario;

    public UserCompleteDTO() {}

    public UserCompleteDTO(PessoaFisicaDTO pessoaFisica, PessoaJuridicaDTO pessoaJuridica, UserDTO usuario) {
        this.pessoaFisica = pessoaFisica;
        this.pessoaJuridica = pessoaJuridica;
        this.usuario = usuario;
    }

    public PessoaFisicaDTO getPessoaFisica() { return pessoaFisica; }
    public void setPessoaFisica(PessoaFisicaDTO pessoaFisica) { this.pessoaFisica = pessoaFisica; }

    public PessoaJuridicaDTO getPessoaJuridica() { return pessoaJuridica; }
    public void setPessoaJuridica(PessoaJuridicaDTO pessoaJuridica) { this.pessoaJuridica = pessoaJuridica; }

    public UserDTO getUsuario() { return usuario; }
    public void setUsuario(UserDTO usuario) { this.usuario = usuario; }
}