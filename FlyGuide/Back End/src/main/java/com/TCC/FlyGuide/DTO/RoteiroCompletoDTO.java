package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.util.List;

public class RoteiroCompletoDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private RoteiroDTO roteiro;
    private List<RoteiroLocalDTO> locais;

    public RoteiroCompletoDTO() {
    }

    public RoteiroCompletoDTO(RoteiroDTO roteiro, List<RoteiroLocalDTO> locais) {
        this.roteiro = roteiro;
        this.locais = locais;
    }

    public RoteiroDTO getRoteiro() {
        return roteiro;
    }

    public void setRoteiro(RoteiroDTO roteiro) {
        this.roteiro = roteiro;
    }

    public List<RoteiroLocalDTO> getLocais() {
        return locais;
    }

    public void setLocais(List<RoteiroLocalDTO> locais) {
        this.locais = locais;
    }
}