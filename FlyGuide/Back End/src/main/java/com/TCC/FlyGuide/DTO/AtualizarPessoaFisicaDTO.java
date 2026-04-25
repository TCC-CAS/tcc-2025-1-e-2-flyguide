package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

public class AtualizarPessoaFisicaDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    // tb_user
    private String cep;
    private String endereco;
    private String cidade;
    private String pais;

    // tb_pessoa_fisica
    private String primeiroNome;
    private String ultimoNome;

    public AtualizarPessoaFisicaDTO() {}

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getPais() { return pais; }
    public void setPais(String pais) { this.pais = pais; }

    public String getPrimeiroNome() { return primeiroNome; }
    public void setPrimeiroNome(String primeiroNome) { this.primeiroNome = primeiroNome; }

    public String getUltimoNome() { return ultimoNome; }
    public void setUltimoNome(String ultimoNome) { this.ultimoNome = ultimoNome; }
}
