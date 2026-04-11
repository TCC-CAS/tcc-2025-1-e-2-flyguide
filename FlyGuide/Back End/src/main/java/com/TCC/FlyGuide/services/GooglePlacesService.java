package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.LocalBuscaDTO;
import com.TCC.FlyGuide.DTO.PlaceDetailsDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class GooglePlacesService {

    private static final String TEXT_SEARCH_URL =
            "https://maps.googleapis.com/maps/api/place/textsearch/json";

    private static final String DETAILS_URL =
            "https://maps.googleapis.com/maps/api/place/details/json";

    // Tipos genéricos que não agregam valor ao campo "tipo"
    private static final Set<String> TIPOS_IGNORADOS = Set.of(
            "point_of_interest", "establishment", "premise", "political", "geocode"
    );

    @Value("${google.places.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Busca locais no mundo inteiro via Google Places Text Search.
     * Retorna lista de LocalBuscaDTO com os campos básicos.
     */
    @SuppressWarnings("unchecked")
    public List<LocalBuscaDTO> buscarLocais(String query) {
        List<LocalBuscaDTO> resultado = new ArrayList<>();

        if (apiKey == null || apiKey.isBlank() || query == null || query.isBlank()) {
            return resultado;
        }

        try {
            String url = UriComponentsBuilder.fromUriString(TEXT_SEARCH_URL)
                    .queryParam("query", query)
                    .queryParam("language", "pt-BR")
                    .queryParam("key", apiKey)
                    .toUriString();

            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return resultado;

            List<?> results = (List<?>) response.get("results");
            if (results == null) return resultado;

            for (Object item : results) {
                Map<?, ?> place = (Map<?, ?>) item;

                LocalBuscaDTO dto = new LocalBuscaDTO();
                dto.setPlaceId((String) place.get("place_id"));
                dto.setNome((String) place.get("name"));
                dto.setEndereco((String) place.get("formatted_address"));
                dto.setTipo(extrairTipo((List<?>) place.get("types")));

                // Coordenadas
                Map<?, ?> geometry = (Map<?, ?>) place.get("geometry");
                if (geometry != null) {
                    Map<?, ?> location = (Map<?, ?>) geometry.get("location");
                    if (location != null) {
                        dto.setLatitude(((Number) location.get("lat")).doubleValue());
                        dto.setLongitude(((Number) location.get("lng")).doubleValue());
                    }
                }

                // Campos premium — populados pelo Text Search quando disponíveis
                if (place.get("rating") != null) {
                    dto.setRating(((Number) place.get("rating")).doubleValue());
                }
                if (place.get("price_level") != null) {
                    dto.setPriceLevel(((Number) place.get("price_level")).intValue());
                }
                Map<?, ?> openingHours = (Map<?, ?>) place.get("opening_hours");
                if (openingHours != null) {
                    dto.setOpenNow((Boolean) openingHours.get("open_now"));
                }

                resultado.add(dto);
            }

        } catch (Exception e) {
            // Falha na API retorna lista vazia sem quebrar o sistema
        }

        return resultado;
    }

    /**
     * Busca acessibilidade de um local específico via Place Details.
     * Chamado apenas para filtros premium de acessibilidade.
     */
    @SuppressWarnings("unchecked")
    public Boolean buscarAcessibilidade(String placeId) {
        if (apiKey == null || apiKey.isBlank()) return null;

        try {
            String url = UriComponentsBuilder.fromUriString(DETAILS_URL)
                    .queryParam("place_id", placeId)
                    .queryParam("fields", "wheelchair_accessible_entry")
                    .queryParam("key", apiKey)
                    .toUriString();

            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return null;

            Map<?, ?> result = (Map<?, ?>) response.get("result");
            if (result == null) return null;

            return (Boolean) result.get("wheelchair_accessible_entry");

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Busca detalhes completos de um local pelo placeId (usado internamente).
     */
    @SuppressWarnings("unchecked")
    public PlaceDetailsDTO buscarDetalhes(String placeId) {
        if (apiKey == null || apiKey.isBlank()) return new PlaceDetailsDTO();

        try {
            String url = UriComponentsBuilder.fromUriString(DETAILS_URL)
                    .queryParam("place_id", placeId)
                    .queryParam("fields", "rating,price_level,opening_hours,wheelchair_accessible_entry")
                    .queryParam("key", apiKey)
                    .toUriString();

            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response == null) return new PlaceDetailsDTO();

            Map<?, ?> result = (Map<?, ?>) response.get("result");
            if (result == null) return new PlaceDetailsDTO();

            Double  rating     = result.get("rating") != null
                    ? ((Number) result.get("rating")).doubleValue() : null;
            Integer priceLevel = result.get("price_level") != null
                    ? ((Number) result.get("price_level")).intValue() : null;

            Boolean openNow = null;
            Map<?, ?> openingHours = (Map<?, ?>) result.get("opening_hours");
            if (openingHours != null) openNow = (Boolean) openingHours.get("open_now");

            Boolean acessivel = (Boolean) result.get("wheelchair_accessible_entry");

            return new PlaceDetailsDTO(rating, priceLevel, openNow, acessivel);

        } catch (Exception e) {
            return new PlaceDetailsDTO();
        }
    }

    private String extrairTipo(List<?> types) {
        if (types == null) return null;
        return types.stream()
                .map(Object::toString)
                .filter(t -> !TIPOS_IGNORADOS.contains(t))
                .findFirst()
                .orElse(null);
    }
}
