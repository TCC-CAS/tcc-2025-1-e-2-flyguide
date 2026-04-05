package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

import com.TCC.FlyGuide.entities.PessoaJuridica;

public class PessoaJuridicaDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idUsuario;
    private String cnpj;
    private String razaoSocial;
    private String nomeFantasia;

    public PessoaJuridicaDTO() {
    }

    public PessoaJuridicaDTO(PessoaJuridica entity) {
        this.idUsuario = entity.getIdUsuario();
        this.cnpj = entity.getCnpj();
        this.razaoSocial = entity.getRazaoSocial();
        this.nomeFantasia = entity.getNomeFantasia();
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }

    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }

    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }
}