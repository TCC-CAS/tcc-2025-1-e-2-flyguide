package com.TCC.FlyGuide.DTO;

import java.time.LocalDate;

public class TrialStatusDTO {

    /**
     * true  → usuário está dentro do período de trial ativo
     * false → trial expirado, cancelado ou não aplicável
     */
    private boolean emTrial;

    /** true → os 30 dias já passaram */
    private boolean expirado;

    /** Dias restantes do trial (0 se já expirou) */
    private int diasRestantes;

    /** Data em que o trial expira/expirou */
    private LocalDate dataExpiracao;

    /**
     * Estado atual da conta após a verificação:
     * TRIAL, FREE ou PREMIUM
     */
    private String tipoConta;

    public TrialStatusDTO(boolean emTrial, boolean expirado, int diasRestantes,
                          LocalDate dataExpiracao, String tipoConta) {
        this.emTrial = emTrial;
        this.expirado = expirado;
        this.diasRestantes = diasRestantes;
        this.dataExpiracao = dataExpiracao;
        this.tipoConta = tipoConta;
    }

    public boolean isEmTrial() {
        return emTrial;
    }

    public boolean isExpirado() {
        return expirado;
    }

    public int getDiasRestantes() {
        return diasRestantes;
    }

    public LocalDate getDataExpiracao() {
        return dataExpiracao;
    }

    public String getTipoConta() {
        return tipoConta;
    }
}
