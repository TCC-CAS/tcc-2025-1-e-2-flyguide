package com.TCC.FlyGuide.DTO;

/**
 * Resultado de busca de locais via Google Places API.
 * Campos premium (rating, priceLevel, openNow, acessivel) são retornados
 * apenas para usuários com tipoConta = "Premium".
 */
public class LocalBuscaDTO {

    private String placeId;
    private String nome;
    private String endereco;
    private String tipo;
    private Double latitude;
    private Double longitude;

    // Campos PREMIUM — null para usuários FREE
    private Double  rating;
    private Integer priceLevel;
    private Boolean openNow;
    private Boolean acessivel;

    public LocalBuscaDTO() {}

    public String getPlaceId()                    { return placeId; }
    public void setPlaceId(String placeId)         { this.placeId = placeId; }

    public String getNome()                        { return nome; }
    public void setNome(String nome)               { this.nome = nome; }

    public String getEndereco()                    { return endereco; }
    public void setEndereco(String endereco)        { this.endereco = endereco; }

    public String getTipo()                        { return tipo; }
    public void setTipo(String tipo)               { this.tipo = tipo; }

    public Double getLatitude()                    { return latitude; }
    public void setLatitude(Double latitude)        { this.latitude = latitude; }

    public Double getLongitude()                   { return longitude; }
    public void setLongitude(Double longitude)      { this.longitude = longitude; }

    public Double getRating()                      { return rating; }
    public void setRating(Double rating)           { this.rating = rating; }

    public Integer getPriceLevel()                 { return priceLevel; }
    public void setPriceLevel(Integer priceLevel)  { this.priceLevel = priceLevel; }

    public Boolean getOpenNow()                    { return openNow; }
    public void setOpenNow(Boolean openNow)         { this.openNow = openNow; }

    public Boolean getAcessivel()                  { return acessivel; }
    public void setAcessivel(Boolean acessivel)     { this.acessivel = acessivel; }
}
