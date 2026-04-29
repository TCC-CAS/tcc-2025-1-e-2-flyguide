package com.TCC.FlyGuide.DTO;

public class VerificarLoginDTO {

    private String email;
    private String codigo;

    public VerificarLoginDTO() {}

    public String getEmail() { return email; }

    public void setEmail(String email) { this.email = email; }

    public String getCodigo() { return codigo; }

    public void setCodigo(String codigo) { this.codigo = codigo; }
}