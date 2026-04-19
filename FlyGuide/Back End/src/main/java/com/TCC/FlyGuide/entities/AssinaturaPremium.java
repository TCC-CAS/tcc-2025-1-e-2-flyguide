package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tb_assinatura_premium")
public class AssinaturaPremium implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "id_usuario", unique = true)
    private User usuario;

    private String cartaoUltimos4;
    private String cartaoBandeira;

    /** Status possíveis: ACTIVE, CANCELLED */
    private String status;

    private LocalDate dataInicio;
    private LocalDate proximoVencimento;

    public AssinaturaPremium() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUsuario() { return usuario; }
    public void setUsuario(User usuario) { this.usuario = usuario; }

    public String getCartaoUltimos4() { return cartaoUltimos4; }
    public void setCartaoUltimos4(String cartaoUltimos4) { this.cartaoUltimos4 = cartaoUltimos4; }

    public String getCartaoBandeira() { return cartaoBandeira; }
    public void setCartaoBandeira(String cartaoBandeira) { this.cartaoBandeira = cartaoBandeira; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }

    public LocalDate getProximoVencimento() { return proximoVencimento; }
    public void setProximoVencimento(LocalDate proximoVencimento) { this.proximoVencimento = proximoVencimento; }
}