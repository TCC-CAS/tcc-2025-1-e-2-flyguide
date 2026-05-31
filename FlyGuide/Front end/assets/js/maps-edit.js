/* ================================================================
   FlyGuide - maps-edit.js
   Google Maps Places no modal de edicao de roteiro (meus-roteiros)
   Depende de: app.js (authFetch, escapeHtml)
================================================================ */

const _URL_API = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";

// ── Estado do modal ───────────────────────────────────────────────
let _autocompleteEdit         = null;
let _autocompleteBasePaisEdit  = null;
let _autocompleteBaseCidadeEdit = null;
let _localSelecionadoEdit      = null;
let _locaisEdit                = [];
let _roteiroIdEdit             = null;
let _basesEdit                 = [];
let _baseAtivaIdEdit           = null;
let _raioFiltroKmEdit          = 10;
let _cidadeBaseSelecionadaEdit = null;
let _paisBaseSelecionadoEdit   = null;
let _diasTotaisEdit            = 0;
let _userIdEdit                = null;
let _roteiroObjEdit            = null;
let _codigoPaisEdit            = null; // código ISO-2 do país do roteiro (ex: "br")
let _estadoBaseCode            = null; // código do estado da base (ex: "SP") — disponível antes das bases carregarem
let _estadoBaseName            = null; // nome legível do estado (ex: "São Paulo")
let _ocultarBtnSalvarSugestoes = false; // true no passo3 do criar-roteiro
let _lookupAiSeq               = 0;
let _lookupAiPendente          = false;
let _destinoPOIEdit            = false;
let _localBaseEscolhidoEdit    = null;

// ── Estado temporário da tela ─────────────────────────────────────
function _resetarEstadoBasesEdit() {
  _basesEdit = [];
  _baseAtivaIdEdit = null;
  _raioFiltroKmEdit = 10;
}

function _salvarBasesEdit() {}
function _salvarFiltroEdit() {}

function _setLookupAiPendente(pendente) {
  _lookupAiPendente = !!pendente;
  window._flyguideLookupAiPendente = _lookupAiPendente;
  _atualizarBotoesLookupAi();
}

window.flyguideAiLookupPendente = function () {
  return !!_lookupAiPendente;
};

function _alternarBotaoLookup(btn, pendente, htmlPendente) {
  if (!btn) return;
  if (pendente) {
    if (!btn.dataset.lookupOriginalHtml) {
      btn.dataset.lookupOriginalHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.innerHTML = htmlPendente;
    return;
  }
  if (btn.dataset.lookupOriginalHtml) {
    btn.innerHTML = btn.dataset.lookupOriginalHtml;
    delete btn.dataset.lookupOriginalHtml;
    btn.disabled = false;
  }
}

function _atualizarBotoesLookupAi() {
  _alternarBotaoLookup(
    document.getElementById("btnFinalizarRoteiro"),
    _lookupAiPendente,
    `<span class="spinner-border spinner-border-sm me-2"></span>Preparando locais...`
  );
  _alternarBotaoLookup(
    document.getElementById("btnSalvarSugestoesAIMR"),
    _lookupAiPendente,
    `<span class="spinner-border spinner-border-sm me-2"></span>Preparando locais...`
  );
}

// ── Utilidades ────────────────────────────────────────────────────
function _normalizar(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function _calcularKm(lat1, lng1, lat2, lng2) {
  const toRad = g => g * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _distanciaBase(local, base) {
  if (!base || base.latitude == null || base.longitude == null) return null;
  if (!local || local.latitude == null || local.longitude == null) return null;
  return _calcularKm(
    parseFloat(base.latitude), parseFloat(base.longitude),
    parseFloat(local.latitude), parseFloat(local.longitude)
  );
}

function _fmtKm(v) {
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: v < 10 ? 1 : 0,
    maximumFractionDigits: v < 10 ? 1 : 0,
  });
}

function _mapsUrlEdit(placeId, query) {
  const place = String(placeId || "").trim();
  const q = String(query || place || "").trim();
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  return place ? `${url}&query_place_id=${encodeURIComponent(place)}` : url;
}

function _mapsUrlLocalEdit(local) {
  if (!local) return "";
  const lat = parseFloat(local.latitude);
  const lng = parseFloat(local.longitude);
  const placeId = local.placeId || local.place_id || "";
  if (placeId) return _mapsUrlEdit(placeId, local.endereco || local.nome);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return _mapsUrlEdit("", `${lat},${lng}`);
  }
  const query = local.endereco || local.nome || "";
  return query ? _mapsUrlEdit("", query) : "";
}

function _atualizarLinksMapsAI(item, url) {
  if (!item) return;
  item.querySelectorAll("[data-ai-maps-link]").forEach(link => {
    link.href = url || "#";
    link.style.display = url ? "inline-flex" : "none";
  });
}

function _obterBaseAtiva() {
  return _basesEdit.find(b => String(b.id) === String(_baseAtivaIdEdit)) || _basesEdit[0] || null;
}

function _coordenadasDestinoEdit(opts) {
  const roteiro = opts?.roteiro || {};
  const lat = opts?.latDestino ?? roteiro.latDestino ?? roteiro.latitudeDestino ?? null;
  const lng = opts?.lngDestino ?? roteiro.lngDestino ?? roteiro.longitudeDestino ?? null;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  return { latitude: latNum, longitude: lngNum };
}

function _mostrarErroLocalEdit(msg) {
  const erroEl = document.getElementById("erroLocalEdit");
  if (!erroEl) return;
  erroEl.textContent = msg;
  erroEl.style.display = "";
}

function _ocultarErroLocalEdit() {
  const erroEl = document.getElementById("erroLocalEdit");
  if (erroEl) erroEl.style.display = "none";
}

function _limparLocalSelecionadoEdit(limparInput) {
  _localSelecionadoEdit = null;
  const preview = document.getElementById("localPreviewEdit");
  if (preview) preview.style.display = "none";
  if (limparInput) {
    const input = document.getElementById("buscaLocalEdit");
    if (input) input.value = "";
  }
}

function _extrairEstadoDeComponentsEdit(components) {
  const comp = (components || []).find(c => (c.types || []).includes("administrative_area_level_1"));
  return comp ? (comp.short_name || comp.long_name || null) : null;
}

function _mensagemLocalForaDaBaseEdit(local) {
  const base = _obterBaseAtiva();
  if (!base) return "Adicione ou aguarde carregar a cidade base antes de escolher um local.";
  if (base.latitude == null || base.longitude == null) return "A cidade base ainda não possui coordenadas. Aguarde carregar e tente novamente.";
  if (!local || local.latitude == null || local.longitude == null) return "Selecione um local válido da lista do Google Maps.";

  // Validação de país — bloqueia qualquer local fora do país do roteiro
  if (_codigoPaisEdit && local.addressComponents) {
    const paisLocal = (local.addressComponents || []).find(c => (c.types || []).includes("country"));
    if (paisLocal && paisLocal.short_name?.toLowerCase() !== _codigoPaisEdit.toLowerCase()) {
      return `O local está em outro país (${paisLocal.long_name}). Apenas locais no mesmo país do roteiro podem ser adicionados.`;
    }
  }

  // Validação por estado/região — bloqueia independente do raio configurado
  const estadoBase  = base.stateCode || _estadoBaseCode || null;
  const estadoLocal = _extrairEstadoDeComponentsEdit(local.addressComponents);
  if (estadoBase && estadoLocal && estadoBase.toUpperCase() !== estadoLocal.toUpperCase()) {
    return `O local está em outra região (${estadoLocal}). Apenas locais na mesma região da cidade base (${estadoBase}) podem ser adicionados ao roteiro.`;
  }

  const distancia = _distanciaBase(local, base);
  if (distancia == null) return "Selecione um local válido da lista do Google Maps.";
  if (distancia > _raioFiltroKmEdit) {
    return `O local escolhido está a ${_fmtKm(distancia)} km de ${base.city || base.label}. Locais fora da cidade base não podem ser adicionados ao roteiro.`;
  }
  return "";
}

function _validarLocalNaBaseEdit(local) {
  const mensagem = _mensagemLocalForaDaBaseEdit(local);
  if (!mensagem) return true;
  _mostrarErroLocalEdit(mensagem);
  _limparLocalSelecionadoEdit(false);
  return false;
}

function _calcularTimeline(bases) {
  let dia = 1;
  return bases.map(b => {
    const ini = dia;
    const d   = parseInt(b.dias) || 0;
    const fim = d > 0 ? dia + d - 1 : null;
    if (d > 0) dia += d;
    return { ...b, diaInicio: ini, diaFim: fim };
  });
}

// ── Erro base ─────────────────────────────────────────────────────
function _mostrarErroBase(msg) {
  const el = document.getElementById("erroBaseEdit");
  if (el) { el.textContent = msg; el.style.display = ""; }
}

function _ocultarErroBase() {
  const el = document.getElementById("erroBaseEdit");
  if (el) el.style.display = "none";
}

// ── Geocodifica usando PlacesService (evita Geocoding API) ────────
async function _geocodificarBase(pais, cidade) {
  if (!window.google || !google.maps?.places?.PlacesService) {
    throw new Error("Aguarde o Google Maps terminar de carregar.");
  }
  const query = [cidade, pais].filter(Boolean).join(", ");
  const div = document.createElement("div");
  const svc = new google.maps.places.PlacesService(div);
  return new Promise((resolve, reject) => {
    svc.findPlaceFromQuery({ query, fields: ["geometry", "name", "formatted_address", "address_components"] }, (results, status) => {
      const OK = google.maps.places.PlacesServiceStatus.OK;
      if (status !== OK || !results?.[0]?.geometry) {
        reject(new Error("Nao foi possivel localizar essa cidade base."));
        return;
      }
      const place = results[0];
      // Tenta extrair estado via address_components (universal)
      const estadoComp = (place.address_components || []).find(c => (c.types || []).includes("administrative_area_level_1"));
      let stateCode = estadoComp?.short_name || null;
      // Fallback Brasil: regex no formatted_address
      if (!stateCode) {
        const addr = place.formatted_address || "";
        const m = addr.match(/[-\s]([A-Z]{2})[,\s]/);
        if (m) stateCode = m[1];
      }
      resolve({
        latitude:  place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        stateCode,
        stateName: estadoComp?.long_name || stateCode || null,
      });
    });
  });
}

// ── Render bases ──────────────────────────────────────────────────
function _renderBases() {
  const listaEl  = document.getElementById("listaBasesFiltroEdit");
  const vazioEl  = document.getElementById("vazioBasesFiltroEdit");
  const selectEl = document.getElementById("baseFiltroAtivaEdit");
  const raioEl   = document.getElementById("raioBaseKmEdit");
  if (!listaEl || !selectEl) return;

  if (raioEl) raioEl.value = _raioFiltroKmEdit;

  if (_basesEdit.length === 0) {
    listaEl.innerHTML = "";
    if (vazioEl) vazioEl.style.display = "";
    selectEl.innerHTML = '<option value="">Nenhuma base cadastrada</option>';
    selectEl.disabled = true;
    return;
  }

  if (!_obterBaseAtiva()) _baseAtivaIdEdit = _basesEdit[0].id;
  if (vazioEl) vazioEl.style.display = "none";

  selectEl.disabled = false;
  selectEl.innerHTML = _basesEdit.map(b =>
    `<option value="${b.id}" ${String(b.id) === String(_baseAtivaIdEdit) ? "selected" : ""}>
      ${escapeHtml(b.city || "Cidade")}${b.country ? ` · ${escapeHtml(b.country)}` : ""}
    </option>`
  ).join("");

  const timeline = _calcularTimeline(_basesEdit);
  const temDias  = _basesEdit.some(b => b.dias);
  const isDark   = document.documentElement.getAttribute("data-theme") === "dark";
  const cFundo   = isDark ? "#1e293b" : "#fff7ed";
  const cBorda   = isDark ? "#334155" : "#fed7aa";
  const cTexto   = isDark ? "#fdba74" : "#92400e";

  const timelineHtml = temDias ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;padding:10px 12px;background:${cFundo};border-radius:10px;border:1px solid ${cBorda};">
      <div style="width:100%;font-size:.7rem;font-weight:700;color:${cTexto};text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">
        <i class="bi bi-calendar-range me-1"></i>Cronograma
      </div>
      ${timeline.map(b => b.diaFim ? `
        <span style="padding:3px 10px;border-radius:999px;background:#f97316;color:#fff;font-size:.78rem;font-weight:700;">
          ${b.diaInicio === b.diaFim ? `Dia ${b.diaInicio}` : `Dias ${b.diaInicio}–${b.diaFim}`}:
          ${escapeHtml(b.city || b.label)}
        </span>` : `
        <span style="padding:3px 10px;border-radius:999px;background:${isDark ? "#334155" : "#e2e8f0"};color:${isDark ? "#94a3b8" : "#475569"};font-size:.78rem;font-weight:600;">
          <i class="bi bi-geo-alt"></i> ${escapeHtml(b.city || b.label)}
        </span>`
      ).join("")}
    </div>` : "";

  listaEl.innerHTML = timelineHtml + timeline.map(base => {
    const ativa       = String(base.id) === String(_baseAtivaIdEdit);
    const cCard       = isDark ? "#1e293b" : "#fff";
    const cBordaCard  = isDark ? (ativa ? "#f97316" : "#334155") : (ativa ? "#f97316" : "#e5e7eb");
    const diasLabel   = base.diaFim
      ? `<span style="padding:2px 8px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:.7rem;font-weight:700;border:1px solid #fed7aa;">
           <i class="bi bi-calendar-range"></i>
           ${base.diaInicio === base.diaFim ? `Dia ${base.diaInicio}` : `Dias ${base.diaInicio}–${base.diaFim}`}
           (${base.dias}d)
         </span>` : "";
    return `
      <div style="background:${cCard};border:1.5px solid ${cBordaCard};border-radius:10px;padding:10px 12px;
                  display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <i class="bi bi-geo-alt-fill" style="color:#f97316;font-size:1rem;flex-shrink:0;"></i>
          <div>
            <div style="font-weight:800;font-size:.9rem;">${escapeHtml(base.city || "Cidade")}</div>
            <div style="font-size:.78rem;color:#94a3b8;">${escapeHtml(base.country || "")}</div>
            ${diasLabel ? `<div style="margin-top:5px;">${diasLabel}</div>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          ${ativa
            ? `<span style="padding:3px 10px;border-radius:999px;background:#fff7ed;color:#f97316;font-size:.72rem;font-weight:700;">Base ativa</span>`
            : `<button class="btn btn-sm btn-outline-gray" data-sel-base="${base.id}" type="button" style="font-size:.75rem;padding:3px 8px;">Usar</button>`}
          ${_basesEdit.length > 1
            ? `<button class="btn btn-sm btn-outline-danger" data-rem-base="${base.id}" type="button"><i class="bi bi-trash"></i></button>`
            : ""}
        </div>
      </div>`;
  }).join("");

  listaEl.querySelectorAll("[data-sel-base]").forEach(btn => {
    btn.addEventListener("click", () => {
      _baseAtivaIdEdit = btn.getAttribute("data-sel-base");
      _salvarFiltroEdit();
      _renderBases();
      renderLocaisEdit();
    });
  });

  listaEl.querySelectorAll("[data-rem-base]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-rem-base");
      _basesEdit = _basesEdit.filter(b => String(b.id) !== String(id));
      if (String(_baseAtivaIdEdit) === String(id)) _baseAtivaIdEdit = _basesEdit[0]?.id || null;
      _salvarBasesEdit();
      _salvarFiltroEdit();
      _renderBases();
      renderLocaisEdit();
    });
  });
}

// ── Autocomplete bases ────────────────────────────────────────────
function _configurarAutocompleteBases() {
  const inputPais   = document.getElementById("basePaisEdit");
  const inputCidade = document.getElementById("baseCidadeEdit");
  if (!window.google || !google.maps?.places || !inputPais || !inputCidade) return;

  if (!_autocompleteBasePaisEdit) {
    _autocompleteBasePaisEdit = new google.maps.places.Autocomplete(inputPais, {
      fields: ["address_components", "name", "types"],
      types: ["(regions)"],
      language: "pt-BR",
    });
    _autocompleteBasePaisEdit.addListener("place_changed", () => {
      const place = _autocompleteBasePaisEdit.getPlace();
      const comp  = (place?.address_components || []).find(c => (c.types || []).includes("country"));
      if (!comp) return;
      _paisBaseSelecionadoEdit = { nome: comp.long_name, codigo: comp.short_name?.toLowerCase() };
      inputPais.value = comp.long_name;
      if (_autocompleteBaseCidadeEdit && comp.short_name) {
        _autocompleteBaseCidadeEdit.setComponentRestrictions({ country: comp.short_name });
      }
    });
    inputPais.addEventListener("input", () => {
      if (!inputPais.value.trim()) {
        _paisBaseSelecionadoEdit = null;
        inputCidade.value = "";
        _cidadeBaseSelecionadaEdit = null;
      }
    });
  }

  if (!_autocompleteBaseCidadeEdit) {
    _autocompleteBaseCidadeEdit = new google.maps.places.Autocomplete(inputCidade, {
      fields: ["place_id", "name", "address_components", "geometry", "types"],
      types: ["(cities)"],
      language: "pt-BR",
    });
    _autocompleteBaseCidadeEdit.addListener("place_changed", () => {
      const place = _autocompleteBaseCidadeEdit.getPlace();
      if (!place.place_id) return;

      const cidadeComp = (place.address_components || []).find(c =>
        ["locality", "administrative_area_level_2", "postal_town", "administrative_area_level_1"]
          .some(t => (c.types || []).includes(t))
      );
      const cidadeNome = cidadeComp?.long_name || place.name || inputCidade.value.trim();

      const stateComp = (place.address_components || []).find(c =>
        (c.types || []).includes("administrative_area_level_1")
      );
      _cidadeBaseSelecionadaEdit = {
        nome:      cidadeNome,
        latitude:  place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
        stateCode: stateComp?.short_name || null,
        stateName: stateComp?.long_name  || null,
      };
      inputCidade.value = cidadeNome;

      if (!_paisBaseSelecionadoEdit) {
        const paisComp = (place.address_components || []).find(c => (c.types || []).includes("country"));
        if (paisComp) {
          _paisBaseSelecionadoEdit = { nome: paisComp.long_name, codigo: paisComp.short_name?.toLowerCase() };
          inputPais.value = paisComp.long_name;
        }
      }
      _ocultarErroBase();
    });
    inputCidade.addEventListener("input", () => {
      if (_cidadeBaseSelecionadaEdit && _normalizar(inputCidade.value) !== _normalizar(_cidadeBaseSelecionadaEdit.nome)) {
        _cidadeBaseSelecionadaEdit = null;
      }
    });
  }
}

// ── Recomendações ─────────────────────────────────────────────────
async function _buscarRecomendacoes(base, tipo) {
  if (!window.google || !google.maps?.places) throw new Error("Google Maps não carregou ainda.");
  if (!base || base.latitude == null) throw new Error("A base ativa não possui coordenadas.");

  const div = document.createElement("div");
  const svc = new google.maps.places.PlacesService(div);
  return new Promise((resolve, reject) => {
    svc.nearbySearch({
      location: new google.maps.LatLng(parseFloat(base.latitude), parseFloat(base.longitude)),
      radius:   _raioFiltroKmEdit * 1000,
      type:     tipo,
    }, (results, status) => {
      const OK   = google.maps.places.PlacesServiceStatus.OK;
      const ZERO = google.maps.places.PlacesServiceStatus.ZERO_RESULTS;
      if (status !== OK && status !== ZERO) { reject(new Error("Erro ao buscar recomendações.")); return; }
      const sorted = (results || [])
        .filter(p => p.rating != null)
        .sort((a, b) => b.rating !== a.rating
          ? b.rating - a.rating
          : (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
      resolve(sorted);
    });
  });
}

let _todosLugaresEdit = [];
const _POR_PAGINA_EDIT = 5;

function _renderRecomendacoes(lugares, pagina) {
  const listaEl = document.getElementById("listaRecomendacoesEdit");
  if (!listaEl) return;

  const lugaresBase = Array.isArray(lugares) ? lugares : _todosLugaresEdit;

  if (lugaresBase.length === 0) {
    _todosLugaresEdit = [];
    listaEl.innerHTML = `
      <div class="text-center py-3 text-secondary" style="font-size:.82rem;">
        <i class="bi bi-search" style="font-size:1.5rem;color:#cbd5e1;display:block;margin-bottom:6px;"></i>
        Nenhum lugar encontrado nessa categoria.
      </div>`;
    return;
  }

  if (pagina === undefined) { _todosLugaresEdit = lugaresBase; pagina = 0; }
  const pg       = Math.max(0, Math.min(pagina, Math.ceil(_todosLugaresEdit.length / _POR_PAGINA_EDIT) - 1));
  const total    = _todosLugaresEdit.length;
  const totalPg  = Math.ceil(total / _POR_PAGINA_EDIT);
  const slice    = _todosLugaresEdit.slice(pg * _POR_PAGINA_EDIT, (pg + 1) * _POR_PAGINA_EDIT);
  const cidade   = _roteiroObjEdit ? (_roteiroObjEdit.cidade || _roteiroObjEdit.pais || "") : "";

  listaEl.innerHTML = `
    <div style="font-size:.78rem;color:#64748b;margin-bottom:8px;">
      <i class="bi bi-trophy me-1" style="color:#f97316;"></i>
      <strong>${total}</strong> lugar${total !== 1 ? "es" : ""}, ordenado${total !== 1 ? "s" : ""} por avaliação
      ${cidade ? `· <strong>${escapeHtml(cidade)}</strong>` : ""}
    </div>
    ${slice.map((lugar, i) => {
      const idx     = pg * _POR_PAGINA_EDIT + i;
      const rating  = lugar.rating || 0;
      const tot     = lugar.user_ratings_total || 0;
      const addr    = lugar.vicinity || lugar.formatted_address || "";
      const mapsUrl = lugar.place_id
        ? _mapsUrlEdit(lugar.place_id, addr || lugar.name)
        : _mapsUrlLocalEdit({
            nome: lugar.name,
            endereco: addr,
            latitude: lugar.geometry?.location?.lat?.(),
            longitude: lugar.geometry?.location?.lng?.(),
          });
      const stars   = Array.from({ length: 5 }, (_, s) =>
        `<i class="bi bi-star${s < Math.round(rating) ? "-fill" : ""}" style="color:${s < Math.round(rating) ? "#f59e0b" : "#cbd5e1"};font-size:.72rem;"></i>`
      ).join("");
      return `
        <div style="background:#fff;border:1px solid #eef2f7;border-radius:10px;padding:10px 12px;
                    display:flex;gap:10px;align-items:flex-start;margin-bottom:6px;">
          <div style="background:#f97316;color:#fff;min-width:28px;height:28px;border-radius:50%;
                      display:grid;place-items:center;font-weight:900;font-size:.8rem;flex-shrink:0;">${idx + 1}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:.88rem;">${escapeHtml(lugar.name)}</div>
            <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
              ${stars}
              <span style="font-weight:700;font-size:.82rem;">${rating.toFixed(1)}</span>
              ${tot > 0 ? `<span style="font-size:.72rem;color:#94a3b8;">(${tot.toLocaleString("pt-BR")})</span>` : ""}
            </div>
            ${addr ? `<div style="color:#94a3b8;font-size:.75rem;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(addr)}</div>` : ""}
            ${window.placeCategoryBadgeHtml ? window.placeCategoryBadgeHtml(lugar.types || []) : ""}
            ${lugar.business_status === "OPERATIONAL" ? `<div style="font-size:.72rem;color:#16a34a;margin-top:2px;"><i class="bi bi-clock me-1"></i>Estabelecimento ativo</div>` : ""}
            ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="font-size:.72rem;color:#f97316;text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-top:3px;font-weight:700;"><i class="bi bi-map"></i>Ver no Maps</a>` : ""}
          </div>
          <button class="btn btn-sm btn-primary-orange flex-shrink-0"
                  style="font-size:.78rem;padding:4px 8px;white-space:nowrap;"
                  data-rec-nome="${escapeHtml(lugar.name)}"
                  data-rec-end="${escapeHtml(addr)}"
                  data-rec-pid="${lugar.place_id}"
                  data-rec-lat="${lugar.geometry?.location?.lat() ?? ""}"
                  data-rec-lng="${lugar.geometry?.location?.lng() ?? ""}"
                  data-rec-tipo="${(lugar.types || [])[0] || "establishment"}">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>`;
    }).join("")}
    ${totalPg > 1 ? `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
      <button id="recEditPrev" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:.78rem;font-weight:700;color:#475569;cursor:pointer;" ${pg === 0 ? "disabled" : ""}>&#8592; Anterior</button>
      <span style="font-size:.75rem;color:#94a3b8;">${pg + 1} / ${totalPg}</span>
      <button id="recEditNext" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:.78rem;font-weight:700;color:#475569;cursor:pointer;" ${pg >= totalPg - 1 ? "disabled" : ""}>Próximo &#8594;</button>
    </div>` : ""}
  `;

  listaEl.querySelectorAll("[data-rec-pid]").forEach(btn => {
    btn.addEventListener("click", () => {
      _localSelecionadoEdit = {
        placeId:   btn.getAttribute("data-rec-pid"),
        nome:      btn.getAttribute("data-rec-nome"),
        endereco:  btn.getAttribute("data-rec-end"),
        tipo:      btn.getAttribute("data-rec-tipo"),
        latitude:  parseFloat(btn.getAttribute("data-rec-lat")) || null,
        longitude: parseFloat(btn.getAttribute("data-rec-lng")) || null,
      };
      const inputBusca = document.getElementById("buscaLocalEdit");
      const preview    = document.getElementById("localPreviewEdit");
      if (inputBusca) inputBusca.value = _localSelecionadoEdit.nome;
      if (preview) {
        preview.style.display = "";
        const nEl = document.getElementById("previewNomeEdit");
        const eEl = document.getElementById("previewEnderecoEdit");
        if (nEl) nEl.textContent = _localSelecionadoEdit.nome;
        if (eEl) eEl.textContent = _localSelecionadoEdit.endereco;
      }
      const busca = document.getElementById("buscaLocalEdit");
      if (busca) busca.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  const prevBtn = listaEl.querySelector("#recEditPrev");
  const nextBtn = listaEl.querySelector("#recEditNext");
  if (prevBtn) prevBtn.addEventListener("click", () => _renderRecomendacoes(null, pg - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => _renderRecomendacoes(null, pg + 1));
}

// ── Autocomplete busca local ──────────────────────────────────────
// Aplica bounds de ~300 km ao redor da base ativa para restringir ao estado/região
function _calcularBoundsEstado(base) {
  if (!base || base.latitude == null || base.longitude == null || !window.google) return null;
  const lat = parseFloat(base.latitude);
  const lng = parseFloat(base.longitude);
  const delta = 1.5; // ~165 km por grau — restringe ao estado
  return new google.maps.LatLngBounds(
    { lat: lat - delta, lng: lng - delta },
    { lat: lat + delta, lng: lng + delta }
  );
}

function _aplicarBoundsEstado() {
  if (!_autocompleteEdit || !window.google) return;
  const bounds = _calcularBoundsEstado(_obterBaseAtiva());
  if (!bounds) return;
  // setOptions com bounds + strictBounds em chamada única — mais confiável que setBounds separado
  _autocompleteEdit.setOptions({ bounds, strictBounds: true });
}

function garantirAutocompleteEdit() {
  const input = document.getElementById("buscaLocalEdit");
  if (!input || !window.google || _autocompleteEdit) return;

  if (input.dataset.localResetEditReady !== "true") {
    input.dataset.localResetEditReady = "true";
    input.addEventListener("input", () => {
      if (!_localSelecionadoEdit) return;
      if (_normalizar(input.value) === _normalizar(_localSelecionadoEdit.nome)) return;
      _limparLocalSelecionadoEdit(false);
      _ocultarErroLocalEdit();
    });
  }

  const opts = {
    fields: ["place_id", "name", "formatted_address", "geometry", "types", "address_components"],
    language: "pt-BR",
  };
  if (_codigoPaisEdit) {
    opts.componentRestrictions = { country: _codigoPaisEdit };
  }

  _autocompleteEdit = new google.maps.places.Autocomplete(input, opts);

  _autocompleteEdit.addListener("place_changed", () => {
    const place = _autocompleteEdit.getPlace();
    if (!place || !place.place_id) return;
    _ocultarErroLocalEdit();

    _localSelecionadoEdit = {
      placeId:           place.place_id,
      nome:              place.name,
      endereco:          place.formatted_address,
      tipo:              (place.types || [])[0] || "establishment",
      latitude:          place.geometry && place.geometry.location ? place.geometry.location.lat() : null,
      longitude:         place.geometry && place.geometry.location ? place.geometry.location.lng() : null,
      addressComponents: place.address_components || [],
    };

    const preview    = document.getElementById("localPreviewEdit");
    const nomeEl     = document.getElementById("previewNomeEdit");
    const enderecoEl = document.getElementById("previewEnderecoEdit");
    if (preview)    preview.style.display    = "";
    if (nomeEl)     nomeEl.textContent       = _localSelecionadoEdit.nome || "";
    if (enderecoEl) enderecoEl.textContent   = _localSelecionadoEdit.endereco || "";
  });

  window.setTimeout(() => {
    document.querySelectorAll(".pac-container").forEach(el => { el.style.zIndex = "2000"; });
  }, 0);
}

window.initMapsEdit = function () {
  garantirAutocompleteEdit();
  _configurarAutocompleteBases();
};

// ── Horário ───────────────────────────────────────────────────────
function _normalizarHorarioEdit(valor) {
  if (Array.isArray(valor)) {
    const hh = String(valor[0] || 0).padStart(2, "0");
    const mm = String(valor[1] || 0).padStart(2, "0");
    return `${hh}:${mm}:00`;
  }
  const h = String(valor || "").trim();
  if (!h) return null;
  if (/^\d{2}:\d{2}$/.test(h)) return `${h}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(h)) return h;
  return null;
}

function _formatarHorarioEdit(valor) {
  const h = _normalizarHorarioEdit(valor);
  return h ? h.slice(0, 5) : "";
}

function _horarioOrdemEdit(valor) {
  const h = _normalizarHorarioEdit(valor);
  if (!h) return Number.MAX_SAFE_INTEGER;
  const [hora, min] = h.split(":").map(Number);
  return hora * 60 + min;
}

function _compararLocaisEdit(a, b) {
  return (a.dia || 0) - (b.dia || 0)
    || _horarioOrdemEdit(a.horario) - _horarioOrdemEdit(b.horario)
    || (a.ordem || 0) - (b.ordem || 0)
    || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function _agruparLocaisEdit(locais) {
  const grupos = new Map();
  [...locais].sort(_compararLocaisEdit).forEach(l => {
    const chave = l.dia || 0;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(l);
  });
  return [...grupos.entries()].sort((a, b) => a[0] - b[0]).map(([dia, itens]) => ({ dia, itens }));
}

function _ehCheckinCheckoutEdit(local) {
  const nome = String(local?.nome || local?.name || local || "").trim().toLowerCase().replace(/[\s-]/g, "");
  return !!local?._checkin || !!local?._checkout || nome === "checkin" || nome === "checkout";
}

function _contarLocaisContaveisEdit(locais) {
  return (locais || []).filter(l => !_ehCheckinCheckoutEdit(l)).length;
}

function _ehElementoCheckinCheckoutEdit(el) {
  if (!el) return false;
  if (el.hasAttribute("data-ai-special")) return true;
  const nome = (el.querySelector("[data-ai-title]")?.textContent
    || el.querySelector("[data-ai-nome]")?.value
    || el.querySelector("[data-ai-edit-title]")?.textContent
    || el.textContent
    || "").trim().toLowerCase().replace(/[\s-]/g, "");
  return nome === "checkin" || nome === "checkout";
}

function _contarItensVisiveisDiaEdit(diaEl) {
  return [...diaEl.querySelectorAll("[data-ai-item], [id^='lwrap-']")]
    .filter(el => !_ehElementoCheckinCheckoutEdit(el)).length;
}

// ── AI suggestions editing ────────────────────────────────────────
function _parseCustoAI(custo) {
  if (!custo) return "";
  const s = String(custo).replace(/[Rr]?\$\s*/g, "").replace(/\./g, "").replace(/,/g, ".");
  const nums = s.match(/\d+(\.\d+)?/g);
  if (!nums) return "";
  if (nums.length === 1) return parseFloat(nums[0]);
  return Math.round((parseFloat(nums[0]) + parseFloat(nums[nums.length - 1])) / 2);
}

const _PERIODOS_AI_MR = [
  { key: "manha", label: "Manhã",  icon: "bi-sunrise-fill",   cor: "#f59e0b" },
  { key: "tarde", label: "Tarde",  icon: "bi-sun-fill",        cor: "#f97316" },
  { key: "noite", label: "Noite",  icon: "bi-moon-stars-fill", cor: "#6366f1" },
];

function _hasSugestoesAIEdit() {
  return _roteiroObjEdit
    && Array.isArray(_roteiroObjEdit.sugestoes)
    && _roteiroObjEdit.sugestoes.length > 0;
}

function _initAIItemAutocomplete(input) {
  if (!window.google || !window.google.maps || !window.google.maps.places) return;
  const ac = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "name", "formatted_address"],
    language: "pt-BR"
  });
  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (!place || !place.place_id) return;
    const item = input.closest("[data-ai-item]");
    if (!item) return;
    if (place.name) input.value = place.name;
    const titleEl = item.querySelector("[data-ai-title]");
    if (titleEl && place.name) titleEl.textContent = place.name;
    const endEl = item.querySelector("[data-ai-endereco]");
    if (endEl) {
      endEl.textContent = place.formatted_address || "";
      endEl.style.display = place.formatted_address ? "" : "none";
    }
    const addressEl = item.querySelector("[data-ai-address]");
    if (addressEl) {
      addressEl.innerHTML = place.formatted_address
        ? `<i class="bi bi-geo-alt me-1"></i>${escapeHtml(place.formatted_address)}`
        : "";
      addressEl.style.display = place.formatted_address ? "" : "none";
    }
    const pidEl = item.querySelector("[data-ai-place-id]");
    if (pidEl) pidEl.value = place.place_id || "";
    _atualizarLinksMapsAI(item, _mapsUrlEdit(place.place_id, place.formatted_address || place.name));
  });
}

function _renderAIItemCardMR(item, idx, uid, isDark) {
  // Renderização especial para marcadores de check-in / checkout
  const _nomeNormAI = (item.nome || "").trim().toLowerCase().replace(/[\s-]/g, "");
  const _isAICI  = !!item._checkin  || _nomeNormAI === "checkin";
  const _isAICO  = !!item._checkout || _nomeNormAI === "checkout";
  if (_isAICI || _isAICO) {
    const isCI  = _isAICI;
    const icon  = isCI ? "bi-key-fill" : "bi-box-arrow-right";
    const bg    = isCI ? (isDark ? "rgba(20,83,45,.3)"   : "#f0fdf4") : (isDark ? "rgba(124,45,18,.25)" : "#fff7ed");
    const clr   = isCI ? "#16a34a" : "#ea580c";
    const brd   = isCI ? (isDark ? "#166534" : "#bbf7d0") : (isDark ? "#9a3412" : "#fed7aa");
    const label = isCI ? "Check-in" : "Checkout";
    return `<div data-ai-item data-ai-special style="margin-top:5px;">
      <div style="background:${bg};border:1.5px solid ${brd};border-radius:10px;display:flex;align-items:center;gap:10px;padding:12px 16px;">
        <div style="background:${clr}22;color:${clr};width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:.95rem;">
          <i class="bi ${icon}"></i>
        </div>
        <div style="font-weight:800;font-size:.92rem;color:${clr};">${label}</div>
        <input type="hidden" data-ai-nome value="${escapeHtml(label)}">
        <input type="hidden" data-ai-checkin  value="${isCI  ? '1' : ''}">
        <input type="hidden" data-ai-checkout value="${!isCI ? '1' : ''}">
      </div>
    </div>`;
  }

  const nome = item.nome || "";
  const endereco = item.endereco || "";
  const placeId = item.placeId || item.place_id || "";
  const mapsUrl = _mapsUrlLocalEdit({ ...item, nome, endereco, placeId });
  const custo = _parseCustoAI(item.custo);
  const corCard = isDark ? "#1e293b" : "#f8fafc";
  const corBorda = isDark ? "#334155" : "#e2e8f0";
  const corForm = isDark ? "#0f172a" : "#f1f5f9";
  const custoLabel = custo ? "$ " + custo : "$";
  const obs = String(item.observacoes || "").trim();

  return `<div data-ai-item style="margin-top:5px;">
    <div style="background:${corCard};border:1px solid ${corBorda};border-radius:8px;display:flex;align-items:center;gap:8px;padding:7px 10px;">
      <div style="background:#f97316;color:#fff;min-width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.75rem;flex-shrink:0;">${idx + 1}</div>
      <div style="flex:1;min-width:0;">
        <div data-ai-title style="font-weight:700;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(nome || "Local")}</div>
        <div data-ai-address style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:${endereco ? "" : "none"};">${endereco ? `<i class="bi bi-geo-alt me-1"></i>${escapeHtml(endereco)}` : ""}</div>
        ${window.placeCategoryBadgeHtml ? window.placeCategoryBadgeHtml([window.inferPlaceType ? window.inferPlaceType(nome) : "tourist_attraction"]) : ""}
        <span id="mr-rating-ai-${uid}" data-mr-rating-id="mr-rating-ai-${uid}" data-mr-rating-nome="${escapeHtml(nome)}" data-mr-rating-pid="${escapeHtml(placeId)}" style="display:none;font-size:.7rem;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:999px;align-items:center;gap:3px;"></span>
        <div data-ai-obs-display style="display:${obs ? "" : "none"};font-size:.72rem;color:#94a3b8;margin-top:2px;"><i class="bi bi-pencil-fill me-1"></i><span>${escapeHtml(obs)}</span></div>
        <a data-ai-maps-link href="${mapsUrl ? escapeHtml(mapsUrl) : "#"}" target="_blank" rel="noopener" style="font-size:.7rem;color:#f97316;text-decoration:none;display:${mapsUrl ? "inline-flex" : "none"};align-items:center;gap:3px;margin-top:3px;font-weight:700;"><i class="bi bi-map"></i>Ver no Maps</a>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-ai-edit="${uid}" title="Editar"><i class="bi bi-pencil"></i></button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-ai-del title="Remover"><i class="bi bi-trash"></i></button>
      </div>
    </div>
    <div id="aiedit-mr-${uid}" style="display:none;background:${corForm};border:1px solid ${corBorda};border-radius:0 0 8px 8px;padding:8px 10px;margin-top:-1px;">
      <div class="row g-2">
        <div class="col-12">
          <label style="font-size:.72rem;font-weight:700;color:#94a3b8;">Local</label>
          <div data-ai-edit-title style="font-size:.88rem;font-weight:700;padding:3px 0 1px;">${escapeHtml(nome || "")}</div>
          <input type="hidden" data-ai-nome value="${escapeHtml(nome)}">
          <input type="hidden" data-ai-place-id value="${escapeHtml(placeId)}">
          <input type="hidden" data-ai-lat value="${escapeHtml(String(item.latitude ?? ""))}">
          <input type="hidden" data-ai-lng value="${escapeHtml(String(item.longitude ?? ""))}">
          <div data-ai-endereco style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:${endereco ? "" : "none"};">${escapeHtml(endereco)}</div>
          <a data-ai-maps-link href="${mapsUrl ? escapeHtml(mapsUrl) : "#"}" target="_blank" rel="noopener" style="font-size:.7rem;color:#3b82f6;text-decoration:none;display:${mapsUrl ? "inline-flex" : "none"};align-items:center;gap:3px;margin-top:2px;"><i class="bi bi-map-fill"></i>Ver no Maps</a>
        </div>
        <div class="col-12">
          <label style="font-size:.72rem;font-weight:700;color:#94a3b8;">Observações</label>
          <input type="text" class="form-control form-control-sm" data-ai-obs value="${escapeHtml(item.observacoes || "")}" placeholder="Opcional">
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button type="button" class="btn btn-sm btn-primary-orange" data-ai-salvar="${uid}"><i class="bi bi-check-lg me-1"></i>Salvar</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-ai-cancelar="${uid}">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function _atualizarContadoresAIVisiveis(lista) {
  if (!lista) return;
  lista.querySelectorAll("[data-ai-dia-idx]").forEach(diaEl => {
    const countEl = diaEl.querySelector("[data-ai-count-dia]");
    if (!countEl) return;
    const total = _contarItensVisiveisDiaEdit(diaEl);
    countEl.textContent = `${total} ${total === 1 ? "local" : "locais"}`;
  });
}

function _garantirLocalBaseNoDiaUnicoEdit(sugestoes) {
  if (!_destinoPOIEdit || _diasTotaisEdit !== 1 || !_localBaseEscolhidoEdit || !Array.isArray(sugestoes) || sugestoes.length === 0) {
    return sugestoes;
  }

  const baseItem = {
    nome:      _localBaseEscolhidoEdit.nome || _roteiroObjEdit?.cidade || "Local escolhido",
    endereco:  _localBaseEscolhidoEdit.endereco || "",
    placeId:   _localBaseEscolhidoEdit.placeId || "",
    latitude:  _localBaseEscolhidoEdit.latitude ?? "",
    longitude: _localBaseEscolhidoEdit.longitude ?? "",
    custo:     _localBaseEscolhidoEdit.custo || null,
  };
  const nomeBase = _normalizar(baseItem.nome);
  const pidBase  = String(baseItem.placeId || "").trim();

  const jaExiste = sugestoes.some(dia => {
    const grupos = dia.periodos && typeof dia.periodos === "object"
      ? Object.values(dia.periodos).flat()
      : (Array.isArray(dia.locais) ? dia.locais : []);
    return grupos.some(item => {
      const pid = String(item?.placeId || item?.place_id || "").trim();
      if (pidBase && pid && pid === pidBase) return true;
      return nomeBase && _normalizar(item?.nome || item?.name || item) === nomeBase;
    });
  });
  if (jaExiste) return sugestoes;

  const diaUm = sugestoes[0];
  if (diaUm.periodos && typeof diaUm.periodos === "object") {
    if (!Array.isArray(diaUm.periodos.manha)) diaUm.periodos.manha = [];
    diaUm.periodos.manha.unshift(baseItem);
  } else {
    if (!Array.isArray(diaUm.locais)) diaUm.locais = [];
    diaUm.locais.unshift(baseItem);
  }
  return sugestoes;
}

function _atualizarObservacaoSugestaoEdit(uid, obs) {
  if (!_roteiroObjEdit || !Array.isArray(_roteiroObjEdit.sugestoes) || !uid) return;
  const parts = String(uid).split("-");
  let item = null;
  if (parts[0] === "p" && parts.length >= 4) {
    const dIdx = parseInt(parts[1], 10);
    const perKey = parts[2];
    const idx = parseInt(parts[3], 10);
    item = _roteiroObjEdit.sugestoes[dIdx]?.periodos?.[perKey]?.[idx];
  } else if (parts[0] === "l" && parts.length >= 3) {
    const dIdx = parseInt(parts[1], 10);
    const idx = parseInt(parts[2], 10);
    item = _roteiroObjEdit.sugestoes[dIdx]?.locais?.[idx];
  }
  if (!item || typeof item !== "object") return;
  const texto = String(obs || "").trim();
  if (texto) item.observacoes = texto;
  else delete item.observacoes;
}

function _renderLocalCardMR(l, idx, isDark) {
  // Renderização especial para check-in / checkout salvos
  const _nomeNormLR = (l.nome || "").trim().toLowerCase().replace(/[\s-]/g, "");
  if (_nomeNormLR === "checkin" || _nomeNormLR === "checkout") {
    const isCI  = _nomeNormLR === "checkin";
    const icon  = isCI ? "bi-key-fill" : "bi-box-arrow-right";
    const bg    = isCI ? (isDark ? "rgba(20,83,45,.3)"   : "#f0fdf4") : (isDark ? "rgba(124,45,18,.25)" : "#fff7ed");
    const clr   = isCI ? "#16a34a" : "#ea580c";
    const brd   = isCI ? (isDark ? "#166534" : "#bbf7d0") : (isDark ? "#9a3412" : "#fed7aa");
    const label = isCI ? "Check-in" : "Checkout";
    return `<div id="lwrap-${String(l.idRoteiroLocal)}" style="margin-top:5px;">
      <div style="background:${bg};border:1.5px solid ${brd};border-radius:10px;display:flex;align-items:center;gap:10px;padding:12px 16px;">
        <div style="background:${clr}22;color:${clr};width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:.95rem;">
          <i class="bi ${icon}"></i>
        </div>
        <div style="font-weight:800;font-size:.92rem;color:${clr};">${label}</div>
      </div>
    </div>`;
  }

  const vid = String(l.idRoteiroLocal);
  const horFmt    = _formatarHorarioEdit(l.horario) || "";
  const corCard   = isDark ? "#1e293b" : "#f8fafc";
  const corBorda  = isDark ? "#334155" : "#e2e8f0";
  const corLabel  = isDark ? "#94a3b8" : "#64748b";
  const corForm   = isDark ? "#0f172a" : "#f1f5f9";
  const corFormBrd = isDark ? "#334155" : "#e2e8f0";
  const maxDiaAttr = _diasTotaisEdit > 0 ? ` max="${_diasTotaisEdit}"` : "";
  const custoVal  = l.custo != null ? String(l.custo) : "";
  const custoLabel = custoVal !== "" ? "$ " + custoVal : "$";
  const mapsUrl = _mapsUrlLocalEdit(l);
  return `<div id="lwrap-${vid}" style="margin-top:5px;">
    <div style="background:${corCard};border:1px solid ${corBorda};border-radius:8px;display:flex;align-items:center;gap:8px;padding:7px 10px;">
      <div style="background:#f97316;color:#fff;min-width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.75rem;flex-shrink:0;">${idx + 1}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.nome || "Local")}</div>
        ${l.endereco ? `<div style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(l.endereco)}</div>` : ""}
        ${window.placeCategoryBadgeHtml && (l.tipo || l.nome) ? window.placeCategoryBadgeHtml([l.tipo || (window.inferPlaceType ? window.inferPlaceType(l.nome) : "tourist_attraction")]) : ""}
        ${l.observacoes ? `<div style="font-size:.72rem;color:${corLabel};">${escapeHtml(l.observacoes)}</div>` : ""}
        ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="font-size:.7rem;color:#f97316;text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-top:3px;font-weight:700;"><i class="bi bi-map"></i>Ver no Maps</a>` : ""}
        <span id="mr-rating-lr-${vid}" data-mr-rating-id="mr-rating-lr-${vid}" data-mr-rating-nome="${escapeHtml(l.nome || '')}" data-mr-rating-pid="${escapeHtml(l.placeId || '')}" style="display:none;font-size:.7rem;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:999px;align-items:center;gap:3px;"></span>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-sm btn-outline-secondary" data-edit-vinculo-mr="${vid}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-del-local-mr="${l.idLocal}" data-del-vinculo-mr="${vid}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
    <div id="ledit-mr-${vid}" style="display:none;background:${corForm};border:1px solid ${corFormBrd};border-radius:0 0 8px 8px;padding:8px 10px;margin-top:-1px;">
      <input type="hidden" id="ledit-mr-dia-${vid}" value="${l.dia || ""}">
      <div style="margin-bottom:8px;">
        <label style="font-size:.72rem;font-weight:700;color:${corLabel};">Local</label>
        <div style="font-size:.88rem;font-weight:700;padding:3px 0 1px;">${escapeHtml(l.nome || "")}</div>
        ${l.endereco ? `<div style="font-size:.72rem;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.endereco)}</div>` : ""}
        ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="font-size:.7rem;color:#3b82f6;text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-top:2px;"><i class="bi bi-map-fill"></i>Ver no Maps</a>` : ""}
      </div>
      <div class="row g-2">
        <div class="col-12">
          <label style="font-size:.72rem;font-weight:700;color:${corLabel};">Observações</label>
          <input type="text" class="form-control form-control-sm" id="ledit-mr-obs-${vid}" value="${escapeHtml(l.observacoes || "")}" placeholder="Opcional">
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-sm btn-primary-orange" data-salvar-mr="${vid}" data-salvar-mr-local="${l.idLocal}" data-salvar-mr-ordem="${l.ordem || 1}" data-salvar-mr-status="${l.status || "PLANEJADO"}">
          <i class="bi bi-check-lg me-1"></i>Salvar
        </button>
        <button class="btn btn-sm btn-outline-secondary" data-cancelar-mr="${vid}">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function _inferirTipoGenericoAI(nome) {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/jantar|almoco|almocar|restaurante|refeicao/.test(n)) return "restaurant";
  if (/cafe|cafeteria|padaria|lanche|desjejum|brunch/.test(n)) return "cafe";
  if (/museu|musee|museum/.test(n)) return "museum";
  if (/praia/.test(n)) return "natural_feature";
  if (/parque|jardim|bosque/.test(n)) return "park";
  if (/feira|mercado|shopping|compras|loja/.test(n)) return "shopping_mall";
  if (/bar|pub|cerveja|boteco|rooftop|noite/.test(n)) return "bar";
  if (/hotel|pousada|hostel|hospedagem/.test(n)) return "lodging";
  if (/teatro|cinema|show|concerto|espetaculo/.test(n)) return "movie_theater";
  if (/spa|massagem|bem.estar/.test(n)) return "spa";
  // Qualquer coisa turística/passeio genérico mapeia para tourist_attraction
  if (/passeio|tour|caminhada|trilha|ponto turistico|centro historico|bairro|mirante|vista|galeria|cultural|ponte|passarela|passerelle|praca|plaza|monumento|avenida/.test(n)) return "tourist_attraction";
  return null;
}

function _ehNomeGenericoAI(nome) {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/\b(em|no|na|num|numa)\b.*(restaurante|cafe|museu|parque|praia|feira|mercado|bar|hotel|pousada)/.test(n)) return true;
  if (/^(almoco|jantar|cafe da manha|lanche|refeicao|desjejum|brunch)\b/.test(n)) return true;
  if (/(local|tipico|regional|tradicional|popular|da cidade|do local|da regiao|principal|urbano|historico)$/.test(n)) return true;
  // Frases descritivas genéricas de atividades
  if (/^(passeio|visita|tour|caminhada|trilha|ponto turistico|centro historico|bairro|mirante|vista|noite|show|espetaculo)/.test(n)) return true;
  if (/\b(local|historico|urbano|principal|da regiao|tipico)\b/.test(n)) return true;
  return false;
}

async function _autoLookupAIAddresses(lista, cidade) {
  const lookupSeq = ++_lookupAiSeq;
  let manterPendente = false;
  _setLookupAiPendente(true);

  try {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    const svc          = new google.maps.places.PlacesService(document.createElement("div"));
    const base         = _obterBaseAtiva();
    const OK           = google.maps.places.PlacesServiceStatus.OK;
    const usedPlaceIds = new Set();
    const usedAddrs    = new Set();  // endereços normalizados já usados
    const usedCoords   = [];         // [{lat,lng}] já usados — evita mesmo local com place_id diferente
    const MIN_KM       = 0.08;       // 80 m — raio mínimo de exclusão entre lugares
    const baseLat      = base?.latitude != null ? parseFloat(base.latitude) : null;
    const baseLng      = base?.longitude != null ? parseFloat(base.longitude) : null;
    const hasBaseCoords = Number.isFinite(baseLat) && Number.isFinite(baseLng);
    const MAX_KM_BASE  = Number(_raioFiltroKmEdit) > 0 ? Number(_raioFiltroKmEdit) : 30;
    const cidadeBusca  = cidade || base?.city || base?.label || "";
    if (!hasBaseCoords) {
      manterPendente = true;
      setTimeout(() => {
        if (lookupSeq === _lookupAiSeq && _obterBaseAtiva()?.latitude != null) {
          _autoLookupAIAddresses(lista, cidade);
        } else if (lookupSeq === _lookupAiSeq) {
          _setLookupAiPendente(false);
        }
      }, 500);
      return;
    }
    const BLOCKED_TYPES = new Set([
      "lodging", "supermarket", "grocery_or_supermarket", "convenience_store",
      "gas_station", "bank", "atm", "car_dealer", "car_repair", "car_wash",
      "hardware_store", "laundry", "storage", "moving_company", "electrician",
      "plumber", "locksmith", "painter", "roofing_contractor", "general_contractor",
      "insurance_agency", "real_estate_agency", "finance", "accounting",
      "car_rental", "embassy", "post_office", "courthouse", "police",
      "fire_station", "funeral_home", "cemetery"
    ]);

    const _normAddr = s =>
      String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/\s+/g, " ").trim();

    const _normCidade = s =>
      String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

    const _coordProxima = (lat, lng) =>
      usedCoords.some(c => _calcularKm(c.lat, c.lng, lat, lng) < MIN_KM);

    const _coordsDoItem = item => {
      const lat = parseFloat(item.querySelector("[data-ai-lat]")?.value || "");
      const lng = parseFloat(item.querySelector("[data-ai-lng]")?.value || "");
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    };

    const _dentroDoRaioCoords = (lat, lng) => {
      if (!hasBaseCoords) return true;
      return _calcularKm(baseLat, baseLng, lat, lng) <= MAX_KM_BASE;
    };

    const _dentroDoRaio = r => {
      if (!hasBaseCoords) return true;
      const loc = r.geometry?.location;
      if (!loc) return false;
      return _dentroDoRaioCoords(loc.lat(), loc.lng());
    };

    const _temTipoBloqueado = r => (r.types || []).some(t => BLOCKED_TYPES.has(t));

    const _naCidadeBase = r => {
      if (_destinoPOIEdit) return true;
      const cidadeAlvo = _normCidade(base?.city || cidadeBusca);
      if (!cidadeAlvo) return true;
      const addr = _normCidade(r.formatted_address || r.vicinity || "");
      if (!addr) return false;
      return addr.includes(cidadeAlvo);
    };

    const _resultadoAceitavel = r => r?.place_id && _dentroDoRaio(r) && _noEstado(r) && !_temTipoBloqueado(r);

    const _limparResolucaoItem = item => {
      const pidEl = item.querySelector("[data-ai-place-id]");
      const latEl = item.querySelector("[data-ai-lat]");
      const lngEl = item.querySelector("[data-ai-lng]");
      const addrEl = item.querySelector("[data-ai-address]");
      const endEl = item.querySelector("[data-ai-endereco]");
      if (pidEl) pidEl.value = "";
      if (latEl) latEl.value = "";
      if (lngEl) lngEl.value = "";
      if (addrEl) { addrEl.textContent = ""; addrEl.style.display = "none"; }
      if (endEl) { endEl.textContent = ""; endEl.style.display = "none"; }
      _atualizarLinksMapsAI(item, "");
    };

    // Valida estado apenas para Brasil (UF de 2 letras no formatted_address).
    // Outros países têm geocodificação diferente — a restrição já vem via cidade na query.
    const _noEstado = r => {
      if (!_estadoBaseCode || _codigoPaisEdit !== "br") return true;
      const addr = r.formatted_address || "";
      if (!addr) return true; // vicinity-only sem formatted_address: aceita (raio já restringe)
      return new RegExp(`[-\\s]${_estadoBaseCode}[,\\s]`).test(addr);
    };

    // Nomes de itens NÃO-genéricos (ex: POI "Maracanã") — itens genéricos não podem usar esses nomes
    const reservedNames = new Set();
    // Nomes já resolvidos nesta execução — nenhum item pode repetir
    const usedNames = new Set();

    lista.querySelectorAll("[data-ai-item]").forEach(item => {
      const n = (item.querySelector("[data-ai-nome]")?.value || "").trim();
      if (!n) return;
      const t = _inferirTipoGenericoAI(n);
      if (!_ehNomeGenericoAI(n) && !(t && n.split(" ").length > 3)) {
        reservedNames.add(n.toLowerCase());
      }
    });

    // Registra place_ids já existentes (itens já resolvidos)
    // Não pré-carrega usedCoords — a proximidade só bloqueia itens resolvidos
    // nesta mesma execução, evitando que museus do dia 2 sejam bloqueados pelo dia 1
    lista.querySelectorAll("[data-ai-item]").forEach(item => {
      const pidEl = item.querySelector("[data-ai-place-id]");
      const coords = _coordsDoItem(item);
      if (pidEl?.value && (!coords || _dentroDoRaioCoords(coords.lat, coords.lng))) {
        usedPlaceIds.add(pidEl.value);
      }
    });

    // Coleta itens pendentes: sem placeId, sem coordenadas ou resolvidos fora da cidade base.
    const pendentes = [];
    for (const item of lista.querySelectorAll("[data-ai-item]")) {
      if (item.hasAttribute("data-ai-special")) continue; // check-in/checkout: sem busca Maps
      const pidEl    = item.querySelector("[data-ai-place-id]");
      const endEl    = item.querySelector("[data-ai-endereco]");
      const endVazio = !endEl?.textContent?.trim();
      const coords    = _coordsDoItem(item);
      const foraDaBase = !!coords && !_dentroDoRaioCoords(coords.lat, coords.lng);
      const semCoords = !coords;
      if (foraDaBase) _limparResolucaoItem(item);
      if (pidEl?.value && !endVazio && !semCoords && !foraDaBase) continue; // já tem tudo e está dentro da base
      const nomeInput = item.querySelector("[data-ai-nome]");
      const nome      = nomeInput?.value?.trim() || "";
      if (!nome) continue;
      const existingPlaceId = foraDaBase ? null : (pidEl?.value || null);
      pendentes.push({ item, pidEl, nomeInput, nome, existingPlaceId, forceGeneric: foraDaBase });
    }

    const _tipoBuscaAI = (nome, forceGeneric) => {
      let tipo = _inferirTipoGenericoAI(nome) || (window.inferPlaceType ? window.inferPlaceType(nome) : null);
      if (forceGeneric && (!tipo || tipo === "lodging")) tipo = "tourist_attraction";
      return tipo;
    };

    const _labelBuscaTipo = tipo => ({
      restaurant: "restaurantes",
      cafe: "cafes",
      museum: "museus",
      natural_feature: "praias e mirantes",
      park: "parques",
      shopping_mall: "compras",
      bar: "bares",
      movie_theater: "teatros e cinemas",
      spa: "spas",
      stadium: "estadios",
      tourist_attraction: "atrações turísticas",
    }[tipo] || "atrações turísticas");

    const _buscarCandidatosAI = async (nome, forceGeneric) => {
      const tipo     = _tipoBuscaAI(nome, forceGeneric);
      const generico = !!forceGeneric || _ehNomeGenericoAI(nome) || (tipo && nome.split(" ").length > 3);
      let candidates = [];

      if ((generico || forceGeneric) && tipo && hasBaseCoords) {
        candidates = await new Promise(resolve => {
          svc.nearbySearch({
            location: new google.maps.LatLng(baseLat, baseLng),
            radius:   MAX_KM_BASE * 1000,
            type:     tipo,
          }, (r, s) => resolve(s === OK && r?.length ? r.filter(_resultadoAceitavel) : []));
        });
      }

      if (!candidates.length) {
        const query = forceGeneric
          ? [_labelBuscaTipo(tipo), cidadeBusca].filter(Boolean).join(" ")
          : (cidadeBusca ? `${nome}, ${cidadeBusca}` : nome);
        const tsParams = { query };
        if (hasBaseCoords) {
          tsParams.location = new google.maps.LatLng(baseLat, baseLng);
          tsParams.radius   = MAX_KM_BASE * 1000;
        }
        candidates = await new Promise(resolve => {
          svc.textSearch(tsParams, (r, s) => resolve(s === OK && r?.length ? r.filter(_resultadoAceitavel) : []));
        });
      }

      if (!candidates.length && forceGeneric && hasBaseCoords) {
        const tsParams = { query: ["pontos turísticos", cidadeBusca].filter(Boolean).join(" ") };
        tsParams.location = new google.maps.LatLng(baseLat, baseLng);
        tsParams.radius   = MAX_KM_BASE * 1000;
        candidates = await new Promise(resolve => {
          svc.textSearch(tsParams, (r, s) => resolve(s === OK && r?.length ? r.filter(_resultadoAceitavel) : []));
        });
      }

      return { generico, candidates };
    };

    // FASE 1: dispara TODAS as buscas em paralelo — elimina espera sequencial
    const searchResults = await Promise.all(pendentes.map(async ({ nome, existingPlaceId, forceGeneric }) => {
      // Item já tem placeId — não precisa de busca, só getDetails para pegar endereço
      if (existingPlaceId && !forceGeneric) return { generico: false, candidates: [], existingPlaceId, forceGeneric: false };
      const resolved = await _buscarCandidatosAI(nome, forceGeneric);
      return { ...resolved, existingPlaceId: null, forceGeneric: !!forceGeneric };
    }));
    if (lookupSeq !== _lookupAiSeq) return;

    // FASE 2: atribuição sequencial com deduplicação total
    for (let i = 0; i < pendentes.length; i++) {
      const { item, pidEl, nomeInput, nome }      = pendentes[i];
      let { generico, candidates, existingPlaceId } = searchResults[i];

      // Item com placeId existente mas sem endereço — só busca detalhes e atualiza
      if (existingPlaceId) {
        const details = await new Promise(resolve => {
          svc.getDetails({
            placeId: existingPlaceId,
            fields: ["formatted_address", "geometry", "name", "place_id", "types"],
          }, (result, status) => resolve(status === OK ? result : null));
        });
        if (details && _resultadoAceitavel(details)) {
          const addr = details.formatted_address || details.vicinity || "";
          if (details.place_id) usedPlaceIds.add(details.place_id);
          if (details.name) usedNames.add(details.name.toLowerCase());
          if (addr) usedAddrs.add(_normAddr(addr));
          if (details.geometry?.location) {
            usedCoords.push({ lat: details.geometry.location.lat(), lng: details.geometry.location.lng() });
          }
          if (details.name) {
            const titleEl = item.querySelector("[data-ai-title]");
            const editTitleEl = item.querySelector("[data-ai-edit-title]");
            if (titleEl) titleEl.textContent = details.name;
            if (editTitleEl) editTitleEl.textContent = details.name;
            if (nomeInput) nomeInput.value = details.name;
          }
          if (addr) {
            const addrEl = item.querySelector("[data-ai-address]");
            if (addrEl) { addrEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${escapeHtml(addr)}`; addrEl.style.display = ""; }
            const endEl = item.querySelector("[data-ai-endereco]");
            if (endEl) { endEl.textContent = addr; endEl.style.display = ""; }
          }
          if (details.place_id && pidEl) {
            pidEl.value = details.place_id;
            _atualizarLinksMapsAI(item, _mapsUrlEdit(details.place_id, addr || details.name));
          }
          if (details.geometry?.location) {
            const latEl = item.querySelector("[data-ai-lat]");
            const lngEl = item.querySelector("[data-ai-lng]");
            if (latEl) latEl.value = details.geometry.location.lat();
            if (lngEl) lngEl.value = details.geometry.location.lng();
          }
          continue;
        }

        _limparResolucaoItem(item);
        const fallback = await _buscarCandidatosAI(nome, true);
        generico = fallback.generico;
        candidates = fallback.candidates;
        existingPlaceId = null;
      }

      let place = candidates.find(r => {
        if (!_resultadoAceitavel(r) || usedPlaceIds.has(r.place_id)) return false;
        const addr = _normAddr(r.formatted_address || r.vicinity || "");
        if (addr && usedAddrs.has(addr)) return false;
        const loc = r.geometry?.location;
        if (loc && _coordProxima(loc.lat(), loc.lng())) return false;
        if (r.name) {
          const rName = r.name.toLowerCase();
          if (usedNames.has(rName)) return false;
          if (generico && reservedNames.has(rName)) return false;
        }
        return true;
      }) || null;

      // Fallback nearbySearch: só para itens genéricos sem nome específico
      // Itens com nome específico (ex: "Beco do Batman") são removidos se não encontrados — não substituídos
      if (!place && generico && hasBaseCoords) {
        const fbCandidates = await new Promise(resolve => {
          svc.nearbySearch({
            location: new google.maps.LatLng(baseLat, baseLng),
            radius:   MAX_KM_BASE * 1000,
            type:     "tourist_attraction",
          }, (r, s) => resolve(s === OK && r?.length ? r.filter(_resultadoAceitavel) : []));
        });
        place = fbCandidates.find(r => {
          if (!_resultadoAceitavel(r) || usedPlaceIds.has(r.place_id)) return false;
          if (r.name && usedNames.has(r.name.toLowerCase())) return false;
          return true;
        }) || null;
      }
      // Sem candidato válido: remove o item — não exibe local sem endereço
      if (!place) { item.remove(); continue; }

      // nearbySearch só retorna vicinity — tenta buscar formatted_address via getDetails
      if (!place.formatted_address && place.place_id) {
        const details = await new Promise(resolve => {
          svc.getDetails({
            placeId: place.place_id,
            fields: ["formatted_address", "geometry", "name", "place_id", "types"],
          }, (result, status) => resolve(status === OK ? result : null));
        });
        if (details && _resultadoAceitavel(details)) place = { ...place, ...details };
      }

      // Só remove se não existe absolutamente nenhum endereço identificável
      const finalAddr = place.formatted_address || place.vicinity || "";
      if (!finalAddr || !_resultadoAceitavel(place)) {
        item.remove();
        continue;
      }

      if (place.place_id) usedPlaceIds.add(place.place_id);
      if (place.name)     usedNames.add(place.name.toLowerCase());
      const usedAddr = _normAddr(place.formatted_address || place.vicinity || "");
      if (usedAddr) usedAddrs.add(usedAddr);
      if (place.geometry?.location)
        usedCoords.push({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });

      if (place.name) {
        const titleEl = item.querySelector("[data-ai-title]");
        const editTitleEl = item.querySelector("[data-ai-edit-title]");
        if (titleEl) titleEl.textContent = place.name;
        if (editTitleEl) editTitleEl.textContent = place.name;
        if (nomeInput) nomeInput.value = place.name;
      }

      const addr = place.formatted_address || place.vicinity || "";
      if (addr) {
        const addrEl = item.querySelector("[data-ai-address]");
        if (addrEl) { addrEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${escapeHtml(addr)}`; addrEl.style.display = ""; }
        const endEl = item.querySelector("[data-ai-endereco]");
        if (endEl) { endEl.textContent = addr; endEl.style.display = ""; }
      }

      if (place.place_id && pidEl) {
        pidEl.value = place.place_id;
        _atualizarLinksMapsAI(item, _mapsUrlEdit(place.place_id, addr || place.name));
      }

      if (place.geometry?.location) {
        const latEl = item.querySelector("[data-ai-lat]");
        const lngEl = item.querySelector("[data-ai-lng]");
        if (latEl) latEl.value = place.geometry.location.lat();
        if (lngEl) lngEl.value = place.geometry.location.lng();
      }
    }

    // ── Pós-processamento: garante ao menos 1 item por período ──────────────
    // Re-avalia base — pode ter geocodificado durante os awaits do loop acima
    const basePP   = _obterBaseAtiva();
    const cidadePP = cidade || (_roteiroObjEdit?.cidade) || "";
    const isDarkPP = document.documentElement.getAttribute("data-theme") === "dark";

    // Injeta card e registra dedup global para que períodos seguintes não repitam
    const _injetarCardPP = (perEl, place, addr) => {
      if (place.place_id) usedPlaceIds.add(place.place_id);
      if (place.name)     usedNames.add(place.name.toLowerCase());
      const normA = _normAddr(addr);
      if (normA) usedAddrs.add(normA);
      if (place.geometry?.location)
        usedCoords.push({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });

      const uid     = `fb-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      const nextIdx = perEl.querySelectorAll("[data-ai-item]").length;
      const data    = {
        nome: place.name || "", endereco: addr,
        placeId:   place.place_id || "",
        latitude:  place.geometry?.location?.lat() ?? "",
        longitude: place.geometry?.location?.lng() ?? "",
      };
      perEl.insertAdjacentHTML("beforeend", _renderAIItemCardMR(data, nextIdx, uid, isDarkPP));
      const ins = document.getElementById(`aiedit-mr-${uid}`)?.closest("[data-ai-item]");
      if (!ins) return;
      ins.querySelector("[data-ai-del]")?.addEventListener("click", () => {
        ins.remove();
        _atualizarContadoresAIVisiveis(lista);
        _renderMiniMapaPasso3(lista);
      });
      ins.querySelector("[data-ai-edit]")?.addEventListener("click", () => {
        const f = document.getElementById(`aiedit-mr-${uid}`);
        if (f) f.style.display = f.style.display === "none" ? "" : "none";
      });
      ins.querySelector("[data-ai-salvar]")?.addEventListener("click", () => {
        const ci = ins.querySelector("[data-ai-custo]");
        const cb = ins.querySelector("[data-ai-cost-display]");
        if (cb && ci) cb.textContent = ci.value.trim() ? "$ " + ci.value.trim() : "$";
        const f = document.getElementById(`aiedit-mr-${uid}`);
        if (f) f.style.display = "none";
      });
      ins.querySelector("[data-ai-cancelar]")?.addEventListener("click", () => {
        const f = document.getElementById(`aiedit-mr-${uid}`);
        if (f) f.style.display = "none";
      });
      if (lista._setupDragItem) lista._setupDragItem(ins);
    };

    // Busca candidate para um período vazio usando textSearch (não depende de coordenadas)
    // Deduplicação apenas dentro do mesmo dia — cidades pequenas podem reusar entre dias
    const _buscarCandidatoPP = async (perKey, diaEl) => {
      // IDs/nomes usados NO DIA corrente (não global) — permite reusar entre dias
      const dayIds   = new Set();
      const dayNames = new Set();
      diaEl?.querySelectorAll("[data-ai-place-id]").forEach(el => { if (el.value) dayIds.add(el.value); });
      diaEl?.querySelectorAll("[data-ai-nome]").forEach(el => { if (el.value?.trim()) dayNames.add(el.value.trim().toLowerCase()); });

      // Queries por período: específica → genérica
      const qMap = {
        manha: [
          `pontos turísticos ${cidadePP}`,
          `atrações turísticas ${cidadePP}`,
          `museus e parques ${cidadePP}`,
          `estabelecimentos ${cidadePP}`,
        ],
        tarde: [
          `restaurantes ${cidadePP}`,
          `atrações turísticas ${cidadePP}`,
          `passeios e lazer ${cidadePP}`,
          `estabelecimentos ${cidadePP}`,
        ],
        noite: [
          `bares e restaurantes ${cidadePP}`,
          `vida noturna ${cidadePP}`,
          `gastronomia ${cidadePP}`,
          `estabelecimentos ${cidadePP}`,
        ],
      };
      const queries = qMap[perKey] || [`atrações ${cidadePP}`];
      const encontrados = [];

      for (const q of queries) {
        const tsParams = { query: q };
        // Usa bias de localização quando disponível (não restrição — evita zero resultado)
        if (basePP?.latitude != null) {
          tsParams.location = new google.maps.LatLng(parseFloat(basePP.latitude), parseFloat(basePP.longitude));
          tsParams.radius   = MAX_KM_BASE * 1000;
        }

        let cands = await new Promise(resolve => {
          svc.textSearch(tsParams, (r, s) => resolve(s === OK && r?.length ? r : []));
        });

        // Filtra por distância real quando temos base (textSearch usa bias fraco)
        if (basePP?.latitude != null) {
          cands = cands.filter(r => {
            const loc = r.geometry?.location;
            if (!loc) return false;
            return _calcularKm(parseFloat(basePP.latitude), parseFloat(basePP.longitude), loc.lat(), loc.lng()) <= MAX_KM_BASE;
          });
        }

        for (const r of cands) {
          if (!_resultadoAceitavel(r)) continue;
          if (dayIds.has(r.place_id)) continue;           // só evita duplicata no mesmo dia
          if (r.name && dayNames.has(r.name.toLowerCase())) continue;
          encontrados.push(r);
          dayIds.add(r.place_id);
          if (r.name) dayNames.add(r.name.toLowerCase());
        }
      }
      return encontrados;
    };

    for (const perEl of lista.querySelectorAll("[data-ai-per]")) {
      if (lookupSeq !== _lookupAiSeq) return;
      const perKey = perEl.getAttribute("data-ai-per");
      if (!["manha", "tarde", "noite"].includes(perKey)) continue;
      if (!cidadePP) continue; // sem cidade não há como buscar
      // Não preencher períodos que já contenham marker de checkout
      const hasCheckout = [...perEl.querySelectorAll("[data-ai-special]")]
        .some(el => el.querySelector("input[data-ai-checkout]")?.value === "1");
      if (hasCheckout) continue;

      const alvo = Math.max(1, parseInt(perEl.getAttribute("data-ai-target-count") || "1") || 1);
      // Exclui special items (checkin/checkout) da contagem — evita injetar após o marker
      const faltantes = Math.max(0, alvo - perEl.querySelectorAll("[data-ai-item]:not([data-ai-special])").length);
      if (faltantes <= 0) continue;

      const diaEl = perEl.closest("[data-ai-dia-idx]");
      const places = await _buscarCandidatoPP(perKey, diaEl);
      if (!places?.length) continue;

      places.slice(0, faltantes).forEach(place => {
        const addr = place.formatted_address || place.vicinity || "";
        if (addr) _injetarCardPP(perEl, place, addr);
      });
    }

    _atualizarContadoresAIVisiveis(lista);
    _renderMiniMapaPasso3(lista);
    _renderMapaModalEdit(lista);
  } catch (_) { /* API unavailable, skip entirely */ }
  finally {
    if (!manterPendente && lookupSeq === _lookupAiSeq) {
      _setLookupAiPendente(false);
    }
  }
}

function _posicaoDeslocadaMapaEdit(p, contadorCoordenada) {
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

function _renderMiniMapaPasso3(lista) {
  const mapEl = document.getElementById("miniMapaPasso3");
  const box   = document.getElementById("miniMapaPasso3Box");
  if (!mapEl || !box || !window.google) return;

  const base   = _obterBaseAtiva();
  const PALETA = ["#f97316","#3b82f6","#22c55e","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#ef4444"];

  // Coleta pontos agrupados por dia e mantém o total real da lista para evitar contagem enganosa no mapa.
  const pontosPorDia = {};
  const statusPorDia = {};
  lista.querySelectorAll("[data-ai-item]").forEach(item => {
    if (item.hasAttribute("data-ai-special")) return;
    const nome = item.querySelector("[data-ai-title]")?.textContent?.trim()
              || item.querySelector("[data-ai-nome]")?.value?.trim() || "";
    const lat  = parseFloat(item.querySelector("[data-ai-lat]")?.value || "");
    const lng  = parseFloat(item.querySelector("[data-ai-lng]")?.value || "");
    const dia  = parseInt(item.closest("[data-dia]")?.getAttribute("data-dia") || "1");
    if (!statusPorDia[dia]) statusPorDia[dia] = { total: 0, mapeados: 0, pendentes: [] };
    statusPorDia[dia].total += 1;

    const semCoord = !nome || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0;
    const foraDoRaio = !semCoord && base?.latitude != null && base?.longitude != null
      ? _calcularKm(parseFloat(base.latitude), parseFloat(base.longitude), lat, lng) > _raioFiltroKmEdit
      : false;
    if (semCoord || foraDoRaio) {
      if (nome) statusPorDia[dia].pendentes.push(nome);
      return;
    }
    if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
    pontosPorDia[dia].push({ nome, lat, lng, dia });
    statusPorDia[dia].mapeados += 1;
  });

  const diasUnicos = [...new Set([
    ...Object.keys(statusPorDia).map(Number),
    ...Object.keys(pontosPorDia).map(Number),
  ])].filter(d => Number.isFinite(d)).sort((a, b) => a - b);
  const todosOsPontos = diasUnicos.flatMap(d => pontosPorDia[d]);
  if (!todosOsPontos.length && diasUnicos.length === 0) { box.style.display = "none"; return; }
  box.style.display = "";

  const corPorDia = {};
  diasUnicos.forEach((d, i) => { corPorDia[d] = PALETA[i % PALETA.length]; });

  // Injeta container de filtros e legenda se ainda não existirem
  if (!box.querySelector("#p3Filtros")) {
    const fEl = document.createElement("div");
    fEl.id = "p3Filtros";
    fEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
    box.querySelector(".mapa-titulo").after(fEl);
  }
  if (!box.querySelector("#p3Legenda")) {
    const lEl = document.createElement("div");
    lEl.id = "p3Legenda";
    lEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
    mapEl.before(lEl);
  }
  if (!box.querySelector("#p3AvisoMapa")) {
    const aEl = document.createElement("div");
    aEl.id = "p3AvisoMapa";
    mapEl.before(aEl);
  }
  const filtrosEl = box.querySelector("#p3Filtros");
  const legendaEl = box.querySelector("#p3Legenda");
  const avisoEl   = box.querySelector("#p3AvisoMapa");

  let diaFiltrado = null;
  let mapInstance = null;
  const infoWindow = new google.maps.InfoWindow();
  let markers = [], polylines = [];

  function _renderAvisoMapa() {
    const dias = diaFiltrado ? [diaFiltrado] : diasUnicos;
    const infos = dias.map(d => statusPorDia[d]).filter(Boolean);
    const incompletos = infos.filter(info => info.total > info.mapeados);
    if (!incompletos.length) {
      avisoEl.style.display = "none";
      avisoEl.innerHTML = "";
      return;
    }
    const total = infos.reduce((sum, info) => sum + info.total, 0);
    const mapeados = infos.reduce((sum, info) => sum + info.mapeados, 0);
    const exemplos = incompletos.flatMap(info => info.pendentes || []).slice(0, 3);
    const detalheExemplos = exemplos.length ? ` Ex.: ${exemplos.map(escapeHtml).join(", ")}.` : "";
    avisoEl.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin:-2px 0 10px;padding:9px 12px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#f59e0b;font-size:.82rem;font-weight:700;";
    avisoEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill" style="font-size:.95rem;line-height:1.25;"></i><span>${mapeados}/${total} locais foram posicionados no mapa. A lista continua completa.${detalheExemplos}</span>`;
  }

  function _renderMapa() {
    markers.forEach(m => m.setMap(null));
    polylines.forEach(p => p.setMap(null));
    markers = []; polylines = [];
    _renderAvisoMapa();

    const grupos = diaFiltrado
      ? [{ dia: diaFiltrado, itens: pontosPorDia[diaFiltrado] || [] }]
      : diasUnicos.map(d => ({ dia: d, itens: pontosPorDia[d] }));
    const todosVisiveis = grupos.flatMap(g => g.itens);
    if (!todosVisiveis.length) {
      mapInstance = null;
      mapEl.innerHTML = `
        <div style="height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#94a3b8;font-weight:700;">
          Nenhum local deste filtro tem coordenadas confiáveis para exibir no mapa.
        </div>`;
      return;
    }

    if (!mapInstance) {
      mapEl.innerHTML = "";
      mapInstance = new google.maps.Map(mapEl, {
        zoom: 12, center: { lat: todosVisiveis[0].lat, lng: todosVisiveis[0].lng },
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true,
      });
    }

    const bounds = new google.maps.LatLngBounds();
    const contadorCoordenada = {};
    grupos.forEach(({ dia, itens }) => {
      const cor = corPorDia[dia];
      itens.forEach((p, i) => {
        const pos = _posicaoDeslocadaMapaEdit(p, contadorCoordenada);
        p._mapPos = pos;
        const marker = new google.maps.Marker({
          position: pos, map: mapInstance, title: p.nome,
          label: { text: String(i + 1), color: "#fff", fontWeight: "800", fontFamily: "Inter,sans-serif", fontSize: "11px" },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: cor, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
          zIndex: 10,
        });
        marker.addListener("click", () => {
          infoWindow.setContent(`<div style="font-family:Inter,sans-serif;padding:2px 4px;min-width:140px;">
            <div style="font-size:.72rem;font-weight:700;color:${cor};margin-bottom:2px;">Dia ${dia}</div>
            <div style="font-weight:700;font-size:.88rem;color:#0f172a;">${escapeHtml(p.nome)}</div>
          </div>`);
          infoWindow.open(mapInstance, marker);
        });
        bounds.extend(pos);
        markers.push(marker);
      });
      if (itens.length > 1) {
        const poly = new google.maps.Polyline({
          path: itens.map(p => p._mapPos || ({ lat: p.lat, lng: p.lng })), map: mapInstance,
          strokeColor: cor, strokeOpacity: 0.7, strokeWeight: 3,
        });
        polylines.push(poly);
      }
    });
    if (todosVisiveis.length > 1) mapInstance.fitBounds(bounds);
    else { mapInstance.setCenter({ lat: todosVisiveis[0].lat, lng: todosVisiveis[0].lng }); mapInstance.setZoom(15); }
  }

  function _renderControles() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const chipBg = isDark ? "#1e293b" : "#fff";
    const chipMuted = isDark ? "#cbd5e1" : "#64748b";
    const chipBorder = isDark ? "#334155" : "#e2e8f0";

    filtrosEl.innerHTML = [
      `<button style="padding:4px 14px;border-radius:999px;border:1px solid ${chipBorder};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${diaFiltrado === null ? "#f97316" : chipBg};color:${diaFiltrado === null ? "#fff" : chipMuted};" data-p3-dia="todos">Todos</button>`,
      ...diasUnicos.map(d => {
        const cor = corPorDia[d], ativo = diaFiltrado === d;
        const totalPontos = (pontosPorDia[d] || []).length;
        const status = statusPorDia[d] || { total: totalPontos, mapeados: totalPontos };
        const totalLocais = status.total ?? totalPontos;
        const incompleto = totalLocais > status.mapeados;
        const textoQtd = `${totalLocais} ${totalLocais === 1 ? "local" : "locais"}`;
        return `<button title="${incompleto ? "Alguns locais deste dia não foram posicionados no mapa." : ""}" style="padding:4px 14px;border-radius:999px;border:1px ${incompleto ? "dashed" : "solid"} ${cor};font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;background:${ativo ? cor : chipBg};color:${ativo ? "#fff" : cor};" data-p3-dia="${d}">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ativo ? "#fff" : cor};margin-right:4px;vertical-align:middle;"></span>Dia ${d} - ${textoQtd}
        </button>`;
      }),
    ].join("");
    filtrosEl.querySelectorAll("[data-p3-dia]").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-p3-dia");
        diaFiltrado = val === "todos" ? null : parseInt(val);
        _renderControles(); _renderMapa();
      });
    });
    legendaEl.innerHTML = "";
    legendaEl.style.display = "none";
  }

  _renderControles();
  _renderMapa();
}

function renderLocaisEditAI() {
  const lista   = document.getElementById("listaLocaisEdit");
  const vazio   = document.getElementById("vazioLocaisEdit");
  const isDark  = document.documentElement.getAttribute("data-theme") === "dark";

  if (vazio) vazio.style.display = "none";
  if (!lista) return;

  const sugestoes = _garantirLocalBaseNoDiaUnicoEdit(_roteiroObjEdit.sugestoes);
  const corCard   = isDark ? "#1e293b" : "#f8fafc";
  const corBorda  = isDark ? "#334155" : "#e2e8f0";
  const corHeader = isDark ? "#f1f5f9" : "#0f172a";

  const corToggle = isDark ? "#1e293b" : "#f1f5f9";
  const corToggleBrd = isDark ? "#334155" : "#e2e8f0";

  let html = `<div style="background:${isDark ? "#172554" : "#eff6ff"};border:1px solid ${isDark ? "#1e40af" : "#bfdbfe"};border-radius:12px;padding:10px 14px;margin-bottom:10px;">
    <div class="d-flex align-items-center gap-2">
      <i class="bi bi-stars" style="color:#3b82f6;font-size:1.1rem;"></i>
      <span style="font-size:.85rem;font-weight:700;color:${isDark ? "#93c5fd" : "#1e40af"};">Roteiro gerado por IA — edite os locais e custos abaixo</span>
    </div></div>`;

  sugestoes.forEach((diaObj, dIdx) => {
    const temPeriodos = diaObj.periodos && typeof diaObj.periodos === "object";
    const colId = `ai-dia-mr-${dIdx}`;
    const diaNum = diaObj.dia || (dIdx + 1);
    const locaisDesteDia = _locaisEdit.filter(l => (l.dia || 0) === diaNum);
    const totalLocais = temPeriodos
      ? _PERIODOS_AI_MR.reduce((s, p) => s + _contarLocaisContaveisEdit(diaObj.periodos[p.key] || []), 0)
      : _contarLocaisContaveisEdit(diaObj.locais || []);
    const totalDia = totalLocais + _contarLocaisContaveisEdit(locaisDesteDia);

    html += `<div class="mb-2" data-ai-dia-idx="${dIdx}" data-dia="${diaNum}" style="border:1px solid ${corToggleBrd};border-radius:10px;overflow:hidden;">`;
    html += `<button type="button"
        class="w-100 d-flex align-items-center justify-content-between gap-3 px-3 py-2 border-0"
        style="background:${corToggle};cursor:pointer;"
        data-bs-toggle="collapse" data-bs-target="#${colId}" aria-expanded="${dIdx === 0}">
      <span style="font-size:.85rem;font-weight:800;color:${corHeader};">Dia ${diaObj.dia || (dIdx + 1)}</span>
      <div class="d-flex align-items-center gap-2">
        <span data-ai-count-dia style="font-size:.72rem;font-weight:700;color:#6366f1;">${totalDia} ${totalDia === 1 ? "local" : "locais"}</span>
        <i class="bi bi-chevron-down" style="color:#94a3b8;font-size:.75rem;transition:transform .2s;"></i>
      </div>
    </button>`;
    html += `<div id="${colId}" class="collapse ${dIdx === 0 ? "show" : ""}">`;
    html += `<div style="padding:10px 12px;background:${isDark ? "#0f172a" : "#fff"};">`;

    if (temPeriodos) {
      // Detecta posição exata de checkin/checkout para filtrar períodos
      const PER_KEYS = _PERIODOS_AI_MR.map(p => p.key); // ["manha","tarde","noite"]
      let ciPeriodIdx = -1,               coPeriodIdx = PER_KEYS.length;
      let ciPosInPer  = -1,               coPosInPer  = Number.MAX_SAFE_INTEGER;
      _PERIODOS_AI_MR.forEach((per, pidx) => {
        (diaObj.periodos[per.key] || []).forEach((item, lidx) => {
          if (item._checkin)  { ciPeriodIdx = pidx; ciPosInPer = lidx; }
          if (item._checkout) { coPeriodIdx = pidx; coPosInPer = lidx; }
        });
      });
      const startPer = ciPeriodIdx >= 0            ? ciPeriodIdx          : 0;
      const endPer   = coPeriodIdx < PER_KEYS.length ? coPeriodIdx        : PER_KEYS.length - 1;

      _PERIODOS_AI_MR.forEach((per, pidx) => {
        if (pidx < startPer || pidx > endPer) return; // período fora da janela

        const todosItens = diaObj.periodos[per.key] || [];
        const itens = todosItens.filter((item, lidx) => {
          if (item._checkin || item._checkout) return true; // marcadores sempre incluídos
          if (pidx === startPer && lidx < ciPosInPer)  return false; // antes do checkin
          if (pidx === endPer   && lidx > coPosInPer)  return false; // depois do checkout
          return true;
        });

        const locaisDestePer = locaisDesteDia.filter(l => {
          const hNorm = _normalizarHorarioEdit(l.horario);
          if (!hNorm) return false;
          const h = hNorm.slice(0, 5);
          if (per.key === "manha") return h < "12:00";
          if (per.key === "tarde") return h >= "12:00" && h < "18:00";
          return h >= "18:00";
        });
        // Separa checkout (de AI items E de locais salvos) para garantir que seja o último
        const _isCheckoutNome = x => {
          const n = ((x.nome || "")).trim().toLowerCase().replace(/[\s-]/g, "");
          return !!x._checkout || n === "checkout";
        };
        const itensRegulares     = itens.filter(it => !_isCheckoutNome(it));
        const checkoutAI         = itens.find(it => _isCheckoutNome(it));
        const locaisRegularesPer = locaisDestePer.filter(l => !_isCheckoutNome(l));
        const checkoutLocal      = locaisDestePer.find(l => _isCheckoutNome(l));
        const checkoutFinal      = checkoutAI || checkoutLocal;

        html += `<div class="mb-2" data-ai-per="${per.key}" data-ai-target-count="${itens.length}">`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <i class="bi ${per.icon}" style="color:${per.cor};font-size:.85rem;"></i>
          <span style="font-size:.78rem;font-weight:700;color:${per.cor};">${per.label}</span>
        </div>`;
        itensRegulares.forEach((item, idx) => {
          html += _renderAIItemCardMR(item, idx, `p-${dIdx}-${per.key}-${idx}`, isDark);
        });
        locaisRegularesPer.forEach((l, idx) => { html += _renderLocalCardMR(l, idx, isDark); });
        if (checkoutFinal) {
          const totalAntes = itensRegulares.length + locaisRegularesPer.length;
          html += checkoutAI
            ? _renderAIItemCardMR(checkoutFinal, totalAntes, `p-${dIdx}-${per.key}-co`, isDark)
            : _renderLocalCardMR(checkoutFinal, totalAntes, isDark);
        }
        html += `</div>`;
      });
      const _isCONome = l => ((l.nome||"")).trim().toLowerCase().replace(/[\s-]/g,"") === "checkout" || !!l._checkout;
      const locaisSemPerTodos = locaisDesteDia.filter(l => !_normalizarHorarioEdit(l.horario));
      const locaisSemPer      = locaisSemPerTodos.filter(l => !_isCONome(l));
      const checkoutSemPer    = locaisSemPerTodos.find(l => _isCONome(l));
      if (locaisSemPer.length > 0 || checkoutSemPer) {
        html += `<div class="mt-2 pt-2" data-drag-container="sem-periodo" style="border-top:1px solid ${isDark ? "#334155" : "#e2e8f0"};">
          <div style="font-size:.75rem;font-weight:700;color:#64748b;margin-bottom:5px;"><i class="bi bi-pin-map me-1"></i>Sem período</div>`;
        locaisSemPer.forEach((l, idx) => { html += _renderLocalCardMR(l, idx, isDark); });
        if (checkoutSemPer) html += _renderLocalCardMR(checkoutSemPer, locaisSemPer.length, isDark);
        html += `</div>`;
      }
    } else {
      const itens = diaObj.locais || [];
      html += `<div data-ai-per="locais" data-ai-target-count="${itens.length}">`;
      itens.forEach((item, idx) => {
        html += _renderAIItemCardMR(item, idx, `l-${dIdx}-${idx}`, isDark);
      });
      html += `</div>`;
      if (locaisDesteDia.length > 0) {
        html += `<div class="mt-2 pt-2" data-drag-container="locais-adicionados" style="border-top:1px solid ${isDark ? "#334155" : "#e2e8f0"};">
          <div style="font-size:.75rem;font-weight:700;color:#f97316;margin-bottom:5px;"><i class="bi bi-pin-map me-1"></i>Locais adicionados</div>`;
        locaisDesteDia.forEach((l, idx) => { html += _renderLocalCardMR(l, idx, isDark); });
        html += `</div>`;
      }
    }

    html += `</div></div></div>`;
  });

  if (!_ocultarBtnSalvarSugestoes) {
    html += `<button type="button" id="btnSalvarSugestoesAIMR" class="btn btn-primary-orange w-100 fw-bold mt-2">
      <i class="bi bi-check-lg me-1"></i>Salvar Sugestões IA</button>`;
  }

  lista.innerHTML = html;

  lista.querySelectorAll("[data-ai-nome]").forEach(input => _initAIItemAutocomplete(input));

  lista.querySelectorAll("[data-del-local-mr]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idLocal   = btn.getAttribute("data-del-local-mr");
      const idVinculo = btn.getAttribute("data-del-vinculo-mr");
      btn.disabled = true;
      try {
        const r = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${idLocal}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisEdit = _locaisEdit.filter(l => String(l.idRoteiroLocal) !== String(idVinculo));
          renderLocaisEdit();
        } else { alert("Não foi possível remover."); btn.disabled = false; }
      } catch { alert("Erro ao conectar."); btn.disabled = false; }
    });
  });

  lista.querySelectorAll("[data-ai-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest("[data-ai-item]")?.remove();
      _atualizarContadoresAIVisiveis(lista);
      _renderMiniMapaPasso3(lista);
    });
  });

  lista.querySelectorAll("[data-ai-add-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const perDiv  = btn.closest("[data-ai-per]");
      const nextIdx = perDiv.querySelectorAll("[data-ai-item]").length + 1;
      const uid = `new-${Date.now()}-${nextIdx}`;
      btn.insertAdjacentHTML("beforebegin", _renderAIItemCardMR({ nome: "" }, nextIdx - 1, uid, isDark));
      const inserted = document.getElementById(`aiedit-mr-${uid}`)?.closest("[data-ai-item]");
      if (inserted) {
        inserted.querySelector("[data-ai-edit]")?.addEventListener("click", () => {
          const uid = inserted.querySelector("[data-ai-edit]")?.getAttribute("data-ai-edit");
          const form = document.getElementById(`aiedit-mr-${uid}`);
          if (form) form.style.display = form.style.display === "none" ? "" : "none";
        });
        const nomeInput = inserted.querySelector("[data-ai-nome]");
        const custoInput = inserted.querySelector("[data-ai-custo]");
        inserted.querySelector("[data-ai-del]")?.addEventListener("click", () => {
          inserted.remove();
          _atualizarContadoresAIVisiveis(lista);
          _renderMiniMapaPasso3(lista);
        });
        nomeInput?.addEventListener("input", () => {
          const title = inserted.querySelector("[data-ai-title]");
          if (title) title.textContent = nomeInput.value.trim() || "Local";
        });
        custoInput?.addEventListener("input", () => {
          const costBox = inserted.querySelector("[data-ai-cost-display]");
          if (costBox) costBox.textContent = custoInput.value.trim() ? "$ " + custoInput.value.trim() : "$";
        });
        _initAIItemAutocomplete(nomeInput);
        _atualizarContadoresAIVisiveis(lista);
      }
    });
  });

  lista.querySelectorAll("[data-ai-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-ai-edit");
      const form = document.getElementById(`aiedit-mr-${uid}`);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-ai-salvar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-ai-salvar");
      const item = btn.closest("[data-ai-item]");
      const custoInput = item?.querySelector("[data-ai-custo]");
      const costBox = item?.querySelector("[data-ai-cost-display]");
      const obsInput = item?.querySelector("[data-ai-obs]");
      const obsBox = item?.querySelector("[data-ai-obs-display]");
      const obsText = obsBox?.querySelector("span");
      if (costBox && custoInput) costBox.textContent = custoInput.value.trim() ? "$ " + custoInput.value.trim() : "$";
      const obs = obsInput?.value.trim() || "";
      if (obsBox && obsText) {
        obsText.textContent = obs;
        obsBox.style.display = obs ? "" : "none";
      }
      _atualizarObservacaoSugestaoEdit(uid, obs);
      if (!_lookupAiPendente) _salvarOrdemSilencioso();
      const form = document.getElementById(`aiedit-mr-${uid}`);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-ai-cancelar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-ai-cancelar");
      const form = document.getElementById(`aiedit-mr-${uid}`);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-ai-nome]").forEach(input => {
    input.addEventListener("input", () => {
      const item = input.closest("[data-ai-item]");
      const title = item?.querySelector("[data-ai-title]");
      if (title) title.textContent = input.value.trim() || "Local";
    });
  });

  lista.querySelectorAll("[data-ai-custo]").forEach(input => {
    input.addEventListener("input", () => {
      const item = input.closest("[data-ai-item]");
      const costBox = item?.querySelector("[data-ai-cost-display]");
      if (costBox) costBox.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  lista.querySelectorAll("[data-ai-custo]").forEach(input => {
    input.addEventListener("input", () => {
      const item = input.closest("[data-ai-item]");
      const valueBox = item?.children?.[0]?.children?.[2];
      if (valueBox) valueBox.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  lista.querySelectorAll("[data-edit-vinculo-mr]").forEach(btn => {
    btn.addEventListener("click", () => {
      const vid  = btn.getAttribute("data-edit-vinculo-mr");
      const form = document.getElementById(`ledit-mr-${vid}`);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-cancelar-mr]").forEach(btn => {
    btn.addEventListener("click", () => {
      const vid  = btn.getAttribute("data-cancelar-mr");
      const form = document.getElementById(`ledit-mr-${vid}`);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-salvar-mr]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const vid    = btn.getAttribute("data-salvar-mr");
      const idLocal = btn.getAttribute("data-salvar-mr-local");
      const ordem  = parseInt(btn.getAttribute("data-salvar-mr-ordem")) || 1;
      const status = btn.getAttribute("data-salvar-mr-status") || "PLANEJADO";
      const dia    = parseInt(document.getElementById(`ledit-mr-dia-${vid}`).value) || null;
      const obs    = document.getElementById(`ledit-mr-obs-${vid}`).value.trim() || null;
      const custoRaw = document.getElementById(`ledit-mr-custo-${vid}`)?.value.trim();
      const custo = custoRaw ? parseFloat(custoRaw) : null;
      const horario = (_locaisEdit.find(l => String(l.idRoteiroLocal) === String(vid)) || {}).horario || null;
      if (!dia) { alert("Informe o dia da atividade."); return; }
      if (_diasTotaisEdit > 0 && dia > _diasTotaisEdit) {
        alert(`O dia não pode ultrapassar a duração do roteiro (${_diasTotaisEdit} dias).`);
        return;
      }
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
      try {
        const res = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${idLocal}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ idLocal: parseInt(idLocal), dia, ordem, observacoes: obs, horario, status, custo })
        });
        if (res.ok) {
          const updated = await res.json();
          const i = _locaisEdit.findIndex(l => String(l.idRoteiroLocal) === String(vid));
          if (i !== -1) _locaisEdit[i] = updated;
          renderLocaisEdit();
        } else { alert("Erro ao salvar. HTTP " + res.status); btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`; }
      } catch { alert("Erro ao conectar."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`; }
    });
  });

  lista.querySelectorAll("[id^='ledit-mr-custo-']").forEach(input => {
    const vid = input.id.replace("ledit-mr-custo-", "");
    input.addEventListener("input", () => {
      const display = document.getElementById(`lcusto-display-${vid}`);
      if (display) display.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  const btnSalvar = document.getElementById("btnSalvarSugestoesAIMR");
  if (btnSalvar) btnSalvar.addEventListener("click", _salvarSugestoesAIEdit);

  _autoLookupAIAddresses(lista, _roteiroObjEdit ? _roteiroObjEdit.cidade : "");
}

function _getAiSugestoesEditadasEdit() {
  const lista = document.getElementById("listaLocaisEdit");
  if (!lista || !_roteiroObjEdit) return null;
  const sugestoes = _roteiroObjEdit.sugestoes;
  const result = [];
  const base = _obterBaseAtiva();
  const _coordsValidas = (latVal, lngVal) => {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  };
  const _itemDentroDaBase = (latVal, lngVal) => {
    if (!_coordsValidas(latVal, lngVal)) return false;
    if (!base || base.latitude == null || base.longitude == null) return true;
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    return _calcularKm(
      parseFloat(base.latitude), parseFloat(base.longitude),
      lat, lng
    ) <= _raioFiltroKmEdit;
  };

  lista.querySelectorAll("[data-ai-dia-idx]").forEach((diaEl, dIdx) => {
    const diaOriginal = sugestoes[dIdx] || {};
    const temPeriodos = diaOriginal.periodos && typeof diaOriginal.periodos === "object";
    const obj = { dia: diaOriginal.dia || (dIdx + 1) };

    if (temPeriodos) {
      obj.periodos = {};
      diaEl.querySelectorAll("[data-ai-per]").forEach(perEl => {
        const perKey = perEl.getAttribute("data-ai-per");
        const itens = [];
        perEl.querySelectorAll("[data-ai-item]").forEach(itemEl => {
          const nome       = (itemEl.querySelector("[data-ai-nome]")     || {}).value || "";
          const isCheckin  = !!((itemEl.querySelector("[data-ai-checkin]")  || {}).value);
          const isCheckout = !!((itemEl.querySelector("[data-ai-checkout]") || {}).value);
          if (!nome.trim()) return;
          // Marcadores especiais: salvar apenas com flag, sem endereço/custo
          if (isCheckin || isCheckout) {
            itens.push({ nome: nome.trim(), ...(isCheckin && { _checkin: true }), ...(isCheckout && { _checkout: true }) });
            return;
          }
          const custoRaw = (itemEl.querySelector("[data-ai-custo]") || {}).value || "";
          const custo    = custoRaw !== "" ? parseFloat(custoRaw) : null;
          const endereco = ((itemEl.querySelector("[data-ai-endereco]") || {}).textContent || "").trim();
          const placeId  = ((itemEl.querySelector("[data-ai-place-id]") || {}).value || "").trim();
          const obs      = ((itemEl.querySelector("[data-ai-obs]")  || {}).value || "").trim();
          const latVal   = ((itemEl.querySelector("[data-ai-lat]")  || {}).value || "").trim();
          const lngVal   = ((itemEl.querySelector("[data-ai-lng]")  || {}).value || "").trim();
          if (!_itemDentroDaBase(latVal, lngVal)) return;
          const lat = parseFloat(latVal);
          const lng = parseFloat(lngVal);
          itens.push({
            nome: nome.trim(),
            custo: custo != null ? `R$ ${custo.toLocaleString("pt-BR", {minimumFractionDigits: 0, maximumFractionDigits: 2})}` : "",
            ...(endereco && { endereco }),
            ...(placeId  && { placeId  }),
            ...(obs      && { observacoes: obs }),
            latitude:  lat,
            longitude: lng,
          });
        });
        obj.periodos[perKey] = itens;
      });
    } else {
      const locais = [];
      diaEl.querySelectorAll("[data-ai-item]").forEach(itemEl => {
        const nome     = (itemEl.querySelector("[data-ai-nome]")  || {}).value || "";
        const custo    = (itemEl.querySelector("[data-ai-custo]") || {}).value || "";
        const endereco = ((itemEl.querySelector("[data-ai-endereco]") || {}).textContent || "").trim();
        const placeId  = ((itemEl.querySelector("[data-ai-place-id]") || {}).value || "").trim();
        const obs      = ((itemEl.querySelector("[data-ai-obs]")  || {}).value || "").trim();
        const latVal2 = ((itemEl.querySelector("[data-ai-lat]") || {}).value || "").trim();
        const lngVal2 = ((itemEl.querySelector("[data-ai-lng]") || {}).value || "").trim();
        if (!_itemDentroDaBase(latVal2, lngVal2)) return;
        const lat = parseFloat(latVal2);
        const lng = parseFloat(lngVal2);
        if (nome.trim()) locais.push({
          nome: nome.trim(), custo: custo.trim(),
          ...(endereco && { endereco }),
          ...(placeId  && { placeId  }),
          ...(obs      && { observacoes: obs }),
          latitude:  lat,
          longitude: lng,
        });
      });
      obj.locais = locais;
    }

    result.push(obj);
  });

  return result;
}

window.getSugestoesEditadasLocais = function () {
  return _getAiSugestoesEditadasEdit();
};

// Versão silenciosa para uso após drag-and-drop: salva sem reload nem fechar modal
async function _salvarOrdemSilencioso() {
  try {
    const sugestoesEditadas = _getAiSugestoesEditadasEdit();
    if (!sugestoesEditadas || !_roteiroObjEdit) return;
    const r = _roteiroObjEdit;
    await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idUsuario:           r.idUsuario,
        titulo:              r.titulo,
        pais:                r.pais,
        cidade:              r.cidade,
        tipoRoteiro:         r.tipoRoteiro,
        statusRoteiro:       r.statusRoteiro,
        visibilidadeRoteiro: r.visibilidadeRoteiro,
        dataInicio:          r.dataInicio,
        dataFim:             r.dataFim,
        observacoes:         r.observacoes,
        diasTotais:          r.diasTotais,
        orcamento:           null,
        sugestoes:           sugestoesEditadas,
      }),
    });
    _roteiroObjEdit = Object.assign({}, _roteiroObjEdit, { sugestoes: sugestoesEditadas });
  } catch (_) { /* silencioso */ }
}

async function _salvarSugestoesAIEdit() {
  if (_lookupAiPendente) {
    alert("Aguarde a preparação dos locais no mapa terminar antes de salvar.");
    return;
  }

  const btnSalvar = document.getElementById("btnSalvarSugestoesAIMR");
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`; }

  try {
    const sugestoesEditadas = _getAiSugestoesEditadasEdit();
    if (!sugestoesEditadas) throw new Error("Erro ao coletar sugestões.");

    const r = _roteiroObjEdit;
    const body = {
      idUsuario:           r.idUsuario,
      titulo:              r.titulo,
      pais:                r.pais,
      cidade:              r.cidade,
      tipoRoteiro:         r.tipoRoteiro,
      statusRoteiro:       r.statusRoteiro,
      visibilidadeRoteiro: r.visibilidadeRoteiro,
      dataInicio:          r.dataInicio,
      dataFim:             r.dataFim,
      observacoes:         r.observacoes,
      diasTotais:          r.diasTotais,
      orcamento:           null,
      sugestoes:           sugestoesEditadas,
    };

    const res = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (res.ok) {
      _roteiroObjEdit = Object.assign({}, _roteiroObjEdit, { sugestoes: sugestoesEditadas });
      const modal = document.getElementById("modalEditarRoteiro");
      if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      }
      window.location.reload();
    } else {
      throw new Error("HTTP " + res.status);
    }
  } catch(e) {
    alert("Erro ao salvar sugestões: " + (e.message || "Erro desconhecido"));
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar Sugestões IA`; }
  }
}

function _renderLocaisReaisEdit(lista) {
  const isDark      = document.documentElement.getAttribute("data-theme") === "dark";
  const baseAtiva   = _obterBaseAtiva();
  const corHeader   = isDark ? "#f1f5f9" : "#0f172a";
  const corCount    = isDark ? "#94a3b8" : "#64748b";
  const corBorda    = isDark ? "#334155" : "#eef2f7";
  const corEndereco = isDark ? "#cbd5e1" : "#94a3b8";
  const corCard     = isDark ? "#1e293b" : "#f8fafc";
  const corCardBrd  = isDark ? "#334155" : "#e2e8f0";
  const maxDiaAttr  = _diasTotaisEdit > 0 ? ` max="${_diasTotaisEdit}"` : "";

  const locaisHtml  = _agruparLocaisEdit(_locaisEdit).map(({ dia, itens }) => `
    <section data-drag-container="dia-${dia || 0}" style="margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;
                  margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${corBorda};">
        <div style="font-size:.82rem;font-weight:800;color:${corHeader};">${dia ? `Dia ${dia}` : "Sem dia definido"}</div>
        ${(() => {
          const total = _contarLocaisContaveisEdit(itens);
          return `<div style="font-size:.72rem;font-weight:700;color:${corCount};">${total} ${total === 1 ? "local" : "locais"}</div>`;
        })()}
      </div>
      ${itens.map((l, idx) => {
        const vid = String(l.idRoteiroLocal);
        const dist = _distanciaBase(l, baseAtiva);
        const ok   = dist != null ? dist <= _raioFiltroKmEdit : null;
        const distHtml = dist != null
          ? `<div style="font-size:.72rem;color:${ok ? (isDark ? "#4ade80" : "#15803d") : (isDark ? "#f87171" : "#dc2626")};margin-top:2px;">
               <i class="bi bi-signpost me-1"></i>${_fmtKm(dist)} km da base${ok ? "" : " · fora do raio"}
             </div>` : "";
        const horFmt = _formatarHorarioEdit(l.horario) || "";
        const corForm = isDark ? "#1e293b" : "#f1f5f9";
        const corFormBrd = isDark ? "#334155" : "#e2e8f0";
        const corLabel = isDark ? "#94a3b8" : "#64748b";
        const mapsUrl = _mapsUrlLocalEdit(l);
        return `
          <div id="lwrap-${vid}" style="margin-bottom:6px;">
            <div style="background:${corCard};border:1px solid ${corCardBrd};border-radius:10px;
                        display:flex;align-items:center;gap:10px;padding:10px 12px;">
              <div style="background:#f97316;color:#fff;min-width:30px;height:30px;border-radius:50%;
                          display:grid;place-items:center;font-weight:800;font-size:.82rem;flex-shrink:0;">
                ${idx + 1}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;flex-wrap:wrap;">
                  <div style="font-weight:800;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${escapeHtml(l.nome || "Local")}
                  </div>
                  ${horFmt ? `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:999px;
                                            background:#fff7ed;color:#c2410c;font-size:.7rem;font-weight:800;">
                                 <i class="bi bi-clock"></i>${horFmt}
                               </span>` : ""}
                </div>
                ${l.observacoes ? `<div style="font-size:.75rem;color:${isDark ? "#94a3b8" : "#64748b"};">${escapeHtml(l.observacoes)}</div>` : ""}
                ${l.endereco    ? `<div style="font-size:.72rem;color:${corEndereco};margin-top:1px;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(l.endereco)}</div>` : ""}
                ${distHtml}
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px;">
                  ${window.placeCategoryBadgeHtml && (l.tipo || l.nome) ? window.placeCategoryBadgeHtml([l.tipo || (window.inferPlaceType ? window.inferPlaceType(l.nome) : "tourist_attraction")]) : ""}
                  <span id="mr-rating-lr-${vid}" data-mr-rating-id="mr-rating-lr-${vid}" data-mr-rating-nome="${escapeHtml(l.nome || '')}" data-mr-rating-pid="${escapeHtml(l.placeId || '')}" style="display:none;font-size:.7rem;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:999px;align-items:center;gap:3px;"></span>
                  ${mapsUrl ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;font-size:.72rem;color:#f97316;font-weight:700;text-decoration:none;"><i class="bi bi-map"></i>Ver no Maps</a>` : ""}
                </div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-sm btn-outline-secondary" data-edit-vinculo-mr="${vid}" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger"
                        data-del-local-mr="${l.idLocal}" data-del-vinculo-mr="${vid}"
                        title="Remover">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div id="ledit-mr-${vid}" style="display:none;background:${corForm};border:1px solid ${corFormBrd};
                 border-radius:0 0 10px 10px;padding:10px 12px;margin-top:-1px;">
              <div class="row g-2">
                <div class="col-6">
                  <label style="font-size:.75rem;font-weight:700;color:${corLabel};">Dia</label>
                  <input type="number" min="1"${maxDiaAttr} class="form-control form-control-sm"
                         id="ledit-mr-dia-${vid}" value="${l.dia || ""}">
                </div>
                <div class="col-6">
                  <label style="font-size:.75rem;font-weight:700;color:${corLabel};">Custo (R$)</label>
                  <input type="number" min="0" step="0.01" class="form-control form-control-sm"
                         id="ledit-mr-custo-${vid}" value="${l.custo != null ? String(l.custo) : ""}" placeholder="R$">
                </div>
                <div class="col-12">
                  <label style="font-size:.75rem;font-weight:700;color:${corLabel};">Observações</label>
                  <input type="text" class="form-control form-control-sm"
                         id="ledit-mr-obs-${vid}" value="${escapeHtml(l.observacoes || "")}" placeholder="Opcional">
                </div>
              </div>
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-sm btn-primary-orange"
                        data-salvar-mr="${vid}"
                        data-salvar-mr-local="${l.idLocal}"
                        data-salvar-mr-ordem="${l.ordem || 1}"
                        data-salvar-mr-status="${l.status || "PLANEJADO"}">
                  <i class="bi bi-check-lg me-1"></i>Salvar
                </button>
                <button class="btn btn-sm btn-outline-secondary" data-cancelar-mr="${vid}">Cancelar</button>
              </div>
            </div>
          </div>`;
      }).join("")}
    </section>`
  ).join("");

  lista.insertAdjacentHTML("beforeend", locaisHtml);

  lista.querySelectorAll("[data-edit-vinculo-mr]").forEach(btn => {
    btn.addEventListener("click", () => {
      const vid  = btn.getAttribute("data-edit-vinculo-mr");
      const form = document.getElementById(`ledit-mr-${vid}`);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-cancelar-mr]").forEach(btn => {
    btn.addEventListener("click", () => {
      const vid  = btn.getAttribute("data-cancelar-mr");
      const form = document.getElementById(`ledit-mr-${vid}`);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-salvar-mr]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const vid    = btn.getAttribute("data-salvar-mr");
      const idLocal = btn.getAttribute("data-salvar-mr-local");
      const ordem  = parseInt(btn.getAttribute("data-salvar-mr-ordem")) || 1;
      const status = btn.getAttribute("data-salvar-mr-status") || "PLANEJADO";
      const dia    = parseInt(document.getElementById(`ledit-mr-dia-${vid}`).value) || null;
      const obs    = document.getElementById(`ledit-mr-obs-${vid}`).value.trim() || null;
      const custoRaw = document.getElementById(`ledit-mr-custo-${vid}`)?.value.trim();
      const custo  = custoRaw ? parseFloat(custoRaw) : null;
      const horario = (_locaisEdit.find(l => String(l.idRoteiroLocal) === String(vid)) || {}).horario || null;

      if (!dia) { alert("Informe o dia da atividade."); return; }
      if (_diasTotaisEdit > 0 && dia > _diasTotaisEdit) {
        alert(`O dia não pode ultrapassar a duração do roteiro (${_diasTotaisEdit} dias). Ajuste a duração na aba Informações.`);
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
      try {
        const res = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${idLocal}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ idLocal: parseInt(idLocal), dia, ordem, observacoes: obs, horario, status, custo })
        });
        if (res.ok) {
          const updated = await res.json();
          const idx = _locaisEdit.findIndex(l => String(l.idRoteiroLocal) === String(vid));
          if (idx !== -1) _locaisEdit[idx] = updated;
          renderLocaisEdit();
        } else { alert("Erro ao salvar. HTTP " + res.status); btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`; }
      } catch { alert("Erro ao conectar ao servidor."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar`; }
    });
  });

  lista.querySelectorAll("[data-del-local-mr]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idLocal   = btn.getAttribute("data-del-local-mr");
      const idVinculo = btn.getAttribute("data-del-vinculo-mr");
      btn.disabled = true;
      try {
        const r = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${idLocal}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisEdit = _locaisEdit.filter(l => String(l.idRoteiroLocal) !== String(idVinculo));
          renderLocaisEdit();
        } else { alert("Não foi possível remover."); btn.disabled = false; }
      } catch { alert("Erro ao conectar ao servidor."); btn.disabled = false; }
    });
  });
}

// ── Drag-and-drop para reordenar itens dentro do dia ─────────────
function _initDragDropAI(lista) {
  if (!lista) return;
  let dragSrc = null;

  const _sel = () => ":scope > [data-ai-item]:not([data-ai-special]), :scope > [id^='lwrap-']";

  function _clearAllIndicators() {
    lista.querySelectorAll("[data-drag-over]").forEach(el => {
      el.removeAttribute("data-drag-over");
      el.style.borderTop = "";
      el.style.borderBottom = "";
    });
  }

  function _renumerarTudo() {
    lista.querySelectorAll("[data-ai-per], [data-drag-container]").forEach(c => {
      [...c.querySelectorAll(_sel())].forEach((item, i) => {
        const badge = item.querySelector("[data-nr-badge]");
        if (badge) badge.textContent = String(i + 1);
      });
    });
  }

  function _getDropTarget(container, y) {
    const items = [...container.querySelectorAll(_sel())].filter(i => i !== dragSrc);
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return { el: item, before: true };
    }
    const last = items[items.length - 1];
    return last ? { el: last, before: false } : null;
  }

  function _setupItem(item) {
    const cardInner = item.querySelector(":scope > div");
    if (cardInner && !item.querySelector("[data-drag-handle]")) {
      const handle = document.createElement("div");
      handle.setAttribute("data-drag-handle", "");
      handle.style.cssText = "cursor:grab;color:#94a3b8;font-size:.95rem;padding:0 2px;flex-shrink:0;display:flex;align-items:center;";
      handle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
      cardInner.insertBefore(handle, cardInner.firstChild);
      const badge = cardInner.children[1];
      if (badge && !badge.hasAttribute("data-nr-badge")) badge.setAttribute("data-nr-badge", "");
    }
    if (item.dataset.dragReady) return;
    item.dataset.dragReady = "1";
    item.setAttribute("draggable", "true");
    item.addEventListener("dragstart", e => {
      dragSrc = item;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => { item.style.opacity = "0.4"; }, 0);
    });
    item.addEventListener("dragend", () => {
      dragSrc = null;
      item.style.opacity = "";
      _clearAllIndicators();
    });
  }

  // Configura itens já presentes
  lista.querySelectorAll("[data-ai-per], [data-drag-container]").forEach(c => {
    [...c.querySelectorAll(_sel())].forEach(_setupItem);
  });

  // Expõe para _injetarCardPP adicionar handle em itens injetados dinamicamente
  lista._setupDragItem = _setupItem;

  lista.querySelectorAll("[data-ai-per], [data-drag-container]").forEach(perContainer => {
    perContainer.addEventListener("dragover", e => {
      e.preventDefault();
      if (!dragSrc) return;
      const srcDia = dragSrc.closest("[data-ai-dia-idx]");
      const tgtDia = perContainer.closest("[data-ai-dia-idx]");
      // Permite mover entre períodos do mesmo dia; fora do contexto AI mantém restrição ao mesmo container
      const ok = (srcDia && tgtDia && srcDia === tgtDia) || (!srcDia && perContainer.contains(dragSrc));
      if (!ok) return;
      e.dataTransfer.dropEffect = "move";
      _clearAllIndicators();
      const target = _getDropTarget(perContainer, e.clientY);
      if (target?.el && target.el !== dragSrc) {
        target.el.setAttribute("data-drag-over", "");
        target.el.style[target.before ? "borderTop" : "borderBottom"] = "2px solid #f97316";
      }
    });
    perContainer.addEventListener("dragleave", e => {
      if (!perContainer.contains(e.relatedTarget)) {
        perContainer.querySelectorAll("[data-drag-over]").forEach(el => {
          el.removeAttribute("data-drag-over");
          el.style.borderTop = "";
          el.style.borderBottom = "";
        });
      }
    });
    perContainer.addEventListener("drop", e => {
      e.preventDefault();
      if (!dragSrc) return;
      const srcDia = dragSrc.closest("[data-ai-dia-idx]");
      const tgtDia = perContainer.closest("[data-ai-dia-idx]");
      const ok = (srcDia && tgtDia && srcDia === tgtDia) || (!srcDia && perContainer.contains(dragSrc));
      if (!ok) return;
      _clearAllIndicators();
      const target = _getDropTarget(perContainer, e.clientY);
      if (target?.el) {
        perContainer.insertBefore(dragSrc, target.before ? target.el : target.el.nextSibling);
      } else {
        perContainer.appendChild(dragSrc);
      }
      dragSrc.style.opacity = "";
      dragSrc = null;
      _renumerarTudo();
      _salvarOrdemSilencioso();
      const _listaAtual = document.getElementById("listaLocaisEdit");
      if (_listaAtual) _renderMiniMapaPasso3(_listaAtual);
    });
  });
}

// ── Ratings do Google Maps nos cards ──────────────────────────────
const _mrRatingCache = {};

function _fetchRatingMR(nome, placeId, spanId) {
  const cacheKey = placeId || nome;
  if (!cacheKey) return;

  const apply = rating => {
    const el = document.getElementById(spanId);
    if (!el || !rating) return;
    el.innerHTML = `<i class="bi bi-star-fill" style="color:#facc15;font-size:.65rem;"></i> ${rating.toFixed(1)}`;
    el.style.display = "inline-flex";
  };

  if (_mrRatingCache[cacheKey] !== undefined) { apply(_mrRatingCache[cacheKey]); return; }
  if (!window.google || !google.maps?.places?.PlacesService) return;

  const svc = new google.maps.places.PlacesService(document.createElement("div"));
  if (placeId) {
    svc.getDetails({ placeId, fields: ["rating"] }, (place, status) => {
      const r = status === google.maps.places.PlacesServiceStatus.OK ? (place?.rating || null) : null;
      _mrRatingCache[cacheKey] = r;
      apply(r);
    });
  } else if (nome) {
    svc.textSearch({ query: nome }, (results, status) => {
      const r = status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.rating
        ? results[0].rating : null;
      _mrRatingCache[cacheKey] = r;
      apply(r);
    });
  }
}

function _iniciarRatingsMR() {
  document.querySelectorAll("[data-mr-rating-id]").forEach(el => {
    _fetchRatingMR(
      el.getAttribute("data-mr-rating-nome") || "",
      el.getAttribute("data-mr-rating-pid")  || "",
      el.getAttribute("data-mr-rating-id")
    );
  });
}

// ── Render locais ─────────────────────────────────────────────────
function renderLocaisEdit() {
  const lista = document.getElementById("listaLocaisEdit");
  const vazio = document.getElementById("vazioLocaisEdit");
  if (!lista) return;

  const temSugestoes = _hasSugestoesAIEdit();
  const temLocais    = _locaisEdit.length > 0;

  if (!temSugestoes && !temLocais) {
    lista.innerHTML = "";
    if (vazio) { vazio.style.display = ""; lista.appendChild(vazio); }
    return;
  }

  if (vazio) vazio.style.display = "none";
  lista.innerHTML = "";

  if (temSugestoes) {
    renderLocaisEditAI(); // locais reais por dia já incluídos dentro de cada accordion
    _iniciarRatingsMR();
    _initDragDropAI(lista);
    return;
  }

  _renderLocaisReaisEdit(lista);
  _renderMiniMapaLocaisEdit();
  _iniciarRatingsMR();
  _initDragDropAI(lista);
}

// ── Carregar locais ───────────────────────────────────────────────
function carregarLocaisEdit(roteiroId) {
  _roteiroIdEdit = roteiroId;
  _locaisEdit    = [];
  authFetch(`${_URL_API}/roteiros/${roteiroId}/locais`)
    .then(r => r.json())
    .then(data => {
      _locaisEdit = Array.isArray(data) ? data : [];
      if (_locaisEdit.length === 0 && !_hasSugestoesAIEdit()) {
        // Fallback: busca /completo que retorna locais E sugestoes juntos
        authFetch(`${_URL_API}/roteiros/${roteiroId}/completo`)
          .then(r => r.json())
          .then(completo => {
            if (completo && Array.isArray(completo.locais) && completo.locais.length > 0) {
              _locaisEdit = completo.locais;
            }
            if (completo && completo.roteiro && Array.isArray(completo.roteiro.sugestoes) && completo.roteiro.sugestoes.length > 0) {
              _roteiroObjEdit = Object.assign({}, _roteiroObjEdit, { sugestoes: completo.roteiro.sugestoes });
            }
            renderLocaisEdit();
            _renderMiniMapaLocaisEdit();
          })
          .catch(() => { renderLocaisEdit(); _renderMiniMapaLocaisEdit(); });
      } else {
        renderLocaisEdit();
        _renderMiniMapaLocaisEdit();
      }
    })
    .catch(() => { _locaisEdit = []; renderLocaisEdit(); _renderMiniMapaLocaisEdit(); });
}

function _renderMiniMapaLocaisEdit() {
  _renderMapaModalEdit(document.getElementById("listaLocaisEdit"));
}

function _renderMapaModalEdit(lista) {
  const box   = document.getElementById("miniMapaEditBox");
  const mapEl = document.getElementById("miniMapaEdit");
  if (!box || !mapEl || !window.google) return;

  const pontos = [];

  // 1. Locais de IA presentes no DOM (já com lat/lng resolvidos pelo _autoLookupAIAddresses)
  if (lista) {
    lista.querySelectorAll("[data-ai-item]").forEach(item => {
      const nome = (item.querySelector("[data-ai-title]") || {}).textContent?.trim()
                || (item.querySelector("[data-ai-nome]") || {}).value?.trim() || "";
      const lat  = parseFloat((item.querySelector("[data-ai-lat]") || {}).value || "");
      const lng  = parseFloat((item.querySelector("[data-ai-lng]") || {}).value || "");
      if (nome && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        pontos.push({ nome, lat, lng });
      }
    });
  }

  // 2. Locais reais já salvos no banco (_locaisEdit)
  _locaisEdit.forEach(l => {
    if (l.latitude == null || l.longitude == null) return;
    const lat = parseFloat(l.latitude), lng = parseFloat(l.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;
    pontos.push({ nome: l.nome || "Local", lat, lng });
  });

  if (!pontos.length) { box.style.display = "none"; return; }
  box.style.display = "";

  const mapa = new google.maps.Map(mapEl, {
    zoom: 12,
    center: { lat: pontos[0].lat, lng: pontos[0].lng },
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true
  });

  const infoWindow = new google.maps.InfoWindow();
  const bounds     = new google.maps.LatLngBounds();
  const contadorCoordenada = {};

  pontos.forEach((p, i) => {
    const pos = _posicaoDeslocadaMapaEdit(p, contadorCoordenada);
    p._mapPos = pos;
    const marker = new google.maps.Marker({
      position: pos,
      map: mapa,
      title: p.nome,
      label: { text: String(i + 1), color: "#fff", fontWeight: "800", fontFamily: "Inter,sans-serif", fontSize: "11px" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: "#f97316", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      zIndex: 10
    });
    marker.addListener("click", () => {
      infoWindow.setContent(`<div style="font-family:Inter,sans-serif;padding:2px 4px;min-width:120px;"><div style="font-weight:700;font-size:.85rem;color:#0f172a;">${escapeHtml(p.nome)}</div><div style="font-size:.72rem;color:#f97316;font-weight:700;">#${i + 1} no roteiro</div></div>`);
      infoWindow.open(mapa, marker);
    });
    bounds.extend(pos);
  });

  if (pontos.length > 1) {
    new google.maps.Polyline({
      path: pontos.map(p => p._mapPos || ({ lat: p.lat, lng: p.lng })),
      map: mapa, strokeColor: "#f97316", strokeOpacity: 0.65, strokeWeight: 2.5,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: "#f97316", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1 }, offset: "100%", repeat: "70px" }]
    });
    mapa.fitBounds(bounds);
  } else {
    mapa.setZoom(15);
  }
}

// ── Event listeners: bases ────────────────────────────────────────
document.getElementById("btnAdicionarBaseEdit")?.addEventListener("click", async () => {
  const paisEl   = document.getElementById("basePaisEdit");
  const cidadeEl = document.getElementById("baseCidadeEdit");
  const diasEl   = document.getElementById("baseDiasEdit");
  const paiTxt   = paisEl?.value?.trim();
  const cidTxt   = cidadeEl?.value?.trim();
  const dias     = parseInt(diasEl?.value) > 0 ? parseInt(diasEl.value) : null;

  if (!paiTxt || !cidTxt) { _mostrarErroBase("Informe o pais e a cidade base."); return; }
  _ocultarErroBase();

  try {
    const geocoded = _cidadeBaseSelecionadaEdit?.latitude != null
      ? { latitude: _cidadeBaseSelecionadaEdit.latitude, longitude: _cidadeBaseSelecionadaEdit.longitude }
      : await _geocodificarBase(paiTxt, cidTxt);

    const pais   = _paisBaseSelecionadoEdit?.nome || paiTxt;
    const cidade = _cidadeBaseSelecionadaEdit?.nome || cidTxt;

    const duplicada = _basesEdit.find(b =>
      _normalizar(b.country) === _normalizar(pais) && _normalizar(b.city) === _normalizar(cidade)
    );

    if (duplicada) {
      duplicada.latitude  = geocoded.latitude;
      duplicada.longitude = geocoded.longitude;
      duplicada.dias      = dias;
      duplicada.stateCode = _cidadeBaseSelecionadaEdit?.stateCode || geocoded.stateCode || duplicada.stateCode || null;
      duplicada.stateName = _cidadeBaseSelecionadaEdit?.stateName || geocoded.stateName || duplicada.stateName || null;
      _baseAtivaIdEdit    = duplicada.id;
      if (duplicada.stateCode) { _estadoBaseCode = duplicada.stateCode; _estadoBaseName = duplicada.stateName || null; }
    } else {
      const nova = {
        id:        `base-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        country:   pais,
        city:      cidade,
        label:     `${cidade}, ${pais}`,
        latitude:  geocoded.latitude,
        longitude: geocoded.longitude,
        stateCode: _cidadeBaseSelecionadaEdit?.stateCode || geocoded.stateCode || null,
        stateName: _cidadeBaseSelecionadaEdit?.stateName || geocoded.stateName || null,
        dias,
      };
      _basesEdit.push(nova);
      _baseAtivaIdEdit = nova.id;
      if (nova.stateCode) { _estadoBaseCode = nova.stateCode; _estadoBaseName = nova.stateName || null; }
    }

    _salvarBasesEdit();
    _salvarFiltroEdit();
    _renderBases();
    renderLocaisEdit();
    _aplicarBoundsEstado(); // restringe busca ao estado/região da base recém-adicionada

    _cidadeBaseSelecionadaEdit = null;
    _paisBaseSelecionadoEdit   = null;
    if (paisEl)   paisEl.value   = "";
    if (cidadeEl) cidadeEl.value = "";
    if (diasEl)   diasEl.value   = "";
  } catch (erro) {
    _mostrarErroBase(erro.message || "Nao foi possivel adicionar a base.");
  }
});

document.getElementById("baseFiltroAtivaEdit")?.addEventListener("change", e => {
  _baseAtivaIdEdit = e.target.value || null;
  _salvarFiltroEdit();
  _renderBases();
  renderLocaisEdit();
});

document.getElementById("raioBaseKmEdit")?.addEventListener("input", e => {
  _raioFiltroKmEdit = Math.max(1, parseInt(e.target.value) || 10);
  e.target.value = _raioFiltroKmEdit;
  _salvarFiltroEdit();
  renderLocaisEdit();
});

// ── Event listener: recomendações ────────────────────────────────
document.addEventListener("click", function(e) {
  const btn = e.target.closest("#btnBuscarRecomendacoesEdit");
  if (!btn) return;

  const categoria = (document.getElementById("categoriaRecomendacaoEdit") || {}).value || "tourist_attraction";
  const loadEl    = document.getElementById("loadingRecomendacoesEdit");
  const alertaEl  = document.getElementById("alertaRecomendacoesEdit");
  const listaEl   = document.getElementById("listaRecomendacoesEdit");
  const cidade    = _roteiroObjEdit ? (_roteiroObjEdit.cidade || _roteiroObjEdit.pais || "") : "";

  if (!cidade) {
    if (alertaEl) { alertaEl.textContent = "O roteiro não possui cidade definida."; alertaEl.style.display = ""; }
    return;
  }
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    if (alertaEl) { alertaEl.textContent = "Google Maps ainda não carregou. Tente novamente."; alertaEl.style.display = ""; }
    return;
  }

  const labelMap = {
    tourist_attraction: "atrações turísticas",
    restaurant:         "restaurantes",
    lodging:            "hospedagem",
    museum:             "museus",
    park:               "parques",
    shopping_mall:      "shoppings",
    night_club:         "vida noturna",
    bar:                "bares",
    cafe:               "cafés",
    beach:              "praias"
  };
  const label = labelMap[categoria] || categoria;
  const query = label + " em " + cidade;

  if (alertaEl) alertaEl.style.display = "none";
  if (listaEl)  listaEl.innerHTML = "";
  if (loadEl)   loadEl.style.display = "";
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Buscando...';

  const params = { query: query };
  const lat = parseFloat(_roteiroObjEdit?.latDestino);
  const lng = parseFloat(_roteiroObjEdit?.lngDestino);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.location = new google.maps.LatLng(lat, lng);
    params.radius   = 50000;
  }

  const svc = new google.maps.places.PlacesService(document.createElement("div"));
  svc.textSearch(params, function(lugares, st) {
    if (loadEl) loadEl.style.display = "none";
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-search me-1"></i>Buscar';
    if (st !== google.maps.places.PlacesServiceStatus.OK || !lugares || !lugares.length) {
      _renderRecomendacoes([]);
      return;
    }
    const sorted = lugares.filter(function(l) { return l.rating; }).sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    _renderRecomendacoes(sorted.slice(0, 15));
  });
});

// ── Event listener: adicionar local ──────────────────────────────
document.getElementById("btnAdicionarLocalEdit")?.addEventListener("click", async () => {
  const erroEl = document.getElementById("erroLocalEdit");

  if (!_localSelecionadoEdit) {
    erroEl.textContent = "Busque e selecione um local primeiro!";
    erroEl.style.display = "";
    return;
  }
  if (!_roteiroIdEdit) {
    erroEl.textContent = "Nenhum roteiro selecionado.";
    erroEl.style.display = "";
    return;
  }
  const dia       = document.getElementById("localDiaEdit")?.value?.trim();
  const obs       = document.getElementById("localObsEdit")?.value?.trim();
  const periodo = document.getElementById("localPeriodoEdit")?.value || "";

  if (!dia) {
    erroEl.textContent = "Informe o dia da atividade.";
    erroEl.style.display = "";
    return;
  }
  if (_diasTotaisEdit > 0 && parseInt(dia) > _diasTotaisEdit) {
    erroEl.textContent = `O dia não pode ultrapassar a duração do roteiro (${_diasTotaisEdit} dias). Ajuste a duração na aba Informações.`;
    erroEl.style.display = "";
    return;
  }

  if (!periodo) {
    erroEl.textContent = "Selecione o período da atividade: Manhã, Tarde ou Noite.";
    erroEl.style.display = "";
    document.getElementById("localPeriodoEdit")?.focus();
    return;
  }

  if (!_validarLocalNaBaseEdit(_localSelecionadoEdit)) return;

  erroEl.style.display = "none";

  const horario = periodo === "manha" ? "08:00:00"
    : periodo === "tarde" ? "14:00:00"
    : periodo === "noite" ? "20:00:00"
    : null;

  const btn = document.getElementById("btnAdicionarLocalEdit");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

  try {
    const resLocal = await authFetch(`${_URL_API}/locais`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        placeId:   _localSelecionadoEdit.placeId,
        nome:      _localSelecionadoEdit.nome,
        endereco:  _localSelecionadoEdit.endereco,
        tipo:      _localSelecionadoEdit.tipo,
        latitude:  _localSelecionadoEdit.latitude,
        longitude: _localSelecionadoEdit.longitude,
      }),
    });

    let local;
    if (resLocal.ok || resLocal.status === 201) {
      local = await resLocal.json();
    } else {
      const resGet = await authFetch(`${_URL_API}/locais/place/${encodeURIComponent(_localSelecionadoEdit.placeId)}`);
      local = await resGet.json();
    }

    const resVinculo = await authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        idLocal:     local.idLocal,
        dia:         parseInt(dia, 10),
        ordem:       _locaisEdit.length + 1,
        observacoes: obs || null,
        horario:     horario,
        status:      "PLANEJADO",
      }),
    });

    if (!(resVinculo.ok || resVinculo.status === 201)) throw new Error("Erro ao vincular local.");

    const vinculo = await resVinculo.json();
    if (obs && !vinculo.observacoes) vinculo.observacoes = obs;
    _locaisEdit.push(vinculo);
    renderLocaisEdit();

    ["buscaLocalEdit","localDiaEdit","localObsEdit"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const periodoEl = document.getElementById("localPeriodoEdit");
    if (periodoEl) periodoEl.value = "";
    const prevEl = document.getElementById("localPreviewEdit");
    if (prevEl) prevEl.style.display = "none";
    _localSelecionadoEdit = null;
  } catch {
    erroEl.textContent = "Erro ao salvar local. Verifique o backend.";
    erroEl.style.display = "";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-plus-lg me-1"></i>Adicionar Local ao Roteiro`;
  }
});

// ── Abrir aba locais (chamado de roteiros.js) ─────────────────────
window.abrirLocaisEdit = function (roteiroId, cidadeRoteiro, opts) {
  _roteiroIdEdit             = roteiroId;
  _diasTotaisEdit            = (opts && opts.diasTotais) || 0;
  _userIdEdit                = (opts && opts.userId)     || null;
  _roteiroObjEdit            = (opts && opts.roteiro)    || null;
  _cidadeBaseSelecionadaEdit = null;
  _paisBaseSelecionadoEdit   = null;

  // Oculta o botão "Salvar Sugestões IA" no contexto de criar-roteiro
  _ocultarBtnSalvarSugestoes = !!(opts && opts.ocultarBtnSalvarSugestoes);
  _destinoPOIEdit = !!(opts && opts.destinoPOI);
  _localBaseEscolhidoEdit = (opts && opts.localBase) || null;

  // Código ISO-2 do país e estado: sempre vem do roteiro atual.
  _codigoPaisEdit = (opts && opts.codigoPais) || null;
  _estadoBaseCode = (opts && opts.stateCode)  || null;
  _estadoBaseName = (opts && opts.stateName)  || null;
  // Reseta o autocomplete — será recriado APÓS as bases serem carregadas (para ter bounds disponíveis)
  _autocompleteEdit = null;

  _configurarAutocompleteBases();

  // Limpa formulários
  ["buscaLocalEdit","localDiaEdit","localObsEdit",
   "basePaisEdit","baseCidadeEdit","baseDiasEdit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const diaSelectEdit = document.getElementById("localDiaEdit");
  if (diaSelectEdit) {
    const numDias = _diasTotaisEdit > 0 ? _diasTotaisEdit
      : (_roteiroObjEdit && _roteiroObjEdit.sugestoes ? _roteiroObjEdit.sugestoes.length : 0);
    diaSelectEdit.innerHTML = '<option value="" disabled selected>Selecione</option>';
    for (let d = 1; d <= (numDias || 1); d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = "Dia " + d;
      diaSelectEdit.appendChild(opt);
    }
    diaSelectEdit.value = "";
  }

  const prevEl    = document.getElementById("localPreviewEdit");
  const listaRec  = document.getElementById("listaRecomendacoesEdit");
  const alertaRec = document.getElementById("alertaRecomendacoesEdit");

  if (prevEl)    prevEl.style.display    = "none";
  if (listaRec)  listaRec.innerHTML      = "";
  if (alertaRec) alertaRec.style.display = "none";

  _localSelecionadoEdit = null;

  const criandoRoteiro = !!(opts && opts.ocultarBtnSalvarSugestoes);
  _resetarEstadoBasesEdit();
  _locaisEdit = [];
  const listaLocais = document.getElementById("listaLocaisEdit");
  const miniMapaBox = document.getElementById("miniMapaPasso3Box");
  if (listaLocais) listaLocais.innerHTML = "";
  if (miniMapaBox) miniMapaBox.style.display = "none";

  const coordsDestino = _coordenadasDestinoEdit(opts || {});
  if ((criandoRoteiro || _basesEdit.length === 0) && coordsDestino && cidadeRoteiro) {
    let paisHint = opts?.pais || opts?.roteiro?.pais || "";

    const baseDestino = {
      id:        `base-destino-${roteiroId}`,
      country:   paisHint || cidadeRoteiro,
      city:      cidadeRoteiro,
      label:     [cidadeRoteiro, paisHint].filter(Boolean).join(", "),
      latitude:  coordsDestino.latitude,
      longitude: coordsDestino.longitude,
      stateCode: _estadoBaseCode || null,
      stateName: _estadoBaseName || null,
      dias:      _diasTotaisEdit || null,
    };
    _basesEdit.push(baseDestino);
    _baseAtivaIdEdit = baseDestino.id;
  }

  // Tenta popular stateCode a partir da base do roteiro atual.
  if (!_estadoBaseCode) {
    const b = _obterBaseAtiva();
    if (b?.stateCode) { _estadoBaseCode = b.stateCode; _estadoBaseName = b.stateName || null; }
  }

  // Cria o autocomplete AGORA que as bases estão carregadas — bounds já estarão disponíveis
  garantirAutocompleteEdit();

  // Se não há base com coordenadas, pré-preenche e auto-cria a partir dos dados do roteiro
  if (_basesEdit.length === 0) {
    let paisHint   = opts?.pais || opts?.roteiro?.pais || "";
    let cidadeHint = cidadeRoteiro || "";

    if (cidadeHint) {
      // Pré-preenche os campos para o usuário ver
      const paisEl   = document.getElementById("basePaisEdit");
      const cidadeEl = document.getElementById("baseCidadeEdit");
      if (paisEl && paisHint)     paisEl.value   = paisHint;
      if (cidadeEl && cidadeHint) cidadeEl.value = cidadeHint;

      // Auto-geocodifica e cria a base silenciosamente
      const tentarCriarBase = () => {
        _geocodificarBase(paisHint, cidadeHint)
          .then(geocoded => {
            // Evita duplicata se o usuário já adicionou manualmente enquanto carregava
            if (_basesEdit.length > 0) return;

            const nova = {
              id:        `base-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              country:   paisHint || cidadeHint,
              city:      cidadeHint,
              label:     [cidadeHint, paisHint].filter(Boolean).join(", "),
              latitude:  geocoded.latitude,
              longitude: geocoded.longitude,
              stateCode: geocoded.stateCode || null,
              stateName: geocoded.stateName || null,
              dias:      null,
            };
            _basesEdit.push(nova);
            _baseAtivaIdEdit = nova.id;
            if (geocoded.stateCode) { _estadoBaseCode = geocoded.stateCode; _estadoBaseName = geocoded.stateName || null; }
            // Recria o autocomplete com bounds do estado agora que temos coordenadas
            _autocompleteEdit = null;
            garantirAutocompleteEdit();
            _salvarBasesEdit();
            _salvarFiltroEdit();

            // Limpa os campos (base já foi criada)
            const paisEl2   = document.getElementById("basePaisEdit");
            const cidadeEl2 = document.getElementById("baseCidadeEdit");
            if (paisEl2)   paisEl2.value   = "";
            if (cidadeEl2) cidadeEl2.value = "";

            _renderBases();
            renderLocaisEdit();
            _aplicarBoundsEstado(); // restringe busca ao estado/região da base
          })
          .catch(() => {
            // Falhou silenciosamente — campos permanecem preenchidos para adição manual
          });
      };

      if (window.google && google.maps?.places?.PlacesService) {
        tentarCriarBase();
      } else {
        // Maps ainda não carregou, espera o callback initMapsEdit
        const _origInit = window.initMapsEdit;
        window.initMapsEdit = function () {
          _origInit?.();
          tentarCriarBase();
          window.initMapsEdit = _origInit; // restaura
        };
      }
    }
  }

  _renderBases();
  carregarLocaisEdit(roteiroId);
};

// ── Otimização por proximidade (Nearest Neighbor por dia) ─────────
function _nearestNeighborDia(locais) {
  const comCoord = locais.filter(l => l.latitude != null && l.longitude != null);
  const semCoord = locais.filter(l => l.latitude == null  || l.longitude == null);

  if (comCoord.length <= 1) return locais;

  const visitados = [comCoord[0]];
  const restantes = comCoord.slice(1);

  while (restantes.length > 0) {
    const ultimo = visitados[visitados.length - 1];
    let minDist = Infinity, minIdx = 0;
    restantes.forEach((loc, i) => {
      const d = _calcularKm(
        parseFloat(ultimo.latitude),  parseFloat(ultimo.longitude),
        parseFloat(loc.latitude),     parseFloat(loc.longitude)
      );
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    visitados.push(restantes[minIdx]);
    restantes.splice(minIdx, 1);
  }

  return [...visitados, ...semCoord];
}

async function _otimizarRoteiroPorProximidade() {
  if (_locaisEdit.length === 0) return;

  const btn = document.getElementById("btnOtimizarRoteiro");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" style="width:.8rem;height:.8rem;"></span>Otimizando…`;
  }

  try {
    const grupos = {};
    _locaisEdit.forEach(l => {
      const dia = l.dia ?? 0;
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(l);
    });

    const novaOrdem = [];
    Object.keys(grupos).sort((a, b) => Number(a) - Number(b)).forEach(dia => {
      _nearestNeighborDia(grupos[dia]).forEach((l, i) => novaOrdem.push({ ...l, ordem: i + 1 }));
    });

    const alterados = novaOrdem.filter(novo => {
      const orig = _locaisEdit.find(l => l.idRoteiroLocal === novo.idRoteiroLocal);
      return orig && orig.ordem !== novo.ordem;
    });

    if (alterados.length === 0) return;

    await Promise.all(alterados.map(l =>
      authFetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${l.idLocal}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idLocal:     l.idLocal,
          status:      l.status,
          observacoes: l.observacoes,
          dia:         l.dia,
          ordem:       l.ordem,
          horario:     l.horario,
        }),
      })
    ));

    _locaisEdit = novaOrdem;
    renderLocaisEdit();
  } catch {
    alert("Erro ao otimizar o roteiro. Tente novamente.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-magic me-1"></i>Otimizar`;
    }
  }
}

document.getElementById("btnOtimizarRoteiro")
  ?.addEventListener("click", _otimizarRoteiroPorProximidade);
