package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.TCC.FlyGuide.entities.Local;

public class LocalDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idLocal;
    private String placeId;

    private String nome;
    private String endereco;
    private String tipo;

    private BigDecimal latitude;
    private BigDecimal longitude;

    private LocalDateTime atualizadoEm;

    public LocalDTO() {
    }

    public LocalDTO(
            Long idLocal,
            String placeId,
            String nome,
            String endereco,
            String tipo,
            BigDecimal latitude,
            BigDecimal longitude,
            LocalDateTime atualizadoEm
    ) {
        this.idLocal = idLocal;
        this.placeId = placeId;
        this.nome = nome;
        this.endereco = endereco;
        this.tipo = tipo;
        this.latitude = latitude;
        this.longitude = longitude;
        this.atualizadoEm = atualizadoEm;
    }

    // Construtor auxiliar: Entity -> DTO
    public LocalDTO(Local entity) {
        this.idLocal = entity.getIdLocal();
        this.placeId = entity.getPlaceId();
        this.nome = entity.getNome();
        this.endereco = entity.getEndereco();
        this.tipo = entity.getTipo();
        this.latitude = entity.getLatitude();
        this.longitude = entity.getLongitude();
        this.atualizadoEm = entity.getAtualizadoEm();
    }

    public Long getIdLocal() {
        return idLocal;
    }

    public void setIdLocal(Long idLocal) {
        this.idLocal = idLocal;
    }

    public String getPlaceId() {
        return placeId;
    }

    public void setPlaceId(String placeId) {
        this.placeId = placeId;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(LocalDateTime atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }
}