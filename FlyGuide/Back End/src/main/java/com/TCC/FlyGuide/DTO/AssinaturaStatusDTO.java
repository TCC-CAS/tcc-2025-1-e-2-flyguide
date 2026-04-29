package com.TCC.FlyGuide.DTO;

import java.time.LocalDate;

import com.TCC.FlyGuide.entities.AssinaturaPremium;

public class AssinaturaStatusDTO {

    private String status;
    private String cartaoBandeira;
    private String cartaoUltimos4;
    private LocalDate dataInicio;
    private LocalDate proximoVencimento;

    public AssinaturaStatusDTO(AssinaturaPremium assinatura) {
        this.status = assinatura.getStatus();
        this.cartaoBandeira = assinatura.getCartaoBandeira();
        this.cartaoUltimos4 = assinatura.getCartaoUltimos4();
        this.dataInicio = assinatura.getDataInicio();
        this.proximoVencimento = assinatura.getProximoVencimento();
    }

    public String getStatus() { return status; }
    public String getCartaoBandeira() { return cartaoBandeira; }
    public String getCartaoUltimos4() { return cartaoUltimos4; }
    public LocalDate getDataInicio() { return dataInicio; }
    public LocalDate getProximoVencimento() { return proximoVencimento; }
}