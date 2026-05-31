/* ================================================================
   FlyGuide - maps.js
   Integração com Google Maps e Places API
   - Busca de locais por autocomplete
   - Salva locais no banco via POST /roteiros/{id}/locais
   - Exibe mapa com pins na página de detalhes
   Depende de: app.js
================================================================ */

const MAPS_API_KEY  = "AIzaSyDJDXcLhGd99ryVpWwvkVpeFaKuzDWbvwI";
const URL_API_BASE  = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";

// ================================================================
// ATIVIDADES — busca de locais e listagem
// ================================================================
(function iniciarMapsAtividades() {
  const paginaAtual = document.body.getAttribute("data-pagina");
  if (paginaAtual !== "atividades-roteiro" && paginaAtual !== "criar-roteiro") return;

  const userId    = getUserIdFromToken();
  const urlParams = new URLSearchParams(window.location.search);
  const roteiroId = urlParams.get("id") || "DRAFT";

  if (!userId) return;

  let locaisSalvos = [];
  let autocomplete = null;
  let autocompleteBasePais = null;
  let autocompleteBaseCidade = null;
  let localSelecionado = null;
  let paisBaseSelecionado = null;
  let cidadeBaseSelecionada = null;
  let basesViagem = [];
  let baseAtivaId = null;
  let raioFiltroKm = 30;
  let diaFiltradoMapa = null;
  let lugaresRecomendados = [];
  let paginaRecomAtual = 0;
  const RECOM_POR_PAGINA = 5;
  const STORAGE_BASES = `flyguide:roteiro-bases:${roteiroId}`;
  const STORAGE_FILTRO = `flyguide:roteiro-filtro-base:${roteiroId}`;

  function lerStorageJSON(chave, fallback) {
    try {
      const salvo = localStorage.getItem(chave);
      if (!salvo) return fallback;
      const data = JSON.parse(salvo);
      return data == null ? fallback : data;
    } catch (_) {
      return fallback;
    }
  }

  function salvarBasesViagem() {
    try {
      localStorage.setItem(STORAGE_BASES, JSON.stringify(basesViagem));
    } catch (_) {}
  }

  function salvarConfigFiltroBase() {
    try {
      localStorage.setItem(STORAGE_FILTRO, JSON.stringify({
        baseAtivaId,
        raioFiltroKm,
      }));
    } catch (_) {}
  }

  function carregarBasesDoStorage() {
    const basesSalvas = lerStorageJSON(STORAGE_BASES, []);
    const filtroSalvo = lerStorageJSON(STORAGE_FILTRO, {});

    basesViagem = Array.isArray(basesSalvas) ? basesSalvas : [];
    raioFiltroKm = Number(filtroSalvo.raioFiltroKm) > 0 ? Number(filtroSalvo.raioFiltroKm) : 30;
    baseAtivaId = filtroSalvo.baseAtivaId || basesViagem[0]?.id || null;
  }

  function normalizarTextoLugar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase();
  }

  function extrairComponentePlace(place, tipos) {
    return (place?.address_components || []).find((comp) =>
      (comp.types || []).some((tipo) => tipos.includes(tipo))
    ) || null;
  }

  function extrairEstadoDeComponents(components) {
    const comp = (components || []).find(c => (c.types || []).includes("administrative_area_level_1"));
    return comp ? (comp.short_name || comp.long_name || null) : null;
  }

  function extrairPaisDoPlace(place) {
    const componente = extrairComponentePlace(place, ["country"]);
    if (!componente) return null;

    const nome = (componente.long_name || place?.name || "").trim();
    const codigo = String(componente.short_name || "").trim().toLowerCase();
    return nome ? { nome, codigo } : null;
  }

  function extrairCidadeDoPlace(place) {
    const componente = extrairComponentePlace(place, [
      "locality",
      "administrative_area_level_2",
      "postal_town",
      "administrative_area_level_1",
    ]);

    return (componente?.long_name || place?.name || "").trim();
  }

  function limparCidadeBaseSelecionada(limparInput) {
    cidadeBaseSelecionada = null;
    if (!limparInput) return;

    const inputCidade = document.getElementById("baseCidade");
    if (inputCidade) inputCidade.value = "";
  }

  function obterBaseAtiva() {
    return basesViagem.find((base) => String(base.id) === String(baseAtivaId)) || basesViagem[0] || null;
  }

  function mostrarErroLocal(msg) {
    const erroEl = document.getElementById("erroLocal");
    if (!erroEl) return;
    erroEl.textContent = msg;
    erroEl.style.display = "";
  }

  function ocultarErroLocal() {
    const erroEl = document.getElementById("erroLocal");
    if (erroEl) erroEl.style.display = "none";
  }

  function limparLocalSelecionado(limparInput) {
    localSelecionado = null;
    const preview = document.getElementById("localPreview");
    const distancia = document.getElementById("previewDistancia");
    if (preview) preview.style.display = "none";
    if (distancia) distancia.style.display = "none";
    if (limparInput) {
      const input = document.getElementById("buscaLocal");
      if (input) input.value = "";
    }
  }

  function mensagemLocalForaDaBase(local) {
    const base = obterBaseAtiva();
    if (!base) return "Adicione ou aguarde carregar a cidade base antes de escolher um local.";
    if (base.latitude == null || base.longitude == null) return "A cidade base ainda não possui coordenadas. Aguarde carregar e tente novamente.";
    if (!local || local.latitude == null || local.longitude == null) return "Selecione um local válido da lista do Google Maps.";

    // Validação por estado/região — bloqueia independente do raio configurado
    const estadoBase  = base.stateCode || base.stateName || null;
    const estadoLocal = extrairEstadoDeComponents(local.addressComponents);
    if (estadoBase && estadoLocal && estadoBase.toUpperCase() !== estadoLocal.toUpperCase()) {
      return `O local está em outra região (${estadoLocal}). Apenas locais na mesma região da cidade base (${estadoBase}) podem ser adicionados ao roteiro.`;
    }

    const distancia = calcularDistanciaDaBase(local, base);
    if (distancia == null) return "Selecione um local válido da lista do Google Maps.";
    if (distancia > raioFiltroKm) {
      return `O local escolhido está a ${formatarKm(distancia)} km de ${base.city || base.label}. Locais fora da cidade base não podem ser adicionados ao roteiro.`;
    }
    return "";
  }

  function validarLocalNaBase(local) {
    const mensagem = mensagemLocalForaDaBase(local);
    if (!mensagem) return true;
    mostrarErroLocal(mensagem);
    limparLocalSelecionado(false);
    return false;
  }

  function formatarKm(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: valor < 10 ? 1 : 0,
      maximumFractionDigits: valor < 10 ? 1 : 0,
    });
  }

  function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
    const paraRad = (graus) => (graus * Math.PI) / 180;
    const raioTerraKm = 6371;
    const dLat = paraRad(lat2 - lat1);
    const dLng = paraRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(paraRad(lat1)) * Math.cos(paraRad(lat2))
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * raioTerraKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calcularDistanciaDaBase(local, base) {
    if (!base || base.latitude == null || base.longitude == null) return null;
    if (!local || local.latitude == null || local.longitude == null) return null;

    return calcularDistanciaKm(
      parseFloat(base.latitude),
      parseFloat(base.longitude),
      parseFloat(local.latitude),
      parseFloat(local.longitude),
    );
  }

  function criarBoundsPorRaio(base, raioKm) {
    if (!window.google || !base) return null;
    const lat = parseFloat(base.latitude);
    const lng = parseFloat(base.longitude);
    const deltaLat = raioKm / 111;
    const deltaLng = raioKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

    return new google.maps.LatLngBounds(
      { lat: lat - deltaLat, lng: lng - deltaLng },
      { lat: lat + deltaLat, lng: lng + deltaLng },
    );
  }

  function mostrarErroBase(msg) {
    const erroEl = document.getElementById("erroBaseFiltro");
    if (!erroEl) return;
    erroEl.textContent = msg;
    erroEl.style.display = "";
  }

  function ocultarErroBase() {
    const erroEl = document.getElementById("erroBaseFiltro");
    if (erroEl) erroEl.style.display = "none";
  }

  function atualizarResumoFiltroBase() {
    const resumoEl = document.getElementById("resumoFiltroBase");
    const headerEl = document.getElementById("baseHeaderTexto");
    const base = obterBaseAtiva();

    if (!base) {
      if (resumoEl) resumoEl.textContent = "Defina uma base para ativar o filtro de raio";
      if (headerEl) headerEl.textContent = "Nenhuma base definida";
      return;
    }

    const label = `${base.city || base.label}${base.country ? `, ${base.country}` : ""}`;
    if (resumoEl) resumoEl.textContent = `Filtrando a partir de ${base.city || base.label}${raioFiltroKm ? ` · raio de ${raioFiltroKm} km` : ""}`;
    if (headerEl) headerEl.textContent = `${label} · ${raioFiltroKm} km`;
  }

  function atualizarAutocompletePorBase() {
    const inputBusca = document.getElementById("buscaLocal");
    const base = obterBaseAtiva();

    if (inputBusca) {
      inputBusca.placeholder = base
        ? `Ex: lugares perto de ${base.city || base.label}...`
        : "Ex: Cristo Redentor, Rio de Janeiro...";
    }

    if (!autocomplete || !window.google || !base || base.latitude == null || base.longitude == null) {
      if (autocomplete) autocomplete.setOptions({ strictBounds: false });
      return;
    }

    const bounds = criarBoundsPorRaio(base, raioFiltroKm);
    if (bounds) {
      autocomplete.setBounds(bounds);
      autocomplete.setOptions({ strictBounds: true });
    }
  }

  function atualizarRestricaoAutocompleteCidadeBase() {
    const inputCidade = document.getElementById("baseCidade");
    if (inputCidade) {
      inputCidade.placeholder = paisBaseSelecionado?.nome
        ? `Ex: cidade em ${paisBaseSelecionado.nome}`
        : "Ex: Madrid";
    }

    if (!autocompleteBaseCidade) return;

    const restricao = paisBaseSelecionado?.codigo
      ? { country: paisBaseSelecionado.codigo }
      : {};

    if (typeof autocompleteBaseCidade.setComponentRestrictions === "function") {
      autocompleteBaseCidade.setComponentRestrictions(restricao);
      return;
    }

    autocompleteBaseCidade.setOptions({ componentRestrictions: restricao });
  }

  async function resolverPaisBasePorTexto(texto) {
    if (!window.google || !google.maps?.places?.PlacesService) {
      throw new Error("Aguarde o Google Maps terminar de carregar.");
    }

    const consulta = String(texto || "").trim();
    if (!consulta) return null;

    const serviceDiv = document.createElement("div");
    const service = new google.maps.places.PlacesService(serviceDiv);

    return new Promise((resolve, reject) => {
      service.findPlaceFromQuery({
        query: consulta,
        fields: ["address_components", "name", "types"],
      }, (results, status) => {
        const OK = google.maps.places.PlacesServiceStatus.OK;
        if (status !== OK || !Array.isArray(results) || results.length === 0) {
          reject(new Error("Selecione um pais valido para filtrar as cidades."));
          return;
        }

        const pais = results.map(extrairPaisDoPlace).find(Boolean);

        if (!pais) {
          reject(new Error("Selecione um pais valido para filtrar as cidades."));
          return;
        }

        resolve(pais);
      });
    });
  }

  async function sincronizarPaisBaseDigitado(opcoes) {
    const configuracao = {
      limparCidade: false,
      mostrarErro: false,
      canonizarInput: true,
      ...(opcoes || {}),
    };

    const inputPais = document.getElementById("basePais");
    if (!inputPais) return null;

    const valorDigitado = inputPais.value.trim();
    if (!valorDigitado) {
      const tinhaPais = !!paisBaseSelecionado;
      paisBaseSelecionado = null;
      atualizarRestricaoAutocompleteCidadeBase();
      if (configuracao.limparCidade && tinhaPais) limparCidadeBaseSelecionada(true);
      if (!configuracao.mostrarErro) ocultarErroBase();
      return null;
    }

    const valorNormalizado = normalizarTextoLugar(valorDigitado);
    if (paisBaseSelecionado) {
      const nomeAtual = normalizarTextoLugar(paisBaseSelecionado.nome);
      const codigoAtual = normalizarTextoLugar(paisBaseSelecionado.codigo);
      if (valorNormalizado === nomeAtual || valorNormalizado === codigoAtual) {
        atualizarRestricaoAutocompleteCidadeBase();
        return paisBaseSelecionado;
      }
    }

    try {
      const paisResolvido = await resolverPaisBasePorTexto(valorDigitado);
      const paisMudou = !paisBaseSelecionado
        || normalizarTextoLugar(paisBaseSelecionado.nome) !== normalizarTextoLugar(paisResolvido.nome)
        || normalizarTextoLugar(paisBaseSelecionado.codigo) !== normalizarTextoLugar(paisResolvido.codigo);

      paisBaseSelecionado = paisResolvido;
      if (configuracao.canonizarInput) inputPais.value = paisResolvido.nome;
      atualizarRestricaoAutocompleteCidadeBase();
      if (configuracao.limparCidade && paisMudou) limparCidadeBaseSelecionada(true);
      ocultarErroBase();
      return paisResolvido;
    } catch (erro) {
      paisBaseSelecionado = null;
      atualizarRestricaoAutocompleteCidadeBase();
      if (configuracao.limparCidade) limparCidadeBaseSelecionada(true);
      if (configuracao.mostrarErro) {
        mostrarErroBase(erro.message || "Selecione um pais valido para filtrar as cidades.");
      }
      return null;
    }
  }

  function configurarAutocompleteBasesViagem() {
    const inputPais = document.getElementById("basePais");
    const inputCidade = document.getElementById("baseCidade");

    if (!window.google || !google.maps?.places || !inputPais || !inputCidade) return;

    if (!autocompleteBasePais) {
      autocompleteBasePais = new google.maps.places.Autocomplete(inputPais, {
        fields: ["address_components", "name", "types"],
        types: ["(regions)"],
        language: "pt-BR",
      });

      autocompleteBasePais.addListener("place_changed", () => {
        const pais = extrairPaisDoPlace(autocompleteBasePais.getPlace());
        if (!pais) {
          paisBaseSelecionado = null;
          atualizarRestricaoAutocompleteCidadeBase();
          mostrarErroBase("Selecione um pais valido na lista do Google.");
          return;
        }

        const paisMudou = !paisBaseSelecionado
          || normalizarTextoLugar(paisBaseSelecionado.nome) !== normalizarTextoLugar(pais.nome)
          || normalizarTextoLugar(paisBaseSelecionado.codigo) !== normalizarTextoLugar(pais.codigo);

        paisBaseSelecionado = pais;
        inputPais.value = pais.nome;
        atualizarRestricaoAutocompleteCidadeBase();
        if (paisMudou) limparCidadeBaseSelecionada(true);
        ocultarErroBase();
        setTimeout(() => inputCidade.focus(), 0);
      });

      inputPais.addEventListener("input", () => {
        const valor = inputPais.value.trim();
        if (!valor) {
          paisBaseSelecionado = null;
          atualizarRestricaoAutocompleteCidadeBase();
          limparCidadeBaseSelecionada(true);
          ocultarErroBase();
          return;
        }

        if (paisBaseSelecionado && normalizarTextoLugar(valor) === normalizarTextoLugar(paisBaseSelecionado.nome)) {
          return;
        }

        paisBaseSelecionado = null;
        atualizarRestricaoAutocompleteCidadeBase();
        if (inputCidade.value.trim()) limparCidadeBaseSelecionada(true);
      });

      inputPais.addEventListener("blur", () => {
        sincronizarPaisBaseDigitado({ limparCidade: true, canonizarInput: true });
      });
    }

    if (!autocompleteBaseCidade) {
      autocompleteBaseCidade = new google.maps.places.Autocomplete(inputCidade, {
        fields: ["place_id", "name", "formatted_address", "address_components", "geometry", "types"],
        types: ["(cities)"],
        language: "pt-BR",
      });

      autocompleteBaseCidade.addListener("place_changed", () => {
        const place = autocompleteBaseCidade.getPlace();
        if (!place.place_id) return;

        const cidadeNome = extrairCidadeDoPlace(place) || place.name || inputCidade.value.trim();
        const pais = extrairPaisDoPlace(place);

        cidadeBaseSelecionada = {
          nome: cidadeNome,
          latitude: place.geometry?.location?.lat(),
          longitude: place.geometry?.location?.lng(),
          placeId: place.place_id,
        };
        inputCidade.value = cidadeNome;

        if (pais) {
          paisBaseSelecionado = pais;
          inputPais.value = pais.nome;
          atualizarRestricaoAutocompleteCidadeBase();
        }

        ocultarErroBase();
      });

      inputCidade.addEventListener("focus", () => {
        sincronizarPaisBaseDigitado({ limparCidade: false, canonizarInput: true });
      });

      inputCidade.addEventListener("input", () => {
        if (!inputCidade.value.trim()) {
          cidadeBaseSelecionada = null;
          return;
        }

        if (cidadeBaseSelecionada && normalizarTextoLugar(inputCidade.value) !== normalizarTextoLugar(cidadeBaseSelecionada.nome)) {
          cidadeBaseSelecionada = null;
        }
      });
    }

    atualizarRestricaoAutocompleteCidadeBase();
  }

  function atualizarPreviewDistancia() {
    const previewEl = document.getElementById("localPreview");
    const distanciaEl = document.getElementById("previewDistancia");
    const checkEl = previewEl?.querySelector(".bi-check-circle-fill");
    const base = obterBaseAtiva();
    const distancia = calcularDistanciaDaBase(localSelecionado, base);

    if (!previewEl || !distanciaEl) return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    // Remove inline bg/border definidos em versões anteriores (evita conflito com !important do CSS)
    previewEl.style.removeProperty("background");
    previewEl.style.removeProperty("background-color");
    previewEl.style.removeProperty("border-color");

    if (!base || distancia == null) {
      distanciaEl.style.display = "none";
      previewEl.classList.remove("preview-ok", "preview-warn");
      if (checkEl) checkEl.style.color = isDark ? "#4ade80" : "#22c55e";
      return;
    }

    const dentroDoRaio = distancia <= raioFiltroKm;
    localSelecionado.distanciaBaseKm = distancia;

    distanciaEl.style.display = "";
    distanciaEl.textContent = dentroDoRaio
      ? `${formatarKm(distancia)} km da base ${base.city}`
      : `${formatarKm(distancia)} km da base ${base.city} · fora do raio`;

    // Usa cores com bom contraste em ambos os temas
    distanciaEl.style.color = dentroDoRaio
      ? (isDark ? "#4ade80" : "#15803d")
      : (isDark ? "#f87171" : "#dc2626");

    previewEl.classList.remove("preview-ok", "preview-warn");
    previewEl.classList.add(dentroDoRaio ? "preview-ok" : "preview-warn");

    if (checkEl) checkEl.style.color = dentroDoRaio
      ? (isDark ? "#4ade80" : "#22c55e")
      : (isDark ? "#f87171" : "#ef4444");
  }

  function renderDistanciaBaseInfo(local, base) {
    const distancia = calcularDistanciaDaBase(local, base);
    if (!base || distancia == null) return "";
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const cor = isDark ? "#94a3b8" : "#64748b";
    return `<div style="color:${cor};font-size:.78rem;margin-top:6px;"><i class="bi bi-signpost"></i> ${formatarKm(distancia)} km da base ${escapeHtml(base.city || base.label || "ativa")}</div>`;
  }

  function calcularTimelineBases(bases) {
    let diaAtual = 1;
    return bases.map(base => {
      const inicio = diaAtual;
      const dias = parseInt(base.dias) || 0;
      const fim = dias > 0 ? diaAtual + dias - 1 : null;
      if (dias > 0) diaAtual += dias;
      return { ...base, diaInicio: inicio, diaFim: fim };
    });
  }

  function renderBasesFiltro() {
    const listaEl = document.getElementById("listaBasesFiltro");
    const vazioEl = document.getElementById("vazioBasesFiltro");
    const selectEl = document.getElementById("baseFiltroAtiva");
    const raioEl = document.getElementById("raioBaseKm");

    if (!listaEl || !selectEl || !raioEl) return;

    raioEl.value = raioFiltroKm;

    if (basesViagem.length === 0) {
      listaEl.innerHTML = "";
      vazioEl.style.display = "";
      selectEl.innerHTML = '<option value="">Nenhuma base cadastrada</option>';
      selectEl.disabled = true;
      atualizarResumoFiltroBase();
      atualizarAutocompletePorBase();
      return;
    }

    if (!obterBaseAtiva()) baseAtivaId = basesViagem[0].id;

    vazioEl.style.display = "none";
    selectEl.disabled = false;
    selectEl.innerHTML = basesViagem.map((base) => `
      <option value="${base.id}" ${String(base.id) === String(baseAtivaId) ? "selected" : ""}>
        ${escapeHtml(base.city || "Cidade")} ${base.country ? `· ${escapeHtml(base.country)}` : ""}
      </option>`).join("");

    const timeline = calcularTimelineBases(basesViagem);
    const temDias = basesViagem.some(b => b.dias);
    const timelineHtml = temDias ? `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px 14px;background:#fff7ed;border-radius:12px;border:1px solid #fed7aa;">
        <div style="width:100%;font-size:.75rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">
          <i class="bi bi-calendar-range me-1"></i>Cronograma da viagem
        </div>
        ${timeline.map((b, idx) => b.diaFim ? `
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:#f97316;color:#fff;font-size:.82rem;font-weight:700;">
            ${b.diaInicio === b.diaFim ? `Dia ${b.diaInicio}` : `Dias ${b.diaInicio}–${b.diaFim}`}:
            ${escapeHtml(b.city || b.label)}${b.country ? `, ${escapeHtml(b.country)}` : ""}
          </span>
        ` : `
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:#e2e8f0;color:#475569;font-size:.82rem;font-weight:600;">
            <i class="bi bi-geo-alt"></i>${escapeHtml(b.city || b.label)}
          </span>
        `).join("")}
      </div>` : "";

    listaEl.innerHTML = timelineHtml + timeline.map((base) => {
      const ativa = String(base.id) === String(baseAtivaId);
      const diasLabel = base.diaFim
        ? `<span class="base-chip" style="background:#fff7ed;color:#c2410c;border-color:#fed7aa;">
             <i class="bi bi-calendar-range"></i>
             ${base.diaInicio === base.diaFim ? `Dia ${base.diaInicio}` : `Dias ${base.diaInicio}–${base.diaFim}`}
             (${base.dias} ${parseInt(base.dias) === 1 ? "dia" : "dias"})
           </span>`
        : "";
      return `
        <article class="base-card ${ativa ? "is-active" : ""}">
          <div class="base-card-main">
            <div class="base-card-icon"><i class="bi bi-geo-alt-fill"></i></div>
            <div style="min-width:0;">
              <div class="base-card-title">${escapeHtml(base.city || "Cidade base")}</div>
              <div class="base-card-subtitle">${escapeHtml(base.country || "País não informado")}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                <span class="base-chip"><i class="bi bi-signpost-split"></i>${ativa ? "Base ativa" : "Base secundária"}</span>
                ${diasLabel}
                ${base.latitude != null && base.longitude != null ? `<span class="base-chip"><i class="bi bi-bounding-box"></i>Filtro por raio disponível</span>` : `<span class="base-chip"><i class="bi bi-exclamation-circle"></i>Sem coordenadas</span>`}
              </div>
            </div>
          </div>
          <div class="base-card-actions">
            ${ativa ? `<button class="btn btn-sm btn-primary-orange" type="button" disabled>Base ativa</button>` : `<button class="btn btn-sm btn-outline-gray" type="button" data-selecionar-base="${base.id}">Usar no filtro</button>`}
            ${basesViagem.length > 1 ? `<button class="btn btn-sm btn-outline-danger" type="button" data-remover-base="${base.id}"><i class="bi bi-trash"></i></button>` : ""}
          </div>
        </article>`;
    }).join("");

    listaEl.querySelectorAll("[data-selecionar-base]").forEach((btn) => {
      btn.addEventListener("click", () => {
        baseAtivaId = btn.getAttribute("data-selecionar-base");
        salvarConfigFiltroBase();
        renderBasesFiltro();
        renderLocais();
        atualizarPreviewDistancia();
      });
    });

    listaEl.querySelectorAll("[data-remover-base]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remover-base");
        basesViagem = basesViagem.filter((base) => String(base.id) !== String(id));
        if (String(baseAtivaId) === String(id)) {
          baseAtivaId = basesViagem[0]?.id || null;
        }
        salvarBasesViagem();
        salvarConfigFiltroBase();
        renderBasesFiltro();
        renderLocais();
        atualizarPreviewDistancia();
      });
    });

    atualizarResumoFiltroBase();
    atualizarAutocompletePorBase();
  }

  async function geocodificarBase(pais, cidade) {
    if (!window.google || !google.maps?.places?.PlacesService) {
      throw new Error("Aguarde o Google Maps terminar de carregar.");
    }

    const query = [cidade, pais].filter(Boolean).join(", ");
    const serviceDiv = document.createElement("div");
    const service = new google.maps.places.PlacesService(serviceDiv);

    return new Promise((resolve, reject) => {
      service.findPlaceFromQuery({
        query,
        fields: ["geometry", "name", "address_components"],
      }, (results, status) => {
        const OK = google.maps.places.PlacesServiceStatus.OK;
        if (status !== OK || !results || !results[0] || !results[0].geometry) {
          reject(new Error("Nao foi possivel localizar essa cidade base."));
          return;
        }

        const place = results[0];
        const estadoComp  = (place.address_components || []).find(c => (c.types || []).includes("administrative_area_level_1"));
        const countryComp = (place.address_components || []).find(c => (c.types || []).includes("country"));
        resolve({
          latitude:    place.geometry.location.lat(),
          longitude:   place.geometry.location.lng(),
          label:       [cidade, pais].filter(Boolean).join(", "),
          stateCode:   estadoComp?.short_name  || null,
          stateName:   estadoComp?.long_name   || null,
          countryCode: countryComp?.short_name || null,
        });
      });
    });
  }

  async function hidratarBasesSemCoordenadas() {
    if (!window.google || basesViagem.length === 0) return;

    let atualizou = false;

    for (const base of basesViagem) {
      if (base.latitude != null && base.longitude != null) continue;
      if (!base.city) continue;

      try {
        const geocoded = await geocodificarBase(base.country || "", base.city);
        base.latitude  = geocoded.latitude;
        base.longitude = geocoded.longitude;
        if (!base.stateCode   && geocoded.stateCode)   base.stateCode   = geocoded.stateCode;
        if (!base.stateName   && geocoded.stateName)   base.stateName   = geocoded.stateName;
        if (!base.countryCode && geocoded.countryCode) base.countryCode = geocoded.countryCode;
        atualizou = true;
      } catch (_) {}
    }

    if (atualizou) {
      salvarBasesViagem();
      renderBasesFiltro();
      renderLocais();
      atualizarPreviewDistancia();
    }
  }

  async function prefillFormBaseDoRoteiro() {
    if (basesViagem.length > 0) {
      await hidratarBasesSemCoordenadas();
    } else {
      // Cria base automaticamente a partir do país/cidade definidos na página 1
      try {
        const hint = JSON.parse(localStorage.getItem(`flyguide:roteiro-hint:${roteiroId}`) || "null");
        if (hint?.cidade) {
          const pais   = hint.pais   || "";
          const cidade = hint.cidade;
          const geocoded = await geocodificarBase(pais, cidade);
          const totalDias = window.flyguide_diasTotais
            || parseInt(localStorage.getItem(`flyguide:roteiro-dias:${roteiroId}`)) || 0;
          basesViagem.push({
            id:          `base-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            country:     pais,
            city:        cidade,
            label:       pais ? `${cidade}, ${pais}` : cidade,
            latitude:    geocoded.latitude,
            longitude:   geocoded.longitude,
            stateCode:   geocoded.stateCode   || null,
            stateName:   geocoded.stateName   || null,
            countryCode: geocoded.countryCode || null,
            dias:        totalDias,
          });
          baseAtivaId = basesViagem[0].id;
          salvarBasesViagem();
          salvarConfigFiltroBase();
        }
      } catch (_) {}
    }

    // Geocodifica os valores pré-preenchidos via URL para que cidadeBaseSelecionada
    // fique populado antes de o usuário clicar em "+ Adicionar Base"
    const prefPais   = urlParams.get("pref_pais");
    const prefCidade = urlParams.get("pref_cidade");
    if (prefCidade && !cidadeBaseSelecionada) {
      try {
        const geocoded = await geocodificarBase(prefPais || "", prefCidade);
        cidadeBaseSelecionada = {
          nome:      prefCidade,
          latitude:  geocoded.latitude,
          longitude: geocoded.longitude,
        };
        if (prefPais && !paisBaseSelecionado) {
          try {
            const paisResolvido = await resolverPaisBasePorTexto(prefPais);
            if (paisResolvido) {
              paisBaseSelecionado = paisResolvido;
              atualizarRestricaoAutocompleteCidadeBase();
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    renderBasesFiltro();
  }

  function calcularAberturaAgora(periods) {
    if (!periods || !periods.length) return null;
    if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close) return true;
    const now  = new Date();
    const day  = now.getDay();
    const hhmm = now.getHours() * 100 + now.getMinutes();
    return periods.some(p => {
      if (!p.open) return false;
      const od = p.open.day, ot = parseInt(p.open.time || "0000");
      const cd = p.close != null ? p.close.day : od;
      const ct = p.close != null ? parseInt(p.close.time || "2359") : 2359;
      if (od === cd) return day === od && hhmm >= ot && hhmm < ct;
      if (day === od) return hhmm >= ot;
      if (day === cd) return hhmm < ct;
      return (od < cd) ? (day > od && day < cd) : (day > od || day < cd);
    });
  }

  function normalizarHorarioAgenda(valor) {
    const horario = String(valor || "").trim();
    if (!horario) return null;
    if (/^\d{2}:\d{2}$/.test(horario)) return `${horario}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(horario)) return horario;
    return null;
  }

  function formatarHorarioAgenda(valor) {
    const horario = normalizarHorarioAgenda(valor);
    return horario ? horario.slice(0, 5) : "";
  }

  function horarioParaOrdemAgenda(valor) {
    const horario = normalizarHorarioAgenda(valor);
    if (!horario) return Number.MAX_SAFE_INTEGER;
    const [hora, minuto] = horario.split(":").map(Number);
    return (hora * 60) + minuto;
  }

  function compararLocaisAgenda(a, b) {
    return (a.dia || 0) - (b.dia || 0)
      || (a.ordem || 0) - (b.ordem || 0)
      || horarioParaOrdemAgenda(a.horario) - horarioParaOrdemAgenda(b.horario)
      || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
  }

  function agruparLocaisPorDiaAgenda(locais) {
    const grupos = new Map();

    [...locais].sort(compararLocaisAgenda).forEach((local) => {
      const chave = local.dia || 0;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(local);
    });

    return [...grupos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([dia, itens]) => ({ dia, itens }));
  }

  function ehCheckinCheckoutAgenda(local) {
    const nome = String(local?.nome || local?.name || local || "").trim().toLowerCase().replace(/[\s-]/g, "");
    return !!local?._checkin || !!local?._checkout || nome === "checkin" || nome === "checkout";
  }

  function contarLocaisAgenda(locais) {
    return (locais || []).filter(l => !ehCheckinCheckoutAgenda(l)).length;
  }

  function mapsUrlLocalAgenda(local) {
    if (!local) return "";
    const place = String(local.placeId || local.place_id || "").trim();
    const lat = parseFloat(local.latitude);
    const lng = parseFloat(local.longitude);
    const query = place
      ? String(local.endereco || local.nome || place).trim()
      : Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
        ? `${lat},${lng}`
        : String(local.endereco || local.nome || "").trim();
    if (!query) return "";
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    return place ? `${url}&query_place_id=${encodeURIComponent(place)}` : url;
  }

  // Carrega locais já salvos no banco
  function carregarLocais() {
    authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`)
      .then(r => r.json())
      .then(data => {
        locaisSalvos = data;
        renderLocais();
        atualizarMapaAtividades();
      })
      .catch(() => {});
  }

  let _dragSetup = false;

  function renderLocais() {
    const lista  = document.getElementById("listaLocaisMaps");
    const vazio  = document.getElementById("vazioLocais");
    if (!lista) return;

    const totalDias = window.flyguide_diasTotais
      || parseInt(localStorage.getItem(`flyguide:roteiro-dias:${roteiroId}`)) || 0;

    if (locaisSalvos.length === 0 && totalDias === 0) {
      lista.innerHTML = "";
      if (vazio) vazio.style.display = "";
      return;
    }
    if (vazio) vazio.style.display = "none";

    const grupos = agruparLocaisPorDiaAgenda(locaisSalvos);
    const ordenacao = document.getElementById("ordenacaoHorario")?.value || "";
    if (ordenacao === "horario_asc") {
      grupos.forEach(g => g.itens.sort((a, b) =>
        horarioParaOrdemAgenda(a.horario) - horarioParaOrdemAgenda(b.horario)));
    } else if (ordenacao === "horario_desc") {
      grupos.forEach(g => g.itens.sort((a, b) =>
        horarioParaOrdemAgenda(b.horario) - horarioParaOrdemAgenda(a.horario)));
    }
    const gruposMap = new Map(grupos.map(g => [g.dia, g.itens]));

    // Todos os dias 1-N + quaisquer dias extras dos locais salvos
    const diasSet = new Set([
      ...Array.from({ length: totalDias }, (_, i) => i + 1),
      ...grupos.filter(g => g.dia > 0).map(g => g.dia),
    ]);
    const diasOrdenados = [...diasSet].sort((a, b) => a - b);
    const semDiaItens = gruposMap.get(0) || [];

    const baseAtiva = obterBaseAtiva();
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const corHeader  = isDark ? "#f1f5f9" : "#0f172a";
    const corCount   = isDark ? "#94a3b8" : "#64748b";
    const corEndereco = isDark ? "#cbd5e1" : "#94a3b8";
    const corObs     = isDark ? "#94a3b8" : "#64748b";
    const corBorda   = isDark ? "#334155" : "#eef2f7";

    function renderItens(itens, diaGrupo) {
      return itens.map((l, idx) => {
        const mapsUrl = mapsUrlLocalAgenda(l);
        return `
          <div class="day-item" id="local-item-${l.idRoteiroLocal}" draggable="true" data-vinculo-id="${l.idRoteiroLocal}" data-dia-grupo="${diaGrupo}" style="background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:14px;display:flex;gap:10px;align-items:flex-start;margin-top:12px;">
            <div class="drag-handle" style="display:flex;align-items:center;padding:0 2px;cursor:grab;color:#cbd5e1;font-size:1.1rem;flex-shrink:0;" title="Arrastar para reordenar"><i class="bi bi-grip-vertical"></i></div>
            <div class="day-bubble" style="background:#f97316;color:#fff;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:900;flex-shrink:0;">
              ${idx + 1}
            </div>
            <div style="flex:1;" id="local-info-${l.idRoteiroLocal}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="font-weight:800;font-size:1.05rem;">${escapeHtml(l.nome || "Local")}</div>
                ${formatarHorarioAgenda(l.horario) ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:.78rem;font-weight:800;"><i class="bi bi-clock"></i>${formatarHorarioAgenda(l.horario)}</span>` : ""}
              </div>
              ${l.observacoes ? `<div style="font-size:.9rem;color:${corObs};margin-top:2px;">${escapeHtml(l.observacoes)}</div>` : ""}
              ${l.endereco ? `<div style="color:${corEndereco};font-size:.82rem;margin-top:4px;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(l.endereco)}</div>` : ""}
              ${(() => { try { const h = JSON.parse(localStorage.getItem(`flyguide:place-hours:${l.placeId}`) || "null"); if (!h) return ""; const aberto = calcularAberturaAgora(h.periods); if (aberto === null) return ""; return `<div data-abertura="1" style="font-size:.78rem;margin-top:4px;color:${aberto ? "#16a34a" : "#dc2626"};"><i class="bi bi-clock me-1"></i>${aberto ? "Aberto agora" : "Fechado agora"}</div>`; } catch(_){ return ""; } })()}
              ${renderDistanciaBaseInfo(l, baseAtiva)}
              ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;"><i class="bi bi-map"></i>Ver no Maps</a>` : ""}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button class="btn btn-sm btn-outline-secondary" data-editar-local="${l.idRoteiroLocal}" data-dia="${l.dia || ''}" data-obs="${escapeHtml(l.observacoes || '')}" data-horario="${formatarHorarioAgenda(l.horario)}" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" data-remover-local="${l.idLocal}" data-vinculo="${l.idRoteiroLocal}" title="Remover">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>`;
      }).join("");
    }

    lista.innerHTML = [
      ...diasOrdenados.map(dia => {
        const itens = gruposMap.get(dia) || [];
        return `
          <section style="margin-top:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid ${corBorda};">
              <div class="dia-group-header">Dia ${dia}</div>
              ${(() => {
                const total = contarLocaisAgenda(itens);
                return `<div style="font-size:.78rem;font-weight:700;color:${corCount};">${total} ${total === 1 ? "local" : "locais"}</div>`;
              })()}
            </div>
            ${itens.length === 0
              ? `<div style="text-align:center;padding:22px 12px;color:${corCount};">
                   <i class="bi bi-calendar-plus" style="font-size:1.5rem;color:#cbd5e1;display:block;margin-bottom:8px;"></i>
                   Nenhuma atividade para o Dia ${dia} ainda
                 </div>`
              : renderItens(itens, dia)}
          </section>`;
      }),
      ...(semDiaItens.length > 0 ? [`
        <section style="margin-top:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid ${corBorda};">
            <div class="dia-group-header">Sem dia definido</div>
            ${(() => {
              const total = contarLocaisAgenda(semDiaItens);
              return `<div style="font-size:.78rem;font-weight:700;color:${corCount};">${total} ${total === 1 ? "local" : "locais"}</div>`;
            })()}
          </div>
          ${renderItens(semDiaItens, 0)}
        </section>`] : []),
    ].join("");

    // Bloquear "Concluir" se algum dia não tiver atração
    const btnConcluir = document.getElementById("btnConcluirRoteiro");
    const wrapperConcluir = document.getElementById("concluirWrapper");
    if (btnConcluir) {
      const algumDiaVazio = diasOrdenados.some(dia => (gruposMap.get(dia) || []).length === 0);
      btnConcluir.disabled = algumDiaVazio;
      if (wrapperConcluir) {
        wrapperConcluir.title = algumDiaVazio
          ? "Adicione pelo menos uma atração em cada dia antes de concluir"
          : "";
        wrapperConcluir.style.cursor = algumDiaVazio ? "not-allowed" : "";
      }
    }

    // Editar local
    lista.querySelectorAll("[data-editar-local]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idVinculo = btn.getAttribute("data-editar-local");
        const diaAtual  = btn.getAttribute("data-dia");
        const obsAtual  = btn.getAttribute("data-obs");
        const horarioAtual = btn.getAttribute("data-horario") || "";
        const infoEl    = document.getElementById(`local-info-${idVinculo}`);
        const l         = locaisSalvos.find(x => String(x.idRoteiroLocal) === String(idVinculo));

        let novoLocalSelecionado = null;

        infoEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:.8rem;color:#94a3b8;font-weight:600;">Trocar local (opcional)</div>
            <input id="edit-busca-${idVinculo}" type="text" placeholder="${escapeHtml(l?.nome || 'Buscar novo local...')}"
              style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
            <div id="edit-preview-${idVinculo}" style="font-size:.78rem;color:#f97316;display:none;"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input id="edit-dia-${idVinculo}" type="number" min="1" value="${diaAtual}" placeholder="Dia"
                style="width:70px;padding:4px 8px;border-radius:8px;border:1px solid #f97316;font-size:.88rem;background:inherit;color:inherit;">
              <input id="edit-horario-${idVinculo}" type="time" value="${horarioAtual}"
                style="width:110px;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
              <input id="edit-obs-${idVinculo}" type="text" value="${obsAtual}" placeholder="Observações"
                style="flex:1;min-width:120px;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
              <button id="edit-salvar-${idVinculo}" style="background:#f97316;border:none;border-radius:8px;padding:4px 12px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;">Salvar</button>
              <button id="edit-cancelar-${idVinculo}" style="background:none;border:1px solid #94a3b8;border-radius:8px;padding:4px 10px;color:#94a3b8;font-size:.85rem;cursor:pointer;">Cancelar</button>
            </div>
          </div>
        `;

        // Autocomplete no campo de busca de novo local
        if (window.google) {
          const inputBusca = document.getElementById(`edit-busca-${idVinculo}`);
          const previewEl  = document.getElementById(`edit-preview-${idVinculo}`);
          const ac = new google.maps.places.Autocomplete(inputBusca, {
            fields: ["place_id", "name", "formatted_address", "geometry", "types"],
            language: "pt-BR"
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.place_id) return;
            novoLocalSelecionado = {
              placeId:   place.place_id,
              nome:      place.name,
              endereco:  place.formatted_address,
              tipo:      (place.types || [])[0] || "establishment",
              latitude:  place.geometry?.location?.lat(),
              longitude: place.geometry?.location?.lng(),
            };
            previewEl.textContent = `✔ ${place.name}`;
            previewEl.style.display = "";
          });
        }

        document.getElementById(`edit-cancelar-${idVinculo}`).onclick = () => { renderLocais(); atualizarMapaAtividades(); };

        document.getElementById(`edit-salvar-${idVinculo}`).onclick = async () => {
          const novoDia     = document.getElementById(`edit-dia-${idVinculo}`).value.trim();
          const novaObs     = document.getElementById(`edit-obs-${idVinculo}`).value.trim();
          const novoHorario = normalizarHorarioAgenda(document.getElementById(`edit-horario-${idVinculo}`)?.value || null);
          if (!novoDia || !l) return;

          try {
            // Se trocou o local: DELETE + POST em 2 etapas
            if (novoLocalSelecionado) {
              const resDel = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${l.idLocal}`, { method: "DELETE" });
              if (!resDel.ok && resDel.status !== 204) { alert("Erro ao trocar o local."); return; }

              // 1. Cria/busca o local no banco
              const resLocal = await authFetch(`${URL_API_BASE}/locais`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  placeId:   novoLocalSelecionado.placeId,
                  nome:      novoLocalSelecionado.nome,
                  endereco:  novoLocalSelecionado.endereco,
                  tipo:      novoLocalSelecionado.tipo,
                  latitude:  novoLocalSelecionado.latitude,
                  longitude: novoLocalSelecionado.longitude,
                })
              });
              if (!resLocal.ok) { alert("Erro ao salvar novo local."); return; }
              const localSalvo = await resLocal.json();

              // 2. Vincula ao roteiro
              const resVinculo = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  idLocal:     localSalvo.idLocal,
                  dia:         parseInt(novoDia),
                  ordem:       locaisSalvos.length + 1,
                  observacoes: novaObs || null,
                  horario:     novoHorario || null,
                  status:      "PLANEJADO",
                })
              });
              if (resVinculo.ok || resVinculo.status === 201) {
                await carregarLocais();
              } else { alert("Erro ao vincular novo local."); }
            } else {
              // Só atualiza dia/obs/horario
              const res = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${l.idLocal}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dia: parseInt(novoDia), observacoes: novaObs || null, horario: novoHorario || null, idLocal: l.idLocal })
              });
              if (res.ok) {
                l.dia = parseInt(novoDia);
                l.observacoes = novaObs;
                l.horario = novoHorario;
                renderLocais();
                atualizarMapaAtividades();
              } else { alert("Erro ao salvar."); }
            }
          } catch { alert("Erro ao conectar."); }
        };
      });
    });

    // Remover local
    lista.querySelectorAll("[data-remover-local]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idLocal   = btn.getAttribute("data-remover-local");
        const idVinculo = btn.getAttribute("data-vinculo");
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
        try {
          const r = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${idLocal}`, { method: "DELETE" });
          if (r.ok || r.status === 204) {
            locaisSalvos = locaisSalvos.filter(l => String(l.idRoteiroLocal) !== String(idVinculo));
            renderLocais();
            atualizarMapaAtividades();
          } else { alert("Não foi possível remover o local."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-trash"></i>`; }
        } catch { alert("Erro ao conectar ao servidor."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-trash"></i>`; }
      });
    });

    // Drag-and-drop reordering (attach once — listeners accumulate otherwise)
    if (!_dragSetup) {
    _dragSetup = true;
    let _dragSrcId = null;
    lista.addEventListener("dragstart", e => {
      const item = e.target.closest(".day-item[draggable]");
      if (!item) return;
      _dragSrcId = item.dataset.vinculoId;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => { item.style.opacity = "0.4"; }, 0);
    });
    lista.addEventListener("dragend", () => {
      lista.querySelectorAll(".day-item").forEach(el => { el.style.opacity = ""; el.style.borderTop = ""; });
      _dragSrcId = null;
    });
    lista.addEventListener("dragover", e => {
      e.preventDefault();
      const item = e.target.closest(".day-item");
      if (!item || item.dataset.vinculoId === _dragSrcId) return;
      lista.querySelectorAll(".day-item").forEach(el => el.style.borderTop = "");
      item.style.borderTop = "2px solid #f97316";
    });
    lista.addEventListener("drop", async e => {
      e.preventDefault();
      lista.querySelectorAll(".day-item").forEach(el => { el.style.opacity = ""; el.style.borderTop = ""; });
      const targetItem = e.target.closest(".day-item");
      if (!targetItem || !_dragSrcId || targetItem.dataset.vinculoId === _dragSrcId) return;
      const srcEl = lista.querySelector(`[data-vinculo-id="${_dragSrcId}"]`);
      if (!srcEl || srcEl.dataset.diaGrupo !== targetItem.dataset.diaGrupo) return;
      const srcIdx = locaisSalvos.findIndex(x => String(x.idRoteiroLocal) === String(_dragSrcId));
      const tgtIdx = locaisSalvos.findIndex(x => String(x.idRoteiroLocal) === String(targetItem.dataset.vinculoId));
      if (srcIdx === -1 || tgtIdx === -1) return;
      const [moved] = locaisSalvos.splice(srcIdx, 1);
      locaisSalvos.splice(tgtIdx, 0, moved);
      const diaVal = moved.dia;
      const diaItens = locaisSalvos.filter(x => String(x.dia || 0) === String(diaVal || 0));
      diaItens.forEach((x, i) => { x.ordem = i + 1; });
      renderLocais();
      for (const x of diaItens) {
        try {
          await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${x.idLocal}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dia: x.dia, observacoes: x.observacoes || null, horario: x.horario || null, idLocal: x.idLocal, ordem: x.ordem }),
          });
        } catch (_) {}
      }
    });
    } // end _dragSetup

    buscarEAtualizarHorariosAbertos();
  }

  function buscarEAtualizarHorariosAbertos() {
    if (!window.google?.maps?.places) return;
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    const vistos = new Set();
    locaisSalvos.forEach(l => {
      if (!l.placeId || vistos.has(l.placeId)) return;
      vistos.add(l.placeId);
      if (localStorage.getItem(`flyguide:place-hours:${l.placeId}`)) {
        // já tem cache — apenas atualiza o badge se o elemento existir
        const el = document.getElementById(`local-info-${l.idRoteiroLocal}`);
        if (el && !el.querySelector("[data-abertura]")) renderBadgeAbertura(l.idRoteiroLocal, l.placeId);
        return;
      }
      service.getDetails(
        { placeId: l.placeId, fields: ["opening_hours"] },
        (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.opening_hours) return;
          const data = { periods: place.opening_hours.periods || [], weekdayText: place.opening_hours.weekday_text || [] };
          try { localStorage.setItem(`flyguide:place-hours:${l.placeId}`, JSON.stringify(data)); } catch (_) {}
          locaisSalvos.filter(x => x.placeId === l.placeId).forEach(x => renderBadgeAbertura(x.idRoteiroLocal, l.placeId));
        }
      );
    });
  }

  function renderBadgeAbertura(idRoteiroLocal, placeId) {
    const el = document.getElementById(`local-info-${idRoteiroLocal}`);
    if (!el) return;
    if (el.querySelector("[data-abertura]")) return;
    try {
      const h = JSON.parse(localStorage.getItem(`flyguide:place-hours:${placeId}`) || "null");
      if (!h) return;
      const aberto = calcularAberturaAgora(h.periods);
      if (aberto === null) return;
      const badge = document.createElement("div");
      badge.setAttribute("data-abertura", "1");
      badge.style.cssText = `font-size:.78rem;margin-top:4px;color:${aberto ? "#16a34a" : "#dc2626"};`;
      badge.innerHTML = `<i class="bi bi-clock me-1"></i>${aberto ? "Aberto agora" : "Fechado agora"}`;
      el.appendChild(badge);
    } catch (_) {}
  }

  const PALETA_DIAS = [
    "#f97316", "#3b82f6", "#22c55e", "#8b5cf6",
    "#ef4444", "#14b8a6", "#f59e0b", "#ec4899",
    "#06b6d4", "#84cc16",
  ];

  function atualizarMapaAtividades() {
    const box   = document.getElementById("mapaAtividadesBox");
    const mapEl = document.getElementById("mapaAtividades");
    if (!box || !mapEl || !window.google) return;

    const locaisComCoordenadas = locaisSalvos
      .filter(l => l.latitude && l.longitude)
      .sort(compararLocaisAgenda);

    if (locaisComCoordenadas.length === 0) {
      box.style.display = "none";
      return;
    }

    box.style.display = "";

    // Mapeia cor por dia
    const grupos = agruparLocaisPorDiaAgenda(locaisComCoordenadas);
    const totalPorDiaMapa = new Map(
      agruparLocaisPorDiaAgenda(locaisSalvos).map(g => [g.dia, contarLocaisAgenda(g.itens)])
    );
    const corPorDia = {};
    grupos.forEach((g, idx) => { corPorDia[g.dia] = PALETA_DIAS[idx % PALETA_DIAS.length]; });

    // ── Filtros de dia ─────────────────────────────────────────────
    const filtrosEl = document.getElementById("filtrosDiasMapa");
    if (filtrosEl) {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const chipBg = isDark ? "#1e293b" : "#fff";
      const chipMuted = isDark ? "#cbd5e1" : "#64748b";
      const chipBorder = isDark ? "#334155" : "#e2e8f0";
      filtrosEl.innerHTML = [
        `<button class="btn btn-sm"
           style="padding:4px 14px;border-radius:999px;border:1px solid ${diaFiltradoMapa === null ? "#f97316" : chipBorder};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${diaFiltradoMapa === null ? "#f97316" : chipBg};color:${diaFiltradoMapa === null ? "#fff" : chipMuted};"
           data-dia-mapa="todos">Todos</button>`,
        ...grupos.map(g => {
          const cor = corPorDia[g.dia];
          const ativo = diaFiltradoMapa === g.dia;
          const qtd = totalPorDiaMapa.get(g.dia) ?? contarLocaisAgenda(g.itens);
          return `<button class="btn btn-sm"
                    data-dia-mapa="${g.dia}"
                    style="padding:4px 14px;border-radius:999px;border:1px solid ${cor};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${ativo ? cor : chipBg};color:${ativo ? "#fff" : cor};">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ativo ? "#fff" : cor};margin-right:4px;"></span>Dia ${g.dia} - ${qtd} ${qtd === 1 ? "local" : "locais"}
                  </button>`;
        }),
      ].join("");

      filtrosEl.querySelectorAll("[data-dia-mapa]").forEach(btn => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute("data-dia-mapa");
          diaFiltradoMapa = val === "todos" ? null : parseInt(val);
          atualizarMapaAtividades();
        });
      });
    }

    // ── Legenda ────────────────────────────────────────────────────
    const legendaEl = document.getElementById("legendaMapa");
    if (legendaEl) {
      legendaEl.innerHTML = "";
      legendaEl.style.display = "none";
    }

    // ── Filtra locais a exibir ─────────────────────────────────────
    const locaisFiltrados = diaFiltradoMapa !== null
      ? locaisComCoordenadas.filter(l => l.dia === diaFiltradoMapa)
      : locaisComCoordenadas;

    if (locaisFiltrados.length === 0) return;

    // ── Mapa ───────────────────────────────────────────────────────
    const map = new google.maps.Map(mapEl, {
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const infoWindow = new google.maps.InfoWindow();
    const bounds     = new google.maps.LatLngBounds();

    locaisFiltrados.forEach((l, idx) => {
      const cor = corPorDia[l.dia] || "#f97316";
      const pos = { lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) };

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: l.nome,
        label: { text: String(idx + 1), color: "#fff", fontWeight: "bold", fontSize: "13px" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: cor,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 10,
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:Inter,sans-serif;min-width:160px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block;"></span>
              <span style="font-size:.72rem;font-weight:700;color:${cor};">Dia ${l.dia || "?"}</span>
              ${formatarHorarioAgenda(l.horario) ? `<span style="font-size:.72rem;color:#64748b;"> · ${formatarHorarioAgenda(l.horario)}</span>` : ""}
            </div>
            <strong style="font-size:.9rem;">${escapeHtml(l.nome)}</strong>
            ${l.endereco ? `<div style="font-size:.78rem;color:#64748b;margin-top:4px;">${escapeHtml(l.endereco)}</div>` : ""}
            ${l.observacoes ? `<div style="font-size:.78rem;margin-top:4px;color:#334155;">${escapeHtml(l.observacoes)}</div>` : ""}
          </div>`);
        infoWindow.open(map, marker);
      });

      bounds.extend(pos);
    });

    // ── Rota por dia (sem cruzar dias diferentes) ──────────────────
    const gruposFiltrados = diaFiltradoMapa !== null
      ? grupos.filter(g => g.dia === diaFiltradoMapa)
      : grupos;

    gruposFiltrados.forEach(g => {
      const locaisDoDia = g.itens.filter(l => l.latitude && l.longitude);
      if (locaisDoDia.length < 2) return;

      const cor = corPorDia[g.dia] || "#f97316";
      const directionsService  = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: cor, strokeWeight: 4, strokeOpacity: 0.75 },
      });
      directionsRenderer.setMap(map);

      const origem  = locaisDoDia[0];
      const destino = locaisDoDia[locaisDoDia.length - 1];
      const paradas = locaisDoDia.slice(1, -1).map(l => ({
        location: new google.maps.LatLng(parseFloat(l.latitude), parseFloat(l.longitude)),
        stopover: true,
      }));

      directionsService.route({
        origin:            new google.maps.LatLng(parseFloat(origem.latitude), parseFloat(origem.longitude)),
        destination:       new google.maps.LatLng(parseFloat(destino.latitude), parseFloat(destino.longitude)),
        waypoints:         paradas,
        travelMode:        google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      }, (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
        } else {
          // Fallback: polyline simples
          new google.maps.Polyline({
            path: locaisDoDia.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) })),
            map,
            strokeColor: cor,
            strokeWeight: 3,
            strokeOpacity: 0.6,
          });
        }
      });
    });

    // ── Ajusta zoom ───────────────────────────────────────────────
    if (locaisFiltrados.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds);
    }
  }

  // Inicializa Google Maps Autocomplete
  window.initMapsAtividades = function () {
    const input = document.getElementById("buscaLocal");
    if (!input || !window.google) return;

    if (input.dataset.localResetReady !== "true") {
      input.dataset.localResetReady = "true";
      input.addEventListener("input", () => {
        if (!localSelecionado) return;
        if (normalizarTextoLugar(input.value) === normalizarTextoLugar(localSelecionado.nome)) return;
        limparLocalSelecionado(false);
        ocultarErroLocal();
      });
    }

    autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["place_id", "name", "formatted_address", "geometry", "types", "opening_hours", "address_components"],
      language: "pt-BR",
    });

    configurarAutocompleteBasesViagem();
    atualizarAutocompletePorBase();
    prefillFormBaseDoRoteiro().then(() => atualizarAutocompletePorBase()).catch(() => {});

    // Caso locais já tenham carregado antes do Maps estar pronto
    if (locaisSalvos.length > 0) atualizarMapaAtividades();

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.place_id) return;
      ocultarErroLocal();

      localSelecionado = {
        placeId:           place.place_id,
        nome:              place.name,
        endereco:          place.formatted_address,
        tipo:              (place.types || [])[0] || "establishment",
        latitude:          place.geometry?.location?.lat(),
        longitude:         place.geometry?.location?.lng(),
        addressComponents: place.address_components || [],
        openingHours:      place.opening_hours ? {
          periods:     place.opening_hours.periods     || [],
          weekdayText: place.opening_hours.weekday_text || [],
        } : null,
      };
      if (!validarLocalNaBase(localSelecionado)) return;

      // Preenche preview
      const preview = document.getElementById("localPreview");
      if (preview) {
        preview.style.display = "";
        document.getElementById("previewNome").textContent     = localSelecionado.nome;
        document.getElementById("previewEndereco").textContent = localSelecionado.endereco;
        atualizarPreviewDistancia();
      }
    });
  };

  document.getElementById("btnAdicionarBase")?.addEventListener("click", async () => {
    const inputPais = document.getElementById("basePais");
    const inputCidade = document.getElementById("baseCidade");
    const inputDias = document.getElementById("baseDias");
    const paisDigitado = inputPais?.value?.trim();
    const cidadeDigitada = inputCidade?.value?.trim();
    const diasBase = parseInt(inputDias?.value) > 0 ? parseInt(inputDias.value) : null;

    if (!paisDigitado || !cidadeDigitada) {
      mostrarErroBase("Informe o pais e a cidade base antes de adicionar.");
      return;
    }

    const paisResolvido = await sincronizarPaisBaseDigitado({
      limparCidade: false,
      mostrarErro: true,
      canonizarInput: true,
    });
    const pais = paisResolvido?.nome || paisDigitado;
    const cidade = cidadeBaseSelecionada?.nome || cidadeDigitada;

    if (!pais || !cidade) {
      mostrarErroBase("Informe o pais e a cidade base antes de adicionar.");
      return;
    }

    ocultarErroBase();

    try {
      const geocoded = cidadeBaseSelecionada?.latitude != null && cidadeBaseSelecionada?.longitude != null
        ? {
            latitude: cidadeBaseSelecionada.latitude,
            longitude: cidadeBaseSelecionada.longitude,
            label: [cidade, pais].filter(Boolean).join(", "),
          }
        : await geocodificarBase(pais, cidade);
      const duplicada = basesViagem.find((base) =>
        normalizarTextoLugar(base.country) === normalizarTextoLugar(pais)
        && normalizarTextoLugar(base.city) === normalizarTextoLugar(cidade)
      );

      if (duplicada) {
        duplicada.latitude = geocoded.latitude;
        duplicada.longitude = geocoded.longitude;
        duplicada.label = `${cidade}, ${pais}`;
        duplicada.dias = diasBase;
        baseAtivaId = duplicada.id;
      } else {
        basesViagem.push({
          id: `base-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          country: pais,
          city: cidade,
          label: `${cidade}, ${pais}`,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          dias: diasBase,
        });
        baseAtivaId = basesViagem[basesViagem.length - 1].id;
      }

      salvarBasesViagem();
      salvarConfigFiltroBase();
      renderBasesFiltro();
      renderLocais();
      atualizarPreviewDistancia();

      paisBaseSelecionado = null;
      limparCidadeBaseSelecionada(false);
      if (inputPais) inputPais.value = "";
      if (inputCidade) inputCidade.value = "";
      if (inputDias) inputDias.value = "";
      atualizarRestricaoAutocompleteCidadeBase();
    } catch (erro) {
      mostrarErroBase(erro.message || "Nao foi possivel adicionar a base.");
    }
  });

  document.getElementById("baseFiltroAtiva")?.addEventListener("change", (evento) => {
    baseAtivaId = evento.target.value || null;
    salvarConfigFiltroBase();
    renderBasesFiltro();
    renderLocais();
    atualizarPreviewDistancia();
  });

  document.getElementById("raioBaseKm")?.addEventListener("input", (evento) => {
    const valor = Math.max(1, parseInt(evento.target.value, 10) || 0);
    raioFiltroKm = valor || 30;
    evento.target.value = raioFiltroKm;
    salvarConfigFiltroBase();
    atualizarResumoFiltroBase();
    atualizarAutocompletePorBase();
    renderLocais();
    atualizarPreviewDistancia();
  });

  // Salvar local no banco
  document.getElementById("btnSalvarLocal")?.addEventListener("click", async () => {
    if (!localSelecionado) {
      alert("Busque e selecione um local primeiro!");
      return;
    }

    const dia       = document.getElementById("localDia")?.value?.trim();
    const horarioBruto = document.getElementById("localHorario")?.value?.trim();
    const horario   = normalizarHorarioAgenda(horarioBruto);
    const observ    = document.getElementById("localObs")?.value?.trim();
    const erroEl    = document.getElementById("erroLocal");

    if (!dia) {
      if (erroEl) { erroEl.textContent = "Informe o dia da atividade."; erroEl.style.display = ""; }
      return;
    }
    if (horarioBruto && !horario) {
      if (erroEl) { erroEl.textContent = "Informe um horario valido no formato HH:MM."; erroEl.style.display = ""; }
      return;
    }
    if (!validarLocalNaBase(localSelecionado)) return;
    if (erroEl) erroEl.style.display = "none";

    const btn = document.getElementById("btnSalvarLocal");
    btn.disabled  = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

    try {
      // 1. Criar/buscar local no banco (LocalService faz upsert — sempre retorna 200)
      const resLocal = await authFetch(`${URL_API_BASE}/locais`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          placeId:   localSelecionado.placeId,
          nome:      localSelecionado.nome,
          endereco:  localSelecionado.endereco,
          tipo:      localSelecionado.tipo,
          latitude:  localSelecionado.latitude,
          longitude: localSelecionado.longitude,
        }),
      });

      if (!resLocal.ok) throw new Error("Erro ao salvar local");
      const local = await resLocal.json();

      // 2. Vincular local ao roteiro
      const resVinculo = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          idLocal:     local.idLocal,
          dia:         parseInt(dia),
          ordem:       locaisSalvos.length + 1,
          observacoes: observ || null,
          horario:     horario,
          status:      "PLANEJADO",
        }),
      });

      if (resVinculo.ok || resVinculo.status === 201) {
        const vinculo = await resVinculo.json();
        if (localSelecionado?.openingHours && localSelecionado.placeId) {
          try { localStorage.setItem(`flyguide:place-hours:${localSelecionado.placeId}`, JSON.stringify(localSelecionado.openingHours)); } catch (_) {}
        }
        locaisSalvos.push(vinculo);
        renderLocais();
        atualizarMapaAtividades();
      } else if (resVinculo.status === 422 || resVinculo.status === 500) {
        // Local já vinculado ou erro de integridade — recarrega lista do banco
        const resList = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`);
        if (resList.ok) { locaisSalvos = await resList.json(); renderLocais(); atualizarMapaAtividades(); }
      } else {
        const erroEl = document.getElementById("erroLocal");
        if (erroEl) { erroEl.textContent = "Não foi possível adicionar o local. Tente novamente."; erroEl.style.display = ""; }
        return;
      }

      // Reset form
      document.getElementById("buscaLocal").value = "";
      document.getElementById("localDia").value   = "";
      document.getElementById("localObs").value   = "";
      document.getElementById("localHorario").value = "";
      document.getElementById("localPreview").style.display = "none";
      document.getElementById("previewDistancia").style.display = "none";
      localSelecionado = null;

    } catch (err) {
      const erroEl = document.getElementById("erroLocal");
      if (erroEl) { erroEl.textContent = "Erro ao conectar ao servidor. Verifique se o backend está rodando."; erroEl.style.display = ""; }
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="bi bi-plus-lg me-1"></i>Adicionar ao Roteiro`;
    }
  });

  // ── RECOMENDAÇÕES INTELIGENTES ──────────────────────────────────

  async function buscarRecomendacoes(base, tipo) {
    if (!window.google || !google.maps?.places) {
      throw new Error("Google Maps não carregou ainda. Aguarde e tente novamente.");
    }
    if (!base || base.latitude == null || base.longitude == null) {
      throw new Error("A base ativa não possui coordenadas. Aguarde o carregamento ou adicione a base novamente.");
    }

    const serviceDiv = document.createElement("div");
    const service = new google.maps.places.PlacesService(serviceDiv);

    return new Promise((resolve, reject) => {
      service.nearbySearch({
        location: new google.maps.LatLng(parseFloat(base.latitude), parseFloat(base.longitude)),
        radius: raioFiltroKm * 1000,
        type: tipo,
      }, (results, status) => {
        const OK   = google.maps.places.PlacesServiceStatus.OK;
        const ZERO = google.maps.places.PlacesServiceStatus.ZERO_RESULTS;
        if (status !== OK && status !== ZERO) {
          reject(new Error("Erro ao buscar recomendações. Tente novamente."));
          return;
        }
        const sorted = (results || [])
          .filter(p => p.rating != null)
          .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
          });
        resolve(sorted);
      });
    });
  }

  function renderRecomendacoes(lugares) {
    lugaresRecomendados = lugares;
    paginaRecomAtual = 0;
    const filtrosEl = document.getElementById("filtrosRecomendacoes");
    if (filtrosEl) filtrosEl.style.display = lugares.length > 0 ? "" : "none";
    renderPaginaRecomendacoes();
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function renderPaginaRecomendacoes() {
    const listaEl = document.getElementById("listaRecomendacoes");
    if (!listaEl) return;

    const avalMin  = parseFloat(document.getElementById("filtroAvaliacaoMin")?.value || "0");
    const qtdMin   = parseInt(document.getElementById("filtroQtdMin")?.value || "0");
    const ordem    = document.getElementById("filtroOrdemRecom")?.value || "avaliacao";
    const base     = obterBaseAtiva();

    let lugares = lugaresRecomendados
      .filter(l => (l.rating || 0) >= avalMin && (l.user_ratings_total || 0) >= qtdMin);

    if (ordem === "qtd") {
      lugares = [...lugares].sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
    } else if (ordem === "distancia" && base?.lat && base?.lng) {
      lugares = [...lugares].sort((a, b) => {
        const da = haversineKm(base.lat, base.lng, a.geometry?.location?.lat() ?? 0, a.geometry?.location?.lng() ?? 0);
        const db = haversineKm(base.lat, base.lng, b.geometry?.location?.lat() ?? 0, b.geometry?.location?.lng() ?? 0);
        return da - db;
      });
    } else {
      lugares = [...lugares].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (lugares.length === 0) {
      listaEl.innerHTML = `
        <div class="text-center py-4 text-secondary" style="margin-top:16px;">
          <i class="bi bi-search" style="font-size:2rem;color:#cbd5e1;"></i>
          <div class="mt-2">Nenhum lugar encontrado para esta categoria no raio definido.</div>
          <div class="small mt-1">Tente aumentar o raio ou escolher outra categoria.</div>
        </div>`;
      return;
    }

    const totalPaginas = Math.ceil(lugares.length / RECOM_POR_PAGINA);
    const inicio = paginaRecomAtual * RECOM_POR_PAGINA;
    const lugaresVisiveis = lugares.slice(inicio, inicio + RECOM_POR_PAGINA);
    const temMais = paginaRecomAtual < totalPaginas - 1;

    listaEl.innerHTML = `
      <div style="font-size:.85rem;color:#64748b;margin-top:16px;margin-bottom:8px;">
        <i class="bi bi-trophy me-1" style="color:#f97316;"></i>
        <strong>${lugares.length}</strong> lugar${lugares.length !== 1 ? "es" : ""} encontrado${lugares.length !== 1 ? "s" : ""},
        ordenado${lugares.length !== 1 ? "s" : ""} por avaliação
        ${base ? `· base: <strong>${escapeHtml(base.city || base.label)}</strong> · raio: <strong>${raioFiltroKm} km</strong>` : ""}
      </div>
      ${lugaresVisiveis.map((lugar, idx) => {
        const rating = lugar.rating || 0;
        const total  = lugar.user_ratings_total || 0;
        const globalIdx = inicio + idx;
        const endereco = lugar.vicinity || lugar.formatted_address || "";
        const mapsUrl = mapsUrlLocalAgenda({
          placeId: lugar.place_id,
          nome: lugar.name,
          endereco,
          latitude: lugar.geometry?.location?.lat?.(),
          longitude: lugar.geometry?.location?.lng?.(),
        });
        const starsHtml = Array.from({ length: 5 }, (_, i) =>
          `<i class="bi bi-star${i < Math.round(rating) ? "-fill" : ""}" style="color:${i < Math.round(rating) ? "#f59e0b" : "#cbd5e1"};font-size:.8rem;"></i>`
        ).join("");

        return `
          <div style="background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:14px;display:flex;gap:14px;align-items:flex-start;margin-top:10px;">
            <div style="background:#f97316;color:#fff;min-width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:.9rem;flex-shrink:0;">
              ${globalIdx + 1}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:800;font-size:1rem;">${escapeHtml(lugar.name)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
                ${starsHtml}
                <span style="font-weight:700;color:#0f172a;font-size:.88rem;">${rating.toFixed(1)}</span>
                ${total > 0 ? `<span style="color:#94a3b8;font-size:.78rem;">(${total.toLocaleString("pt-BR")} avaliações)</span>` : ""}
              </div>
              ${endereco ? `<div style="color:#94a3b8;font-size:.82rem;margin-top:4px;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(endereco)}</div>` : ""}
              ${lugar.opening_hours != null ? `<div style="font-size:.78rem;margin-top:4px;color:${lugar.opening_hours.open_now ? "#16a34a" : "#dc2626"};">
                <i class="bi bi-clock me-1"></i>${lugar.opening_hours.open_now ? "Aberto agora" : "Fechado agora"}
              </div>` : ""}
              ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;"><i class="bi bi-map"></i>Ver no Maps</a>` : ""}
            </div>
            <button class="btn btn-sm btn-primary-orange flex-shrink-0"
              style="white-space:nowrap;"
              data-recom-nome="${escapeHtml(lugar.name)}"
              data-recom-endereco="${escapeHtml(lugar.vicinity || "")}"
              data-recom-placeid="${lugar.place_id}"
              data-recom-lat="${lugar.geometry?.location?.lat() ?? ""}"
              data-recom-lng="${lugar.geometry?.location?.lng() ?? ""}"
              data-recom-tipo="${(lugar.types || [])[0] || "establishment"}">
              <i class="bi bi-plus-lg"></i> Adicionar
            </button>
          </div>`;
      }).join("")}
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
        ${paginaRecomAtual > 0 ? `
        <button id="recomPrev" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 16px;font-weight:700;font-size:.9rem;">
          <i class="bi bi-chevron-left"></i> Anterior
        </button>` : ""}
        <span style="font-size:.85rem;color:#64748b;">Página ${paginaRecomAtual + 1} de ${totalPaginas}</span>
        ${temMais ? `
        <button id="btnCarregarMaisRecom" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 20px;font-weight:700;font-size:.9rem;">
          Próxima <i class="bi bi-chevron-right"></i>
        </button>` : `<span style="font-size:.8rem;color:#94a3b8;">Última página</span>`}
      </div>
    `;

    document.getElementById("recomPrev")?.addEventListener("click", () => {
      paginaRecomAtual--;
      renderPaginaRecomendacoes();
      document.getElementById("listaRecomendacoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("btnCarregarMaisRecom")?.addEventListener("click", () => {
      paginaRecomAtual++;
      renderPaginaRecomendacoes();
      document.getElementById("listaRecomendacoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    listaEl.querySelectorAll("[data-recom-placeid]").forEach(btn => {
      btn.addEventListener("click", () => {
        const nome     = btn.getAttribute("data-recom-nome");
        const endereco = btn.getAttribute("data-recom-endereco");
        const placeId  = btn.getAttribute("data-recom-placeid");
        const lat      = parseFloat(btn.getAttribute("data-recom-lat")) || null;
        const lng      = parseFloat(btn.getAttribute("data-recom-lng")) || null;
        const tipo     = btn.getAttribute("data-recom-tipo");

        localSelecionado = { placeId, nome, endereco, tipo, latitude: lat, longitude: lng };
        if (!validarLocalNaBase(localSelecionado)) return;

        const inputBusca = document.getElementById("buscaLocal");
        const preview    = document.getElementById("localPreview");
        if (inputBusca) inputBusca.value = nome;
        if (preview) {
          preview.style.display = "";
          document.getElementById("previewNome").textContent     = nome;
          document.getElementById("previewEndereco").textContent = endereco;
          atualizarPreviewDistancia();
        }

        const formLocal = document.querySelector(".local-search-box");
        if (formLocal) formLocal.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  document.getElementById("btnBuscarRecomendacoes")?.addEventListener("click", async () => {
    const base       = obterBaseAtiva();
    const categoria  = document.getElementById("categoriaRecomendacao")?.value || "tourist_attraction";
    const loadingEl  = document.getElementById("loadingRecomendacoes");
    const alertaEl   = document.getElementById("alertaRecomendacoes");
    const listaEl    = document.getElementById("listaRecomendacoes");
    const btn        = document.getElementById("btnBuscarRecomendacoes");

    if (!base) {
      if (alertaEl) { alertaEl.textContent = "Adicione pelo menos uma base de viagem antes de buscar recomendações."; alertaEl.style.display = ""; }
      return;
    }
    if (base.latitude == null || base.longitude == null) {
      if (alertaEl) { alertaEl.textContent = `Aguarde as coordenadas de "${escapeHtml(base.city || base.label)}" serem carregadas e tente novamente.`; alertaEl.style.display = ""; }
      return;
    }

    if (alertaEl) alertaEl.style.display = "none";
    if (listaEl)  listaEl.innerHTML = "";
    if (loadingEl) loadingEl.style.display = "";
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Buscando...`; }

    try {
      const lugares = await buscarRecomendacoes(base, categoria);
      renderRecomendacoes(lugares);
    } catch (erro) {
      if (alertaEl) { alertaEl.textContent = erro.message || "Erro ao buscar recomendações."; alertaEl.style.display = ""; }
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="bi bi-search me-1"></i>Buscar`; }
    }
  });

  // Pré-preenche os campos País e Cidade Base com os valores da página 1 (passados via URL)
  (function aplicarPrefill() {
    const prefPais   = urlParams.get("pref_pais");
    const prefCidade = urlParams.get("pref_cidade");
    if (!prefPais && !prefCidade) return;
    const elPais   = document.getElementById("basePais");
    const elCidade = document.getElementById("baseCidade");
    if (prefPais   && elPais)   elPais.value   = prefPais;
    if (prefCidade && elCidade) elCidade.value = prefCidade;
  })();

  carregarBasesDoStorage();
  renderBasesFiltro();
  if (roteiroId !== "DRAFT") carregarLocais();

  document.getElementById("ordenacaoHorario")?.addEventListener("change", () => renderLocais());

  ["filtroAvaliacaoMin", "filtroQtdMin", "filtroOrdemRecom"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      paginaRecomAtual = 0;
      renderPaginaRecomendacoes();
    });
  });
})();

// ================================================================
// DETALHES — mapa com pins dos locais separados por dia
// ================================================================
(function iniciarMapsDetalhes() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const PALETA_DETALHE = [
    "#f97316", "#3b82f6", "#22c55e", "#8b5cf6",
    "#ef4444", "#14b8a6", "#f59e0b", "#ec4899",
    "#06b6d4", "#84cc16",
  ];

  let _locaisDetalhe      = [];
  let _diaFiltrado        = null;
  let _corPorDia          = {};
  let _diasUnicos         = [];
  let _aiPlacesCache      = [];

  function ehCheckinCheckoutMapaDetalhe(local) {
    const nome = String(local?.nome || local?.name || local || "").trim().toLowerCase().replace(/[\s-]/g, "");
    return !!local?._checkin || !!local?._checkout || nome === "checkin" || nome === "checkout";
  }

  function contarLocaisMapaDetalhe(locais) {
    return (locais || []).filter(l => !ehCheckinCheckoutMapaDetalhe(l)).length;
  }

  function renderMapaDetalhe() {
    const mapEl = document.getElementById("mapaRoteiro");
    if (!mapEl || !window.google) return;

    const locaisComCoordenadas = _locaisDetalhe
      .filter(l => l.latitude && l.longitude)
      .sort(compararLocaisMapaDetalhe);

    const locaisFiltrados = _diaFiltrado !== null
      ? locaisComCoordenadas.filter(l => (l.dia || 0) === _diaFiltrado)
      : locaisComCoordenadas;

    if (locaisFiltrados.length === 0) {
      mapEl.style.display = "none";
      return;
    }
    mapEl.style.display = "";

    const bounds     = new google.maps.LatLngBounds();
    const infoWindow = new google.maps.InfoWindow();

    const map = new google.maps.Map(mapEl, {
      zoom:      13,
      mapTypeId: "roadmap",
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    });

    // Numerar marcadores dentro de cada dia
    const contadorPorDia = {};
    locaisFiltrados.forEach(l => {
      const dia  = l.dia || 0;
      contadorPorDia[dia] = (contadorPorDia[dia] || 0) + 1;
      const cor = _corPorDia[dia] || "#f97316";
      const pos = { lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) };

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: l.nome,
        label: { text: String(contadorPorDia[dia]), color: "#fff", fontWeight: "bold", fontSize: "13px" },
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        18,
          fillColor:    cor,
          fillOpacity:  1,
          strokeColor:  "#fff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:Inter,sans-serif;max-width:220px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block;flex-shrink:0;"></span>
              <span style="font-size:.72rem;font-weight:700;color:${cor};">Dia ${l.dia || "?"}${formatarHorarioMapaDetalhe(l.horario) ? ` · ${formatarHorarioMapaDetalhe(l.horario)}` : ""}</span>
            </div>
            <div style="font-weight:700;font-size:.9rem;">${escapeHtml(l.nome || "Local")}</div>
            ${l.endereco   ? `<div style="color:#64748b;font-size:.78rem;margin-top:3px;">${escapeHtml(l.endereco)}</div>` : ""}
            ${l.observacoes ? `<div style="font-size:.82rem;margin-top:4px;color:#334155;">${escapeHtml(l.observacoes)}</div>` : ""}
          </div>`);
        infoWindow.open(map, marker);
      });

      bounds.extend(pos);
    });

    // Rota por dia (na cor do dia)
    const directionsService = new google.maps.DirectionsService();
    const gruposFiltrados = _diaFiltrado !== null
      ? [{ dia: _diaFiltrado, itens: locaisFiltrados }]
      : _diasUnicos.map(dia => ({ dia, itens: locaisFiltrados.filter(l => (l.dia || 0) === dia) }));

    gruposFiltrados.forEach(({ dia, itens }) => {
      if (itens.length < 2) return;
      const cor      = _corPorDia[dia] || "#f97316";
      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: cor, strokeWeight: 4, strokeOpacity: 0.75 },
      });
      renderer.setMap(map);
      directionsService.route({
        origin:            new google.maps.LatLng(parseFloat(itens[0].latitude), parseFloat(itens[0].longitude)),
        destination:       new google.maps.LatLng(parseFloat(itens[itens.length - 1].latitude), parseFloat(itens[itens.length - 1].longitude)),
        waypoints:         itens.slice(1, -1).map(l => ({ location: new google.maps.LatLng(parseFloat(l.latitude), parseFloat(l.longitude)), stopover: true })),
        travelMode:        google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      }, (result, status) => {
        if (status === "OK") {
          renderer.setDirections(result);
        } else {
          new google.maps.Polyline({
            path:          itens.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) })),
            map,
            strokeColor:   cor,
            strokeWeight:  3,
            strokeOpacity: 0.6,
          });
        }
      });
    });

    if (locaisFiltrados.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds);
    }
  }

  function renderControlesMapaDetalhe() {
    const filtrosEl = document.getElementById("filtrosDiasMapaDetalhe");
    const legendaEl = document.getElementById("legendaMapaDetalhe");
    if (!filtrosEl || !legendaEl) return;

    if (_diasUnicos.length <= 1) {
      filtrosEl.style.display = "none";
      legendaEl.style.display = "none";
      return;
    }

    // Filtros
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const chipBg = isDark ? "#1e293b" : "#fff";
    const chipMuted = isDark ? "#cbd5e1" : "#64748b";
    const chipBorder = isDark ? "#334155" : "#e2e8f0";

    filtrosEl.style.display = "flex";
    filtrosEl.innerHTML = [
      `<button style="padding:4px 14px;border-radius:999px;border:1px solid ${chipBorder};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${_diaFiltrado === null ? "#f97316" : chipBg};color:${_diaFiltrado === null ? "#fff" : chipMuted};"
         data-dia-detalhe="todos">Todos</button>`,
      ..._diasUnicos.map(dia => {
        const cor   = _corPorDia[dia];
        const ativo = _diaFiltrado === dia;
        const qtd = contarLocaisMapaDetalhe(_locaisDetalhe.filter(l => (l.dia || 0) === dia));
        return `<button style="padding:4px 14px;border-radius:999px;border:1px solid ${cor};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${ativo ? cor : chipBg};color:${ativo ? "#fff" : cor};"
                   data-dia-detalhe="${dia}">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ativo ? "#fff" : cor};margin-right:4px;vertical-align:middle;"></span>Dia ${dia} - ${qtd} ${qtd === 1 ? "local" : "locais"}
                </button>`;
      }),
    ].join("");

    filtrosEl.querySelectorAll("[data-dia-detalhe]").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-dia-detalhe");
        _diaFiltrado = val === "todos" ? null : parseInt(val);
        renderControlesMapaDetalhe();
        renderMapaDetalhe();
      });
    });

    legendaEl.style.display = "none";
    legendaEl.innerHTML = "";
  }

  // Mapa para roteiros com sugestões da IA (sem locais reais cadastrados)
  window.renderMapaAiSugestoes = function (places) {
    _aiPlacesCache = places;

    // Merge real locals from initMapsDetalhes fetch into the AI places list
    const _realPlaces = (_locaisDetalhe || [])
      .filter(l => l.latitude && l.longitude)
      .map(l => ({
        dia:      l.dia || 0,
        nome:     l.nome || "Local",
        lat:      parseFloat(l.latitude),
        lng:      parseFloat(l.longitude),
        endereco: l.endereco || "",
        horario:  l.horario  || null,
        isReal:   true,
      }));
    places = [..._realPlaces, ...places];

    const mapEl   = document.getElementById("mapaRoteiro");
    const secao   = document.getElementById("secaoMapa");
    if (!mapEl || !secao || !window.google) return;

    const statusMapa = window._aiMapaStatusPorDia || {};

    // Ordena por dia e pela ordem original da lista para que a numeração fique correta
    places.sort((a, b) => (a.dia - b.dia) || ((a.ordem || 0) - (b.ordem || 0)));

    const diasUnicos = [...new Set([
      ...places.map(p => p.dia),
      ...Object.keys(statusMapa).map(Number),
    ])].filter(dia => Number.isFinite(dia)).sort((a, b) => a - b);
    const corPorDia  = {};
    diasUnicos.forEach((dia, idx) => { corPorDia[dia] = PALETA_DETALHE[idx % PALETA_DETALHE.length]; });

    let diaFiltrado = null;

    function statusDoDia(dia) {
      return statusMapa[dia] || statusMapa[String(dia)] || null;
    }

    function totalMapeadoDia(dia) {
      return places.filter(p => p.dia === dia).length;
    }

    function avisoMapaEl() {
      let aviso = document.getElementById("avisoMapaAiSugestoes");
      if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "avisoMapaAiSugestoes";
        mapEl.parentNode.insertBefore(aviso, mapEl);
      }
      return aviso;
    }

    function renderAvisoMapa() {
      const aviso = avisoMapaEl();
      const dias = diaFiltrado !== null ? [diaFiltrado] : diasUnicos;
      const infos = dias
        .map(dia => {
          const status = statusDoDia(dia);
          if (!status) return null;
          const mapeados = totalMapeadoDia(dia);
          return { dia, total: status.total || 0, mapeados, pendentes: status.pendentes || [] };
        })
        .filter(Boolean);
      const incompletos = infos.filter(info => info.total > info.mapeados);

      if (incompletos.length === 0) {
        aviso.style.display = "none";
        aviso.innerHTML = "";
        return;
      }

      const total = infos.reduce((sum, info) => sum + info.total, 0);
      const mapeados = infos.reduce((sum, info) => sum + Math.min(info.mapeados, info.total), 0);
      const exemplos = incompletos.flatMap(info => info.pendentes || []).slice(0, 3);
      const detalheExemplos = exemplos.length
        ? ` Ex.: ${exemplos.map(escapeHtml).join(", ")}.`
        : "";
      const texto = diaFiltrado !== null
        ? `Neste dia, ${mapeados}/${total} locais foram posicionados no mapa.`
        : `Alguns locais ainda não possuem coordenadas confiáveis no mapa (${mapeados}/${total} exibidos nos dias filtrados).`;

      aviso.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin:-2px 0 10px;padding:9px 12px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#f59e0b;font-size:.82rem;font-weight:700;";
      aviso.innerHTML = `<i class="bi bi-exclamation-triangle-fill" style="font-size:.95rem;line-height:1.25;"></i><span>${texto} A lista abaixo continua completa.${detalheExemplos}</span>`;
    }

    function posicaoComDeslocamento(p, contadorCoordenada) {
      const key = `${Number(p.lat).toFixed(5)},${Number(p.lng).toFixed(5)}`;
      const repeticao = contadorCoordenada[key] || 0;
      contadorCoordenada[key] = repeticao + 1;
      if (repeticao === 0) return { lat: p.lat, lng: p.lng };
      const angulo = repeticao * 1.7;
      const raio = 0.00008 * Math.ceil(repeticao / 2);
      return {
        lat: p.lat + Math.cos(angulo) * raio,
        lng: p.lng + Math.sin(angulo) * raio,
      };
    }

    function renderMapa() {
      const filtrados = (diaFiltrado !== null ? places.filter(p => p.dia === diaFiltrado) : places)
        .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));

      mapEl.style.display = "";
      secao.style.display = "";
      window._flyguide_ai_mapa_pronto = true;
      renderAvisoMapa();

      if (filtrados.length === 0) {
        mapEl.innerHTML = `
          <div style="height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#94a3b8;font-weight:700;">
            Nenhum local deste filtro tem coordenadas confiáveis para exibir no mapa.
          </div>`;
        return;
      }

      const bounds     = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();
      const contadorCoordenada = {};

      const map = new google.maps.Map(mapEl, {
        zoom:      13,
        mapTypeId: "roadmap",
        mapTypeControl:    false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });

      const contadorPorDia = {};
      filtrados.forEach(p => {
        const cor = corPorDia[p.dia] || "#f97316";
        contadorPorDia[p.dia] = (contadorPorDia[p.dia] || 0) + 1;
        const pos    = posicaoComDeslocamento(p, contadorCoordenada);
        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: p.nome,
          label: { text: String(contadorPorDia[p.dia]), color: "#fff", fontWeight: "bold", fontSize: "13px" },
          icon: {
            path:         google.maps.SymbolPath.CIRCLE,
            scale:        18,
            fillColor:    cor,
            fillOpacity:  1,
            strokeColor:  "#fff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => {
          infoWindow.setContent(`
            <div style="font-family:Inter,sans-serif;max-width:220px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block;flex-shrink:0;"></span>
                <span style="font-size:.72rem;font-weight:700;color:${cor};">Dia ${p.dia}${p.isReal ? "" : " · IA"}</span>
              </div>
              <div style="font-weight:700;font-size:.9rem;">${escapeHtml(p.nome)}</div>
              ${p.endereco ? `<div style="color:#64748b;font-size:.78rem;margin-top:3px;">${escapeHtml(p.endereco)}</div>` : ""}
            </div>`);
          infoWindow.open(map, marker);
        });
        bounds.extend(pos);
      });

      // Rota por dia
      const directionsService = new google.maps.DirectionsService();
      const grupos = diaFiltrado !== null
        ? [{ dia: diaFiltrado, itens: filtrados }]
        : diasUnicos.map(dia => ({ dia, itens: filtrados.filter(p => p.dia === dia) }));

      grupos.forEach(({ dia, itens }) => {
        if (itens.length < 2) return;
        const cor      = corPorDia[dia] || "#f97316";
        const renderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: cor, strokeWeight: 4, strokeOpacity: 0.75 },
        });
        renderer.setMap(map);
        directionsService.route({
          origin:            new google.maps.LatLng(itens[0].lat, itens[0].lng),
          destination:       new google.maps.LatLng(itens[itens.length - 1].lat, itens[itens.length - 1].lng),
          waypoints:         itens.slice(1, -1).map(p => ({ location: new google.maps.LatLng(p.lat, p.lng), stopover: true })),
          travelMode:        google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        }, (result, status) => {
          if (status === "OK") {
            renderer.setDirections(result);
          } else {
            new google.maps.Polyline({
              path:          itens.map(p => ({ lat: p.lat, lng: p.lng })),
              map,
              strokeColor:   cor,
              strokeWeight:  3,
              strokeOpacity: 0.6,
            });
          }
        });
      });

      if (filtrados.length === 1) { map.setCenter(bounds.getCenter()); map.setZoom(14); }
      else map.fitBounds(bounds);
    }

    function renderControles() {
      const filtrosEl = document.getElementById("filtrosDiasMapaDetalhe");
      const legendaEl = document.getElementById("legendaMapaDetalhe");
      if (!filtrosEl || !legendaEl) return;

      if (diasUnicos.length <= 1) {
        filtrosEl.style.display = "none";
        legendaEl.style.display = "none";
        return;
      }

      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const chipBg = isDark ? "#1e293b" : "#fff";
      const chipMuted = isDark ? "#cbd5e1" : "#64748b";
      const chipBorder = isDark ? "#334155" : "#e2e8f0";

      filtrosEl.style.display = "flex";
      filtrosEl.innerHTML = [
        `<button style="padding:4px 14px;border-radius:999px;border:1px solid ${chipBorder};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${diaFiltrado === null ? "#f97316" : chipBg};color:${diaFiltrado === null ? "#fff" : chipMuted};"
           data-ai-dia="todos">Todos</button>`,
        ...diasUnicos.map(dia => {
          const cor   = corPorDia[dia];
          const ativo = diaFiltrado === dia;
          const status = statusDoDia(dia);
          const mapeados = totalMapeadoDia(dia);
          const qtd = (window._aiTotalLocaisPorDia && window._aiTotalLocaisPorDia[dia] != null)
            ? window._aiTotalLocaisPorDia[dia]
            : (status?.total ?? mapeados);
          const incompleto = qtd > mapeados;
          const textoQtd = `${qtd} ${qtd === 1 ? "local" : "locais"}`;
          return `<button title="${incompleto ? "Alguns locais deste dia não foram posicionados no mapa." : ""}"
                     style="padding:4px 14px;border-radius:999px;border:1px ${incompleto ? "dashed" : "solid"} ${cor};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${ativo ? cor : chipBg};color:${ativo ? "#fff" : cor};"
                     data-ai-dia="${dia}">
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ativo ? "#fff" : cor};margin-right:4px;vertical-align:middle;"></span>Dia ${dia} - ${textoQtd}
                  </button>`;
        }),
      ].join("");

      filtrosEl.querySelectorAll("[data-ai-dia]").forEach(btn => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute("data-ai-dia");
          diaFiltrado = val === "todos" ? null : parseInt(val);
          renderControles();
          renderMapa();
        });
      });

      legendaEl.style.display = "none";
      legendaEl.innerHTML = "";
    }

    renderControles();
    renderMapa();
  };

  window.initMapsDetalhes = function () {
    if (typeof initMapsDetalheEdit === "function") initMapsDetalheEdit();

    if (window._flyguide_pendente_horarios?.length && typeof buscarHorariosDetalhes === "function") {
      buscarHorariosDetalhes(window._flyguide_pendente_horarios);
      window._flyguide_pendente_horarios = null;
    }

    const mapEl = document.getElementById("mapaRoteiro");
    if (!mapEl || !window.google) return;

    const params    = new URLSearchParams(window.location.search);
    const roteiroId = params.get("id");
    if (!roteiroId) return;

    authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`)
      .then(r => r.json())
      .then(locais => {
        const locaisComCoordenadas = (locais || []).filter(l => l.latitude && l.longitude);
        if (locaisComCoordenadas.length === 0) {
          if (!window._flyguide_ai_mapa_pronto) {
            mapEl.style.display = "none";
            document.getElementById("secaoMapa").style.display = "none";
          }
          return;
        }

        _locaisDetalhe = locais;
        _diasUnicos    = [...new Set(locaisComCoordenadas.sort(compararLocaisMapaDetalhe).map(l => l.dia || 0))].sort((a, b) => a - b);
        _diasUnicos.forEach((dia, idx) => { _corPorDia[dia] = PALETA_DETALHE[idx % PALETA_DETALHE.length]; });

        // If AI places already arrived, re-render combined map with both sources
        if (_aiPlacesCache.length > 0) {
          window.renderMapaAiSugestoes(_aiPlacesCache);
          return;
        }

        renderControlesMapaDetalhe();
        renderMapaDetalhe();
      })
      .catch(() => {
        mapEl.style.display = "none";
        const secao = document.getElementById("secaoMapa");
        if (secao) secao.style.display = "none";
      });
  };
})();

function normalizarHorarioMapaDetalhe(valor) {
  const horario = String(valor || "").trim();
  if (!horario) return null;
  if (/^\d{2}:\d{2}$/.test(horario)) return `${horario}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(horario)) return horario;
  return null;
}

function formatarHorarioMapaDetalhe(valor) {
  const horario = normalizarHorarioMapaDetalhe(valor);
  return horario ? horario.slice(0, 5) : "";
}

function horarioParaOrdemMapaDetalhe(valor) {
  const horario = normalizarHorarioMapaDetalhe(valor);
  if (!horario) return Number.MAX_SAFE_INTEGER;
  const [hora, minuto] = horario.split(":").map(Number);
  return (hora * 60) + minuto;
}

function compararLocaisMapaDetalhe(a, b) {
  return (a.dia || 0) - (b.dia || 0)
    || horarioParaOrdemMapaDetalhe(a.horario) - horarioParaOrdemMapaDetalhe(b.horario)
    || (a.ordem || 0) - (b.ordem || 0)
    || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

// ================================================================
// GLOBAL — autocomplete país + cidade (compartilhado entre páginas)
// ================================================================
function _extrairCompGooglePlace(place, tipos) {
  return (place?.address_components || []).find(c => (c.types || []).some(t => tipos.includes(t))) || null;
}
function _extrairPaisGooglePlaceGlobal(place) {
  const c = _extrairCompGooglePlace(place, ["country"]);
  if (!c) return null;
  const nome = (c.long_name || place?.name || "").trim();
  const codigo = String(c.short_name || "").trim().toLowerCase();
  return nome ? { nome, codigo } : null;
}
function _extrairCidadeGooglePlaceGlobal(place) {
  const c = _extrairCompGooglePlace(place, ["locality", "administrative_area_level_2", "postal_town", "administrative_area_level_1"]);
  return c ? (c.long_name || "").trim() : null;
}
function _normalizarTextoGlobal(valor) {
  return String(valor || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function criarAutocompletePaisCidadeGlobal(inputPaisId, inputCidadeId) {
  const inputPais   = document.getElementById(inputPaisId);
  const inputCidade = document.getElementById(inputCidadeId);
  if (!inputPais || !inputCidade || !window.google?.maps?.places) return null;

  let paisSelecionado   = null;
  let cidadeSelecionada = null;
  let acPais   = null;
  let acCidade = null;

  function limparCidade(limparInput) {
    cidadeSelecionada = null;
    if (limparInput) inputCidade.value = "";
  }

  function atualizarRestricao() {
    inputCidade.placeholder = paisSelecionado?.nome ? `Ex: cidade em ${paisSelecionado.nome}` : "Ex: Paris";
    if (!acCidade) return;
    const restricao = paisSelecionado?.codigo ? { country: paisSelecionado.codigo } : {};
    try { acCidade.setComponentRestrictions(restricao); } catch (_) { acCidade.setOptions({ componentRestrictions: restricao }); }
  }

  async function sincronizarPais(opcoes) {
    const { limparCidade: limpar = false, canonizar = true } = opcoes || {};
    const valor = inputPais.value.trim();
    if (!valor) { paisSelecionado = null; atualizarRestricao(); if (limpar) limparCidade(true); return null; }
    const norm = _normalizarTextoGlobal(valor);
    if (paisSelecionado?.codigo) {
      const nomeAtual = _normalizarTextoGlobal(paisSelecionado.nome);
      if (norm === nomeAtual || norm === _normalizarTextoGlobal(paisSelecionado.codigo)) { atualizarRestricao(); return paisSelecionado; }
    }
    try {
      const geocoder = new google.maps.Geocoder();
      const paisResolvido = await new Promise((res, rej) => {
        geocoder.geocode({ address: valor }, (results, status) => {
          if (status !== "OK") { rej(); return; }
          const p = (results || []).map(_extrairPaisGooglePlaceGlobal).find(Boolean);
          p ? res(p) : rej();
        });
      });
      const mudou = !paisSelecionado || _normalizarTextoGlobal(paisSelecionado.nome) !== _normalizarTextoGlobal(paisResolvido.nome);
      paisSelecionado = paisResolvido;
      if (canonizar) inputPais.value = paisResolvido.nome;
      atualizarRestricao();
      if (limpar && mudou) limparCidade(true);
      return paisResolvido;
    } catch (_) {
      paisSelecionado = null;
      atualizarRestricao();
      if (limpar) limparCidade(true);
      return null;
    }
  }

  acPais = new google.maps.places.Autocomplete(inputPais, { fields: ["address_components", "name", "types"], types: ["(regions)"] });
  acPais.addListener("place_changed", () => {
    const p = _extrairPaisGooglePlaceGlobal(acPais.getPlace());
    if (!p) return;
    const mudou = !paisSelecionado || _normalizarTextoGlobal(paisSelecionado.nome) !== _normalizarTextoGlobal(p.nome);
    paisSelecionado = p;
    inputPais.value = p.nome;
    atualizarRestricao();
    if (mudou) limparCidade(true);
    setTimeout(() => inputCidade.focus(), 0);
  });
  inputPais.addEventListener("input", () => {
    const v = inputPais.value.trim();
    if (!v) { paisSelecionado = null; atualizarRestricao(); limparCidade(true); return; }
    if (paisSelecionado && _normalizarTextoGlobal(v) === _normalizarTextoGlobal(paisSelecionado.nome)) return;
    paisSelecionado = null;
    atualizarRestricao();
    if (inputCidade.value.trim()) limparCidade(true);
  });
  inputPais.addEventListener("blur", () => sincronizarPais({ limparCidade: true, canonizar: true }));

  acCidade = new google.maps.places.Autocomplete(inputCidade, {
    fields: ["place_id", "name", "formatted_address", "address_components", "geometry", "types"],
    types: ["(cities)"],
  });
  acCidade.addListener("place_changed", () => {
    const place = acCidade.getPlace();
    if (!place.place_id) return;
    const cidadeNome = _extrairCidadeGooglePlaceGlobal(place) || place.name || inputCidade.value.trim();
    const p = _extrairPaisGooglePlaceGlobal(place);
    cidadeSelecionada = { nome: cidadeNome };
    inputCidade.value = cidadeNome;
    if (p) { paisSelecionado = p; inputPais.value = p.nome; atualizarRestricao(); }
  });
  inputCidade.addEventListener("focus", () => sincronizarPais({ limparCidade: false, canonizar: true }));
  inputCidade.addEventListener("input", () => {
    if (!inputCidade.value.trim()) { cidadeSelecionada = null; return; }
    if (cidadeSelecionada && _normalizarTextoGlobal(inputCidade.value) !== _normalizarTextoGlobal(cidadeSelecionada.nome)) cidadeSelecionada = null;
  });

  atualizarRestricao();

  return {
    obterPais()   { return paisSelecionado?.nome  || inputPais.value.trim(); },
    obterCidade() { return cidadeSelecionada?.nome || inputCidade.value.trim(); },
    sincronizarPais,
    aplicarValores(pais, cidade) {
      inputPais.value   = pais   || "";
      inputCidade.value = cidade || "";
      paisSelecionado   = pais   ? { nome: pais,   codigo: "" } : null;
      cidadeSelecionada = cidade ? { nome: cidade } : null;
      atualizarRestricao();
      if (pais) sincronizarPais({ limparCidade: false, canonizar: false });
    },
  };
}
