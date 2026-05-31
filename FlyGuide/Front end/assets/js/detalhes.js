/* ================================================================
   FlyGuide - detalhes.js
   Página de detalhes de um roteiro (pages/detalhes-roteiro.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarDetalhes() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");
  const userId       = getUserIdFromToken();
  const EMPTY_TEXT   = "\u2014";
  const PUBLICO      = "P\u00fablico";
  const PRIVADO      = "Privado";

  const loading  = document.getElementById("detalhesLoading");
  const erro     = document.getElementById("detalhesErro");
  const conteudo = document.getElementById("detalhesConteudo");

  if (!roteiroId) { loading.style.display = "none"; erro.style.display = ""; return; }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val || EMPTY_TEXT;
  }

  function formatarData(dataStr) {
    if (!dataStr) return EMPTY_TEXT;
    const [y, m, d] = dataStr.split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  }

  function normalizarHorario(valor) {
    const horario = String(valor || "").trim();
    if (!horario) return null;
    if (/^\d{2}:\d{2}$/.test(horario)) return `${horario}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(horario)) return horario;
    return null;
  }

  function formatarHorario(valor) {
    const horario = normalizarHorario(valor);
    return horario ? horario.slice(0, 5) : "";
  }

  function horarioParaOrdem(valor) {
    const horario = normalizarHorario(valor);
    if (!horario) return Number.MAX_SAFE_INTEGER;
    const [hora, minuto] = horario.split(":").map(Number);
    return (hora * 60) + minuto;
  }

  function compararLocais(a, b) {
    return (a.dia || 0) - (b.dia || 0)
      || horarioParaOrdem(a.horario) - horarioParaOrdem(b.horario)
      || (a.ordem || 0) - (b.ordem || 0)
      || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
  }

  function mapsUrlDetalhes(placeId, query) {
    const place = String(placeId || "").trim();
    const q = String(query || place || "").trim();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    return place ? `${url}&query_place_id=${encodeURIComponent(place)}` : url;
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

  function badgeAberturaHtml() {
    return "";
  }

  // Converte o price_level (0-4) da Google Places API em badge HTML
  function priceLevelHtml(level) {
    if (level === undefined || level === null) return "";
    const cfg = [
      { signo: "",      label: "Gratuito",    cor: "#16a34a", bg: "#dcfce7" },
      { signo: "$",     label: "Acessível",   cor: "#15803d", bg: "#d1fae5" },
      { signo: "$$",    label: "Moderado",    cor: "#b45309", bg: "#fef3c7" },
      { signo: "$$$",   label: "Caro",        cor: "#dc2626", bg: "#fee2e2" },
      { signo: "$$$$",  label: "Muito caro",  cor: "#991b1b", bg: "#fecaca" },
    ][level] || null;
    if (!cfg) return "";
    return `<span data-price-level="${level}" style="font-size:.72rem;font-weight:700;color:${cfg.cor};background:${cfg.bg};padding:2px 8px;border-radius:999px;">${cfg.signo ? cfg.signo + " · " : ""}${cfg.label}</span>`;
  }

  function normalizarTiposPlace(local, fallbackNome) {
    let tipos = [];
    if (Array.isArray(local)) tipos = local;
    else if (Array.isArray(local?.types)) tipos = local.types;
    else if (local?.tipo) tipos = [local.tipo];

    if ((!tipos || tipos.length === 0) && fallbackNome && typeof window.inferPlaceType === "function") {
      tipos = [window.inferPlaceType(fallbackNome)];
    }

    return [...new Set((tipos || []).filter(Boolean))];
  }

  function categoriaLocalHtml(local, fallbackNome) {
    if (typeof window.placeCategoryBadgeHtml !== "function") return "";
    const tipos = normalizarTiposPlace(local, fallbackNome);
    return tipos.length ? window.placeCategoryBadgeHtml(tipos) : "";
  }

  function aplicarCategoriaPlace(container, tipos, fallbackNome) {
    const slot = container?.querySelector("[data-place-category-slot]");
    if (!slot) return;
    const html = categoriaLocalHtml(Array.isArray(tipos) ? tipos : { types: tipos || [] }, fallbackNome);
    if (html) slot.innerHTML = html;
  }

  function aplicarRatingPlace(container, rating, selector) {
    const nota = Number(rating);
    if (!Number.isFinite(nota) || nota <= 0) return;
    const ratingEl = container?.querySelector(selector);
    if (!ratingEl) return;
    ratingEl.innerHTML = `<i class="bi bi-star-fill" style="color:#facc15;font-size:.75rem;"></i> ${nota.toFixed(1)}`;
    ratingEl.style.display = "inline-flex";
  }

  window.buscarHorariosDetalhes = function buscarHorariosDetalhes(locais) {
    if (!window.google?.maps?.places) return;
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    const vistos = new Set();
    locais.forEach(l => {
      if (!l.placeId || vistos.has(l.placeId)) return;
      vistos.add(l.placeId);
      service.getDetails({ placeId: l.placeId, fields: ["opening_hours"] }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
        const data = {
          periods:     place.opening_hours?.periods      || [],
          weekdayText: place.opening_hours?.weekday_text || [],
          priceLevel:  null,
        };
        locais.filter(x => x.placeId === l.placeId).forEach(x => injetarBadgeDetalhe(x, data));
      });
    });
  }

  function injetarBadgeDetalhe(l, hoursData) {
    const el = document.getElementById(`detalhe-local-${l.idRoteiroLocal}`);
    if (!el || !hoursData) return;

    // Badge abertura
    if (!el.querySelector("[data-abertura]") && hoursData.periods.length > 0) {
      const aberto = calcularAberturaAgora(hoursData.periods);
      if (aberto !== null) {
        el.insertAdjacentHTML("beforeend",
          `<div data-abertura="1" style="font-size:.78rem;margin-top:4px;color:${aberto ? "#16a34a" : "#dc2626"};"><i class="bi bi-clock me-1"></i>${aberto ? "Aberto agora" : "Fechado agora"}</div>`);
      }
    }
  }

  function agruparLocaisPorDia(locais) {
    const grupos = new Map();

    [...locais].sort(compararLocais).forEach((local) => {
      const chave = local.dia || 0;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(local);
    });

    return [...grupos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([dia, itens]) => ({ dia, itens }));
  }

  const SUGESTOES_TIPO = {
    "Praia":       [{busca:"praia",custo:"Gratuito"},{busca:"passeio barco",custo:"R$ 80 a R$ 200"},{busca:"restaurante beira mar",custo:"R$ 60 a R$ 150"},{busca:"pôr do sol praia",custo:"Gratuito"}],
    "Natureza":    [{busca:"trilha ecológica",custo:"Gratuito a R$ 30"},{busca:"cachoeira",custo:"Gratuito a R$ 20"},{busca:"mirante parque",custo:"Gratuito"},{busca:"parque nacional",custo:"R$ 20 a R$ 60"}],
    "Aventura":    [{busca:"tirolesa",custo:"R$ 80 a R$ 150"},{busca:"rafting rio",custo:"R$ 120 a R$ 250"},{busca:"escalada",custo:"R$ 100 a R$ 200"},{busca:"mountain bike trilha",custo:"R$ 50 a R$ 120"}],
    "Cultural":    [{busca:"museu histórico",custo:"R$ 15 a R$ 40"},{busca:"centro cultural",custo:"Gratuito a R$ 20"},{busca:"catedral igreja",custo:"Gratuito"},{busca:"mercado artesanal",custo:"Gratuito"}],
    "Gastronomia": [{busca:"mercado gastronômico",custo:"R$ 30 a R$ 80"},{busca:"restaurante tradicional",custo:"R$ 50 a R$ 120"},{busca:"aula culinária",custo:"R$ 150 a R$ 300"},{busca:"feira gastronomia",custo:"Gratuito"}],
    "Mochilão":    [{busca:"hostel",custo:"R$ 40 a R$ 80/noite"},{busca:"tour a pé free walking",custo:"Gratuito"},{busca:"bar",custo:"R$ 20 a R$ 50"},{busca:"ponto turístico",custo:"Gratuito a R$ 30"}],
    "Luxo":        [{busca:"restaurante fine dining",custo:"R$ 300 a R$ 600"},{busca:"spa bem-estar",custo:"R$ 200 a R$ 500"},{busca:"tour privativo",custo:"R$ 500+"},{busca:"loja boutique luxo",custo:"Preço varia"}],
    "Família":     [{busca:"parque diversões",custo:"R$ 100 a R$ 250"},{busca:"zoológico aquário",custo:"R$ 40 a R$ 100"},{busca:"museu interativo",custo:"R$ 25 a R$ 60"},{busca:"restaurante família",custo:"R$ 40 a R$ 100"}],
    "default":     [{busca:"centro histórico",custo:"Gratuito"},{busca:"ponto turístico",custo:"Gratuito a R$ 40"},{busca:"museu",custo:"R$ 15 a R$ 40"},{busca:"restaurante",custo:"R$ 40 a R$ 100"}],
  };

  function normalizarLocal(l) {
    if (!l) return { nome: "", custo: null, observacoes: null, _replace: false, _busca: null, _checkin: false, _checkout: false, endereco: null, placeId: null, latitude: null, longitude: null, tipo: null, types: [], rating: null };
    if (typeof l === "string") return { nome: l, custo: null, observacoes: null, _replace: false, _busca: null, _checkin: false, _checkout: false, endereco: null, placeId: null, latitude: null, longitude: null, tipo: null, types: [], rating: null };
    const tipos = Array.isArray(l.types) ? l.types : (l.tipo ? [l.tipo] : []);
    return { nome: l.nome || "", custo: l.custo || null, observacoes: l.observacoes || null, _replace: !!l._replace, _busca: l._busca || null,
             _checkin: !!l._checkin, _checkout: !!l._checkout, endereco: l.endereco || null,
             placeId: l.placeId || l.place_id || null,
             latitude: l.latitude ?? l.lat ?? null,
             longitude: l.longitude ?? l.lng ?? null,
             tipo: l.tipo || tipos[0] || null,
             types: tipos,
             rating: l.rating ?? l.notaGoogle ?? l.googleRating ?? null };
  }

  function ehCheckinCheckoutDetalhe(local) {
    const l = normalizarLocal(local);
    const nome = String(l.nome || "").trim().toLowerCase().replace(/[\s-]/g, "");
    return l._checkin || l._checkout || nome === "checkin" || nome === "checkout";
  }

  function contarLocaisContaveisDetalhe(locais) {
    return (locais || []).filter(l => !ehCheckinCheckoutDetalhe(l)).length;
  }

  function ehElementoCheckinCheckoutDetalhe(el) {
    const nome = (el?.querySelector(".name")?.textContent
      || el?.querySelector(".ai-place-name")?.textContent
      || el?.textContent
      || "").trim().toLowerCase().replace(/[\s-]/g, "");
    return nome === "checkin" || nome === "checkout";
  }

  const PERIODOS_CONFIG = [
    { key: "manha", label: "Manhã",  icon: "bi-sunrise-fill",   cor: "#f59e0b" },
    { key: "tarde", label: "Tarde",  icon: "bi-sun-fill",        cor: "#f97316" },
    { key: "noite", label: "Noite",  icon: "bi-moon-stars-fill", cor: "#6366f1" },
  ];

  // Retorna array plano de todos os locais de um dia (periodos ou locais flat)
  function locaisDoDia(d) {
    if (d.periodos) {
      return PERIODOS_CONFIG.flatMap(p => Array.isArray(d.periodos[p.key]) ? d.periodos[p.key] : []);
    }
    return Array.isArray(d.locais) ? d.locais : [];
  }

  function contarLocaisRenderizadosDia(dia) {
    const container = document.getElementById("aiDiasContainer");
    if (!container) return 0;
    let total = 0;
    container.querySelectorAll("section").forEach(sec => {
      const hdr = sec.querySelector(".dia-header-label");
      if (hdr && hdr.textContent.trim() === `Dia ${dia}`) {
        total += [...sec.querySelectorAll(".day-item")]
          .filter(item => !ehElementoCheckinCheckoutDetalhe(item)).length;
      }
    });
    return total;
  }

  function gerarSugestoesFrontend(roteiro) {
    const dias   = roteiro.diasTotais || 1;
    const cidade = roteiro.cidade || "destino";
    const tipo   = roteiro.tipoRoteiro || "default";
    const lista  = SUGESTOES_TIPO[tipo] || SUGESTOES_TIPO["default"];
    const result = [];
    for (let dia = 1; dia <= dias; dia++) {
      const manha = [];
      const tarde = [];
      const noite = [];
      if (dia === 1) manha.push({ nome: "Chegada em " + cidade + " e check-in", custo: "Preço varia" });
      manha.push({ nome: lista[(dia - 1) % lista.length].busca, custo: lista[(dia - 1) % lista.length].custo, _busca: lista[(dia - 1) % lista.length].busca + " " + cidade, _replace: true });
      tarde.push({ nome: lista[dia % lista.length].busca, custo: lista[dia % lista.length].custo, _busca: lista[dia % lista.length].busca + " " + cidade, _replace: true });
      tarde.push({ nome: lista[(dia + 1) % lista.length].busca, custo: lista[(dia + 1) % lista.length].custo, _busca: lista[(dia + 1) % lista.length].busca + " " + cidade, _replace: true });
      if (dia === dias && dias > 1) noite.push({ nome: "Últimas compras e retorno", custo: "Preço varia" });
      noite.push({ nome: lista[(dia + 2) % lista.length].busca, custo: lista[(dia + 2) % lista.length].custo, _busca: lista[(dia + 2) % lista.length].busca + " " + cidade, _replace: true });
      result.push({ dia, periodos: { manha, tarde, noite } });
    }
    return result;
  }

  function enrichWithMaps(cidade, pais, latSalva, lngSalva) {
    if (!window.google?.maps?.places) {
      setTimeout(() => enrichWithMaps(cidade, pais, latSalva, lngSalva), 600);
      return;
    }
    const service  = new google.maps.places.PlacesService(document.createElement("div"));
    const geocoder = new google.maps.Geocoder();
    const items    = [...document.querySelectorAll("#aiDiasContainer [data-maps-query]")];
    if (items.length === 0) return;

    let pending        = items.length;
    const aiPlaces    = [];
    const usedPlaceIds = new Set();
    const statusPorDia = {};
    const ordemPorDia  = {};

    items.forEach(el => {
      const dia = parseInt(el.getAttribute("data-dia")) || 0;
      if (dia <= 0) return;
      ordemPorDia[dia] = (ordemPorDia[dia] || 0) + 1;
      el.dataset.mapaOrdem = String(ordemPorDia[dia]);
      if (!statusPorDia[dia]) statusPorDia[dia] = { total: 0, resolvidos: 0, pendentes: [] };
      statusPorDia[dia].total += 1;
    });

    // Tipos que nunca devem aparecer em roteiro turistico
    const _BLOCKED_TYPES = new Set([
      "lodging", "supermarket", "grocery_or_supermarket", "convenience_store",
      "gas_station", "bank", "atm", "car_dealer", "car_repair", "car_wash",
      "hardware_store", "laundry", "storage", "moving_company", "electrician",
      "plumber", "locksmith", "painter", "roofing_contractor", "general_contractor",
      "insurance_agency", "real_estate_agency", "finance", "accounting",
      "car_rental", "embassy", "post_office", "courthouse", "police",
      "fire_station", "funeral_home", "cemetery"
    ]);

    function _statusOk(status) {
      return status === google.maps.places.PlacesServiceStatus.OK || status === "OK";
    }

    function _overQueryLimit(status) {
      return status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT || status === "OVER_QUERY_LIMIT";
    }

    // Escolhe o melhor resultado excluindo tipos nao turisticos e, quando necessario, duplicados
    function _pickPlace(results, minRatings, permitirRepetido = false) {
      if (!results?.length) return null;
      const valid = results.filter(r =>
        r?.place_id &&
        (permitirRepetido || !usedPlaceIds.has(r.place_id)) &&
        !(r.types || []).some(t => _BLOCKED_TYPES.has(t))
      );
      return valid.find(r => (r.user_ratings_total || 0) >= minRatings) || valid[0] || null;
    }

    function _uniqueQueries(list) {
      const seen = new Set();
      return list
        .map(q => String(q || "").replace(/\s+/g, " ").trim())
        .filter(q => {
          if (!q) return false;
          const key = q.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    function _distKm(lat1, lng1, lat2, lng2) {
      const R = 6371, toRad = d => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function _nearbySearch(params, minRatings, permitirRepetido, callback, tentativa = 0) {
      service.nearbySearch(params, (results, status) => {
        if (_overQueryLimit(status) && tentativa < 3) {
          setTimeout(() => _nearbySearch(params, minRatings, permitirRepetido, callback, tentativa + 1), 450 * (tentativa + 1));
          return;
        }
        callback(_statusOk(status) ? _pickPlace(results, minRatings, permitirRepetido) : null);
      });
    }

    function _textSearch(params, minRatings, permitirRepetido, callback, tentativa = 0) {
      service.textSearch(params, (results, status) => {
        if (_overQueryLimit(status) && tentativa < 3) {
          setTimeout(() => _textSearch(params, minRatings, permitirRepetido, callback, tentativa + 1), 450 * (tentativa + 1));
          return;
        }
        callback(_statusOk(status) ? _pickPlace(results, minRatings, permitirRepetido) : null);
      });
    }

    function _geocode(address, nomeFallback, callback, tentativa = 0) {
      if (!address) { callback(null); return; }
      geocoder.geocode({ address }, (results, status) => {
        if (_overQueryLimit(status) && tentativa < 3) {
          setTimeout(() => _geocode(address, nomeFallback, callback, tentativa + 1), 500 * (tentativa + 1));
          return;
        }
        if (status !== "OK" || !results?.[0]?.geometry?.location) { callback(null); return; }
        const result = results[0];
        callback({
          place_id: result.place_id,
          name: nomeFallback || result.formatted_address || address,
          formatted_address: result.formatted_address || address,
          geometry: result.geometry,
          types: result.types || [],
        });
      });
    }

    function _getDetails(placeId, fallbackPlace, callback, tentativa = 0) {
      if (!placeId) { callback(fallbackPlace); return; }
      service.getDetails({
        placeId,
        fields: ["name", "formatted_address", "geometry", "place_id", "types", "rating", "opening_hours"]
      }, (place, status) => {
        if (_overQueryLimit(status) && tentativa < 3) {
          setTimeout(() => _getDetails(placeId, fallbackPlace, callback, tentativa + 1), 450 * (tentativa + 1));
          return;
        }
        if (!_statusOk(status) || !place) {
          callback(fallbackPlace);
          return;
        }
        callback({
          ...fallbackPlace,
          ...place,
          place_id: place.place_id || fallbackPlace.place_id,
          name: place.name || fallbackPlace.name,
          formatted_address: place.formatted_address || fallbackPlace.formatted_address,
          geometry: place.geometry || fallbackPlace.geometry,
          types: place.types?.length ? place.types : fallbackPlace.types,
          rating: place.rating ?? fallbackPlace.rating,
        });
      });
    }

    function registrarStatus(el, dia, ok, query) {
      const status = statusPorDia[dia];
      if (!status) return;
      if (ok) {
        status.resolvidos += 1;
        return;
      }
      const nome = (el.querySelector(".ai-place-name")?.textContent || query || "Local").trim();
      if (nome && !status.pendentes.includes(nome)) status.pendentes.push(nome);
    }

    function onAllDone() {
      const totalPorDia = {};
      const totaisAtuais = window._aiTotalLocaisPorDia || {};
      const diasComTotal = new Set([
        ...Object.keys(statusPorDia),
        ...Object.keys(totaisAtuais),
      ]);
      diasComTotal.forEach(dia => {
        const status = statusPorDia[dia] || {};
        totalPorDia[dia] = Math.max(
          Number(status.total) || 0,
          Number(totaisAtuais[dia]) || 0,
          contarLocaisRenderizadosDia(dia)
        );
      });
      window._aiTotalLocaisPorDia = totalPorDia;
      window._aiMapaStatusPorDia = statusPorDia;

      if ((aiPlaces.length > 0 || Object.keys(statusPorDia).length > 0) && typeof window.renderMapaAiSugestoes === "function") {
        window.renderMapaAiSugestoes(aiPlaces);
      }
    }

    // Map common PT activity keywords to a Google Places type for nearbySearch
    const _inferType = window.inferPlaceType;

    function applyPlace(place, el, replace, dia, query) {
      if (!place) return false;
      if (replace && place.name) {
        const nameEl = el.querySelector(".ai-place-name");
        if (nameEl) nameEl.textContent = place.name;
      }
      const addr = place.formatted_address || place.vicinity || el.dataset.addr || "";
      if (addr) {
        const addrEl = el.querySelector(".ai-place-addr");
        if (addrEl) { addrEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${escapeHtml(addr)}`; addrEl.style.display = ""; }
        el.dataset.addr = addr;
      }
      aplicarRatingPlace(el, place.rating, ".ai-place-rating");
      const openNow = place.opening_hours?.open_now ?? place.opening_hours?.isOpen?.() ?? null;
      if (openNow !== null && openNow !== undefined) {
        const mainEl = el.querySelector(".day-main");
        if (mainEl && !mainEl.querySelector("[data-abertura]")) {
          mainEl.insertAdjacentHTML("beforeend",
            `<div data-abertura="1" style="font-size:.78rem;margin-top:4px;color:${openNow ? "#16a34a" : "#dc2626"};"><i class="bi bi-clock me-1"></i>${openNow ? "Aberto agora" : "Fechado agora"}</div>`);
        }
      }
      // Badge de categoria
      aplicarCategoriaPlace(el, place.types, place.name || el.querySelector(".ai-place-name")?.textContent || query);

      const mapsLink = el.querySelector(".ai-maps-link");
      if (mapsLink) {
        mapsLink.href = mapsUrlDetalhes(place.place_id, place.formatted_address || place.name || query);
      }
      if (!place.geometry?.location) return false;

      const nomeFinal = replace && place.name
        ? place.name
        : (el.querySelector(".ai-place-name")?.textContent || query);
      aiPlaces.push({
        dia,
        nome: nomeFinal,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        endereco: addr,
        ordem: parseInt(el.dataset.mapaOrdem) || 0,
      });
      return true;
    }

    function runSearches(destLat, destLng) {
      const destLocation = destLat != null && destLng != null ? new google.maps.LatLng(destLat, destLng) : null;
      const fila = [...items];
      let ativos = 0;
      const limiteParalelo = 4;

      function processarItem(el, finished) {
        const query    = el.getAttribute("data-maps-query");
        const replace  = el.hasAttribute("data-maps-replace");
        const dia      = parseInt(el.getAttribute("data-dia")) || 0;
        const endereco = (el.dataset.addr || "").trim();
        const nameText = (el.querySelector(".ai-place-name")?.textContent || query || "").trim();
        const permitirRepetido = !replace;
        const latSalvaItem = parseFloat(el.dataset.lat || "");
        const lngSalvaItem = parseFloat(el.dataset.lng || "");

        if (Number.isFinite(latSalvaItem) && Number.isFinite(lngSalvaItem) && !(latSalvaItem === 0 && lngSalvaItem === 0)) {
          const fallbackPlace = {
            place_id: el.dataset.placeId || "",
            name: nameText || query || "Local",
            formatted_address: endereco,
            geometry: {
              location: {
                lat: () => latSalvaItem,
                lng: () => lngSalvaItem,
              },
            },
            types: normalizarTiposPlace(null, nameText || query),
            rating: parseFloat(el.dataset.rating || "") || null,
          };
          if (fallbackPlace.place_id) {
            _getDetails(fallbackPlace.place_id, fallbackPlace, finalizar);
          } else {
            finalizar(fallbackPlace);
          }
          return;
        }

        if (!query) {
          registrarStatus(el, dia, false, query);
          finished();
          return;
        }

        function validarDestino(rawPlace) {
          if (!rawPlace) return null;
          if (destLat != null && destLng != null && rawPlace.geometry?.location) {
            const dist = _distKm(destLat, destLng, rawPlace.geometry.location.lat(), rawPlace.geometry.location.lng());
            if (dist > 200) return null;
          }
          return rawPlace;
        }

        function finalizar(rawPlace) {
          const place = validarDestino(rawPlace);
          if (place?.place_id) usedPlaceIds.add(place.place_id);
          const ok = applyPlace(place, el, replace, dia, query);
          registrarStatus(el, dia, ok, query);
          finished();
        }

        function fallbackSearch(callback) {
          const queries = _uniqueQueries([
            endereco && nameText ? `${nameText}, ${endereco}` : "",
            endereco,
            [nameText || query, cidade, pais].filter(Boolean).join(", "),
            [query, cidade, pais].filter(Boolean).join(", "),
            [endereco, cidade, pais].filter(Boolean).join(", "),
          ]);

          function tentarTexto(idx) {
            if (idx >= queries.length) {
              const enderecoCompleto = [endereco, cidade, pais].filter(Boolean).join(", ");
              _geocode(enderecoCompleto || queries[0], nameText, callback);
              return;
            }
            const params = { query: queries[idx] };
            if (destLocation) {
              params.location = destLocation;
              params.radius = 100000;
            }
            _textSearch(params, 0, permitirRepetido, place => {
              const validado = validarDestino(place);
              if (validado) callback(validado);
              else tentarTexto(idx + 1);
            });
          }

          tentarTexto(0);
        }

        function doneComFallback(rawPlace) {
          const validado = validarDestino(rawPlace);
          if (validado) {
            finalizar(validado);
            return;
          }
          fallbackSearch(finalizar);
        }

        if (destLocation && replace) {
          const type = _inferType(nameText);
          // Usa a cidade como keyword somente no item de chegada; os demais usam tipo para variar os lugares.
          const isChegada = /check.in|chegada/i.test(nameText);
          const searchParams = { location: destLocation, radius: 100000, type };
          if (isChegada && cidade) searchParams.keyword = cidade;
          _nearbySearch(searchParams, 10, permitirRepetido, doneComFallback);

        } else if (destLocation) {
          const geoQuery = [query, cidade, pais].filter(Boolean).join(", ");
          _textSearch({ query: geoQuery, location: destLocation, radius: 100000 }, 0, permitirRepetido, doneComFallback);

        } else {
          const geoQuery = [query, cidade, pais].filter(Boolean).join(", ");
          _textSearch({ query: geoQuery }, 0, permitirRepetido, doneComFallback);
        }
      }

      function pump() {
        while (ativos < limiteParalelo && fila.length > 0) {
          const el = fila.shift();
          ativos += 1;
          processarItem(el, () => {
            ativos -= 1;
            pending -= 1;
            if (pending === 0) onAllDone();
            else setTimeout(pump, 80);
          });
        }
      }

      pump();
    }

    // Se o roteiro já tem coordenadas salvas, usa diretamente — sem geocoding
    if (latSalva != null && lngSalva != null) {
      runSearches(latSalva, lngSalva);
    } else if (cidade || pais) {
      // Geocoding com fallback progressivo: "Tóquio, Japão" → "Tóquio" → "Japão"
      const geoQueries = [[cidade, pais], [cidade], [pais]]
        .map(parts => parts.filter(Boolean).join(", "))
        .filter(Boolean);
      let geoIdx = 0;
      function tryGeocode() {
        if (geoIdx >= geoQueries.length) { runSearches(null, null); return; }
        new google.maps.Geocoder().geocode({ address: geoQueries[geoIdx++] }, (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            runSearches(loc.lat(), loc.lng());
          } else {
            tryGeocode();
          }
        });
      }
      tryGeocode();
    } else {
      runSearches(null, null);
    }
  }

  function renderSugestoesItinerario(roteiro) {
    let dias = null;
    if (Array.isArray(roteiro.sugestoes) && roteiro.sugestoes.length > 0) {
      const first       = roteiro.sugestoes[0];
      const temPeriodos = first?.periodos && typeof first.periodos === "object";
      const firstLocal  = first?.locais?.[0];
      const temLocais   = firstLocal && typeof firstLocal === "object" && firstLocal.custo;
      if (temPeriodos || temLocais) dias = roteiro.sugestoes;
    }
    if (!Array.isArray(dias) || dias.length === 0) dias = gerarSugestoesFrontend(roteiro);
    if (!dias || dias.length === 0) return false;

    const secao = document.getElementById("secaoSemLocais");
    if (!secao) return false;

    secao.style.display = "";
    secao.innerHTML = `
      <div class="section-title">Roteiro Dia a Dia</div>
      <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
        <i class="bi bi-robot" style="color:#6366f1;font-size:1.1rem;flex-shrink:0;"></i>
        <span style="font-size:.85rem;color:#4338ca;font-weight:600;">Sugest&otilde;es de atividades &mdash; enriquecidas com dados do Google Maps.</span>
      </div>
      <div id="aiDiasContainer"></div>`;

    document.getElementById("aiDiasContainer").innerHTML = dias.map((d, diaIdx) => {
      const locaisList = locaisDoDia(d);
      const totalDia = contarLocaisContaveisDetalhe(locaisList);
      const collapseId = `ai-dia-collapse-${d.dia}`;
      const aberto     = diaIdx === 0 ? "show" : "";
      const expandido  = diaIdx === 0 ? "true" : "false";

      let gIdx = 0;

      function mkItemHtml(local, dia, bubbleCor) {
        // Special fixed marker for check-in / checkout
        if (local._checkin || local._checkout) {
          const isCI   = !!local._checkin;
          const icon   = isCI ? "bi-key-fill" : "bi-box-arrow-right";
          const bg     = isCI ? "#f0fdf4" : "#fff7ed";
          const clr    = isCI ? "#16a34a" : "#ea580c";
          const border = isCI ? "#bbf7d0" : "#fed7aa";
          const label  = isCI ? "Check-in" : "Checkout";
          gIdx++;
          return `<div class="day-item" data-dia="${dia}" style="border-left:3px solid ${clr};background:${bg};border-radius:10px;margin-bottom:6px;">
            <div class="day-bubble" style="background:${clr}22;color:${clr};"><i class="bi ${icon}"></i></div>
            <div class="day-main">
              <div class="topline">
                <div class="name" style="color:${clr};font-weight:800;">${escapeHtml(label)}</div>
              </div>
            </div>
          </div>`;
        }

        const query    = local._busca || (local.nome + (roteiro.cidade ? ", " + roteiro.cidade : ""));
        const mapsQ    = encodeURIComponent(query);
        const dataRep  = local._replace ? "data-maps-replace" : "";
        const curIdx   = gIdx++;
        const bStyle   = bubbleCor
          ? `background:${bubbleCor}22;color:${bubbleCor};`
          : `background:#e0e7ff;color:#4338ca;`;
        const _endAI = local.endereco ? escapeHtml(local.endereco) : "";
        const latAI = parseFloat(local.latitude);
        const lngAI = parseFloat(local.longitude);
        const temCoordAI = Number.isFinite(latAI) && Number.isFinite(lngAI) && !(latAI === 0 && lngAI === 0);
        const placeIdAI = local.placeId ? escapeHtml(local.placeId) : "";
        const ratingAI = Number(local.rating || 0);
        const ratingHtmlAI = Number.isFinite(ratingAI) && ratingAI > 0
          ? `<i class="bi bi-star-fill" style="color:#facc15;font-size:.75rem;"></i> ${ratingAI.toFixed(1)}`
          : "";
        const categoriaHtmlAI = categoriaLocalHtml(local, local.nome);
        const observacoesAI = String(local.observacoes || "").trim();
        return `<div class="day-item" id="ai-place-${diaIdx}-${curIdx}"
             data-maps-query="${escapeHtml(query)}" ${dataRep} data-dia="${dia}"${_endAI ? ` data-addr="${_endAI}"` : ""}${temCoordAI ? ` data-lat="${latAI}" data-lng="${lngAI}"` : ""}${placeIdAI ? ` data-place-id="${placeIdAI}"` : ""}${ratingHtmlAI ? ` data-rating="${ratingAI}"` : ""}>
          <div class="day-bubble" style="${bStyle}">${curIdx + 1}</div>
          <div class="day-main">
            <div class="topline" style="flex-wrap:wrap;gap:6px;">
              <div class="name ai-place-name">${escapeHtml(local.nome)}</div>
            </div>
            <div class="ai-place-addr" style="${_endAI ? "" : "display:none;"}font-size:.78rem;color:#64748b;margin-top:3px;">${_endAI ? `<i class="bi bi-geo-alt me-1"></i>${_endAI}` : ""}</div>
            ${observacoesAI ? `<div class="costline mt-1"><i class="bi bi-pencil-fill" style="color:#94a3b8;"></i><span style="font-size:.82rem;color:#64748b;">${escapeHtml(observacoesAI)}</span></div>` : ""}
            <div class="place-detail-meta">
              <span data-place-category-slot>${categoriaHtmlAI}</span>
              <span class="ai-place-rating" style="display:${ratingHtmlAI ? "inline-flex" : "none"};align-items:center;gap:3px;font-size:.75rem;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:999px;">${ratingHtmlAI}</span>
              <a class="ai-maps-link" href="https://www.google.com/maps/search/?api=1&query=${mapsQ}"
                 target="_blank" rel="noopener"
                 style="display:inline-flex;align-items:center;gap:5px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;">
                <i class="bi bi-map"></i> Ver no Maps
              </a>
            </div>
          </div>
        </div>`;
      }

      let itemsHtml = "";
      if (d.periodos) {
        // Localiza checkin/checkout e suas posições exatas dentro do período
        let checkinLocal = null, checkoutLocal = null;
        let checkinPeriodIdx = 0,                        checkoutPeriodIdx = PERIODOS_CONFIG.length - 1;
        let checkinPosInPeriod = -1,                     checkoutPosInPeriod = Number.MAX_SAFE_INTEGER;
        let checkinCor = "#16a34a",                      checkoutCor = "#ea580c";

        PERIODOS_CONFIG.forEach((pc, pidx) => {
          (Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : []).forEach((l, lidx) => {
            const n = normalizarLocal(l);
            if (n._checkin)  { checkinLocal  = l; checkinPeriodIdx  = pidx; checkinPosInPeriod  = lidx; checkinCor  = pc.cor; }
            if (n._checkout) { checkoutLocal = l; checkoutPeriodIdx = pidx; checkoutPosInPeriod = lidx; checkoutCor = pc.cor; }
          });
        });

        // Janela de períodos visíveis: apenas entre o período do checkin e o do checkout
        const startPeriod = checkinLocal  ? checkinPeriodIdx  : 0;
        const endPeriod   = checkoutLocal ? checkoutPeriodIdx : PERIODOS_CONFIG.length - 1;

        // Checkin sempre primeiro
        if (checkinLocal) {
          itemsHtml += `<div style="margin-bottom:6px;">${mkItemHtml(normalizarLocal(checkinLocal), d.dia, checkinCor)}</div>`;
        }

        // Renderiza apenas os períodos dentro da janela, filtrando itens antes do checkin
        // e depois do checkout dentro do mesmo período
        PERIODOS_CONFIG.forEach((pc, pidx) => {
          if (pidx < startPeriod || pidx > endPeriod) return;

          const pLocais = Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : [];
          const pFiltered = pLocais.filter((l, lidx) => {
            const n = normalizarLocal(l);
            if (n._checkin || n._checkout) return false;
            if (pidx === startPeriod && lidx <= checkinPosInPeriod)  return false;
            if (pidx === endPeriod   && lidx >= checkoutPosInPeriod) return false;
            return true;
          });

          if (!pFiltered.length) return;
          gIdx = 0;
          const perColId = `per-det-${diaIdx}-${pc.key}`;
          itemsHtml += `<div style="margin-bottom:8px;" data-period-key="${pc.key}" data-period-cor="${pc.cor}" data-period-icon="${pc.icon}" data-period-label="${pc.label}">
            <button class="w-100 d-flex align-items-center justify-content-between border-0 px-2 py-1"
                    style="background:${pc.cor}18;border-radius:8px;cursor:pointer;"
                    data-bs-toggle="collapse" data-bs-target="#${perColId}" aria-expanded="true">
              <div style="display:flex;align-items:center;gap:6px;">
                <i class="bi ${pc.icon}" style="color:${pc.cor};font-size:.82rem;"></i>
                <span style="font-size:.78rem;font-weight:700;color:${pc.cor};">${pc.label}</span>
                <span class="per-count-badge" style="font-size:.68rem;font-weight:700;color:${pc.cor};opacity:.7;">${pFiltered.length} ${pFiltered.length === 1 ? "local" : "locais"}</span>
              </div>
              <i class="bi bi-chevron-down" style="color:${pc.cor};font-size:.72rem;transition:transform .2s;opacity:.7;"></i>
            </button>
            <div id="${perColId}" class="collapse show" style="padding:4px 0 0 0;">
              ${pFiltered.map(l => mkItemHtml(normalizarLocal(l), d.dia, pc.cor)).join("")}
            </div>
          </div>`;
        });

        // Checkout sempre último
        if (checkoutLocal) {
          itemsHtml += `<div style="margin-top:6px;">${mkItemHtml(normalizarLocal(checkoutLocal), d.dia, checkoutCor)}</div>`;
        }
      } else {
        // Locais flat (sem períodos): mesma lógica por índice
        const todosLocais = Array.isArray(d.locais) ? d.locais : [];
        let checkinFlat = null, checkoutFlat = null;
        let checkinIdxFlat = -1, checkoutIdxFlat = Number.MAX_SAFE_INTEGER;
        todosLocais.forEach((l, i) => {
          const n = normalizarLocal(l);
          if (n._checkin)  { checkinFlat = l;  checkinIdxFlat  = i; }
          if (n._checkout) { checkoutFlat = l; checkoutIdxFlat = i; }
        });
        const regularesFlat = todosLocais.filter((l, i) => {
          const n = normalizarLocal(l);
          if (n._checkin || n._checkout) return false;
          if (i <= checkinIdxFlat)  return false;
          if (i >= checkoutIdxFlat) return false;
          return true;
        });
        if (checkinFlat)  itemsHtml += mkItemHtml(normalizarLocal(checkinFlat),  d.dia, null);
        regularesFlat.forEach(l => { itemsHtml += mkItemHtml(normalizarLocal(l), d.dia, null); });
        if (checkoutFlat) itemsHtml += mkItemHtml(normalizarLocal(checkoutFlat), d.dia, null);
      }

      return `<section style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <button class="w-100 d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 bg-transparent"
                style="cursor:pointer;"
                data-bs-toggle="collapse"
                data-bs-target="#${collapseId}"
                aria-expanded="${expandido}">
          <div class="dia-header-label mb-0">Dia ${d.dia}</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:.78rem;font-weight:700;color:#6366f1;">${totalDia} ${totalDia === 1 ? "local" : "locais"}</span>
            <i class="bi bi-chevron-down" style="color:#94a3b8;transition:transform .2s;"></i>
          </div>
        </button>
        <div id="${collapseId}" class="collapse ${aberto}">
          <div style="padding:0 16px 16px;">
            ${itemsHtml}
          </div>
        </div>
      </section>`;
    }).join("");

    window._aiTotalLocaisPorDia = dias.reduce((acc, d) => {
      acc[d.dia] = contarLocaisContaveisDetalhe(locaisDoDia(d));
      return acc;
    }, {});

    enrichWithMaps(roteiro.cidade, roteiro.pais, roteiro.latDestino ?? null, roteiro.lngDestino ?? null);
    return true;
  }

  function _localCardHtml(l, cor) {
    const bStyle = cor ? `background:${cor}22;color:${cor};` : `background:#fff7ed;color:#f97316;`;
    const ratingReal = Number(l.rating || l.notaGoogle || l.googleRating || 0);
    const ratingHtmlReal = Number.isFinite(ratingReal) && ratingReal > 0
      ? `<i class="bi bi-star-fill" style="color:#facc15;font-size:.75rem;"></i> ${ratingReal.toFixed(1)}`
      : "";
    const categoriaHtmlReal = categoriaLocalHtml(l, l.nome || "Local");
    const latReal = parseFloat(l.latitude);
    const lngReal = parseFloat(l.longitude);
    const temCoordReal = Number.isFinite(latReal) && Number.isFinite(lngReal) && !(latReal === 0 && lngReal === 0);
    const mapsUrl = l.placeId
      ? mapsUrlDetalhes(l.placeId, l.endereco || l.nome)
      : (temCoordReal
        ? `https://www.google.com/maps/search/?api=1&query=${latReal},${lngReal}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.endereco || l.nome || "Local")}`);
    return `<div class="day-item" data-real-local${l.placeId ? ` data-real-place-id="${escapeHtml(l.placeId)}"` : ""}${l.endereco ? ` data-addr="${escapeHtml(l.endereco)}"` : ""}>
      <div class="day-bubble" data-real-bubble style="${bStyle}">?</div>
      <div class="day-main" id="detalhe-local-${l.idRoteiroLocal}">
        <div class="topline" style="gap:10px;flex-wrap:wrap;">
          <div class="name">${escapeHtml(l.nome || "Local")}</div>
        </div>
        ${l.observacoes ? `<div class="text-secondary mt-1" style="font-size:.9rem;">${escapeHtml(l.observacoes)}</div>` : ""}
        ${l.endereco ? `<div class="costline mt-1"><i class="bi bi-geo-alt-fill" style="color:#f97316;"></i><span style="font-size:.82rem;color:#64748b;">${escapeHtml(l.endereco)}</span></div>` : ""}
        <div class="place-detail-meta">
          <span data-place-category-slot>${categoriaHtmlReal}</span>
          <span class="real-place-rating" style="display:${ratingHtmlReal ? "inline-flex" : "none"};align-items:center;gap:3px;font-size:.75rem;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:999px;">${ratingHtmlReal}</span>
          <a href="${mapsUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;"><i class="bi bi-map"></i> Ver no Maps</a>
        </div>
        ${badgeAberturaHtml(l.placeId)}
      </div>
    </div>`;
  }

  function enrichRealLocais() {
    if (!window.google?.maps?.places) { setTimeout(enrichRealLocais, 600); return; }
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    document.querySelectorAll("[data-real-local]").forEach(el => {
      const placeId = el.getAttribute("data-real-place-id");
      if (!placeId) return;
      service.getDetails({ placeId, fields: ["rating", "types", "name"] }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
        aplicarRatingPlace(el, place.rating, ".real-place-rating");
        aplicarCategoriaPlace(el, place.types, place.name || el.querySelector(".name")?.textContent);
      });
    });
  }

  function _renumerarDia(collapseInner) {
    if (!collapseInner) return;
    collapseInner.querySelectorAll("[data-period-key]").forEach(perDiv => {
      perDiv.querySelectorAll(".day-item").forEach((item, i) => {
        const bubble = item.querySelector(".day-bubble");
        if (bubble) bubble.textContent = i + 1;
      });
    });
  }

  function renderLocais(locais, roteiro) {
    if (!locais || locais.length === 0) {
      if (!renderSugestoesItinerario(roteiro || {})) {
        document.getElementById("secaoSemLocais").style.display = "";
      }
      return;
    }

    // If AI suggestions exist: inject real locais into the correct period within each day accordion
    if (renderSugestoesItinerario(roteiro || {})) {
      const container = document.getElementById("aiDiasContainer");
      if (container) {
        function _horarioToPeriodo(horario) {
          if (!horario) return null;
          var hStr = Array.isArray(horario)
            ? String(horario[0] || 0).padStart(2, "0") + ":" + String(horario[1] || 0).padStart(2, "0")
            : String(horario).slice(0, 5);
          if (hStr < "12:00") return "manha";
          if (hStr < "18:00") return "tarde";
          return "noite";
        }

        const grupos = agruparLocaisPorDia(locais);
        grupos.forEach(({ dia, itens }) => {
          let daySection = null;
          container.querySelectorAll("section").forEach(sec => {
            const hdr = sec.querySelector(".dia-header-label");
            if (hdr && hdr.textContent.trim() === `Dia ${dia}`) daySection = sec;
          });

          const collapseInner = daySection ? daySection.querySelector(".collapse > div") : null;

          itens.forEach(local => {
            const per = _horarioToPeriodo(local.horario);
            let perContainer = collapseInner && per ? collapseInner.querySelector(`[data-period-key="${per}"]`) : null;

            if (!perContainer && collapseInner) {
              const cfg = PERIODOS_CONFIG.find(p => p.key === per) || { key: per || "sem", label: per === "manha" ? "Manhã" : per === "tarde" ? "Tarde" : per === "noite" ? "Noite" : "Outros", icon: "bi-pin-map-fill", cor: "#64748b" };
              const newPerColId = `per-det-new-${per}-${Date.now()}`;
              collapseInner.insertAdjacentHTML("beforeend",
                `<div style="margin-bottom:8px;" data-period-key="${cfg.key}" data-period-cor="${cfg.cor}" data-period-icon="${cfg.icon}" data-period-label="${cfg.label}">
                  <button class="w-100 d-flex align-items-center justify-content-between border-0 px-2 py-1"
                          style="background:${cfg.cor}18;border-radius:8px;cursor:pointer;"
                          data-bs-toggle="collapse" data-bs-target="#${newPerColId}" aria-expanded="true">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <i class="bi ${cfg.icon}" style="color:${cfg.cor};font-size:.82rem;"></i>
                      <span style="font-size:.78rem;font-weight:700;color:${cfg.cor};">${cfg.label}</span>
                      <span class="per-count-badge" style="font-size:.68rem;font-weight:700;color:${cfg.cor};opacity:.7;">0 locais</span>
                    </div>
                    <i class="bi bi-chevron-down" style="color:${cfg.cor};font-size:.72rem;transition:transform .2s;opacity:.7;"></i>
                  </button>
                  <div id="${newPerColId}" class="collapse show" style="padding:4px 0 0 0;"></div>
                </div>`);
              perContainer = collapseInner.querySelector(`[data-period-key="${cfg.key}"]`);
            }

            if (perContainer) {
              const perCor = perContainer.getAttribute("data-period-cor") || null;
              const perBody = perContainer.querySelector(".collapse") || perContainer;
              perBody.insertAdjacentHTML("beforeend", _localCardHtml(local, perCor));
            } else if (collapseInner) {
              collapseInner.insertAdjacentHTML("beforeend", _localCardHtml(local, null));
            } else {
              // Day section doesn't exist — create it
              const collapseId = `dia-collapse-extra-${dia ?? "sem"}`;
              const totalExtra = ehCheckinCheckoutDetalhe(local) ? 0 : 1;
              container.insertAdjacentHTML("beforeend", `
                <section style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                  <button class="w-100 d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 bg-transparent"
                          style="cursor:pointer;" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                    <div class="dia-header-label mb-0">${dia ? `Dia ${dia}` : "Sem dia definido"}</div>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="font-size:.78rem;font-weight:700;color:#6366f1;">${totalExtra} ${totalExtra === 1 ? "local" : "locais"}</span>
                      <i class="bi bi-chevron-down" style="color:#94a3b8;transition:transform .2s;"></i>
                    </div>
                  </button>
                  <div id="${collapseId}" class="collapse">
                    <div style="padding:0 16px 16px;">${_localCardHtml(local)}</div>
                  </div>
                </section>`);
            }
          });

          // Renumber items and update counts (day header + period badges)
          if (daySection && collapseInner) {
            _renumerarDia(collapseInner);
            const total = contarLocaisRenderizadosDia(dia);
            const countSpan = daySection.querySelector("span[style*='#6366f1']");
            if (countSpan) countSpan.textContent = `${total} ${total === 1 ? "local" : "locais"}`;
            window._aiTotalLocaisPorDia = window._aiTotalLocaisPorDia || {};
            window._aiTotalLocaisPorDia[dia] = total;
            collapseInner.querySelectorAll("[data-period-key]").forEach(perDiv => {
              const n = [...perDiv.querySelectorAll(".day-item")]
                .filter(item => !ehElementoCheckinCheckoutDetalhe(item)).length;
              const badge = perDiv.querySelector(".per-count-badge");
              if (badge) badge.textContent = `${n} ${n === 1 ? "local" : "locais"}`;
            });
          }
        });
        enrichRealLocais();
      }
      return;
    }

    // No AI suggestions — render real locais only
    document.getElementById("secaoLocais").style.display = "";
    const lista = document.getElementById("listaLocais");
    const grupos = agruparLocaisPorDia(locais);
    lista.innerHTML = grupos.map(({ dia, itens }, grupoIdx) => {
      const collapseId = `dia-collapse-${dia ?? "sem"}`;
      const aberto = grupoIdx === 0 ? "show" : "";
      const total = contarLocaisContaveisDetalhe(itens);
      return `
      <section style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <button class="w-100 d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 bg-transparent"
                style="cursor:pointer;" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${grupoIdx === 0}">
          <div class="dia-header-label mb-0">${dia ? `Dia ${dia}` : "Sem dia definido"}</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:.78rem;font-weight:700;color:#64748b;">${total} ${total === 1 ? "local" : "locais"}</span>
            <i class="bi bi-chevron-down" style="color:#94a3b8;transition:transform .2s;"></i>
          </div>
        </button>
        <div id="${collapseId}" class="collapse ${aberto}">
          <div style="padding:0 16px 16px;">${itens.map(_localCardHtml).join("")}</div>
        </div>
      </section>`;
    }).join("");
    enrichRealLocais();
  }

  const ROTEIROS_SALVOS_CACHE = "flyguide.roteirosSalvos";
  const LIMITE_FREE = 20;

  function obterRoteirosSalvosCache() {
    try {
      const data = JSON.parse(localStorage.getItem(ROTEIROS_SALVOS_CACHE) || "[]");
      return new Set(Array.isArray(data) ? data.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function definirRoteiroSalvoCache(id, salvo) {
    if (!id) return;
    const salvos = obterRoteirosSalvosCache();
    if (salvo) salvos.add(String(id));
    else salvos.delete(String(id));
    localStorage.setItem(ROTEIROS_SALVOS_CACHE, JSON.stringify([...salvos]));
  }

  function roteiroSalvoCache(id) {
    return obterRoteirosSalvosCache().has(String(id));
  }

  function aplicarEstadoBotaoSalvarDetalhe(btn, salvo) {
    if (!btn) return;
    const icon = btn.querySelector("i");
    const label = btn.querySelector("span");
    btn.classList.toggle("saved", !!salvo);
    btn.setAttribute("aria-pressed", salvo ? "true" : "false");
    btn.setAttribute("title", salvo ? "Roteiro salvo" : "Salvar roteiro");
    btn.setAttribute("aria-label", salvo ? "Roteiro salvo" : "Salvar roteiro");
    if (icon) icon.className = salvo ? "bi bi-bookmark-fill" : "bi bi-bookmark-plus";
    if (label) label.textContent = salvo ? "Roteiro salvo" : "Salvar roteiro";
  }

  function mostrarToastRoteiroSalvo() {
    const toast = document.createElement("div");
    toast.style.cssText = [
      "position:fixed", "bottom:24px", "left:50%", "transform:translateX(-50%)",
      "background:#1e293b", "color:#f1f5f9", "padding:14px 20px", "border-radius:12px",
      "box-shadow:0 8px 24px rgba(0,0,0,.3)", "font-size:.9rem", "font-weight:600",
      "display:flex", "align-items:center", "gap:10px", "z-index:9999",
      "border:1px solid #334155"
    ].join(";");
    toast.innerHTML = '<i class="bi bi-bookmark-fill" style="color:#f97316;font-size:1.1rem;"></i>'
      + ' Roteiro salvo! Acesse em <a href="meus-roteiros.html" style="color:#f97316;margin-left:4px;font-weight:700;">Meus Roteiros</a>';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity .3s";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  async function verificarLimiteFreeDetalhe() {
    if (!userId) return true;
    try {
      const [resR, resU] = await Promise.all([
        authFetch(`${URL_API_BASE}/roteiros/usuario/${userId}`),
        authFetch(`${URL_API_BASE}/users/search-completo/${userId}`)
      ]);
      const lista = resR.ok ? await resR.json() : [];
      const usr = resU.ok ? await resU.json() : null;
      if ((usr?.usuario?.tipoConta || "FREE") === "PREMIUM") return true;
      return !Array.isArray(lista) || lista.length < LIMITE_FREE;
    } catch (_) {
      return true;
    }
  }

  function mostrarModalLimiteDetalhe() {
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
    modal.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:32px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
      + '<div style="width:52px;height:52px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">'
      + '<i class="bi bi-map" style="font-size:1.5rem;color:#f97316;"></i></div>'
      + '<h5 style="color:#f1f5f9;margin-bottom:8px;font-weight:800;">Limite atingido</h5>'
      + '<p style="color:#94a3b8;font-size:.9rem;margin-bottom:20px;">Você já possui <strong style="color:#f97316;">20 roteiros</strong> no plano gratuito.<br>Assine o Premium para criar e salvar roteiros ilimitados.</p>'
      + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'
      + '<button id="_limDetFechar" style="background:none;border:1px solid #334155;border-radius:10px;padding:9px 20px;color:#94a3b8;cursor:pointer;font-size:.9rem;">Fechar</button>'
      + '<a href="planos-premium.html" style="background:#f97316;border:none;border-radius:10px;padding:9px 20px;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;text-decoration:none;"><i class="bi bi-star-fill me-1"></i>Ver Planos</a>'
      + '</div></div>';
    document.body.appendChild(modal);
    modal.querySelector("#_limDetFechar").onclick = () => modal.remove();
    modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
  }

  function confirmarSalvarNovamenteDetalhe() {
    return new Promise(resolve => {
      const modal = document.createElement("div");
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
      modal.innerHTML = '<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
        + '<i class="bi bi-bookmark-fill" style="font-size:2rem;color:#f97316;"></i>'
        + '<h5 style="color:#f1f5f9;margin:12px 0 8px;">Salvar novamente?</h5>'
        + '<p style="color:#94a3b8;font-size:.88rem;margin-bottom:20px;">Você já salvou este roteiro. Deseja criar outra cópia em Meus Roteiros?</p>'
        + '<div style="display:flex;gap:10px;justify-content:center;">'
        + '<button id="_salvarDetNao" style="background:none;border:1px solid #334155;border-radius:10px;padding:8px 20px;color:#94a3b8;cursor:pointer;font-size:.9rem;">Não</button>'
        + '<button id="_salvarDetSim" style="background:#f97316;border:none;border-radius:10px;padding:8px 20px;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;">Salvar cópia</button>'
        + '</div></div>';
      document.body.appendChild(modal);
      function fechar(valor) { modal.remove(); resolve(valor); }
      modal.querySelector("#_salvarDetNao").onclick = () => fechar(false);
      modal.querySelector("#_salvarDetSim").onclick = () => fechar(true);
      modal.onclick = (ev) => { if (ev.target === modal) fechar(false); };
    });
  }

  async function sincronizarBotaoSalvarDetalhe(btn) {
    if (!btn || !userId) return;
    const id = btn.getAttribute("data-roteiro-id");
    if (!id) return;
    const iniciadoEm = Date.now();
    if (roteiroSalvoCache(id)) aplicarEstadoBotaoSalvarDetalhe(btn, true);
    try {
      const res = await authFetch(`${URL_API_BASE}/roteiros/${id}/clonou?idUsuario=${userId}`);
      if (res.ok) {
        const jaClonou = await res.json();
        if (!jaClonou && Number(btn.dataset.saveStateChangedAt || 0) > iniciadoEm) return;
        definirRoteiroSalvoCache(id, !!jaClonou);
        aplicarEstadoBotaoSalvarDetalhe(btn, !!jaClonou);
      }
    } catch (_) {}
  }

  async function clonarRoteiroDetalhe(id, btn) {
    const icon = btn?.querySelector("i");
    const label = btn?.querySelector("span");
    const salvoAntes = btn?.classList.contains("saved");
    if (btn) btn.disabled = true;
    if (icon) icon.className = "bi bi-hourglass-split";
    if (label) label.textContent = "Salvando...";

    try {
      const res = await authFetch(`${URL_API_BASE}/roteiros/${id}/clonar?idUsuario=${userId}`, {
        method: "POST"
      });
      if (res.ok || res.status === 201) {
        definirRoteiroSalvoCache(id, true);
        if (btn) btn.dataset.saveStateChangedAt = String(Date.now());
        aplicarEstadoBotaoSalvarDetalhe(btn, true);
        mostrarToastRoteiroSalvo();
        return true;
      }
      aplicarEstadoBotaoSalvarDetalhe(btn, salvoAntes);
      alert("Não foi possível salvar o roteiro.");
      return false;
    } catch (_) {
      aplicarEstadoBotaoSalvarDetalhe(btn, salvoAntes);
      alert("Erro ao conectar ao servidor.");
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function inicializarBotaoSalvarDetalhe(roteiro) {
    const btn = document.getElementById("btnSalvarRoteiroDetalhe");
    if (!btn || !roteiro) return;

    const ownerId = roteiro.idUsuario ?? roteiro.usuario?.idUsuario ?? roteiro.usuarioId;
    const isOwner = userId && ownerId != null && String(ownerId) === String(userId);
    if (isOwner) {
      btn.style.display = "none";
      return;
    }

    btn.style.display = "inline-flex";
    btn.setAttribute("data-roteiro-id", roteiro.idRoteiro);
    aplicarEstadoBotaoSalvarDetalhe(btn, roteiroSalvoCache(roteiro.idRoteiro));
    sincronizarBotaoSalvarDetalhe(btn);

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userId) { window.location.href = "login.html"; return; }
      const permitido = await verificarLimiteFreeDetalhe();
      if (!permitido) { mostrarModalLimiteDetalhe(); return; }
      if (btn.classList.contains("saved")) {
        const salvarCopia = await confirmarSalvarNovamenteDetalhe();
        if (!salvarCopia) return;
      }
      await clonarRoteiroDetalhe(roteiro.idRoteiro, btn);
    };
  }

  window.addEventListener("pageshow", () => {
    const btn = document.getElementById("btnSalvarRoteiroDetalhe");
    if (btn?.getAttribute("data-roteiro-id") && btn.style.display !== "none") {
      sincronizarBotaoSalvarDetalhe(btn);
    }
  });

  authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/completo`)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      const r      = data.roteiro;
      const locais = data.locais || [];

      loading.style.display  = "none";
      conteudo.style.display = "";

      // Hero com imagem
      const imgUrl = typeof obterImagemUrlRoteiro === "function" ? obterImagemUrlRoteiro(r) : (r.imagemUrl || IMG_FALLBACK);
      const hero   = document.getElementById("detalhesHero");
      if (hero) {
        hero.style.backgroundImage = `
          linear-gradient(90deg,rgba(15,23,42,.55),rgba(15,23,42,.35)),
          url('${imgUrl}')`;
        hero.style.backgroundSize     = "cover";
        hero.style.backgroundPosition = "center";
      }

      // Informações
      setText("detalheTitulo",  r.titulo);
      setText("detalheCidade",  r.cidade);
      setText("detalheTipo",    r.tipoRoteiro || "Viagem");
      setText("detalheVis",     r.visibilidadeRoteiro === PUBLICO ? PUBLICO : PRIVADO);
      if (r.nomeUsuario) {
        const autorWrap = document.getElementById("detalheAutorWrap");
        if (autorWrap) { autorWrap.style.display = "flex"; }
        setText("detalheAutor", r.nomeUsuario);
      }
      inicializarBotaoSalvarDetalhe(r);

      // Stats
      setText("detalheDias", r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : EMPTY_TEXT);
      const periodoEl = document.getElementById("detalhePeriodo");
      if (periodoEl) {
        if (r.dataInicio && r.dataFim) {
          periodoEl.textContent = `${formatarData(r.dataInicio)} - ${formatarData(r.dataFim)}`;
          periodoEl.style.display = "";
        } else {
          periodoEl.style.display = "none";
        }
      }
      // Descrição
      if (r.observacoes) {
        document.getElementById("secaoSobre").style.display = "";
        setText("detalheDescricao", r.observacoes);
      }

      // Locais/atividades
      renderLocais(locais, r);
      renderAvaliacoesDia(roteiroId);
      if (window.google?.maps?.places) {
        buscarHorariosDetalhes(locais);
      } else {
        window._flyguide_pendente_horarios = locais;
      }

      // Exportar PDF (visível para todos)
      document.getElementById("btnExportarPdf")?.addEventListener("click", () => {
        exportarPDF(r, locais);
      });

    })
    .catch(() => { loading.style.display = "none"; erro.style.display = ""; });

  async function _validarTexto(texto) {
    if (!texto || !texto.trim()) return true;
    try {
      var res = await authFetch(URL_API_BASE + "/validar/texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto })
      });
      if (!res.ok) return true;
      var data = await res.json();
      return data.valido !== false;
    } catch (_) { return true; }
  }

  // ── Helpers de confirmação ──
  function _confirmarExclusaoRoteiroDetalhe() {
    return new Promise(function(resolve) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
      overlay.innerHTML =
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
        + '<div style="width:52px;height:52px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="bi bi-trash3-fill" style="font-size:1.4rem;color:#dc2626;"></i>'
        + '</div>'
        + '<div style="font-size:1.05rem;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Excluir Roteiro?</div>'
        + '<div style="font-size:.88rem;color:#94a3b8;margin-bottom:24px;">Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.</div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button id="_excRotDetNao" style="flex:1;background:none;border:1px solid #334155;border-radius:10px;padding:10px 0;color:#94a3b8;cursor:pointer;font-size:.9rem;font-weight:600;">Cancelar</button>'
        + '<button id="_excRotDetSim" style="flex:1;background:#dc2626;border:none;border-radius:10px;padding:10px 0;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;"><i class="bi bi-trash3 me-1"></i>Excluir</button>'
        + '</div></div>';
      document.body.appendChild(overlay);
      function fechar(res) { overlay.remove(); resolve(res); }
      overlay.querySelector("#_excRotDetSim").onclick = function() { fechar(true); };
      overlay.querySelector("#_excRotDetNao").onclick = function() { fechar(false); };
      overlay.addEventListener("click", function(e) { if (e.target === overlay) fechar(false); });
    });
  }

  function _confirmarExclusaoDiaRating() {
    return new Promise(function(resolve) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
      overlay.innerHTML =
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
        + '<div style="width:52px;height:52px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="bi bi-trash3-fill" style="font-size:1.4rem;color:#dc2626;"></i>'
        + '</div>'
        + '<div style="font-size:1.05rem;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Excluir avaliação do dia?</div>'
        + '<div style="font-size:.88rem;color:#94a3b8;margin-bottom:24px;">Sua nota e comentário deste dia serão removidos. Esta ação não pode ser desfeita.</div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button id="_excDiaNao" style="flex:1;background:none;border:1px solid #334155;border-radius:10px;padding:10px 0;color:#94a3b8;cursor:pointer;font-size:.9rem;font-weight:600;">Cancelar</button>'
        + '<button id="_excDiaSim" style="flex:1;background:#dc2626;border:none;border-radius:10px;padding:10px 0;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;"><i class="bi bi-trash3 me-1"></i>Excluir</button>'
        + '</div></div>';
      document.body.appendChild(overlay);
      function fechar(res) { overlay.remove(); resolve(res); }
      overlay.querySelector("#_excDiaSim").onclick = function() { fechar(true); };
      overlay.querySelector("#_excDiaNao").onclick = function() { fechar(false); };
      overlay.addEventListener("click", function(e) { if (e.target === overlay) fechar(false); });
    });
  }

  function _abrirEditarDiaRating(roteiroId, dia, ratingAtual, onSalvar) {
    var LEGENDAS_EDIT = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];
    var notaEdit = ratingAtual.nota || 0;

    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
    overlay.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px 24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">'
      + '<div style="width:44px;height:44px;border-radius:12px;background:#fff7ed;border:1px solid #ffedd5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
      + '<i class="bi bi-pencil-fill" style="color:#f97316;font-size:1.1rem;"></i></div>'
      + '<div><div style="font-weight:800;color:#f1f5f9;font-size:1rem;">Editar avaliação</div>'
      + '<div style="font-size:.82rem;color:#94a3b8;">Dia ' + escapeHtml(String(dia)) + '</div></div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;justify-content:center;margin-bottom:8px;" id="_editDiaStars">'
      + [1,2,3,4,5].map(function(i) {
          return '<i class="bi ' + (i <= notaEdit ? 'bi-star-fill' : 'bi-star') + ' _edit-star-dia" data-nota="' + i + '"'
            + ' style="font-size:1.8rem;cursor:pointer;color:' + (i <= notaEdit ? '#facc15' : '#475569') + ';transition:color .1s;"></i>';
        }).join('')
      + '</div>'
      + '<div id="_editDiaLegenda" style="text-align:center;font-size:.82rem;color:#94a3b8;min-height:1.2em;margin-bottom:14px;">'
      + escapeHtml(LEGENDAS_EDIT[notaEdit] || '') + '</div>'
      + '<textarea id="_editDiaTexto" maxlength="500" placeholder="Conte como foi o dia (opcional)..."'
      + ' style="width:100%;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;padding:10px;font-size:.88rem;resize:none;min-height:80px;box-sizing:border-box;">'
      + escapeHtml(ratingAtual.texto || '') + '</textarea>'
      + '<div id="_editDiaErro" style="display:none;font-size:.82rem;color:#ef4444;margin-top:8px;padding:8px 10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;">'
      + '<i class="bi bi-exclamation-circle me-1"></i>Comentário contém linguagem inapropriada. Por favor, revise o texto.'
      + '</div>'
      + '<div style="display:flex;gap:10px;margin-top:16px;">'
      + '<button id="_editDiaCancelar" style="flex:1;background:none;border:1px solid #334155;border-radius:10px;padding:10px 0;color:#94a3b8;cursor:pointer;font-size:.9rem;font-weight:600;">Cancelar</button>'
      + '<button id="_editDiaSalvar" style="flex:1;background:#f97316;border:none;border-radius:10px;padding:10px 0;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;"><i class="bi bi-check-lg me-1"></i>Salvar</button>'
      + '</div></div>';
    document.body.appendChild(overlay);

    // Interação das estrelas
    var starsContainer = overlay.querySelector("#_editDiaStars");
    var legendaEl = overlay.querySelector("#_editDiaLegenda");
    starsContainer.querySelectorAll("._edit-star-dia").forEach(function(star) {
      star.addEventListener("mouseenter", function() {
        var n = parseInt(star.dataset.nota);
        starsContainer.querySelectorAll("._edit-star-dia").forEach(function(s, idx) {
          s.className = "bi " + (idx < n ? "bi-star-fill" : "bi-star") + " _edit-star-dia";
          s.style.color = idx < n ? "#facc15" : "#475569";
        });
        legendaEl.textContent = LEGENDAS_EDIT[n] || "";
      });
      star.addEventListener("mouseleave", function() {
        starsContainer.querySelectorAll("._edit-star-dia").forEach(function(s, idx) {
          s.className = "bi " + (idx < notaEdit ? "bi-star-fill" : "bi-star") + " _edit-star-dia";
          s.style.color = idx < notaEdit ? "#facc15" : "#475569";
        });
        legendaEl.textContent = LEGENDAS_EDIT[notaEdit] || "";
      });
      star.addEventListener("click", function() {
        notaEdit = parseInt(star.dataset.nota);
        starsContainer.querySelectorAll("._edit-star-dia").forEach(function(s, idx) {
          s.className = "bi " + (idx < notaEdit ? "bi-star-fill" : "bi-star") + " _edit-star-dia";
          s.style.color = idx < notaEdit ? "#facc15" : "#475569";
        });
        legendaEl.textContent = LEGENDAS_EDIT[notaEdit] || "";
      });
    });

    function fechar() { overlay.remove(); }

    overlay.querySelector("#_editDiaCancelar").onclick = fechar;
    overlay.addEventListener("click", function(e) { if (e.target === overlay) fechar(); });
    overlay.querySelector("#_editDiaTexto").addEventListener("input", function() {
      var erroEl = overlay.querySelector("#_editDiaErro");
      if (erroEl) erroEl.style.display = "none";
    });
    overlay.querySelector("#_editDiaSalvar").onclick = async function() {
      if (!notaEdit) return;
      var texto = (overlay.querySelector("#_editDiaTexto").value || "").trim();
      var erroEl = overlay.querySelector("#_editDiaErro");
      if (erroEl) erroEl.style.display = "none";

      if (texto) {
        var btnSalvar = overlay.querySelector("#_editDiaSalvar");
        var htmlOriginal = btnSalvar.innerHTML;
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
        var valido = await _validarTexto(texto);
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = htmlOriginal;
        if (!valido) {
          if (erroEl) {
            erroEl.textContent = "Comentário contém linguagem inapropriada. Por favor, revise o texto.";
            erroEl.style.display = "";
          }
          return;
        }
      }

      onSalvar(notaEdit, texto);
      fechar();
    };
  }

  // Exibe as avaliações por dia salvas no localStorage após o roteiro ser concluído
  async function renderAvaliacoesDia(id) {
    // Remove seção anterior para suportar re-render após edição/exclusão
    var secaoExistente = document.getElementById("secaoAvaliacoesDia");
    if (secaoExistente) secaoExistente.remove();

    var ratings = {};
    try { ratings = JSON.parse(localStorage.getItem("fg_dia_ratings_" + id) || "{}"); } catch (_) {}

    var dias = Object.keys(ratings).map(Number).filter(function(n){ return !isNaN(n); }).sort(function(a,b){return a-b;});
    if (!dias.length) return;

    // Busca nome do usuário logado no backend
    var nomeUsuario = "";
    try {
      var resUser = await authFetch(URL_API_BASE + "/users/search-completo/" + userId);
      if (resUser.ok) {
        var dadosUser = await resUser.json();
        var pf = dadosUser.pessoaFisica;
        var pj = dadosUser.pessoaJuridica;
        if (pf) nomeUsuario = ((pf.primeiroNome || "") + " " + (pf.ultimoNome || "")).trim();
        else if (pj) nomeUsuario = pj.nomeFantasia || pj.razaoSocial || "";
        if (!nomeUsuario) nomeUsuario = dadosUser.usuario?.email || "";
      }
    } catch (_) {}

    var LEGENDAS = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

    var html = '<div id="secaoAvaliacoesDia" style="margin-top:28px;">'
      + '<div class="section-title" style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">'
      + '<i class="bi bi-star-fill" style="color:#facc15;font-size:1rem;"></i>Avaliações por Dia'
      + '</div>'
      + dias.map(function(dia) {
          var r = ratings[dia];
          if (!r || !r.nota) return "";
          var starsHtml = [1,2,3,4,5].map(function(i) {
            return '<i class="bi ' + (i <= r.nota ? 'bi-star-fill' : 'bi-star') + '" style="color:'
              + (i <= r.nota ? '#facc15' : '#cbd5e1') + ';font-size:.88rem;"></i>';
          }).join('');
          return '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fafbfc;">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:' + (r.texto || nomeUsuario ? '8px' : '0') + ';">'
            + '<span style="font-weight:700;font-size:.9rem;color:#1e293b;">Dia ' + escapeHtml(String(dia)) + '</span>'
            + '<div style="display:flex;gap:3px;">' + starsHtml + '</div>'
            + '<span style="font-size:.78rem;color:#64748b;font-weight:600;">' + escapeHtml(LEGENDAS[r.nota] || '') + '</span>'
            + '<div style="margin-left:auto;display:flex;gap:6px;">'
            + '<button data-editar-dia="' + dia + '" title="Editar" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 9px;cursor:pointer;color:#64748b;font-size:.78rem;display:flex;align-items:center;gap:4px;"><i class="bi bi-pencil"></i> Editar</button>'
            + '<button data-excluir-dia="' + dia + '" title="Excluir" style="background:none;border:1px solid #fecaca;border-radius:8px;padding:4px 9px;cursor:pointer;color:#dc2626;font-size:.78rem;display:flex;align-items:center;gap:4px;"><i class="bi bi-trash3"></i></button>'
            + '</div>'
            + '</div>'
            + (nomeUsuario ? '<div style="font-size:.78rem;color:#f97316;font-weight:700;margin-bottom:' + (r.texto ? '6px' : '0') + ';"><i class="bi bi-person-fill me-1"></i>' + escapeHtml(nomeUsuario) + '</div>' : '')
            + (r.texto ? '<div style="font-size:.84rem;color:#475569;line-height:1.5;border-left:3px solid #f97316;padding-left:10px;">' + escapeHtml(r.texto) + '</div>' : '')
            + '</div>';
        }).join('')
      + '</div>';

    // Injeta após aiDiasContainer ou secaoLocais — onde os dias estão renderizados
    var anchor = document.getElementById("aiDiasContainer") || document.getElementById("secaoLocais");
    if (anchor) anchor.insertAdjacentHTML("afterend", html);

    // Bind botões de excluir e editar
    var secao = document.getElementById("secaoAvaliacoesDia");
    if (!secao) return;

    secao.querySelectorAll("[data-excluir-dia]").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        var dia = btn.getAttribute("data-excluir-dia");
        if (!await _confirmarExclusaoDiaRating()) return;
        var rt = {};
        try { rt = JSON.parse(localStorage.getItem("fg_dia_ratings_" + id) || "{}"); } catch (_) {}
        delete rt[dia];
        localStorage.setItem("fg_dia_ratings_" + id, JSON.stringify(rt));
        renderAvaliacoesDia(id);
      });
    });

    secao.querySelectorAll("[data-editar-dia]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var dia = btn.getAttribute("data-editar-dia");
        var rt = {};
        try { rt = JSON.parse(localStorage.getItem("fg_dia_ratings_" + id) || "{}"); } catch (_) {}
        var ratingAtual = rt[dia];
        if (!ratingAtual) return;
        _abrirEditarDiaRating(id, dia, ratingAtual, function(novaNota, novoTexto) {
          rt[dia] = { nota: novaNota, texto: novoTexto || null, ts: Date.now(), nome: ratingAtual.nome || "" };
          localStorage.setItem("fg_dia_ratings_" + id, JSON.stringify(rt));
          renderAvaliacoesDia(id);
        });
      });
    });
  }

  function exportarPDF(roteiro, locais) {
    const diasStr = roteiro.diasTotais ? `${roteiro.diasTotais} dia${roteiro.diasTotais > 1 ? "s" : ""}` : "—";
    const locStr  = [roteiro.cidade, roteiro.pais].filter(Boolean).join(", ") || "—";

    let gruposHtml = "";

    // Prioridade 1: ler do DOM — mostra os nomes exatamente como exibidos na tela (enriquecidos pelo Maps)
    const aiContainer = document.getElementById("aiDiasContainer");
    if (aiContainer && aiContainer.querySelectorAll(".day-item").length > 0) {
      const diasPDF = [];
      aiContainer.querySelectorAll("section").forEach(sec => {
        const hdr = sec.querySelector(".dia-header-label");
        if (!hdr) return;
        const label = hdr.textContent.trim() || "Sem dia definido";
        const itens = [];
        sec.querySelectorAll(".day-item").forEach(item => {
          const nome = item.querySelector(".name")?.textContent?.trim() || "Local";
          const addr = item.dataset.addr?.trim()
                    || item.querySelector(".ai-place-addr")?.textContent?.trim()
                    || item.querySelector(".costline span")?.textContent?.trim()
                    || "";
          const obs  = item.querySelector(".text-secondary")?.textContent?.trim() || "";
          const perLabel = item.closest("[data-period-key]")?.getAttribute("data-period-label") || "";
          itens.push({ nome, addr, obs, perLabel });
        });
        if (itens.length > 0) diasPDF.push({ label, itens });
      });
      gruposHtml = diasPDF.map(({ label, itens }) => `
        <div class="dia-bloco">
          <div class="dia-titulo">${label}</div>
          ${itens.map(it => `
            <div class="local-item">
              <div class="local-nome">${it.nome}</div>
              ${it.perLabel ? `<span class="local-hora">${it.perLabel}</span>` : ""}
              ${it.addr ? `<div class="local-end">${it.addr}</div>` : ""}
              ${it.obs  ? `<div class="local-obs">${it.obs}</div>`  : ""}
            </div>`).join("")}
        </div>`).join("");
    }

    // Prioridade 2: locais do banco de dados
    if (!gruposHtml && locais.length > 0) {
      const grupos = agruparLocaisPorDia(locais);
      gruposHtml = grupos.map(({ dia, itens }) => `
        <div class="dia-bloco">
          <div class="dia-titulo">${dia ? `Dia ${dia}` : "Sem dia definido"}</div>
          ${itens.map(l => `
            <div class="local-item">
              <div class="local-nome">${l.nome || "Local"}</div>
              ${formatarHorario(l.horario) ? `<span class="local-hora">${formatarHorario(l.horario)}</span>` : ""}
              ${l.endereco    ? `<div class="local-end">${l.endereco}</div>`    : ""}
              ${l.observacoes ? `<div class="local-obs">${l.observacoes}</div>` : ""}
            </div>`).join("")}
        </div>`).join("");
    }

    // Prioridade 3: sugestões brutas da IA (fallback quando nenhuma das anteriores tem dados)
    if (!gruposHtml && roteiro.sugestoes?.length) {
      const diasMap = {};
      roteiro.sugestoes.forEach(s => {
        const dia = s.dia || 1;
        if (!diasMap[dia]) diasMap[dia] = [];
        diasMap[dia].push(s);
      });
      gruposHtml = Object.entries(diasMap)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([dia, itens]) => `
          <div class="dia-bloco">
            <div class="dia-titulo">Dia ${dia}</div>
            ${itens.map(it => `
              <div class="local-item">
                <div class="local-nome">${it.nome || "Local"}</div>
                ${it.custo ? `<div class="local-obs">${it.custo}</div>` : ""}
              </div>`).join("")}
          </div>`).join("");
    }

    const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <title>${roteiro.titulo || "Roteiro"} – FlyGuide</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:32px 40px;}
    .header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:24px;}
    .logo{width:44px;height:44px;background:#f97316;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;}
    .brand-name{font-size:1.4rem;font-weight:800;color:#0f172a;}
    .brand-sub{font-size:.78rem;color:#64748b;}
    .titulo{font-size:2rem;font-weight:900;color:#0f172a;margin-bottom:10px;}
    .meta{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:8px;font-size:.9rem;color:#475569;align-items:center;}
    .meta .tag{background:#fff7ed;color:#c2410c;border-radius:8px;padding:3px 12px;font-weight:700;font-size:.82rem;}
    hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0;}
    .secao-titulo{font-size:.82rem;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;}
    .descricao{font-size:.92rem;color:#475569;line-height:1.7;white-space:pre-wrap;}
    .dia-bloco{margin-bottom:22px;}
    .dia-titulo{font-size:.95rem;font-weight:800;color:#1e293b;background:#f1f5f9;border-radius:8px;padding:7px 14px;margin-bottom:10px;}
    .local-item{display:flex;flex-direction:column;gap:3px;padding:8px 0 8px 14px;border-left:3px solid #fed7aa;margin-bottom:8px;}
    .local-nome{font-weight:700;font-size:.92rem;}
    .local-hora{font-size:.78rem;color:#c2410c;font-weight:700;background:#fff7ed;border-radius:6px;padding:1px 8px;width:fit-content;}
    .local-end{font-size:.8rem;color:#64748b;}
    .local-obs{font-size:.8rem;color:#94a3b8;font-style:italic;}
    .footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:.75rem;color:#94a3b8;text-align:center;}
    @media print{body{padding:16px 20px;}.dia-bloco{page-break-inside:auto;}.dia-titulo{page-break-after:avoid;}.local-item{page-break-inside:avoid;}}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🧭</div>
    <div><div class="brand-name">FlyGuide</div><div class="brand-sub">Suas viagens inesquecíveis</div></div>
  </div>
  <div class="titulo">${roteiro.titulo || "Roteiro"}</div>
  <div class="meta">
    <span>📍 ${locStr}</span>
    <span>🗓 ${diasStr}</span>
    ${roteiro.tipoRoteiro ? `<span class="tag">${roteiro.tipoRoteiro}</span>` : ""}
  </div>
  ${roteiro.observacoes ? `<hr><div class="secao-titulo">Sobre a Viagem</div><div class="descricao">${roteiro.observacoes}</div>` : ""}
  ${gruposHtml ? `<hr><div class="secao-titulo">Roteiro Dia a Dia</div>${gruposHtml}` : ""}
  <div class="footer">Exportado via FlyGuide · ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=950");
    if (!win) { alert("Permita pop-ups para exportar o PDF."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }
})();
// ── Edição inline nos detalhes ─────────────────────────────────
function abrirModalEdicaoDetalhes(roteiro, locaisIniciais) {
  const URL_API_BASE = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const userId       = getUserIdFromToken();
  const PUBLICO      = "Público";
  const PRIVADO      = "Privado";

  // Preenche campos
  document.getElementById("detalheEditId").value        = roteiro.idRoteiro;
  document.getElementById("detalheEditTitulo").value    = roteiro.titulo || "";
  document.getElementById("detalheEditDuracao").value   = roteiro.diasTotais || "";
  document.getElementById("detalheEditTipo").value      = roteiro.tipoRoteiro || "Cidade";
  document.getElementById("detalheEditDesc").value      = roteiro.observacoes || "";
  document.getElementById("detalheEditErro").style.display = "none";

  // País + Cidade com autocomplete (se Maps já carregou) ou plain text
  if (window._autocompletePaisCidadeDetalhe) {
    window._autocompletePaisCidadeDetalhe.aplicarValores(roteiro.pais || "", roteiro.cidade || "");
  } else {
    document.getElementById("detalheEditPais").value   = roteiro.pais   || "";
    document.getElementById("detalheEditCidade").value = roteiro.cidade  || "";
  }

  // Toggle de visibilidade
  const isPublico     = roteiro.visibilidadeRoteiro === PUBLICO;
  const visCheck      = document.getElementById("detalheVisPublico");
  const visLabel      = document.getElementById("detalheVisLabel");
  const visDesc       = document.getElementById("detalheVisDesc");
  const visIcon       = document.getElementById("detalheVisIcon");
  const visIconWrap   = document.getElementById("detalheVisIconWrap");
  const visBadge      = document.getElementById("detalheVisBadge");
  function atualizarToggleVis(pub) {
    if (visCheck)    visCheck.checked     = pub;
    if (visLabel)    visLabel.textContent = pub ? "Compartilhar no Feed Público" : "Roteiro Privado";
    if (visDesc)     visDesc.textContent  = pub ? "Outros viajantes poderão ver seu roteiro" : "Somente você pode ver este roteiro";
    if (visIcon)     visIcon.className    = pub ? "bi bi-globe2" : "bi bi-lock-fill";
    if (visIconWrap) visIconWrap.style.background = pub ? "#fff7ed" : "";
    if (visBadge)    visBadge.textContent = pub ? "Público" : "Privado";
  }
  atualizarToggleVis(isPublico);
  if (visCheck) {
    visCheck.onchange = e => atualizarToggleVis(e.target.checked);
  }

  // Seletor de imagens
  if (typeof renderSeletorImagens === "function") {
    carregarImagens().then(() => renderSeletorImagens("detalheImgSelector", "detalheEditImagem", roteiro.idImagem || roteiro.imagemChave));
  }

  // Locais
  if (typeof window.abrirLocaisEditDetalhe === "function") {
    window.abrirLocaisEditDetalhe(roteiro.idRoteiro, {
      diasTotais: roteiro.diasTotais || 0,
      userId:     parseInt(userId),
      roteiro:    roteiro,
      locais:     locaisIniciais || []
    });
  }

  const modal = new bootstrap.Modal(document.getElementById("modalEditarDetalhe"));
  modal.show();

  // Salvar
  document.getElementById("btnSalvarDetalheEdit").onclick = async () => {
    const titulo = document.getElementById("detalheEditTitulo").value.trim();
    const pais   = window._autocompletePaisCidadeDetalhe
      ? window._autocompletePaisCidadeDetalhe.obterPais()
      : document.getElementById("detalheEditPais").value.trim();
    const cidade = window._autocompletePaisCidadeDetalhe
      ? window._autocompletePaisCidadeDetalhe.obterCidade()
      : document.getElementById("detalheEditCidade").value.trim();
    const erroEl = document.getElementById("detalheEditErro");
    if (!titulo || !pais || !cidade) {
      erroEl.textContent = "Preencha Título, País Principal e Cidade Base.";
      erroEl.style.display = "";
      return;
    }
    erroEl.style.display = "none";

    const dias      = parseInt(document.getElementById("detalheEditDuracao").value) || null;
    const idImg     = document.getElementById("detalheEditImagem").value;
    const imagemSelecionada = typeof obterImagemSelecionada === "function"
      ? obterImagemSelecionada("detalheEditImagem")
      : null;
    const isPublico = document.getElementById("detalheVisPublico")?.checked;

    const payload = {
      idUsuario:           parseInt(userId),
      titulo, pais, cidade,
      tipoRoteiro:         document.getElementById("detalheEditTipo").value,
      statusRoteiro:       roteiro.statusRoteiro || "PLANEJADO",
      visibilidadeRoteiro: isPublico ? PUBLICO : PRIVADO,
      diasTotais:          dias > 0 ? dias : null,
      orcamento:           null,
      observacoes:         document.getElementById("detalheEditDesc").value.trim() || null,
      idImagem:            imagemSelecionada?.idImagem ?? (typeof normalizarIdImagem === "function" ? normalizarIdImagem(idImg) : (idImg ? parseInt(idImg) : null)),
      imagemChave:         imagemSelecionada?.imagemChave || null,
    };

    const btn = document.getElementById("btnSalvarDetalheEdit");
    btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

    try {
      const res = await authFetch(`${URL_API_BASE}/roteiros/${roteiro.idRoteiro}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        modal.hide();
        // Recarrega a página para refletir mudanças
        window.location.reload();
      } else { erroEl.textContent = "Erro ao salvar."; erroEl.style.display = ""; }
    } catch { erroEl.textContent = "Erro ao conectar."; erroEl.style.display = ""; }
    finally { btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar Alterações`; }
  };
}

// ── Módulo de Avaliações (unificado: nota + comentário + likes) ────────────

// ── Módulo de Avaliações ──────────────────────────────────────
(function iniciarAvaliacoes() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  var URL_API_BASE = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  var params       = new URLSearchParams(window.location.search);
  var roteiroId    = params.get("id");
  var userId       = getUserIdFromToken();

  if (!roteiroId) return;

  var notaSelecionada    = 0;
  var avaliacaoDoUsuario = null;

  // ── Estrelas do formulário ──
  var estrelasForm = document.querySelectorAll("#formEstrelasAv i[data-nota]");

  function renderEstrelasForm(nota) {
    estrelasForm.forEach(function(s) {
      var n = parseInt(s.getAttribute("data-nota"));
      s.className = n <= nota ?"bi bi-star-fill" : "bi bi-star";
      s.style.color = "#facc15";
    });
  }

  estrelasForm.forEach(function(s) {
    s.addEventListener("mouseenter", function() {
      if (!userId) return;
      renderEstrelasForm(parseInt(s.getAttribute("data-nota")));
    });
    s.addEventListener("mouseleave", function() {
      renderEstrelasForm(notaSelecionada);
    });
    s.addEventListener("click", function() {
      if (!userId) return;
      notaSelecionada = parseInt(s.getAttribute("data-nota"));
      renderEstrelasForm(notaSelecionada);
    });
  });

  // ── Estrelas do card (média) ──
  var mediaEl      = document.getElementById("mediaAvaliacao");
  var estrelasCard = document.querySelectorAll("#estrelasAvaliacao i[data-nota]");

  function renderEstrelasCard(media) {
    estrelasCard.forEach(function(s) {
      var n = parseInt(s.getAttribute("data-nota"));
      s.className = n <= Math.round(media) ?"bi bi-star-fill" : "bi bi-star";
      s.style.color = "#facc15";
    });
  }

  function sinalizarAtualizacaoMeusRoteiros() {
    try {
      sessionStorage.setItem("flyguide:refresh-meus-roteiros", String(Date.now()));
    } catch(e) { /* silencioso */ }
  }

  // ── Utilitários ──
  function formatarDataHora(str) {
    if (!str) return "";
    try {
      var d = new Date(str);
      return d.toLocaleDateString("pt-BR");
    } catch(e) { return ""; }
  }

  function estrelasHtml(nota) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<i class="bi bi-star' + (i <= nota ?"-fill" : "") + '" style="color:#facc15;font-size:.85rem;"></i>';
    }
    return html;
  }

  function ocultarLoading() {
    var el = document.getElementById("loadingAvaliacoes");
    if (el) el.style.display = "none";
  }

  // ── Carregar média ──
  async function carregarMedia() {
    try {
      var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/media");
      if (!res.ok) return;
      var dados = await res.json();
      var media = dados.media || 0;
      var total = dados.total  || 0;
      renderEstrelasCard(media);
      if (mediaEl) {
        mediaEl.textContent = total > 0
          ? media.toFixed(1) + " \u2605 (" + total + " avalia\u00e7\u00e3o" + (total !== 1 ? "\u00f5es" : "") + ")"
          : "Sem avalia\u00e7\u00f5es ainda";
      }
      try {
        sessionStorage.setItem("flyguide:roteiro-media:" + roteiroId, JSON.stringify({
          media: media,
          total: total,
          atualizadoEm: Date.now()
        }));
      } catch(e2) { /* silencioso */ }
    } catch(e) {
      console.error("[FlyGuide] Erro carregarMedia:", e);
    }
  }

  // ── Carregar avaliação do usuário ──
  async function carregarAvaliacaoUsuario() {
    if (!userId) return;
    try {
      var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/" + userId);
      if (res.status === 204) { avaliacaoDoUsuario = null; return; }
      if (!res.ok) return;
      avaliacaoDoUsuario = await res.json();
      notaSelecionada    = avaliacaoDoUsuario.nota || 0;
      renderEstrelasForm(notaSelecionada);
      var textarea = document.getElementById("inputAvaliacao");
      if (textarea) textarea.value = avaliacaoDoUsuario.texto || "";
      var btn    = document.getElementById("btnEnviarAvaliacao");
      var btnDel = document.getElementById("btnExcluirAvaliacao");
      if (btn)    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Atualizar';
      if (btnDel) btnDel.style.display = "";
    } catch(e) {
      console.error("[FlyGuide] Erro carregarAvaliacaoUsuario:", e);
    }
  }

  // ── Carregar lista de avaliações ──
  async function carregarAvaliacoes() {
    var loading = document.getElementById("loadingAvaliacoes");
    var lista   = document.getElementById("listaAvaliacoes");
    var vazio   = document.getElementById("semAvaliacoes");

    if (loading) loading.style.display = "";
    if (vazio)   vazio.style.display   = "none";
    if (lista)   lista.innerHTML       = "";

    try {
      var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes");

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      var avaliacoes = await res.json();

      if (!avaliacoes || avaliacoes.length === 0) {
        if (vazio) vazio.style.display = "";
        return;
      }

      lista.innerHTML = avaliacoes.map(function(a) {
        return '<div class="comentario-item" id="avaliacao-' + a.idAvaliacao + '" style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f1f5f9;align-items:flex-start;">'
          + '<div style="width:36px;height:36px;border-radius:50%;background:#f97316;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0;">'
          + escapeHtml((a.nomeExibicao || "?")[0].toUpperCase())
          + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px;">'
          + '<div><span style="font-weight:600;font-size:.88rem;">' + escapeHtml(a.nomeExibicao || "Usuário") + '</span>'
          + (a.isPremium ? '<span style="display:inline-flex;align-items:center;gap:3px;margin-left:6px;font-size:.68rem;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #ffedd5;padding:1px 7px;border-radius:999px;"><i class="bi bi-star-fill"></i>Premium</span>' : '')
          + (a.concluiuRoteiro
              ? '<span style="display:inline-flex;align-items:center;gap:3px;margin-left:6px;font-size:.72rem;font-weight:700;color:#22c55e;"><i class="bi bi-patch-check-fill"></i>Concluiu o roteiro</span>'
              : '<span style="display:inline-flex;align-items:center;gap:3px;margin-left:6px;font-size:.72rem;font-weight:600;color:#94a3b8;"><i class="bi bi-clock-history"></i>Não realizou o roteiro</span>')
          + '<div style="margin-top:2px;">' + estrelasHtml(a.nota) + '</div></div>'
          + '<span style="font-size:.75rem;color:#94a3b8;">' + formatarDataHora(a.criadoEm) + '</span>'
          + '</div>'
          + (a.texto ?'<div style="font-size:.88rem;margin-top:6px;word-break:break-word;">' + escapeHtml(a.texto) + '</div>' : '')
          + '<div style="margin-top:6px;display:flex;align-items:center;gap:4px;">'
          + '<button onclick="curtirAvaliacao(' + a.idAvaliacao + ')" id="btnLike-' + a.idAvaliacao + '" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.82rem;padding:0;display:flex;align-items:center;gap:4px;">'
          + '<i class="bi bi-heart" id="iconLike-' + a.idAvaliacao + '"></i>'
          + '<span id="countLike-' + a.idAvaliacao + '">' + (a.totalLikes || 0) + '</span>'
          + '</button></div></div>'
          + (String(a.idUsuario) === String(userId)
              ?'<button onclick="excluirAvaliacaoPropia()" title="Excluir" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.85rem;padding:2px 6px;flex-shrink:0;"><i class="bi bi-trash"></i></button>'
              : '')
          + '</div>';
      }).join("");

      if (userId) avaliacoes.forEach(function(a) { carregarLikeAvaliacao(a.idAvaliacao); });

    } catch(e) {
      console.error("[FlyGuide] Erro carregarAvaliacoes:", e);
      if (lista) lista.innerHTML = '<div class="text-secondary text-center py-2" style="font-size:.85rem;">Não foi possível carregar as avaliações.</div>';
    } finally {
      ocultarLoading();
    }
  }

  // ── Likes nas avaliações ──
  async function carregarLikeAvaliacao(idAvaliacao) {
    if (!userId) return;
    try {
      var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/" + idAvaliacao + "/likes/" + userId);
      if (!res.ok) return;
      var jaCurtiu = await res.json();
      var icon = document.getElementById("iconLike-" + idAvaliacao);
      if (icon) {
        icon.className = jaCurtiu ?"bi bi-heart-fill" : "bi bi-heart";
        icon.style.color = jaCurtiu ?"#ef4444" : "";
      }
    } catch(e) { /* silencioso */ }
  }

  window.curtirAvaliacao = async function(idAvaliacao) {
    if (!userId) { window.location.href = "login.html"; return; }
    var icon    = document.getElementById("iconLike-" + idAvaliacao);
    var countEl = document.getElementById("countLike-" + idAvaliacao);
    var jaCurtiu = icon && icon.classList.contains("bi-heart-fill");
    try {
      var res = await authFetch(
        URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/" + idAvaliacao + "/likes/" + userId,
        { method: jaCurtiu ?"DELETE" : "POST" }
      );
      if (res.ok || res.status === 204) {
        if (icon) { icon.className = jaCurtiu ?"bi bi-heart" : "bi bi-heart-fill"; icon.style.color = jaCurtiu ?"" : "#ef4444"; }
        if (countEl) { var c = parseInt(countEl.textContent) || 0; countEl.textContent = jaCurtiu ?Math.max(0, c - 1) : c + 1; }
      }
    } catch(e) { /* silencioso */ }
  };

  // ── Enviar avaliação ──
  var btnEnviar = document.getElementById("btnEnviarAvaliacao");
  if (btnEnviar) {
    btnEnviar.addEventListener("click", async function() {
      var erroEl   = document.getElementById("erroAvaliacao");
      var erroTx   = document.getElementById("erroAvaliacaoTexto");
      var btn      = document.getElementById("btnEnviarAvaliacao");
      var textarea = document.getElementById("inputAvaliacao");
      if (erroEl) erroEl.style.display = "none";

      if (!notaSelecionada) {
        if (erroTx) erroTx.textContent = "Selecione uma nota (estrelas) antes de publicar.";
        if (erroEl) erroEl.style.display = "";
        return;
      }

      btn.disabled  = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Publicando...';

      try {
        var texto = textarea ?textarea.value.trim() : "";
        var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/" + userId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nota: notaSelecionada, texto: texto })
        });

        if (res.ok || res.status === 201) {
          await carregarMedia();
          await carregarAvaliacaoUsuario();
          await carregarAvaliacoes();
          sinalizarAtualizacaoMeusRoteiros();
        } else {
          var errData = null;
          try { errData = await res.json(); } catch (_) {}
          var msg = (errData && (errData.message || errData.error)) || "Erro ao publicar avaliação.";
          var _m = msg.match(/^\d+\s+\S+\s+"(.+)"$/); if (_m) msg = _m[1];
          if (erroTx) erroTx.textContent = msg;
          if (erroEl) erroEl.style.display = "";
        }
      } catch(e) {
        if (erroTx) erroTx.textContent = "Erro ao conectar ao servidor.";
        if (erroEl) erroEl.style.display = "";
      } finally {
        btn.disabled  = false;
        btn.innerHTML = avaliacaoDoUsuario
          ?'<i class="bi bi-check-lg me-1"></i>Atualizar'
          : '<i class="bi bi-send-fill me-1"></i>Publicar';
      }
    });
  }

  // ── Excluir avaliação ──
  function _confirmarExclusaoAvaliacao() {
    return new Promise(function(resolve) {
      var overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
      overlay.innerHTML =
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
        + '<div style="width:52px;height:52px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="bi bi-trash3-fill" style="font-size:1.4rem;color:#dc2626;"></i>'
        + '</div>'
        + '<div style="font-size:1.05rem;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Excluir avaliação?</div>'
        + '<div style="font-size:.88rem;color:#94a3b8;margin-bottom:24px;">Sua nota e comentário serão removidos permanentemente. Esta ação não pode ser desfeita.</div>'
        + '<div style="display:flex;gap:10px;justify-content:center;">'
        + '<button id="_excAvalNao" style="flex:1;background:none;border:1px solid #334155;border-radius:10px;padding:10px 0;color:#94a3b8;cursor:pointer;font-size:.9rem;font-weight:600;">Cancelar</button>'
        + '<button id="_excAvalSim" style="flex:1;background:#dc2626;border:none;border-radius:10px;padding:10px 0;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;"><i class="bi bi-trash3 me-1"></i>Excluir</button>'
        + '</div></div>';
      document.body.appendChild(overlay);

      function fechar(resultado) {
        overlay.remove();
        resolve(resultado);
      }

      overlay.querySelector("#_excAvalSim").onclick = function() { fechar(true); };
      overlay.querySelector("#_excAvalNao").onclick = function() { fechar(false); };
      overlay.addEventListener("click", function(e) { if (e.target === overlay) fechar(false); });
    });
  }

  var btnExcluir = document.getElementById("btnExcluirAvaliacao");
  if (btnExcluir) {
    btnExcluir.addEventListener("click", async function() {
      if (!await _confirmarExclusaoAvaliacao()) return;
      try {
        var res = await authFetch(URL_API_BASE + "/roteiros/" + roteiroId + "/avaliacoes/" + userId, { method: "DELETE" });
        if (res.ok || res.status === 204) {
          avaliacaoDoUsuario = null;
          notaSelecionada    = 0;
          renderEstrelasForm(0);
          var textarea = document.getElementById("inputAvaliacao");
          if (textarea) textarea.value = "";
          var btn    = document.getElementById("btnEnviarAvaliacao");
          var btnDel = document.getElementById("btnExcluirAvaliacao");
          if (btn)    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Publicar';
          if (btnDel) btnDel.style.display = "none";
          await carregarMedia();
          await carregarAvaliacoes();
          sinalizarAtualizacaoMeusRoteiros();
        }
      } catch(e) { alert("Erro ao excluir avaliação."); }
    });
  }

  window.excluirAvaliacaoPropia = function() {
    var btnDel = document.getElementById("btnExcluirAvaliacao");
    if (btnDel) btnDel.click();
  };

  // ── Init ──
  var formAv = document.getElementById("formAvaliacao");
  var avisoAv = document.getElementById("avisoLoginAvaliacao");
  if (userId) {
    if (formAv) formAv.style.display = "";
  } else {
    if (avisoAv) avisoAv.style.display = "";
  }

  carregarMedia();
  carregarAvaliacoes();
  if (userId) carregarAvaliacaoUsuario();
})();
