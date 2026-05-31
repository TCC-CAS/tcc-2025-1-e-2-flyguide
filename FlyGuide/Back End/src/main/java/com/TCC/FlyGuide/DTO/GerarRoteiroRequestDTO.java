package com.TCC.FlyGuide.DTO;

public class GerarRoteiroRequestDTO {

    private String cidade;
    private String estado;
    private String pais;
    private Integer diasTotais;
    private String tipoRoteiro;
    private String  periodoCheckin;
    private String  periodoCheckout;
    private boolean destinoPontoTuristico;
    private Double  latitude;
    private Double  longitude;
    private String  stateCode;

    public GerarRoteiroRequestDTO() {}

    public String getCidade()              { return cidade; }
    public void setCidade(String cidade)   { this.cidade = cidade; }

    public String getEstado()              { return estado; }
    public void setEstado(String estado)   { this.estado = estado; }

    public String getPais()                { return pais; }
    public void setPais(String pais)       { this.pais = pais; }

    public Integer getDiasTotais()         { return diasTotais; }
    public void setDiasTotais(Integer d)   { this.diasTotais = d; }

    public String getTipoRoteiro()         { return tipoRoteiro; }
    public void setTipoRoteiro(String t)   { this.tipoRoteiro = t; }

    public String getPeriodoCheckin()             { return periodoCheckin; }
    public void setPeriodoCheckin(String p)       { this.periodoCheckin = p; }

    public String getPeriodoCheckout()            { return periodoCheckout; }
    public void setPeriodoCheckout(String p)      { this.periodoCheckout = p; }

    public boolean isDestinoPontoTuristico()              { return destinoPontoTuristico; }
    public void setDestinoPontoTuristico(boolean v)       { this.destinoPontoTuristico = v; }

    public Double getLatitude()                           { return latitude; }
    public void setLatitude(Double latitude)              { this.latitude = latitude; }

    public Double getLongitude()                          { return longitude; }
    public void setLongitude(Double longitude)            { this.longitude = longitude; }

    public String getStateCode()                          { return stateCode; }
    public void setStateCode(String stateCode)            { this.stateCode = stateCode; }

    public boolean temCoordenadas() {
        return latitude != null && longitude != null;
    }

    private String enderecoDestino;
    public String getEnderecoDestino()                      { return enderecoDestino; }
    public void setEnderecoDestino(String enderecoDestino)  { this.enderecoDestino = enderecoDestino; }
}
