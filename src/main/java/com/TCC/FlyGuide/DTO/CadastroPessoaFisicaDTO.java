package com.TCC.FlyGuide.DTO;

import java.io.Serializable;

public class CadastroPessoaFisicaDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    // ===== Dados da conta (tb_user) =====
    private String email;
    private String senha;

    private String cep;
    private String endereco;
    private String cidade;
    private String pais;

    private String tipoConta;

    // ===== Dados PF (tb_pessoa_fisica) =====
    private String primeiroNome;
    private String ultimoNome;
    private String cpf;
    private String rg;

    public CadastroPessoaFisicaDTO() {
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

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

    public String getPrimeiroNome() { return primeiroNome; }
    public void setPrimeiroNome(String primeiroNome) { this.primeiroNome = primeiroNome; }

    public String getUltimoNome() { return ultimoNome; }
    public void setUltimoNome(String ultimoNome) { this.ultimoNome = ultimoNome; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getRg() { return rg; }
    public void setRg(String rg) { this.rg = rg; }
}