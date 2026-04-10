package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.TCC.FlyGuide.entities.RoteiroLocal;

public class RoteiroLocalDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idRoteiroLocal;
    private Long idRoteiro;

    private Long idLocal;
    private String placeId;
    private String nome;
    private String endereco;
    private BigDecimal latitude;
    private BigDecimal longitude;

    private String status;
    private String observacoes;

    private Integer dia;
    private Integer ordem;
    private LocalTime horario;

    private LocalDateTime criadoEm;

    public RoteiroLocalDTO() {}

    public RoteiroLocalDTO(RoteiroLocal entity) {
        this.idRoteiroLocal = entity.getIdRoteiroLocal();

        this.idRoteiro = (entity.getRoteiro() != null)
                ? entity.getRoteiro().getIdRoteiro()
                : null;

        this.idLocal = (entity.getLocal() != null)
                ? entity.getLocal().getIdLocal()
                : null;

        this.placeId = (entity.getLocal() != null)
                ? entity.getLocal().getPlaceId()
                : null;

        this.nome = (entity.getLocal() != null)
                ? entity.getLocal().getNome()
                : null;

        this.endereco = (entity.getLocal() != null)
                ? entity.getLocal().getEndereco()
                : null;

        this.latitude = (entity.getLocal() != null)
                ? entity.getLocal().getLatitude()
                : null;

        this.longitude = (entity.getLocal() != null)
                ? entity.getLocal().getLongitude()
                : null;

        this.status      = entity.getStatus();
        this.observacoes = entity.getObservacoes();
        this.dia         = entity.getDia();
        this.ordem       = entity.getOrdem();
        this.horario     = entity.getHorario();
        this.criadoEm    = entity.getCriadoEm();
    }

    public Long getIdRoteiroLocal()                        { return idRoteiroLocal; }
    public void setIdRoteiroLocal(Long idRoteiroLocal)     { this.idRoteiroLocal = idRoteiroLocal; }

    public Long getIdRoteiro()                             { return idRoteiro; }
    public void setIdRoteiro(Long idRoteiro)               { this.idRoteiro = idRoteiro; }

    public Long getIdLocal()                               { return idLocal; }
    public void setIdLocal(Long idLocal)                   { this.idLocal = idLocal; }

    public String getPlaceId()                             { return placeId; }
    public void setPlaceId(String placeId)                 { this.placeId = placeId; }

    public String getNome()                                { return nome; }
    public void setNome(String nome)                       { this.nome = nome; }

    public String getEndereco()                            { return endereco; }
    public void setEndereco(String endereco)               { this.endereco = endereco; }

    public BigDecimal getLatitude()                        { return latitude; }
    public void setLatitude(BigDecimal latitude)           { this.latitude = latitude; }

    public BigDecimal getLongitude()                       { return longitude; }
    public void setLongitude(BigDecimal longitude)         { this.longitude = longitude; }

    public String getStatus()                              { return status; }
    public void setStatus(String status)                   { this.status = status; }

    public String getObservacoes()                         { return observacoes; }
    public void setObservacoes(String observacoes)         { this.observacoes = observacoes; }

    public Integer getDia()                                { return dia; }
    public void setDia(Integer dia)                        { this.dia = dia; }

    public Integer getOrdem()                              { return ordem; }
    public void setOrdem(Integer ordem)                    { this.ordem = ordem; }

    public LocalTime getHorario()                         { return horario; }
    public void setHorario(LocalTime horario)             { this.horario = horario; }

    public LocalDateTime getCriadoEm()                    { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)       { this.criadoEm = criadoEm; }
}