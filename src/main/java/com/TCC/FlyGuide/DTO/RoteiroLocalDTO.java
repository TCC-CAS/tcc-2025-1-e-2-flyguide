package com.TCC.FlyGuide.DTO;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.TCC.FlyGuide.entities.RoteiroLocal;

public class RoteiroLocalDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long idRoteiroLocal;
    private Long idRoteiro;

    private Long idLocal;
    private String placeId; // opcional (ajuda no front)
    private String nome;    // opcional (ajuda no front)

    private String status;
    private String observacoes;

    private Integer dia;
    private Integer ordem;

    private LocalDateTime criadoEm;

    public RoteiroLocalDTO() {
    }

    public RoteiroLocalDTO(
            Long idRoteiroLocal,
            Long idRoteiro,
            Long idLocal,
            String placeId,
            String nome,
            String status,
            String observacoes,
            Integer dia,
            Integer ordem,
            LocalDateTime criadoEm
    ) {
        this.idRoteiroLocal = idRoteiroLocal;
        this.idRoteiro = idRoteiro;
        this.idLocal = idLocal;
        this.placeId = placeId;
        this.nome = nome;
        this.status = status;
        this.observacoes = observacoes;
        this.dia = dia;
        this.ordem = ordem;
        this.criadoEm = criadoEm;
    }

    // Construtor auxiliar: Entity -> DTO
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

        this.status = entity.getStatus();
        this.observacoes = entity.getObservacoes();
        this.dia = entity.getDia();
        this.ordem = entity.getOrdem();
        this.criadoEm = entity.getCriadoEm();
    }

    public Long getIdRoteiroLocal() {
        return idRoteiroLocal;
    }

    public void setIdRoteiroLocal(Long idRoteiroLocal) {
        this.idRoteiroLocal = idRoteiroLocal;
    }

    public Long getIdRoteiro() {
        return idRoteiro;
    }

    public void setIdRoteiro(Long idRoteiro) {
        this.idRoteiro = idRoteiro;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }

    public Integer getDia() {
        return dia;
    }

    public void setDia(Integer dia) {
        this.dia = dia;
    }

    public Integer getOrdem() {
        return ordem;
    }

    public void setOrdem(Integer ordem) {
        this.ordem = ordem;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }
}