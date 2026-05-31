package com.TCC.FlyGuide.services;

import com.TCC.FlyGuide.DTO.GerarRoteiroRequestDTO;
import com.TCC.FlyGuide.DTO.GerarRoteiroResponseDTO;
import com.TCC.FlyGuide.DTO.LocalBuscaDTO;
import com.TCC.FlyGuide.entities.Imagem;
import com.TCC.FlyGuide.repositories.ImagemRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class GeradorRoteiroService {

    private static final Logger logger = LoggerFactory.getLogger(GeradorRoteiroService.class);

    @Value("${anthropic.api.key:}")
    private String anthropicApiKey;

    @Autowired
    private ImagemRepository imagemRepository;

    @Autowired
    private GooglePlacesService googlePlacesService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private static final String[] PERIODOS = {"manha", "tarde", "noite"};
    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_MODEL = "claude-sonnet-4-6";
    private static final Duration AI_REQUEST_TIMEOUT = Duration.ofMinutes(5);
    private static final int LONG_ROUTE_MIN_DAYS = 10;
    private static final int LONG_ROUTE_CHUNK_DAYS = 5;
    private static final int MAX_AI_TOKENS = 8192;
    private static final int MAX_DIAS_ROTEIRO = 30;

    public GerarRoteiroResponseDTO gerar(GerarRoteiroRequestDTO req) {
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            logger.warn("FALLBACK ativado para: {} — anthropic.api.key está vazio ou não configurado", req.getCidade());
            return fallback(req);
        }

        int dias = diasTotais(req);
        if (dias >= LONG_ROUTE_MIN_DAYS) {
            try {
                return gerarEmBlocos(req, dias);
            } catch (Exception e) {
                logger.error("Erro ao gerar roteiro longo em blocos para {}: {} | Stack trace:", req.getCidade(), e.getMessage(), e);
                return fallback(req);
            }
        }

        try {
            String prompt = buildPrompt(req);

            String systemMsg = "Você é um guia turístico profissional especializado em roteiros personalizados. "
                    + "Sua única saída deve ser JSON válido, sem markdown, sem texto adicional, sem comentários. "
                    + "Use SOMENTE nomes reais de locais pesquisáveis no Google Maps. "
                    + "Nunca use descrições genéricas como 'Passeio pelo centro', 'Restaurante típico' ou 'Galeria local'. "
                    + "Se não souber o nome real de um local, omita-o. "
                    + "O destino principal da viagem é \"" + req.getCidade() + "\" — ele deve aparecer em pelo menos uma atividade do roteiro.";

            Map<String, Object> reqMap = new HashMap<>();
            reqMap.put("model",       ANTHROPIC_MODEL);
            reqMap.put("max_tokens",  calcularMaxTokens(dias));
            reqMap.put("temperature", 0.7);
            reqMap.put("system",      systemMsg);
            reqMap.put("messages",    List.of(Map.of("role", "user", "content", prompt)));
            String requestBody = objectMapper.writeValueAsString(reqMap);

            logger.info("Chamando IA para: {}, modelo: {}", req.getCidade(), ANTHROPIC_MODEL);

            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(ANTHROPIC_URL))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(AI_REQUEST_TIMEOUT)
                    .build();

            HttpResponse<String> response = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());

            logger.info("Status HTTP da Anthropic: {}", response.statusCode());

            if (response.statusCode() != 200) {
                logger.error("Anthropic retornou status {} para {}. Body: {}", response.statusCode(), req.getCidade(), response.body());
                return fallback(req);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String text = root.path("content").get(0).path("text").asText("");
            text = stripMarkdown(text);

            JsonNode aiJson;
            try {
                aiJson = objectMapper.readTree(text);
            } catch (Exception parseEx) {
                int len = text.length();
                String trecho = len > 200 ? text.substring(0, 200) + "...[" + len + " chars total]" : text;
                logger.error("Falha ao parsear JSON da IA para {}. Trecho: [{}] | Erro: {}", req.getCidade(), trecho, parseEx.getMessage());
                return fallback(req);
            }

            String titulo = aiJson.path("titulo").asText("").trim();
            if (titulo.isBlank()) titulo = "Roteiro em " + req.getCidade();

            String descricao   = aiJson.path("descricao").asText("").trim();
            double orcamento   = aiJson.path("orcamentoEstimado").asDouble(0);
            String imagemChave = aiJson.path("imagemChave").asText("cidade").trim();

            List<Map<String, Object>> sugestoes = new ArrayList<>();
            JsonNode sugestoesNode = aiJson.path("sugestoes");
            if (sugestoesNode.isArray()) {
                // Deduplicação global: nenhum local pode aparecer duas vezes no roteiro inteiro
                Set<String> usedNomesAI = new HashSet<>();
                boolean isPOIAI   = req.isDestinoPontoTuristico();
                int     diasTotal = req.getDiasTotais() != null ? req.getDiasTotais() : 1;
                String  cidadeNorm = req.getCidade() != null ? req.getCidade().toLowerCase().trim() : "";

                for (JsonNode diaNode : sugestoesNode) {
                    Map<String, Object> diaMap = new HashMap<>();
                    int diaNum = diaNode.path("dia").asInt();
                    diaMap.put("dia", diaNum);

                    JsonNode periodosNode = diaNode.path("periodos");
                    if (periodosNode.isObject()) {
                        Map<String, Object> periodosMap = new HashMap<>();
                        for (String periodo : PERIODOS) {
                            JsonNode periodoNode = periodosNode.path(periodo);
                            if (periodoNode.isArray()) {
                                List<Map<String, Object>> locaisPeriodo = new ArrayList<>();
                                for (JsonNode localNode : periodoNode) {
                                    String nome = localNode.path("nome").asText("").trim();
                                    if (nome.isEmpty()) continue;
                                    String nomeLow = nome.toLowerCase();
                                    // Remove duplicatas globais (mesmo nome em qualquer dia/período)
                                    if (usedNomesAI.contains(nomeLow)) continue;
                                    // Para POI multi-dia: bloqueia variantes do destino no Dia 1
                                    if (isPOIAI && diasTotal > 1 && diaNum == 1
                                            && !cidadeNorm.isEmpty()
                                            && (nomeLow.startsWith(cidadeNorm) || cidadeNorm.startsWith(nomeLow))) {
                                        continue;
                                    }
                                    usedNomesAI.add(nomeLow);
                                    Map<String, Object> localMap = new HashMap<>();
                                    localMap.put("nome", nome);
                                    String custo = localNode.path("custo").asText("").trim();
                                    if (!custo.isEmpty()) localMap.put("custo", custo);
                                    locaisPeriodo.add(localMap);
                                }
                                periodosMap.put(periodo, locaisPeriodo);
                            }
                        }
                        diaMap.put("periodos", periodosMap);
                    } else {
                        // Fallback: parser antigo com locais flat
                        List<Map<String, Object>> locais = new ArrayList<>();
                        for (JsonNode localNode : diaNode.path("locais")) {
                            String nome = localNode.isTextual()
                                    ? localNode.asText().trim()
                                    : localNode.path("nome").asText("").trim();
                            if (nome.isEmpty() || usedNomesAI.contains(nome.toLowerCase())) continue;
                            usedNomesAI.add(nome.toLowerCase());
                            Map<String, Object> localMap = new HashMap<>();
                            localMap.put("nome", nome);
                            if (!localNode.isTextual()) {
                                String custo = localNode.path("custo").asText("").trim();
                                if (!custo.isEmpty()) localMap.put("custo", custo);
                            }
                            locais.add(localMap);
                        }
                        diaMap.put("locais", locais);
                    }
                    sugestoes.add(diaMap);
                }
            }

            if (!sugestoes.isEmpty()) addCheckinCheckoutMarkers(sugestoes, req);
            GerarRoteiroResponseDTO resp = montarResposta(titulo, descricao, BigDecimal.valueOf(orcamento), imagemChave);
            if (!sugestoes.isEmpty()) resp.setSugestoes(sugestoes);
            return resp;

        } catch (Exception e) {
            logger.error("Erro ao chamar IA para {}: {} | Stack trace:", req.getCidade(), e.getMessage(), e);
            return fallback(req);
        }
    }

    private GerarRoteiroResponseDTO gerarEmBlocos(GerarRoteiroRequestDTO req, int dias) throws Exception {
        logger.info("Gerando roteiro longo em blocos: {} dias para {}", dias, req.getCidade());

        List<Map<String, Object>> sugestoes = new ArrayList<>();
        Set<String> usedNomes = new LinkedHashSet<>();

        String titulo = null;
        String descricao = null;
        String imagemChave = tipoParaChave(req.getTipoRoteiro());
        BigDecimal orcamento = BigDecimal.ZERO;

        for (int inicio = 1; inicio <= dias; inicio += LONG_ROUTE_CHUNK_DAYS) {
            int fim = Math.min(dias, inicio + LONG_ROUTE_CHUNK_DAYS - 1);
            try {
                AiRouteData bloco = gerarBlocoComIa(req, inicio, fim, dias, usedNomes);
                if (isBlank(titulo) && !isBlank(bloco.titulo)) titulo = bloco.titulo;
                if (isBlank(descricao) && !isBlank(bloco.descricao)) descricao = bloco.descricao;
                if (!isBlank(bloco.imagemChave)) imagemChave = bloco.imagemChave;
                if (bloco.orcamento != null) orcamento = orcamento.add(bloco.orcamento);
                sugestoes.addAll(bloco.sugestoes);
            } catch (Exception blocoEx) {
                logger.warn("Falha no bloco {}-{} de {}. Usando fallback parcial. Motivo: {}",
                        inicio, fim, req.getCidade(), blocoEx.getMessage());
                sugestoes.addAll(gerarFallbackBloco(req, inicio, fim, usedNomes));
            }
        }

        if (sugestoes.isEmpty()) {
            throw new IllegalStateException("Nenhum bloco retornou sugestoes");
        }

        sugestoes.sort(Comparator.comparingInt(d -> asInt(d.get("dia"), 0)));
        addCheckinCheckoutMarkers(sugestoes, req);

        if (isBlank(titulo)) titulo = "Roteiro em " + req.getCidade();
        if (isBlank(descricao)) {
            descricao = "Uma viagem inesquecivel para " + req.getCidade()
                    + (req.getPais() != null && !req.getPais().isBlank() ? ", " + req.getPais() : "") + ".";
        }

        GerarRoteiroResponseDTO resp = montarResposta(titulo, descricao, orcamento, imagemChave);
        resp.setSugestoes(sugestoes);
        return resp;
    }

    private AiRouteData gerarBlocoComIa(GerarRoteiroRequestDTO req, int inicio, int fim, int diasTotal,
                                        Set<String> usedNomes) throws Exception {
        String prompt = buildPromptBloco(req, inicio, fim, diasTotal, usedNomes);
        JsonNode aiJson = chamarAnthropicJson(req, prompt, calcularMaxTokens(fim - inicio + 1));
        AiRouteData data = parseAiJson(aiJson, req, usedNomes, inicio, fim);
        if (data.sugestoes.isEmpty()) {
            throw new IllegalStateException("Bloco sem sugestoes validas");
        }
        return data;
    }

    private JsonNode chamarAnthropicJson(GerarRoteiroRequestDTO req, String prompt, int maxTokens) throws Exception {
        Map<String, Object> reqMap = new HashMap<>();
        reqMap.put("model",       ANTHROPIC_MODEL);
        reqMap.put("max_tokens",  maxTokens);
        reqMap.put("temperature", 0.7);
        reqMap.put("system",      buildSystemMsg(req));
        reqMap.put("messages",    List.of(Map.of("role", "user", "content", prompt)));

        HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(ANTHROPIC_URL))
                .header("Content-Type", "application/json")
                .header("x-api-key", anthropicApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(reqMap)))
                .timeout(AI_REQUEST_TIMEOUT)
                .build();

        HttpResponse<String> response = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Anthropic retornou status " + response.statusCode()
                    + ": " + limitar(response.body(), 300));
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode content = root.path("content");
        if (!content.isArray() || content.isEmpty()) {
            throw new IllegalStateException("Resposta da Anthropic sem content");
        }

        String text = stripMarkdown(content.get(0).path("text").asText(""));
        if (text.isBlank()) {
            throw new IllegalStateException("Resposta da Anthropic vazia");
        }

        try {
            return objectMapper.readTree(text);
        } catch (Exception parseEx) {
            throw new IllegalStateException("JSON invalido da IA: " + limitar(text, 300), parseEx);
        }
    }

    private AiRouteData parseAiJson(JsonNode aiJson, GerarRoteiroRequestDTO req, Set<String> usedNomes,
                                    Integer diaInicio, Integer diaFim) {
        AiRouteData data = new AiRouteData();
        data.titulo = aiJson.path("titulo").asText("").trim();
        data.descricao = aiJson.path("descricao").asText("").trim();
        data.imagemChave = aiJson.path("imagemChave").asText("cidade").trim();
        data.orcamento = BigDecimal.valueOf(aiJson.path("orcamentoEstimado").asDouble(0));
        data.sugestoes = parseSugestoesIa(aiJson.path("sugestoes"), req, usedNomes, diaInicio, diaFim);
        return data;
    }

    private List<Map<String, Object>> parseSugestoesIa(JsonNode sugestoesNode, GerarRoteiroRequestDTO req,
                                                       Set<String> usedNomesAI,
                                                       Integer diaInicio, Integer diaFim) {
        List<Map<String, Object>> sugestoes = new ArrayList<>();
        if (!sugestoesNode.isArray()) return sugestoes;

        Set<String> used = usedNomesAI != null ? usedNomesAI : new HashSet<>();
        boolean isPOIAI = req.isDestinoPontoTuristico();
        int diasTotal = diasTotais(req);
        String cidadeNorm = req.getCidade() != null ? req.getCidade().toLowerCase().trim() : "";

        int offset = 0;
        for (JsonNode diaNode : sugestoesNode) {
            int defaultDia = diaInicio != null ? diaInicio + offset : diaNode.path("dia").asInt();
            int diaNum = diaNode.path("dia").asInt(defaultDia);
            if (diaInicio != null && diaFim != null && (diaNum < diaInicio || diaNum > diaFim)) {
                diaNum = defaultDia;
            }
            offset++;

            if (diaInicio != null && diaFim != null && (diaNum < diaInicio || diaNum > diaFim)) {
                continue;
            }

            Map<String, Object> diaMap = new HashMap<>();
            diaMap.put("dia", diaNum);

            JsonNode periodosNode = diaNode.path("periodos");
            if (periodosNode.isObject()) {
                Map<String, Object> periodosMap = new HashMap<>();
                for (String periodo : PERIODOS) {
                    JsonNode periodoNode = periodosNode.path(periodo);
                    List<Map<String, Object>> locaisPeriodo = new ArrayList<>();
                    if (periodoNode.isArray()) {
                        for (JsonNode localNode : periodoNode) {
                            Map<String, Object> local = parseLocalIa(localNode, used, isPOIAI, diasTotal, diaNum, cidadeNorm);
                            if (local != null) locaisPeriodo.add(local);
                        }
                    }
                    periodosMap.put(periodo, locaisPeriodo);
                }
                diaMap.put("periodos", periodosMap);
            } else {
                List<Map<String, Object>> locais = new ArrayList<>();
                for (JsonNode localNode : diaNode.path("locais")) {
                    Map<String, Object> local = parseLocalIa(localNode, used, isPOIAI, diasTotal, diaNum, cidadeNorm);
                    if (local != null) locais.add(local);
                }
                diaMap.put("locais", locais);
            }

            sugestoes.add(diaMap);
        }

        return sugestoes;
    }

    private Map<String, Object> parseLocalIa(JsonNode localNode, Set<String> used, boolean isPOI,
                                             int diasTotal, int diaNum, String cidadeNorm) {
        String nome = localNode.isTextual()
                ? localNode.asText("").trim()
                : localNode.path("nome").asText("").trim();
        if (nome.isEmpty()) return null;

        String nomeLow = nome.toLowerCase();
        if (used.contains(nomeLow)) return null;
        if (isPOI && diasTotal > 1 && diaNum == 1
                && !cidadeNorm.isEmpty()
                && (nomeLow.startsWith(cidadeNorm) || cidadeNorm.startsWith(nomeLow))) {
            return null;
        }

        used.add(nomeLow);
        Map<String, Object> localMap = new HashMap<>();
        localMap.put("nome", nome);
        if (!localNode.isTextual()) {
            String custo = localNode.path("custo").asText("").trim();
            if (!custo.isEmpty()) localMap.put("custo", custo);
        }
        return localMap;
    }

    private List<Map<String, Object>> gerarFallbackBloco(GerarRoteiroRequestDTO req, int inicio, int fim,
                                                         Set<String> usedNomes) {
        GerarRoteiroRequestDTO parcial = copiarRequest(req);
        parcial.setDiasTotais(fim - inicio + 1);
        parcial.setPeriodoCheckin(null);
        parcial.setPeriodoCheckout(null);
        parcial.setDestinoPontoTuristico(false);

        List<Map<String, Object>> diasFallback = gerarSugestoesFallback(parcial);
        for (Map<String, Object> dia : diasFallback) {
            int diaRelativo = asInt(dia.get("dia"), 1);
            dia.put("dia", inicio + diaRelativo - 1);
        }
        incluirPoiNoFallbackBloco(req, diasFallback, inicio, fim, usedNomes);
        return filtrarSugestoesComNomesUsados(diasFallback, usedNomes);
    }

    @SuppressWarnings("unchecked")
    private void incluirPoiNoFallbackBloco(GerarRoteiroRequestDTO req, List<Map<String, Object>> diasFallback,
                                           int inicio, int fim, Set<String> usedNomes) {
        if (!req.isDestinoPontoTuristico() || isBlank(req.getCidade())) return;

        int diaPoi = diasTotais(req) == 1 ? 1 : 2;
        if (diaPoi < inicio || diaPoi > fim) return;

        String nomeLow = req.getCidade().toLowerCase();
        if (usedNomes != null && usedNomes.contains(nomeLow)) return;

        for (Map<String, Object> dia : diasFallback) {
            if (asInt(dia.get("dia"), 0) != diaPoi) continue;
            Map<String, Object> periodos = (Map<String, Object>) dia.computeIfAbsent("periodos", k -> new HashMap<>());
            List<Map<String, Object>> tarde = (List<Map<String, Object>>) periodos.computeIfAbsent("tarde", k -> new ArrayList<>());
            Map<String, Object> poiItem = new HashMap<>();
            poiItem.put("nome", req.getCidade());
            poiItem.put("custo", "Preco varia");
            tarde.add(0, poiItem);
            return;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> filtrarSugestoesComNomesUsados(List<Map<String, Object>> dias,
                                                                     Set<String> usedNomes) {
        Set<String> used = usedNomes != null ? usedNomes : new HashSet<>();
        for (Map<String, Object> dia : dias) {
            Object periodosObj = dia.get("periodos");
            if (periodosObj instanceof Map<?, ?> periodos) {
                Map<String, Object> novosPeriodos = new HashMap<>();
                for (String periodo : PERIODOS) {
                    novosPeriodos.put(periodo, filtrarListaLocais(periodos.get(periodo), used));
                }
                dia.put("periodos", novosPeriodos);
            } else {
                dia.put("locais", filtrarListaLocais(dia.get("locais"), used));
            }
        }
        return dias;
    }

    private List<Map<String, Object>> filtrarListaLocais(Object listaObj, Set<String> used) {
        List<Map<String, Object>> filtrados = new ArrayList<>();
        if (!(listaObj instanceof List<?> lista)) return filtrados;

        for (Object item : lista) {
            String nome = extrairNomeLocal(item);
            if (isBlank(nome)) continue;
            String nomeLow = nome.toLowerCase();
            if (used.contains(nomeLow)) continue;
            used.add(nomeLow);
            filtrados.add(copiarLocal(item, nome));
        }
        return filtrados;
    }

    private String extrairNomeLocal(Object item) {
        if (item instanceof Map<?, ?> map) {
            Object nome = map.get("nome");
            return nome != null ? String.valueOf(nome).trim() : "";
        }
        return item != null ? String.valueOf(item).trim() : "";
    }

    private Map<String, Object> copiarLocal(Object item, String nome) {
        Map<String, Object> copy = new HashMap<>();
        if (item instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                copy.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        copy.put("nome", nome);
        return copy;
    }

    private GerarRoteiroRequestDTO copiarRequest(GerarRoteiroRequestDTO req) {
        GerarRoteiroRequestDTO copy = new GerarRoteiroRequestDTO();
        copy.setCidade(req.getCidade());
        copy.setEstado(req.getEstado());
        copy.setPais(req.getPais());
        copy.setDiasTotais(req.getDiasTotais());
        copy.setTipoRoteiro(req.getTipoRoteiro());
        copy.setPeriodoCheckin(req.getPeriodoCheckin());
        copy.setPeriodoCheckout(req.getPeriodoCheckout());
        copy.setDestinoPontoTuristico(req.isDestinoPontoTuristico());
        copy.setLatitude(req.getLatitude());
        copy.setLongitude(req.getLongitude());
        copy.setStateCode(req.getStateCode());
        copy.setEnderecoDestino(req.getEnderecoDestino());
        return copy;
    }

    private String buildPromptBloco(GerarRoteiroRequestDTO req, int inicio, int fim, int diasTotal,
                                    Set<String> usedNomes) {
        String cidade = req.getCidade() != null ? req.getCidade() : "";
        String estado = req.getEstado() != null ? req.getEstado() : "";
        String pais = req.getPais() != null ? req.getPais() : "";
        String tipo = req.getTipoRoteiro() != null ? req.getTipoRoteiro() : "Cidade";
        String localizacao = cidade
                + (!estado.isBlank() ? ", " + estado : "")
                + (!pais.isBlank() ? ", " + pais : "");

        String faseViagem = calcularFaseViagem(inicio, diasTotal);
        String zonaBloco = calcularZonaBloco(inicio, diasTotal, tipo);

        StringBuilder prompt = new StringBuilder();
        prompt.append("Gere um bloco de roteiro turistico em JSON. Responda SOMENTE JSON valido, sem markdown.\n\n");
        prompt.append("DESTINO: ").append(localizacao).append("\n");
        prompt.append("TIPO: ").append(tipo).append("\n");
        prompt.append("ROTEIRO TOTAL: ").append(diasTotal).append(" dias\n");
        prompt.append("BLOCO SOLICITADO: dias ").append(inicio).append(" a ").append(fim).append("\n");

        if (diasTotal >= 6) {
            prompt.append("FASE DA VIAGEM: ").append(faseViagem).append("\n");
            prompt.append("FOCO GEOGRAFICO DESTE BLOCO: ").append(zonaBloco).append("\n");
        }

        prompt.append("\nREGRAS DO BLOCO:\n");
        prompt.append("- Gere APENAS os dias ").append(inicio).append(" a ").append(fim).append(".\n");
        prompt.append("- Use numeracao absoluta dos dias, nao reinicie em 1 quando o bloco comecar depois do dia 1.\n");
        prompt.append("- Cada periodo ativo deve ter 3 a 4 atividades reais pesquisaveis no Google Maps.\n");
        prompt.append("- Use somente nomes reais de locais, restaurantes, museus, parques, bairros ou atracoes.\n");
        prompt.append("- Nao use nomes genericos como 'Restaurante tipico', 'Passeio pelo centro' ou 'Museu local'.\n");
        prompt.append("- Nao inclua hospedagem, check-in ou checkout como atividade.\n");
        prompt.append("- Evite repetir locais em qualquer dia deste bloco.\n");
        if (diasTotal >= 6) {
            prompt.append("- Concentre as atividades na zona indicada no FOCO GEOGRAFICO para garantir variedade com blocos anteriores.\n");
            prompt.append("- Os dias deste bloco devem ter tema coeso com a FASE DA VIAGEM indicada acima.\n");
        }

        String usados = nomesUsadosParaPrompt(usedNomes, 200);
        if (!usados.isBlank()) {
            prompt.append("- Locais ja usados em blocos anteriores — NAO repita nenhum: ").append(usados).append(".\n");
        }

        appendCheckinCheckoutBloco(prompt, req, inicio, fim, diasTotal);
        appendPoiBloco(prompt, req, inicio, fim, diasTotal);

        prompt.append("\nFORMATO JSON OBRIGATORIO:\n");
        prompt.append("{\"titulo\":\"\",\"descricao\":\"\",\"imagemChave\":\"cidade\",\"orcamentoEstimado\":0,");
        prompt.append("\"sugestoes\":[{\"dia\":").append(inicio).append(",\"periodos\":{");
        prompt.append("\"manha\":[{\"nome\":\"\"}],\"tarde\":[{\"nome\":\"\"}],\"noite\":[{\"nome\":\"\"}]");
        prompt.append("}}]}\n");
        prompt.append("- sugestoes deve ter exatamente ").append(fim - inicio + 1).append(" dia(s).\n");
        prompt.append("- imagemChave deve ser uma de: ").append(ImagemCatalogo.chavesPermitidasPrompt()).append(".\n");
        return prompt.toString();
    }

    private String calcularFaseViagem(int inicio, int diasTotal) {
        if (diasTotal <= 5) return "unica fase";
        double progresso = (double) inicio / diasTotal;
        if (progresso < 0.35) {
            return "FASE INICIAL — ambientacao, bairros centrais e principais atracoes iconicas do destino";
        } else if (progresso < 0.70) {
            return "FASE INTERMEDIARIA — aprofundamento em bairros tematicos, museus, gastronomia local e experiencias autenticas";
        } else {
            return "FASE FINAL — excursoes para arredores, experiencias especiais de despedida, compras e restaurantes premiados";
        }
    }

    private String calcularZonaBloco(int inicio, int diasTotal, String tipo) {
        int numBloco = (int) Math.ceil((double) inicio / LONG_ROUTE_CHUNK_DAYS);
        boolean isNatureza = "Natureza".equals(tipo) || "Praia".equals(tipo) || "Aventura".equals(tipo);
        boolean isGastro   = "Gastronomia".equals(tipo) || "Luxo".equals(tipo);
        String[] zonas;
        if (isNatureza) {
            zonas = new String[]{
                "praias, parques e atracoes naturais proximas ao centro",
                "trilhas, reservas ecologicas e pontos panoramicos",
                "ilhas, lagoas ou cachoeiras mais afastadas (passeio de dia)",
                "esportes e atividades ao ar livre em areas especificas",
                "mercados, feiras e bairros com culinaria regional",
                "experiencias de natureza exclusivas e pontos menos conhecidos"
            };
        } else if (isGastro) {
            zonas = new String[]{
                "restaurantes historicos, cafes tradicionais e mercados centrais",
                "bairros gastronomicos e adegas renomadas",
                "chefs estrelados, menus degustacao e experiencias premium",
                "feiras livres, street food e culinaria de rua autentica",
                "bares classicos, life noturna e coqueteis artesanais",
                "gastronomia de regioes vizinhas — excursao culinaria de dia"
            };
        } else {
            zonas = new String[]{
                "centro historico, pracas principais e atracoes iconicas",
                "museus, galerias de arte e centros culturais",
                "bairros tematicos, feiras e vida local autentica",
                "parques, jardins e espacos ao ar livre da cidade",
                "bairros alternativos, arte de rua e vida noturna",
                "arredores e cidades vizinhas — excursao de dia completo"
            };
        }
        return zonas[Math.min(numBloco - 1, zonas.length - 1)];
    }

    private void appendCheckinCheckoutBloco(StringBuilder prompt, GerarRoteiroRequestDTO req,
                                            int inicio, int fim, int diasTotal) {
        String checkin = req.getPeriodoCheckin();
        String checkout = req.getPeriodoCheckout();
        if (inicio == 1 && temCheckin(checkin)) {
            if ("tarde".equals(checkin)) {
                prompt.append("- Dia 1: manha deve ser [], tarde e noite ativos.\n");
            } else if ("noite".equals(checkin)) {
                prompt.append("- Dia 1: manha e tarde devem ser [], noite ativo.\n");
            }
        }
        if (fim == diasTotal && temCheckin(checkout)) {
            if ("manha".equals(checkout)) {
                prompt.append("- Dia ").append(diasTotal).append(": tarde e noite devem ser [].")
                      .append(" Manha: incluir de 2 a 3 atividades leves antes do checkout (cafe, loja de lembranças, passeio rapido proximo ao hotel).\n");
            } else if ("tarde".equals(checkout)) {
                prompt.append("- Dia ").append(diasTotal).append(": noite deve ser [].")
                      .append(" Manha e tarde: incluir atividades normais, aproveitando o destino ate a hora de partir.\n");
            }
        }
    }

    private void appendPoiBloco(StringBuilder prompt, GerarRoteiroRequestDTO req,
                                int inicio, int fim, int diasTotal) {
        if (!req.isDestinoPontoTuristico() || isBlank(req.getCidade())) return;

        int diaPoi = diasTotal == 1 ? 1 : 2;
        if (inicio <= diaPoi && fim >= diaPoi) {
            prompt.append("- O destino principal e uma atracao especifica: inclua \"")
                    .append(req.getCidade())
                    .append("\" no dia ")
                    .append(diaPoi)
                    .append(" no periodo tarde, usando exatamente esse nome.\n");
        } else {
            prompt.append("- O destino principal \"")
                    .append(req.getCidade())
                    .append("\" fica reservado para outro bloco; nao inclua neste bloco.\n");
        }
    }

    private String nomesUsadosParaPrompt(Set<String> usedNomes, int limite) {
        if (usedNomes == null || usedNomes.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (String nome : usedNomes) {
            if (isBlank(nome)) continue;
            if (count > 0) sb.append(", ");
            sb.append(nome);
            count++;
            if (count >= limite) break;
        }
        return sb.toString();
    }

    private String buildSystemMsg(GerarRoteiroRequestDTO req) {
        int dias = diasTotais(req);
        String base = "Voce e um guia turistico profissional especializado em roteiros personalizados. "
                + "Sua unica saida deve ser JSON valido, sem markdown, sem texto adicional e sem comentarios. "
                + "Use somente nomes reais de locais pesquisaveis no Google Maps. "
                + "Nunca use descricoes genericas como 'Passeio pelo centro', 'Restaurante tipico' ou 'Galeria local'. "
                + "Se nao souber o nome real de um local, omita-o. "
                + "Use o destino principal da viagem, \"" + req.getCidade() + "\", como contexto geografico do roteiro.";
        if (dias >= 10) {
            base += " Voce e especialista em roteiros de longa duracao: distribua as experiencias de forma progressiva, "
                    + "variando os bairros e zonas geograficas a cada bloco de dias, garantindo que o viajante "
                    + "explore facetas diferentes do destino sem repeticoes. Priorize coesao tematica e fluxo narrativo.";
        }
        return base;
    }

    private int diasTotais(GerarRoteiroRequestDTO req) {
        int d = req.getDiasTotais() != null && req.getDiasTotais() > 0 ? req.getDiasTotais() : 1;
        return Math.min(d, MAX_DIAS_ROTEIRO);
    }

    private int calcularMaxTokens(int dias) {
        return Math.min(MAX_AI_TOKENS, Math.max(4096, 3200 + dias * 1000));
    }

    private int asInt(Object value, int fallback) {
        if (value instanceof Number n) return n.intValue();
        try {
            return value != null ? Integer.parseInt(String.valueOf(value)) : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String limitar(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }

    private static class AiRouteData {
        String titulo;
        String descricao;
        String imagemChave;
        BigDecimal orcamento;
        List<Map<String, Object>> sugestoes = new ArrayList<>();
    }

    private GerarRoteiroResponseDTO montarResposta(String titulo, String descricao,
                                                    BigDecimal orcamento, String imagemChave) {
        GerarRoteiroResponseDTO resp = new GerarRoteiroResponseDTO();
        resp.setTitulo(titulo);
        resp.setDescricao(descricao);
        resp.setOrcamentoEstimado(orcamento);

        Imagem imagem = imagemRepository.findByChave(imagemChave)
                .orElseGet(() -> imagemRepository.findByChave("cidade").orElse(null));

        if (imagem != null) {
            resp.setIdImagem(imagem.getIdImagem());
            resp.setImagemChave(imagem.getChave());
            resp.setImagemUrl(imagem.getUrl());
        }

        return resp;
    }

    private GerarRoteiroResponseDTO fallback(GerarRoteiroRequestDTO req) {
        logger.warn("FALLBACK ativado para: {}", req.getCidade());
        String chave = tipoParaChave(req.getTipoRoteiro());
        String titulo = "Roteiro em " + req.getCidade();
        String descricao = "Uma viagem inesquecível para " + req.getCidade()
                + (req.getPais() != null && !req.getPais().isBlank() ? ", " + req.getPais() : "") + ".";
        GerarRoteiroResponseDTO resp = montarResposta(titulo, descricao, BigDecimal.ZERO, chave);
        resp.setSugestoes(gerarSugestoesFallback(req));
        return resp;
    }

    private List<Map<String, Object>> gerarSugestoesFallback(GerarRoteiroRequestDTO req) {
        int dias = req.getDiasTotais() != null ? req.getDiasTotais() : 1;
        String tipo   = req.getTipoRoteiro() != null ? req.getTipoRoteiro() : "Cidade";
        String cidade = req.getCidade()      != null ? req.getCidade()      : "destino";
        boolean isPOI = req.isDestinoPontoTuristico();

        String localidade = cidade + (req.getEstado() != null && !req.getEstado().isBlank()
                ? ", " + req.getEstado() : "");

        // Solicita o suficiente para cobrir todos os dias sem repetição
        int needed = dias * 12 + 10;
        int raio   = req.temCoordenadas() ? 8_000 : 0;

        List<String> manhaPool = buscarNomesReaisComFallback(queriesManha(tipo, localidade), req.getLatitude(), req.getLongitude(), raio, needed);
        List<String> tardePool = buscarNomesReaisComFallback(queriesTarde(tipo, localidade), req.getLatitude(), req.getLongitude(), raio, needed);
        List<String> noitePool = buscarNomesReaisComFallback(queriesNoite(tipo, localidade), req.getLatitude(), req.getLongitude(), raio, needed);

        logger.info("Fallback Google Places — manhã: {}, tarde: {}, noite: {} resultados para {}",
                manhaPool.size(), tardePool.size(), noitePool.size(), cidade);

        int manhaIdx = 0, tardeIdx = 0, noiteIdx = 0;
        Set<String> usedNomes = new HashSet<>();
        if (isPOI) usedNomes.add(cidade.toLowerCase());

        List<Map<String, Object>> sugestoes = new ArrayList<>();
        for (int dia = 1; dia <= dias; dia++) {
            Map<String, Object> diaMap = new HashMap<>();
            diaMap.put("dia", dia);
            Map<String, Object> periodosMap = new HashMap<>();

            // Manhã: exclusivamente resultados do Google Places
            List<Map<String, Object>> locaisManha = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                String nome = null;
                while (nome == null && manhaIdx < manhaPool.size()) {
                    String c = manhaPool.get(manhaIdx++);
                    if (!usedNomes.contains(c.toLowerCase())) nome = c;
                }
                if (nome != null) {
                    usedNomes.add(nome.toLowerCase());
                    Map<String, Object> item = new HashMap<>();
                    item.put("nome", nome);
                    item.put("custo", "Preço varia");
                    item.put("_replace", Boolean.TRUE);
                    locaisManha.add(item);
                }
            }
            periodosMap.put("manha", locaisManha);

            // Tarde: POI no dia correto + resultados do Google Places
            List<Map<String, Object>> locaisTarde = new ArrayList<>();
            boolean poiDay = isPOI && ((dias == 1 && dia == 1) || (dias > 1 && dia == 2));
            if (poiDay) {
                Map<String, Object> poiItem = new HashMap<>();
                poiItem.put("nome", cidade);
                poiItem.put("custo", "Preço varia");
                locaisTarde.add(poiItem);
            }
            for (int i = 0; i < 4; i++) {
                String nome = null;
                while (nome == null && tardeIdx < tardePool.size()) {
                    String c = tardePool.get(tardeIdx++);
                    if (!usedNomes.contains(c.toLowerCase())) nome = c;
                }
                if (nome != null) {
                    usedNomes.add(nome.toLowerCase());
                    Map<String, Object> item = new HashMap<>();
                    item.put("nome", nome);
                    item.put("custo", "Preço varia");
                    item.put("_replace", Boolean.TRUE);
                    locaisTarde.add(item);
                }
            }
            periodosMap.put("tarde", locaisTarde);

            // Noite: exclusivamente resultados do Google Places
            List<Map<String, Object>> locaisNoite = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                String nome = null;
                while (nome == null && noiteIdx < noitePool.size()) {
                    String c = noitePool.get(noiteIdx++);
                    if (!usedNomes.contains(c.toLowerCase())) nome = c;
                }
                if (nome != null) {
                    usedNomes.add(nome.toLowerCase());
                    Map<String, Object> item = new HashMap<>();
                    item.put("nome", nome);
                    item.put("custo", "Preço varia");
                    item.put("_replace", Boolean.TRUE);
                    locaisNoite.add(item);
                }
            }
            periodosMap.put("noite", locaisNoite);

            diaMap.put("periodos", periodosMap);
            sugestoes.add(diaMap);
        }

        addCheckinCheckoutMarkers(sugestoes, req);
        return sugestoes;
    }

    private List<String> buscarNomesReais(String query, int max) {
        return buscarNomesReaisProximos(query, null, null, 0, max);
    }

    private List<String> buscarNomesReaisProximos(String query, Double lat, Double lng, int raioMetros, int max) {
        try {
            List<LocalBuscaDTO> locais = (lat != null && lng != null && raioMetros > 0)
                    ? googlePlacesService.buscarLocaisProximos(query, lat, lng, raioMetros)
                    : googlePlacesService.buscarLocais(query);
            List<String> nomes = new ArrayList<>();
            for (LocalBuscaDTO local : locais) {
                String nome = local.getNome();
                if (nome != null && !nome.isBlank()) {
                    nomes.add(nome);
                    if (nomes.size() >= max) break;
                }
            }
            return nomes;
        } catch (Exception e) {
            logger.warn("Falha ao buscar locais reais para '{}': {}", query, e.getMessage());
            return new ArrayList<>();
        }
    }

    // Tenta cada query em sequência, acumulando até atingir `needed` sem repetir nomes
    private List<String> buscarNomesReaisComFallback(List<String> queries, Double lat, Double lng, int raio, int needed) {
        List<String> resultado = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String query : queries) {
            if (resultado.size() >= needed) break;
            List<String> parcial = buscarNomesReaisProximos(query, lat, lng, raio, needed);
            for (String nome : parcial) {
                if (!seen.contains(nome.toLowerCase())) {
                    seen.add(nome.toLowerCase());
                    resultado.add(nome);
                    if (resultado.size() >= needed) break;
                }
            }
        }
        logger.info("buscarNomesReaisComFallback: {} resultados via {} queries (primeira: {})",
                resultado.size(), queries.size(), queries.isEmpty() ? "-" : queries.get(0));
        return resultado;
    }

    private List<String> queriesManha(String tipo, String localidade) {
        String especifica = switch (tipo) {
            case "Praia"       -> "praias e orla " + localidade;
            case "Natureza"    -> "parques naturais e trilhas " + localidade;
            case "Aventura"    -> "esportes e aventura " + localidade;
            case "Cultural"    -> "museus e patrimônio histórico " + localidade;
            case "Gastronomia" -> "cafés e padarias " + localidade;
            case "Mochilão"    -> "pontos turísticos gratuitos " + localidade;
            case "Luxo"        -> "spas e hotéis de luxo " + localidade;
            case "Família"     -> "parques infantis e zoológico " + localidade;
            default            -> "pontos turísticos " + localidade;
        };
        return List.of(
            especifica,
            "pontos turísticos " + localidade,
            "museus e atrações " + localidade,
            "parques e praças " + localidade,
            "igrejas e monumentos " + localidade,
            "atrações turísticas " + localidade,
            "mercado e feiras " + localidade,
            "pontos de interesse " + localidade
        );
    }

    private List<String> queriesTarde(String tipo, String localidade) {
        String especifica = switch (tipo) {
            case "Praia"       -> "passeios de barco e mergulho " + localidade;
            case "Natureza"    -> "ecoturismo e reservas naturais " + localidade;
            case "Aventura"    -> "esportes radicais e escalada " + localidade;
            case "Cultural"    -> "centros culturais e galerias " + localidade;
            case "Gastronomia" -> "restaurantes e gastronomia " + localidade;
            case "Mochilão"    -> "praças e centros históricos " + localidade;
            case "Luxo"        -> "boutiques e lojas premium " + localidade;
            case "Família"     -> "parques aquáticos e diversão " + localidade;
            default            -> "atrações e passeios " + localidade;
        };
        return List.of(
            especifica,
            "restaurantes " + localidade,
            "atrações turísticas " + localidade,
            "lojas e comércio " + localidade,
            "centros culturais " + localidade,
            "praias e parques " + localidade,
            "pontos turísticos " + localidade,
            "estabelecimentos " + localidade
        );
    }

    private List<String> queriesNoite(String tipo, String localidade) {
        String especifica = switch (tipo) {
            case "Praia"       -> "restaurantes e bares beira-mar " + localidade;
            case "Natureza"    -> "pousadas e restaurantes regionais " + localidade;
            case "Aventura"    -> "bares e pubs " + localidade;
            case "Cultural"    -> "teatros e shows " + localidade;
            case "Gastronomia" -> "restaurantes e jantar " + localidade;
            case "Mochilão"    -> "bares e cervejarias " + localidade;
            case "Luxo"        -> "restaurantes sofisticados " + localidade;
            case "Família"     -> "restaurantes familiares " + localidade;
            default            -> "restaurantes e vida noturna " + localidade;
        };
        return List.of(
            especifica,
            "restaurantes " + localidade,
            "bares e restaurantes " + localidade,
            "gastronomia " + localidade,
            "pizzarias e lanchonetes " + localidade,
            "churrascarías e grelhados " + localidade,
            "cafés e sobremesas " + localidade,
            "estabelecimentos " + localidade
        );
    }

    private static final String[] PERIOD_ORDER = {"manha", "tarde", "noite"};

    @SuppressWarnings("unchecked")
    private void addCheckinCheckoutMarkers(List<Map<String, Object>> sugestoes, GerarRoteiroRequestDTO req) {
        String checkin  = req.getPeriodoCheckin();
        String checkout = req.getPeriodoCheckout();
        int    lastDay  = req.getDiasTotais() != null ? req.getDiasTotais() : 1;

        if (temCheckin(checkin)) {
            sugestoes.stream()
                .filter(d -> Integer.valueOf(1).equals(d.get("dia")))
                .findFirst()
                .ifPresent(dia -> {
                    Map<String, Object> periodos = (Map<String, Object>) dia.computeIfAbsent("periodos", k -> new HashMap<>());

                    // Clear periods that come before check-in (user hasn't arrived yet)
                    boolean reached = false;
                    for (String per : PERIOD_ORDER) {
                        if (per.equals(checkin)) { reached = true; }
                        if (!reached) { periodos.put(per, new ArrayList<>()); }
                    }

                    // Insert check-in marker as FIRST item of its period
                    List<Map<String, Object>> list = (List<Map<String, Object>>) periodos.computeIfAbsent(checkin, k -> new ArrayList<>());
                    Map<String, Object> marker = new HashMap<>();
                    marker.put("nome", "Check-in");
                    marker.put("_checkin", Boolean.TRUE);
                    list.add(0, marker);
                });
        }

        if (temCheckin(checkout)) {
            sugestoes.stream()
                .filter(d -> Integer.valueOf(lastDay).equals(d.get("dia")))
                .findFirst()
                .ifPresent(dia -> {
                    Map<String, Object> periodos = (Map<String, Object>) dia.computeIfAbsent("periodos", k -> new HashMap<>());

                    // Add checkout marker as LAST item of its period
                    List<Map<String, Object>> list = (List<Map<String, Object>>) periodos.computeIfAbsent(checkout, k -> new ArrayList<>());
                    Map<String, Object> marker = new HashMap<>();
                    marker.put("nome", "Checkout");
                    marker.put("_checkout", Boolean.TRUE);
                    list.add(marker);

                    // Clear periods that come after checkout (user has already left)
                    boolean passed = false;
                    for (String per : PERIOD_ORDER) {
                        if (passed) { periodos.put(per, new ArrayList<>()); }
                        if (per.equals(checkout)) { passed = true; }
                    }
                });
        }
    }

    private String tipoParaChave(String tipo) {
        if (tipo == null) return "cidade";
        return switch (tipo) {
            case "Aventura"    -> "aventura";
            case "Cultural"    -> "cultural";
            case "Praia"       -> "praia";
            case "Natureza"    -> "natureza";
            case "Gastronomia" -> "gastronomia";
            case "Mochilão"    -> "mochilao";
            case "Luxo"        -> "luxo";
            case "Família"     -> "familia";
            default            -> "cidade";
        };
    }

    private static boolean temCheckin(String p) { return p != null && !p.isBlank() && !p.equals("sem"); }

    private String buildPrompt(GerarRoteiroRequestDTO req) {
        int    dias     = diasTotais(req);
        String cidade   = req.getCidade()      != null ? req.getCidade()      : "";
        String estado   = req.getEstado()      != null ? req.getEstado()      : "";
        String pais     = req.getPais()        != null ? req.getPais()        : "";
        String tipo     = req.getTipoRoteiro() != null ? req.getTipoRoteiro() : "Cidade";
        int    seed     = (int)(System.currentTimeMillis() % 9000) + 1000;
        String checkinP  = req.getPeriodoCheckin();
        String checkoutP = req.getPeriodoCheckout();
        boolean isPOI   = req.isDestinoPontoTuristico();
        String endereco = req.getEnderecoDestino() != null && !req.getEnderecoDestino().isBlank()
                ? req.getEnderecoDestino() : null;

        String localizacao = cidade
                + (!estado.isBlank() ? ", " + estado : "")
                + (!pais.isBlank()   ? ", " + pais   : "");

        // Períodos bloqueados por checkin/checkout
        String bloqueioCheckin = "";
        if (temCheckin(checkinP)) {
            bloqueioCheckin = switch (checkinP) {
                case "tarde" -> "CHECK-IN NO DIA 1: turista chega na TARDE. Dia 1: manhã=[]. Dia 1 tarde e noite: de 3 a 4 atividades cada.\n";
                case "noite" -> "CHECK-IN NO DIA 1: turista chega à NOITE. Dia 1: manhã=[], tarde=[]. Dia 1 noite: de 3 a 4 atividades.\n";
                default -> "";
            };
        }
        String bloqueioCheckout = "";
        if (temCheckin(checkoutP)) {
            bloqueioCheckout = switch (checkoutP) {
                case "manha" -> "CHECKOUT NO DIA " + dias + ": turista parte de manhã. Dia " + dias + ": tarde=[], noite=[]. Manhã: de 3 a 4 atividades.\n";
                case "tarde" -> "CHECKOUT NO DIA " + dias + ": turista parte à tarde. Dia " + dias + ": noite=[]. Manhã e tarde: de 3 a 4 atividades cada.\n";
                default -> "";
            };
        }

        // Instrução específica para POI (ponto turístico como destino)
        String instrucaoPOI = "";
        if (isPOI) {
            instrucaoPOI = "\nDESTINO É UMA ATRAÇÃO ESPECÍFICA: \"" + cidade + "\""
                    + (endereco != null ? " (endereço: " + endereco + ")" : "") + ".\n"
                    + (dias == 1
                        ? "- Inclua \"" + cidade + "\" no Dia 1 (tarde). Demais atividades: região ao redor.\n"
                        : "- NÃO inclua \"" + cidade + "\" no Dia 1 (dia de chegada/ambientação).\n"
                        + "- Inclua \"" + cidade + "\" no Dia 2 (tarde). Use exatamente este nome.\n"
                        + "- Outros dias: atrações da região ao redor.\n")
                    + "- Nunca repita esta atração em outros períodos ou dias.\n";
        }

        // Perfil do tipo de viagem
        String perfilTipo = switch (tipo) {
            case "Praia"       -> "PRAIA: priorize praias, orla, quiosques, passeios costeiros, restaurantes beira-mar, mergulho.";
            case "Natureza"    -> "NATUREZA: priorize parques, trilhas, cachoeiras, reservas ecológicas, jardins botânicos, mirantes.";
            case "Aventura"    -> "AVENTURA: priorize esportes radicais, trilhas intensas, escalada, parques de aventura, adrenalina.";
            case "Cultural"    -> "CULTURAL: priorize museus, patrimônio histórico, arquitetura, arte urbana, centros culturais, gastronomia típica.";
            case "Gastronomia" -> "GASTRONOMIA: priorize restaurantes renomados, mercados, cafeterias, feiras gastronômicas, culinária típica local.";
            case "Mochilão"    -> "MOCHILÃO: priorize atrações gratuitas, experiências autênticas e locais, ótimo custo-benefício, mobilidade urbana.";
            case "Luxo"        -> "LUXO: priorize restaurantes sofisticados, rooftops, spas, experiências premium, bairros nobres, boutiques.";
            case "Família"     -> "FAMÍLIA: priorize parques, zoológicos, aquários, atrações interativas, segurança e conforto para todas as idades.";
            default            -> "CIDADE: priorize pontos turísticos famosos, bairros icônicos, mirantes, cafés, vida urbana, experiências clássicas.";
        };

        return "Gere um roteiro turístico em JSON para o destino abaixo. Responda SOMENTE com JSON válido, sem texto adicional.\n\n"
             + "=== DESTINO ===\n"
             + "- Local: " + localizacao + "\n"
             + "- Tipo de viagem: " + tipo + "\n"
             + "- Duração: " + dias + " dia" + (dias > 1 ? "s" : "") + "\n"
             + "- Variação #" + seed + "\n\n"
             + "=== PERFIL DA VIAGEM ===\n"
             + perfilTipo + "\n\n"
             + "=== REGRAS GEOGRÁFICAS ===\n"
             + "- Todos os locais devem estar na área de " + localizacao + " e arredores (até 8 km do centro).\n"
             + "- Agrupe os locais de cada período dentro do mesmo bairro ou zona (máximo 3 km entre eles).\n"
             + (!estado.isBlank() ? "- Apenas locais do estado \"" + estado + "\". Nunca inclua outros estados.\n" : "")
             + (!pais.isBlank()   ? "- Apenas locais em \"" + pais + "\". Nunca inclua outros países.\n" : "")
             + "- Agrupe atrações próximas no mesmo dia para minimizar deslocamentos.\n\n"
             + "=== REGRAS DE QUALIDADE ===\n"
             + "- Use SOMENTE nomes reais e pesquisáveis no Google Maps. Se não souber o nome real, OMITA — nunca invente.\n"
             + "- Para destinos internacionais, use o nome oficial do local (pode ser em outro idioma), ex: Tóquio → \"Senso-ji\", \"Shibuya Crossing\", \"TeamLab Borderless\".\n"
             + "- NOMES GENÉRICOS SÃO PROIBIDOS. Exemplos do que nunca gerar:\n"
             + "  ✗ \"Passeio pelo centro histórico\"  →  ✓ \"Praça da Sé\", \"Largo do Pelourinho\"\n"
             + "  ✗ \"Museu local\" / \"Galeria de arte\"  →  ✓ \"MASP\", \"Museu do Ipiranga\"\n"
             + "  ✗ \"Restaurante típico\" / \"Jantar regional\"  →  ✓ \"Mocotó\", \"D.O.M.\", \"Sushi Saito\"\n"
             + "  ✗ \"Bar temático\" / \"Vida noturna local\"  →  ✓ \"Skye Bar\", \"Frank Bar\"\n"
             + "  ✗ \"Trilha ecológica\" / \"Parque natural\"  →  ✓ \"Trilha da Pedra Grande\", \"Parque Estadual Serra do Mar\"\n"
             + "  ✗ \"Mercado gastronômico\"  →  ✓ \"Mercado Municipal de São Paulo\", \"Tsukiji Outer Market\"\n"
             + "  ✗ \"Bairro turístico a pé\"  →  ✓ \"Vila Madalena\", \"Bairro da Liberdade\", \"Shinjuku\"\n"
             + "- Cada local deve aparecer UMA ÚNICA VEZ em todo o roteiro.\n"
             + "- Não inclua hospedagem, check-in ou checkout como atividade.\n"
             + "- O destino principal (\"" + cidade + "\") deve aparecer em pelo menos uma atividade.\n"
             + instrucaoPOI + "\n"
             + "=== LÓGICA DE HORÁRIOS ===\n"
             + "- Manhã: museus, parques, cafés, atrações históricas, mercados.\n"
             + "- Tarde: bairros turísticos, galerias, atrações principais, passeios urbanos.\n"
             + "- Noite: restaurantes famosos, bares, experiências gastronômicas, shows, vida noturna.\n\n"
             + "=== CHECKIN / CHECKOUT ===\n"
             + (bloqueioCheckin.isBlank() && bloqueioCheckout.isBlank()
                 ? "Todos os períodos de todos os dias devem ter de 3 a 4 atividades.\n"
                 : bloqueioCheckin + bloqueioCheckout)
             + "\n"
             + "=== ESTRUTURA JSON OBRIGATÓRIA ===\n"
             + "{\"titulo\":\"\",\"descricao\":\"\",\"imagemChave\":\"\","
             + "\"sugestoes\":[{\"dia\":1,\"periodos\":{"
             + "\"manha\":[{\"nome\":\"\"}],"
             + "\"tarde\":[{\"nome\":\"\"}],"
             + "\"noite\":[{\"nome\":\"\"}]"
             + "}}]}\n\n"
             + "- titulo: criativo, turístico, máx. 70 caracteres.\n"
             + "- descricao: 2-3 frases inspiradoras sobre o destino.\n"
             + "- imagemChave: UMA de: " + ImagemCatalogo.chavesPermitidasPrompt() + ".\n"
             + "- sugestoes: EXATAMENTE " + dias + " dia(s), numerados de 1 a " + dias + ".\n"
             + "- Cada período ATIVO: de 3 a 4 atividades. Período bloqueado: array vazio [].\n";
    }

    private String stripMarkdown(String text) {
        String s = text == null ? "" : text.trim();
        if (s.startsWith("```json")) s = s.substring(7);
        else if (s.startsWith("```"))  s = s.substring(3);
        if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        // Remove BOM e caracteres de controle inválidos em JSON (exceto \t \n \r)
        s = s.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "");
        return s.trim();
    }
}
