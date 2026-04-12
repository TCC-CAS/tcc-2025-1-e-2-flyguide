package com.TCC.FlyGuide.DTO;

import java.time.LocalDate;

import com.TCC.FlyGuide.entities.AssinaturaPremium;

public class AssinaturaStatusDTO {

    private String status;
    private LocalDate dataInicio;
    private LocalDate proximoVencimento;
    private String asaasSubscriptionId;

    public AssinaturaStatusDTO(AssinaturaPremium assinatura) {
        this.status = assinatura.getStatus();
        this.dataInicio = assinatura.getDataInicio();
        this.proximoVencimento = assinatura.getProximoVencimento();
        this.asaasSubscriptionId = assinatura.getAsaasSubscriptionId();
    }

    public String getStatus() {
        return status;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public LocalDate getProximoVencimento() {
        return proximoVencimento;
    }

    public String getAsaasSubscriptionId() {
        return asaasSubscriptionId;
    }
}
