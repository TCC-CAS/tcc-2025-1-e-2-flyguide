package com.TCC.FlyGuide.entities;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "tb_sessao")
public class Sessao implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String token;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDateTime dataExpiracao;

    @Column(nullable = false)
    private boolean ativo = true;

    public Sessao() {}

    public Sessao(String token, Long userId, LocalDateTime dataExpiracao) {
        this.token = token;
        this.userId = userId;
        this.dataExpiracao = dataExpiracao;
        this.ativo = true;
    }

    public Long getId() { return id; }
    public String getToken() { return token; }
    public Long getUserId() { return userId; }
    public LocalDateTime getDataExpiracao() { return dataExpiracao; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
}