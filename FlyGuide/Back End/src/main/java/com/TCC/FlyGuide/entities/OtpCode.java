package com.TCC.FlyGuide.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tb_otp")
public class OtpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String codigo;

    @Column(nullable = false)
    private LocalDateTime expiracao;

    @Column(nullable = false)
    private boolean usado = false;

    @Column(nullable = false)
    private String tipo;

    public OtpCode() {}

    public OtpCode(String email, String codigo, LocalDateTime expiracao, String tipo) {
        this.email = email;
        this.codigo = codigo;
        this.expiracao = expiracao;
        this.tipo = tipo;
    }

    public Long getId() { return id; }

    public String getEmail() { return email; }

    public String getCodigo() { return codigo; }

    public LocalDateTime getExpiracao() { return expiracao; }

    public boolean isUsado() { return usado; }

    public void setUsado(boolean usado) { this.usado = usado; }

    public String getTipo() { return tipo; }
}