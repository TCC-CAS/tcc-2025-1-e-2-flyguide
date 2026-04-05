package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

public class AtualizarPessoaJuridicaDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    // tb_user
    private String cep;
    private String endereco;
    private String cidade;
    private String pais;

    // tb_pessoa_juridica
    private String razaoSocial;
    private String nomeFantasia;

    public AtualizarPessoaJuridicaDTO() {}

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getPais() { return pais; }
    public void setPais(String pais) { this.pais = pais; }

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }

    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }
}