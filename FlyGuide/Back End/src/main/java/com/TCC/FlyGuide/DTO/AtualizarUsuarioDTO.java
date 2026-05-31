package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

public class AtualizarUsuarioDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String cep;
    private String endereco;
    private String cidade;
    private String pais;
    private String tipoConta;

    public AtualizarUsuarioDTO() {}

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getPais() { return pais; }
    public void setPais(String pais) { this.pais = pais; }

    public String getTipoConta() { return tipoConta; }
    public void setTipoConta(String tipoConta) { this.tipoConta = tipoConta; }
}