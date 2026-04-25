package com.TCC.FlyGuide.entities;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_roteiro_local")
public class RoteiroLocal implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idRoteiroLocal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_roteiro")
    private Roteiro roteiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_local")
    private Local local;

    private String status;
    private String observacoes;

    private Integer dia;
    private Integer ordem;
    private LocalTime horario;

    private LocalDateTime criadoEm;

    public RoteiroLocal() {}

    public Long getIdRoteiroLocal()                        { return idRoteiroLocal; }
    public void setIdRoteiroLocal(Long idRoteiroLocal)     { this.idRoteiroLocal = idRoteiroLocal; }

    public Roteiro getRoteiro()                            { return roteiro; }
    public void setRoteiro(Roteiro roteiro)                { this.roteiro = roteiro; }

    public Local getLocal()                                { return local; }
    public void setLocal(Local local)                      { this.local = local; }

    public String getStatus()                              { return status; }
    public void setStatus(String status)                   { this.status = status; }

    public String getObservacoes()                         { return observacoes; }
    public void setObservacoes(String observacoes)         { this.observacoes = observacoes; }

    public Integer getDia()                                { return dia; }
    public void setDia(Integer dia)                        { this.dia = dia; }

    public Integer getOrdem()                              { return ordem; }
    public void setOrdem(Integer ordem)                    { this.ordem = ordem; }

    public LocalTime getHorario()                          { return horario; }
    public void setHorario(LocalTime horario)              { this.horario = horario; }

    public LocalDateTime getCriadoEm()                     { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm)        { this.criadoEm = criadoEm; }

    @Override
    public int hashCode() { return (idRoteiroLocal == null) ? 0 : idRoteiroLocal.hashCode(); }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        RoteiroLocal other = (RoteiroLocal) obj;
        if (idRoteiroLocal == null) return other.idRoteiroLocal == null;
        return idRoteiroLocal.equals(other.idRoteiroLocal);
    }
}