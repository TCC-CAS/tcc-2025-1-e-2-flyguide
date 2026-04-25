package com.TCC.FlyGuide.DTO;

public class LoginResponseDTO {

    private Long id;
    private String email;
    private String nomeExibicao;   // primeiroNome+ultimoNome (PF) ou nomeFantasia/razaoSocial (PJ)
    private String tipoConta;
    private String tipoPessoa;     // "PF" ou "PJ"
    private String dataCadastro;
    private String token;

    public LoginResponseDTO() {}

    public LoginResponseDTO(Long id, String email, String nomeExibicao, String tipoConta, String tipoPessoa, String dataCadastro, String token) {
        this.id = id;
        this.email = email;
        this.nomeExibicao = nomeExibicao;
        this.tipoConta = tipoConta;
        this.tipoPessoa = tipoPessoa;
        this.dataCadastro = dataCadastro;
        this.token = token;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNomeExibicao() { return nomeExibicao; }
    public void setNomeExibicao(String nomeExibicao) { this.nomeExibicao = nomeExibicao; }

    public String getTipoConta() { return tipoConta; }
    public void setTipoConta(String tipoConta) { this.tipoConta = tipoConta; }

    public String getTipoPessoa() { return tipoPessoa; }
    public void setTipoPessoa(String tipoPessoa) { this.tipoPessoa = tipoPessoa; }

    public String getDataCadastro() { return dataCadastro; }
    public void setDataCadastro(String dataCadastro) { this.dataCadastro = dataCadastro; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}