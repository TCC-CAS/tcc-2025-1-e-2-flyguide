package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

import com.TCC.FlyGuide.entities.PessoaFisica;

public class PessoaFisicaDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idUsuario;
    private String cpf;
    private String rg;
    private String primeiroNome;
    private String ultimoNome;

    public PessoaFisicaDTO() {
    }

    public PessoaFisicaDTO(PessoaFisica entity) {
        this.idUsuario = entity.getIdUsuario();
        this.cpf = entity.getCpf();
        this.rg = entity.getRg();
        this.primeiroNome = entity.getPrimeiroNome();
        this.ultimoNome = entity.getUltimoNome();
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getRg() { return rg; }
    public void setRg(String rg) { this.rg = rg; }

    public String getPrimeiroNome() { return primeiroNome; }
    public void setPrimeiroNome(String primeiroNome) { this.primeiroNome = primeiroNome; }

    public String getUltimoNome() { return ultimoNome; }
    public void setUltimoNome(String ultimoNome) { this.ultimoNome = ultimoNome; }
}