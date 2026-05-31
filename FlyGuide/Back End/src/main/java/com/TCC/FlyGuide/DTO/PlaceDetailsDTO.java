package com.TCC.FlyGuide.DTO;

/**
 * Dados retornados pela Google Places API para um local específico.
 */
public class PlaceDetailsDTO {

    private Double  rating;       // Avaliação (0.0 a 5.0)
    private Integer priceLevel;   // Nível de preço (0 = grátis, 4 = muito caro)
    private Boolean openNow;      // Aberto agora
    private Boolean acessivel;    // Acessível para cadeirantes

    public PlaceDetailsDTO() {}

    public PlaceDetailsDTO(Double rating, Integer priceLevel, Boolean openNow, Boolean acessivel) {
        this.rating     = rating;
        this.priceLevel = priceLevel;
        this.openNow    = openNow;
        this.acessivel  = acessivel;
    }

    public Double getRating()                   { return rating; }
    public void setRating(Double rating)         { this.rating = rating; }

    public Integer getPriceLevel()               { return priceLevel; }
    public void setPriceLevel(Integer priceLevel) { this.priceLevel = priceLevel; }

    public Boolean getOpenNow()                  { return openNow; }
    public void setOpenNow(Boolean openNow)       { this.openNow = openNow; }

    public Boolean getAcessivel()                { return acessivel; }
    public void setAcessivel(Boolean acessivel)   { this.acessivel = acessivel; }
}
