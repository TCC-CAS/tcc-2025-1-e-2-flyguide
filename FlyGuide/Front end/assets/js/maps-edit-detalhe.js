/* ================================================================
   FlyGuide - maps-edit-detalhe.js
================================================================ */

var _URL_API_DET = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
var _autocompleteDetalheEdit       = null;
var _localSelecionadoDetalheEdit   = null;
var _locaisDetalheEdit             = [];
var _roteiroIdDetalheEdit          = null;
var _diasTotaisDetalheEdit         = 0;
var _userIdDetalheEdit             = null;
var _roteiroDetalheEdit            = null;
var _lookupAiDetalhePendente       = false;

function _setLookupAiDetalhePendente(pendente) {
  _lookupAiDetalhePendente = !!pendente;
  var btn = document.getElementById("btnSalvarSugestoesAI");
  if (!btn) return;
  if (_lookupAiDetalhePendente) {
    if (!btn.dataset.lookupOriginalHtml) btn.dataset.lookupOriginalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Preparando locais...';
    return;
  }
  if (btn.dataset.lookupOriginalHtml) {
    btn.innerHTML = btn.dataset.lookupOriginalHtml;
    delete btn.dataset.lookupOriginalHtml;
    btn.disabled = false;
  }
}

function _normalizarHorarioDetalhe(valor) {
  if (Array.isArray(valor)) {
    var hh = String(valor[0] || 0).padStart(2, "0");
    var mm = String(valor[1] || 0).padStart(2, "0");
    return hh + ":" + mm + ":00";
  }
  var horario = String(valor || "").trim();
  if (!horario) return null;
  if (/^\d{2}:\d{2}$/.test(horario)) return horario + ":00";
  if (/^\d{2}:\d{2}:\d{2}$/.test(horario)) return horario;
  return null;
}

function _formatarHorarioDetalhe(valor) {
  var horario = _normalizarHorarioDetalhe(valor);
  return horario ? horario.slice(0, 5) : "";
}

function _horarioOrdemDetalhe(valor) {
  var horario = _normalizarHorarioDetalhe(valor);
  if (!horario) return Number.MAX_SAFE_INTEGER;
  var partes = horario.split(":").map(Number);
  return (partes[0] * 60) + partes[1];
}

function _compararLocaisDetalhe(a, b) {
  return (a.dia || 0) - (b.dia || 0)
    || _horarioOrdemDetalhe(a.horario) - _horarioOrdemDetalhe(b.horario)
    || (a.ordem || 0) - (b.ordem || 0)
    || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
}

function _mapsUrlDetalheEdit(placeId, query) {
  var place = String(placeId || "").trim();
  var q = String(query || place || "").trim();
  var url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  return place ? url + "&query_place_id=" + encodeURIComponent(place) : url;
}

function _agruparLocaisDetalhe(locais) {
  var grupos = new Map();

  locais.slice().sort(_compararLocaisDetalhe).forEach(function(local) {
    var chave = local.dia || 0;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(local);
  });

  return Array.from(grupos.entries())
    .sort(function(a, b) { return a[0] - b[0]; })
    .map(function(entry) { return { dia: entry[0], itens: entry[1] }; });
}

function _ehCheckinCheckoutDetalheEdit(local) {
  var nome = String((local && (local.nome || local.name)) || local || "").trim().toLowerCase().replace(/[\s-]/g, "");
  return !!(local && local._checkin) || !!(local && local._checkout) || nome === "checkin" || nome === "checkout";
}

function _contarLocaisDetalheEdit(locais) {
  return (locais || []).filter(function(l) { return !_ehCheckinCheckoutDetalheEdit(l); }).length;
}

function _posicaoDeslocadaMapaDetalheEdit(p, contadorCoordenada) {
  var key = Number(p.lat).toFixed(5) + "," + Number(p.lng).toFixed(5);
  var repeticao = contadorCoordenada[key] || 0;
  contadorCoordenada[key] = repeticao + 1;
  if (repeticao === 0) return { lat: p.lat, lng: p.lng };
  var angulo = repeticao * 1.7;
  var raio = 0.00008 * Math.ceil(repeticao / 2);
  return {
    lat: p.lat + Math.cos(angulo) * raio,
    lng: p.lng + Math.sin(angulo) * raio
  };
}

function _atualizarMapaDetalheEdit() {
  if (typeof window.initMapsDetalhes === "function") {
    window.initMapsDetalhes();
  }
  _renderMiniMapaDetalheEdit();
}

function _renderMiniMapaDetalheEdit() {
  var box   = document.getElementById("miniMapaDetalheEditBox");
  var mapEl = document.getElementById("miniMapaDetalheEdit");
  if (!box || !mapEl || !window.google) return;

  var pontos = _locaisDetalheEdit
    .filter(function(l) { return l.latitude != null && l.longitude != null; })
    .map(function(l) { return { nome: l.nome || "Local", lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }; });

  if (!pontos.length) { box.style.display = "none"; return; }
  box.style.display = "";

  var mapa = new google.maps.Map(mapEl, {
    zoom: 12,
    center: { lat: pontos[0].lat, lng: pontos[0].lng },
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true
  });

  var infoWindow = new google.maps.InfoWindow();
  var bounds = new google.maps.LatLngBounds();
  var contadorCoordenada = {};

  pontos.forEach(function(p, i) {
    var pos = _posicaoDeslocadaMapaDetalheEdit(p, contadorCoordenada);
    p._mapPos = pos;
    var marker = new google.maps.Marker({
      position: pos,
      map: mapa,
      title: p.nome,
      label: { text: String(i + 1), color: "#fff", fontWeight: "800", fontFamily: "Inter,sans-serif", fontSize: "11px" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: "#f97316", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      zIndex: 10
    });
    marker.addListener("click", function() {
      infoWindow.setContent('<div style="font-family:Inter,sans-serif;padding:2px 4px;min-width:120px;"><div style="font-weight:700;font-size:.85rem;color:#0f172a;">' + escapeHtml(p.nome) + '</div><div style="font-size:.72rem;color:#f97316;font-weight:700;">#' + (i + 1) + ' no roteiro</div></div>');
      infoWindow.open(mapa, marker);
    });
    bounds.extend(pos);
  });

  if (pontos.length > 1) {
    new google.maps.Polyline({
      path: pontos.map(function(p) { return p._mapPos || { lat: p.lat, lng: p.lng }; }),
      map: mapa, strokeColor: "#f97316", strokeOpacity: 0.65, strokeWeight: 2.5,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: "#f97316", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1 }, offset: "100%", repeat: "70px" }]
    });
    mapa.fitBounds(bounds);
  } else {
    mapa.setZoom(15);
  }
}

function _detLog(msg, cor) {
  var el = document.getElementById("erroLocalDetalheEdit");
  if (el) {
    el.textContent   = msg;
    el.style.display = "";
    el.style.background = cor || "#fef2f2";
    el.style.color      = cor ? "#fff" : "#991b1b";
  }
  console.log("[maps-detalhe] " + msg);
}

window.initMapsDetalheEdit = function () {
  // Autocomplete país + cidade no formulário de informações
  if (!window._autocompletePaisCidadeDetalhe && document.getElementById("detalheEditPais")) {
    window._autocompletePaisCidadeDetalhe = (typeof criarAutocompletePaisCidadeGlobal === "function")
      ? criarAutocompletePaisCidadeGlobal("detalheEditPais", "detalheEditCidade")
      : null;
  }

  // Autocomplete de local na aba Locais
  var input = document.getElementById("buscaLocalDetalheEdit");
  if (!input || !window.google) return;
  if (_autocompleteDetalheEdit) return;

  _autocompleteDetalheEdit = new google.maps.places.Autocomplete(input, {
    fields:   ["place_id", "name", "formatted_address", "geometry", "types"],
    language: "pt-BR"
  });

  _autocompleteDetalheEdit.addListener("place_changed", function() {
    var place = _autocompleteDetalheEdit.getPlace();
    if (!place || !place.place_id) return;
    _localSelecionadoDetalheEdit = {
      placeId:   place.place_id,
      nome:      place.name,
      endereco:  place.formatted_address,
      tipo:      (place.types || [])[0] || "establishment",
      latitude:  place.geometry && place.geometry.location ? place.geometry.location.lat() : null,
      longitude: place.geometry && place.geometry.location ? place.geometry.location.lng() : null
    };
    var preview = document.getElementById("localPreviewDetalheEdit");
    if (preview) {
      preview.style.display = "";
      var nomeEl = document.getElementById("previewNomeDetalheEdit");
      var endEl  = document.getElementById("previewEnderecoDetalheEdit");
      if (nomeEl) nomeEl.textContent = _localSelecionadoDetalheEdit.nome;
      if (endEl)  endEl.textContent  = _localSelecionadoDetalheEdit.endereco;
    }
  });
};

window.abrirLocaisEditDetalhe = function(roteiroId, opts) {
  _roteiroIdDetalheEdit        = roteiroId;
  _diasTotaisDetalheEdit       = (opts && opts.diasTotais) || 0;
  _userIdDetalheEdit           = (opts && opts.userId)     || null;
  _roteiroDetalheEdit          = (opts && opts.roteiro)    || null;
  _localSelecionadoDetalheEdit = null;
  _autocompleteDetalheEdit     = null;

  var locaisIniciais = (opts && Array.isArray(opts.locais)) ? opts.locais : [];

  ["buscaLocalDetalheEdit","localObsDetalheEdit"]
    .forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ""; });

  var diaSelectAdd = document.getElementById("localDiaDetalheEdit");
  if (diaSelectAdd) {
    var numDias = _diasTotaisDetalheEdit > 0 ? _diasTotaisDetalheEdit
      : (_roteiroDetalheEdit && _roteiroDetalheEdit.sugestoes ? _roteiroDetalheEdit.sugestoes.length : 0);
    diaSelectAdd.innerHTML = '<option value="" disabled selected>Selecione</option>';
    for (var d = 1; d <= (numDias || 1); d++) {
      var opt = document.createElement("option");
      opt.value = d;
      opt.textContent = "Dia " + d;
      diaSelectAdd.appendChild(opt);
    }
    diaSelectAdd.value = "";
  }

  var periodoReset = document.getElementById("localPeriodoDetalheEdit");
  if (periodoReset) periodoReset.value = "";
  _configurarRestricoesPeriodoLocalDetalhe();

  var prevEl = document.getElementById("localPreviewDetalheEdit");
  if (prevEl) prevEl.style.display = "none";
  var erroEl = document.getElementById("erroLocalDetalheEdit");
  if (erroEl) erroEl.style.display = "none";

  authFetch(_URL_API_DET + "/roteiros/" + roteiroId + "/locais")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var locaisDaApi = (Array.isArray(data) && data.length > 0) ? data : locaisIniciais;
      if (locaisDaApi.length === 0 && !_hasSugestoesAI()) {
        authFetch(_URL_API_DET + "/roteiros/" + roteiroId + "/completo")
          .then(function(r) { return r.json(); })
          .then(function(completo) {
            if (completo && Array.isArray(completo.locais) && completo.locais.length > 0) {
              _locaisDetalheEdit = completo.locais;
            } else {
              _locaisDetalheEdit = locaisDaApi;
            }
            if (completo && completo.roteiro && Array.isArray(completo.roteiro.sugestoes) && completo.roteiro.sugestoes.length > 0) {
              _roteiroDetalheEdit = Object.assign({}, _roteiroDetalheEdit, { sugestoes: completo.roteiro.sugestoes });
            }
            renderLocaisDetalheEdit();
            _renderMiniMapaDetalheEdit();
          })
          .catch(function() {
            _locaisDetalheEdit = locaisDaApi;
            renderLocaisDetalheEdit();
            _renderMiniMapaDetalheEdit();
          });
      } else {
        _locaisDetalheEdit = locaisDaApi;
        renderLocaisDetalheEdit();
        _renderMiniMapaDetalheEdit();
      }
    })
    .catch(function() {
      _locaisDetalheEdit = locaisIniciais;
      renderLocaisDetalheEdit();
      _renderMiniMapaDetalheEdit();
    });
};

function _parseCustoAIDet(custo) {
  if (!custo) return "";
  var s = String(custo).replace(/[Rr]?\$\s*/g, "").replace(/\./g, "").replace(/,/g, ".");
  var nums = s.match(/\d+(\.\d+)?/g);
  if (!nums) return "";
  if (nums.length === 1) return parseFloat(nums[0]);
  return Math.round((parseFloat(nums[0]) + parseFloat(nums[nums.length - 1])) / 2);
}

var _PERIODOS_AI_EDIT = [
  { key: "manha", label: "Manhã",  icon: "bi-sunrise-fill",   cor: "#f59e0b" },
  { key: "tarde", label: "Tarde",  icon: "bi-sun-fill",        cor: "#f97316" },
  { key: "noite", label: "Noite",  icon: "bi-moon-stars-fill", cor: "#6366f1" },
];

function _nomeMarcadorPeriodoDetalhe(local) {
  return String((local && (local.nome || local.name)) || local || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, "");
}

function _ehCheckinDetalhe(local) {
  return !!(local && local._checkin) || _nomeMarcadorPeriodoDetalhe(local) === "checkin";
}

function _ehCheckoutDetalhe(local) {
  return !!(local && local._checkout) || _nomeMarcadorPeriodoDetalhe(local) === "checkout";
}

function _obterSugestaoDiaDetalhe(dia) {
  var diaNum = parseInt(dia, 10);
  if (!diaNum || !_hasSugestoesAI()) return null;
  for (var i = 0; i < _roteiroDetalheEdit.sugestoes.length; i++) {
    var item = _roteiroDetalheEdit.sugestoes[i];
    if (parseInt((item && item.dia) || 0, 10) === diaNum) return item;
  }
  return _roteiroDetalheEdit.sugestoes[diaNum - 1] || null;
}

function _janelaPeriodosDiaDetalhe(dia) {
  var janela = {
    inicio: 0,
    fim: _PERIODOS_AI_EDIT.length - 1,
    checkinPos: -1,
    checkoutPos: Number.MAX_SAFE_INTEGER,
    temRestricao: false
  };
  var diaObj = _obterSugestaoDiaDetalhe(dia);
  if (!diaObj || !diaObj.periodos || typeof diaObj.periodos !== "object") return janela;

  _PERIODOS_AI_EDIT.forEach(function(per, pidx) {
    (diaObj.periodos[per.key] || []).forEach(function(item, lidx) {
      if (_ehCheckinDetalhe(item)) {
        janela.inicio = Math.max(janela.inicio, pidx);
        janela.checkinPos = lidx;
      }
      if (_ehCheckoutDetalhe(item)) {
        janela.fim = Math.min(janela.fim, pidx);
        janela.checkoutPos = lidx;
      }
    });
  });

  if (janela.fim < janela.inicio) janela.fim = janela.inicio;
  janela.temRestricao = janela.inicio > 0 || janela.fim < _PERIODOS_AI_EDIT.length - 1;
  return janela;
}

function _periodoPermitidoDiaDetalhe(dia, periodo) {
  var idx = _PERIODOS_AI_EDIT.findIndex(function(p) { return p.key === periodo; });
  if (idx < 0) return true;
  var janela = _janelaPeriodosDiaDetalhe(dia);
  return idx >= janela.inicio && idx <= janela.fim;
}

function _textoPeriodosPermitidosDetalhe(dia) {
  var janela = _janelaPeriodosDiaDetalhe(dia);
  return _PERIODOS_AI_EDIT
    .slice(janela.inicio, janela.fim + 1)
    .map(function(p) { return p.label; })
    .join(", ");
}

function _mensagemPeriodoBloqueadoDetalhe(dia) {
  return "Este dia do roteiro permite atividades apenas em: " + _textoPeriodosPermitidosDetalhe(dia) + ". Ajuste o período para adicionar o local.";
}

function _mostrarErroLocalDetalhe(msg) {
  var erroEl = document.getElementById("erroLocalDetalheEdit");
  if (!erroEl) return;
  erroEl.textContent = msg;
  erroEl.style.display = "";
  erroEl.style.background = "";
  erroEl.style.color = "";
}

function _atualizarOpcoesPeriodoLocalDetalhe() {
  var diaEl = document.getElementById("localDiaDetalheEdit");
  var periodoEl = document.getElementById("localPeriodoDetalheEdit");
  if (!periodoEl) return;

  var dia = parseInt((diaEl && diaEl.value) || "0", 10);
  var valorAtual = periodoEl.value;
  var limpouPeriodo = false;

  Array.from(periodoEl.options).forEach(function(opt) {
    if (!opt.value) return;
    var permitido = !dia || _periodoPermitidoDiaDetalhe(dia, opt.value);
    opt.disabled = !permitido;
    opt.title = permitido ? "" : _mensagemPeriodoBloqueadoDetalhe(dia);
  });

  if (dia && valorAtual && !_periodoPermitidoDiaDetalhe(dia, valorAtual)) {
    periodoEl.value = "";
    limpouPeriodo = true;
  }

  if (limpouPeriodo) _mostrarErroLocalDetalhe(_mensagemPeriodoBloqueadoDetalhe(dia));
}

function _configurarRestricoesPeriodoLocalDetalhe() {
  var diaEl = document.getElementById("localDiaDetalheEdit");
  var periodoEl = document.getElementById("localPeriodoDetalheEdit");

  if (diaEl && !diaEl.dataset.restricoesPeriodoBound) {
    diaEl.dataset.restricoesPeriodoBound = "1";
    diaEl.addEventListener("change", _atualizarOpcoesPeriodoLocalDetalhe);
  }

  if (periodoEl && !periodoEl.dataset.restricoesPeriodoBound) {
    periodoEl.dataset.restricoesPeriodoBound = "1";
    periodoEl.addEventListener("change", function() {
      var dia = parseInt((diaEl && diaEl.value) || "0", 10);
      if (dia && periodoEl.value && !_periodoPermitidoDiaDetalhe(dia, periodoEl.value)) {
        periodoEl.value = "";
        _mostrarErroLocalDetalhe(_mensagemPeriodoBloqueadoDetalhe(dia));
      }
    });
  }

  _atualizarOpcoesPeriodoLocalDetalhe();
}

function _hasSugestoesAI() {
  return _roteiroDetalheEdit
    && Array.isArray(_roteiroDetalheEdit.sugestoes)
    && _roteiroDetalheEdit.sugestoes.length > 0;
}

function _initAIItemAutocompleteDet(input) {
  if (!window.google || !window.google.maps || !window.google.maps.places) return;
  var ac = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "name", "formatted_address", "geometry"],
    language: "pt-BR"
  });
  ac.addListener("place_changed", function() {
    var place = ac.getPlace();
    if (!place || !place.place_id) return;
    var item = input.closest("[data-ai-item]");
    if (!item) return;
    if (place.name) input.value = place.name;
    var titleEl = item.querySelector("[data-ai-title]");
    if (titleEl && place.name) titleEl.textContent = place.name;
    var addrEl = item.querySelector("[data-ai-address]");
    if (addrEl) {
      addrEl.innerHTML = place.formatted_address ? '<i class="bi bi-geo-alt me-1"></i>' + escapeHtml(place.formatted_address) : "";
      addrEl.style.display = place.formatted_address ? "" : "none";
    }
    var endEl = item.querySelector("[data-ai-endereco]");
    if (endEl) {
      endEl.textContent = place.formatted_address || "";
      endEl.style.display = place.formatted_address ? "" : "none";
    }
    var pidEl = item.querySelector("[data-ai-place-id]");
    if (pidEl) pidEl.value = place.place_id || "";
    var latEl = item.querySelector("[data-ai-lat]");
    var lngEl = item.querySelector("[data-ai-lng]");
    if (place.geometry && place.geometry.location) {
      if (latEl) latEl.value = place.geometry.location.lat();
      if (lngEl) lngEl.value = place.geometry.location.lng();
    } else {
      if (latEl) latEl.value = "";
      if (lngEl) lngEl.value = "";
    }
    var mapsLink = item.querySelector("[data-ai-maps-link]");
    if (mapsLink) {
      mapsLink.href = _mapsUrlDetalheEdit(place.place_id, place.formatted_address || place.name);
      mapsLink.style.display = "flex";
    }
  });
}

function _renderAIItemCardDet(item, idx, uid, dragAttrs, isDark) {
  dragAttrs = dragAttrs || "";
  isDark = isDark || false;
  var cCard  = isDark ? "#1e293b" : "#f8fafc";
  var cBorda = isDark ? "#334155" : "#e2e8f0";
  var cForm  = isDark ? "#0f172a" : "#f1f5f9";
  var cLabel = isDark ? "#94a3b8" : "#64748b";
  var cText  = isDark ? "#f1f5f9" : "#0f172a";
  var nome = item.nome || "";
  var endereco = item.endereco || "";
  var placeId = item.placeId || "";
  var latitude = item.latitude != null ? item.latitude : "";
  var longitude = item.longitude != null ? item.longitude : "";
  var custo = _parseCustoAIDet(item.custo);
  var custoLabel = custo !== "" ? "$ " + custo : "$";
  var obs = String(item.observacoes || "").trim();
  return '<div data-ai-item ' + dragAttrs + ' style="margin-top:5px;">'
    + '<div style="background:' + cCard + ';border:1px solid ' + cBorda + ';border-radius:8px;display:flex;align-items:center;gap:8px;padding:7px 10px;">'
    + '<div style="background:#f97316;color:#fff;min-width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.75rem;flex-shrink:0;">' + (idx + 1) + '</div>'
    + '<div style="flex:1;min-width:0;">'
    + '<div data-ai-title style="font-weight:700;font-size:.85rem;color:' + cText + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(nome || 'Local') + '</div>'
    + '<div data-ai-address style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:' + (endereco ? '' : 'none') + ';">'
    + (endereco ? '<i class="bi bi-geo-alt me-1"></i>' + escapeHtml(endereco) : '')
    + '</div>'
    + (window.placeCategoryBadgeHtml ? window.placeCategoryBadgeHtml([window.inferPlaceType ? window.inferPlaceType(nome) : 'tourist_attraction']) : '')
    + '<div data-ai-obs-display style="display:' + (obs ? '' : 'none') + ';font-size:.72rem;color:#94a3b8;margin-top:2px;"><i class="bi bi-pencil-fill me-1"></i><span>' + escapeHtml(obs) + '</span></div>'
    + '</div>'
    + '<div data-ai-cost-display style="min-width:48px;text-align:right;font-size:.8rem;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #ffffff;border-radius:4px;padding:2px 6px;flex-shrink:0;">' + escapeHtml(String(custoLabel)) + '</div>'
    + '<div style="display:flex;gap:4px;flex-shrink:0;">'
    + '<button type="button" class="btn btn-sm btn-outline-secondary" data-ai-edit="' + uid + '" title="Editar"><i class="bi bi-pencil"></i></button>'
    + '<button type="button" class="btn btn-sm btn-outline-danger" data-ai-del title="Remover"><i class="bi bi-trash"></i></button>'
    + '</div>'
    + '</div>'
    + '<div id="aiedit-det-' + uid + '" style="display:none;background:' + cForm + ';border:1px solid ' + cBorda + ';border-radius:0 0 8px 8px;padding:8px 10px;margin-top:-1px;">'
    + '<div class="row g-2">'
    + '<div class="col-12">'
    + '<label style="font-size:.72rem;font-weight:700;color:' + cLabel + ';">Local</label>'
    + '<div style="font-size:.88rem;font-weight:700;color:' + cText + ';padding:3px 0 1px;">' + escapeHtml(nome || '') + '</div>'
    + '<input type="hidden" data-ai-nome value="' + escapeHtml(nome) + '">'
    + '<input type="hidden" data-ai-place-id value="' + escapeHtml(placeId) + '">'
    + '<input type="hidden" data-ai-lat value="' + escapeHtml(String(latitude)) + '">'
    + '<input type="hidden" data-ai-lng value="' + escapeHtml(String(longitude)) + '">'
    + '<div data-ai-endereco style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;display:' + (endereco ? '' : 'none') + ';">' + escapeHtml(endereco) + '</div>'
    + '<a data-ai-maps-link href="' + (placeId ? _mapsUrlDetalheEdit(placeId, endereco || nome) : '#') + '" target="_blank" style="font-size:.7rem;color:#3b82f6;text-decoration:none;display:' + (placeId ? 'flex' : 'none') + ';align-items:center;gap:3px;margin-top:2px;"><i class="bi bi-map-fill"></i>Ver no Maps</a>'
    + '</div>'
    + '<div class="col-12">'
    + '<label style="font-size:.72rem;font-weight:700;color:' + cLabel + ';">Custo ($)</label>'
    + '<input type="number" min="0" step="0.01" class="form-control form-control-sm" data-ai-custo value="' + escapeHtml(String(custo)) + '" placeholder="$">'
    + '</div>'
    + '<div class="col-12">'
    + '<label style="font-size:.72rem;font-weight:700;color:' + cLabel + ';">Observações</label>'
    + '<input type="text" class="form-control form-control-sm" data-ai-obs value="' + escapeHtml(item.observacoes || '') + '" placeholder="Opcional">'
    + '</div>'
    + '</div>'
    + '<div class="d-flex gap-2 mt-2">'
    + '<button type="button" class="btn btn-sm btn-primary-orange" data-ai-salvar="' + uid + '"><i class="bi bi-check-lg me-1"></i>Salvar</button>'
    + '<button type="button" class="btn btn-sm btn-outline-secondary" data-ai-cancelar="' + uid + '">Cancelar</button>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function _renderLocalCardDet(l, idx, dragAttrs, isDark) {
  dragAttrs = dragAttrs || "";
  isDark = isDark || false;
  var cCard  = isDark ? "#1e293b" : "#f8fafc";
  var cBorda = isDark ? "#334155" : "#e2e8f0";
  var cForm  = isDark ? "#0f172a" : "#f1f5f9";
  var cLabel = isDark ? "#94a3b8" : "#64748b";
  var cText  = isDark ? "#f1f5f9" : "#0f172a";
  var vid = String(l.idRoteiroLocal);
  var horFmt = _formatarHorarioDetalhe(l.horario) || "";
  var maxDiaAttr = _diasTotaisDetalheEdit > 0 ? ' max="' + _diasTotaisDetalheEdit + '"' : '';
  var custoVal = l.custo != null ? String(l.custo) : "";
  var custoLabel = custoVal !== "" ? "$ " + custoVal : "$";
  return '<div id="lwrap-' + vid + '" ' + dragAttrs + ' style="margin-top:5px;">'
    + '<div style="background:' + cCard + ';border:1px solid ' + cBorda + ';border-radius:8px;display:flex;align-items:center;gap:8px;padding:7px 10px;">'
    + '<div style="background:#f97316;color:#fff;min-width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.75rem;flex-shrink:0;">' + (idx + 1) + '</div>'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="font-weight:700;font-size:.85rem;color:' + cText + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(l.nome || 'Local') + '</div>'
    + (l.endereco ? '<div style="font-size:.72rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><i class="bi bi-geo-alt me-1"></i>' + escapeHtml(l.endereco) + '</div>' : '')
    + (window.placeCategoryBadgeHtml && (l.tipo || l.nome) ? window.placeCategoryBadgeHtml([l.tipo || (window.inferPlaceType ? window.inferPlaceType(l.nome) : 'tourist_attraction')]) : '')
    + '<span id="det-rating-' + vid + '" data-mr-rating-id="det-rating-' + vid + '" data-mr-rating-nome="' + escapeHtml(l.nome || '') + '" data-mr-rating-pid="' + escapeHtml(l.placeId || '') + '" style="display:none;font-size:.7rem;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:999px;align-items:center;gap:3px;"></span>'
    + (l.observacoes ? '<div style="font-size:.72rem;color:' + cLabel + ';">' + escapeHtml(l.observacoes) + '</div>' : '')
    + '</div>'
    + '<div id="lcusto-display-' + vid + '" style="min-width:48px;text-align:right;font-size:.8rem;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #ffffff;border-radius:4px;padding:2px 6px;flex-shrink:0;">' + escapeHtml(custoLabel) + '</div>'
    + '<div style="display:flex;gap:4px;flex-shrink:0;">'
    + '<button class="btn btn-sm btn-outline-secondary" data-edit-vinculo="' + vid + '" title="Editar"><i class="bi bi-pencil"></i></button>'
    + '<button class="btn btn-sm btn-outline-danger" data-del-local="' + l.idLocal + '" data-del-vinculo="' + vid + '" title="Remover"><i class="bi bi-trash"></i></button>'
    + '</div>'
    + '</div>'
    + '<div id="ledit-' + vid + '" style="display:none;background:' + cForm + ';border:1px solid ' + cBorda + ';border-radius:0 0 8px 8px;padding:10px 12px;margin-top:-1px;">'
    + '<input type="hidden" id="ledit-dia-' + vid + '" value="' + (l.dia || '') + '">'
    + '<div style="margin-bottom:8px;">'
    + '<label style="font-size:.72rem;font-weight:700;color:' + cLabel + ';">Local</label>'
    + '<div style="font-size:.88rem;font-weight:700;color:' + cText + ';padding:3px 0 1px;">' + escapeHtml(l.nome || '') + '</div>'
    + (l.endereco ? '<div style="font-size:.72rem;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(l.endereco) + '</div>' : '')
    + (l.placeId ? '<a href="' + _mapsUrlDetalheEdit(l.placeId, l.endereco || l.nome) + '" target="_blank" style="font-size:.7rem;color:#3b82f6;text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-top:2px;"><i class="bi bi-map-fill"></i>Ver no Maps</a>' : '')
    + '</div>'
    + '<div class="row g-2">'
    + '<div class="col-12"><label style="font-size:.75rem;font-weight:700;color:' + cText + ';">Custo ($)</label>'
    + '<input type="number" min="0" step="0.01" class="form-control form-control-sm" id="ledit-custo-' + vid + '" value="' + escapeHtml(custoVal) + '" placeholder="$"></div>'
    + '<div class="col-12"><label style="font-size:.75rem;font-weight:700;color:' + cText + ';">Observações</label>'
    + '<input type="text" class="form-control form-control-sm" id="ledit-obs-' + vid + '" value="' + escapeHtml(l.observacoes || '') + '" placeholder="Opcional"></div>'
    + '</div>'
    + '<div class="d-flex gap-2 mt-2">'
    + '<button class="btn btn-sm btn-primary-orange" data-salvar-vinculo="' + vid + '" data-salvar-local="' + l.idLocal + '" data-salvar-ordem="' + (l.ordem || 0) + '" data-salvar-status="' + (l.status || 'PLANEJADO') + '"><i class="bi bi-check-lg me-1"></i>Salvar</button>'
    + '<button class="btn btn-sm btn-outline-secondary" data-cancelar-vinculo="' + vid + '">Cancelar</button>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function _atualizarObservacaoSugestaoDetalhe(uid, obs) {
  if (!_roteiroDetalheEdit || !Array.isArray(_roteiroDetalheEdit.sugestoes) || !uid) return;
  var parts = String(uid).split("-");
  var item = null;
  if (parts[0] === "p" && parts.length >= 4) {
    var dIdxP = parseInt(parts[1], 10);
    var perKey = parts[2];
    var idxP = parseInt(parts[3], 10);
    item = _roteiroDetalheEdit.sugestoes[dIdxP]
      && _roteiroDetalheEdit.sugestoes[dIdxP].periodos
      && _roteiroDetalheEdit.sugestoes[dIdxP].periodos[perKey]
      && _roteiroDetalheEdit.sugestoes[dIdxP].periodos[perKey][idxP];
  } else if (parts[0] === "l" && parts.length >= 3) {
    var dIdxL = parseInt(parts[1], 10);
    var idxL = parseInt(parts[2], 10);
    item = _roteiroDetalheEdit.sugestoes[dIdxL]
      && _roteiroDetalheEdit.sugestoes[dIdxL].locais
      && _roteiroDetalheEdit.sugestoes[dIdxL].locais[idxL];
  }
  if (!item || typeof item !== "object") return;
  var texto = String(obs || "").trim();
  if (texto) item.observacoes = texto;
  else delete item.observacoes;
}

async function _autoLookupAIAddressesDet(lista, cidade) {
  _setLookupAiDetalhePendente(true);
  try {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    var svc = new google.maps.places.PlacesService(document.createElement("div"));
    var items = Array.from(lista.querySelectorAll("[data-ai-item]"));
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var pidEl = item.querySelector("[data-ai-place-id]");
      var latAtual = parseFloat((item.querySelector("[data-ai-lat]") || {}).value || "");
      var lngAtual = parseFloat((item.querySelector("[data-ai-lng]") || {}).value || "");
      if (pidEl && pidEl.value && Number.isFinite(latAtual) && Number.isFinite(lngAtual) && !(latAtual === 0 && lngAtual === 0)) continue;
      var nomeInput = item.querySelector("[data-ai-nome]");
      var nome = nomeInput ? nomeInput.value.trim() : "";
      if (!nome) continue;
      try {
        var query = cidade ? nome + ", " + cidade : nome;
        var place = await new Promise(function(resolve) {
          svc.textSearch({ query: query }, function(results, status) {
            resolve(status === google.maps.places.PlacesServiceStatus.OK && results && results.length ? results[0] : null);
          });
        });
        if (!place) continue;
        if (place.formatted_address) {
          var addrEl = item.querySelector("[data-ai-address]");
          if (addrEl) { addrEl.innerHTML = '<i class="bi bi-geo-alt me-1"></i>' + escapeHtml(place.formatted_address); addrEl.style.display = ""; }
          var endEl = item.querySelector("[data-ai-endereco]");
          if (endEl) { endEl.textContent = place.formatted_address; endEl.style.display = ""; }
        }
        if (place.place_id && pidEl) {
          pidEl.value = place.place_id;
          var mapsLink = item.querySelector("[data-ai-maps-link]");
          if (mapsLink) { mapsLink.href = _mapsUrlDetalheEdit(place.place_id, place.formatted_address || place.name); mapsLink.style.display = "flex"; }
        }
        if (place.geometry && place.geometry.location) {
          var latEl = item.querySelector("[data-ai-lat]");
          var lngEl = item.querySelector("[data-ai-lng]");
          if (latEl) latEl.value = place.geometry.location.lat();
          if (lngEl) lngEl.value = place.geometry.location.lng();
        }
      } catch (e) { /* place not found, skip */ }
    }
  } catch (e) { /* API unavailable, skip entirely */ }
  finally { _setLookupAiDetalhePendente(false); }
}

function renderLocaisDetalheEditAI() {
  var lista = document.getElementById("listaLocaisDetalheEdit");
  var vazio = document.getElementById("vazioLocaisDetalheEdit");

  if (vazio) vazio.style.display = "none";
  if (!lista) return;

  var isDark  = document.documentElement.getAttribute("data-theme") === "dark";
  var cCard   = isDark ? "#1e293b" : "#f8fafc";
  var cBorda  = isDark ? "#334155" : "#e2e8f0";
  var cLabel  = isDark ? "#94a3b8" : "#64748b";
  var cForm   = isDark ? "#0f172a" : "#f1f5f9";
  var cBody   = isDark ? "#0f172a" : "#fff";
  var cHead   = isDark ? "#1e293b" : "#f1f5f9";
  var cText   = isDark ? "#f1f5f9" : "#0f172a";

  var sugestoes = _roteiroDetalheEdit.sugestoes;

  var html = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 14px;margin-bottom:10px;">'
    + '<div class="d-flex align-items-center gap-2">'
    + '<i class="bi bi-stars" style="color:#2563eb;font-size:1.1rem;"></i>'
    + '<span style="font-size:.85rem;font-weight:700;color:#1e40af;">Roteiro gerado por IA — edite os locais e custos abaixo</span>'
    + '</div></div>';

  sugestoes.forEach(function(diaObj, dIdx) {
    var temPeriodos = diaObj.periodos && typeof diaObj.periodos === "object";
    var colId = 'ai-dia-det-' + dIdx;
    var diaNum = diaObj.dia || (dIdx + 1);
    var locaisDesteDia = _locaisDetalheEdit.filter(function(l) { return (l.dia || 0) === diaNum; });
    var totalLocais = (temPeriodos
      ? _PERIODOS_AI_EDIT.reduce(function(s, p) { return s + _contarLocaisDetalheEdit(diaObj.periodos[p.key] || []); }, 0)
      : _contarLocaisDetalheEdit(diaObj.locais || []))
      + _contarLocaisDetalheEdit(locaisDesteDia);

    html += '<div class="mb-2" data-ai-dia-idx="' + dIdx + '" style="border:1px solid ' + cBorda + ';border-radius:10px;overflow:hidden;">';
    html += '<button type="button"'
      + ' class="w-100 d-flex align-items-center justify-content-between gap-3 px-3 py-2 border-0"'
      + ' style="background:' + cHead + ';cursor:pointer;"'
      + ' data-bs-toggle="collapse" data-bs-target="#' + colId + '" aria-expanded="' + (dIdx === 0 ? "true" : "false") + '">'
      + '<span style="font-size:.85rem;font-weight:800;color:' + cText + ';">Dia ' + (diaObj.dia || (dIdx + 1)) + '</span>'
      + '<div class="d-flex align-items-center gap-2">'
      + '<span style="font-size:.72rem;font-weight:700;color:#6366f1;">' + totalLocais + ' ' + (totalLocais === 1 ? 'local' : 'locais') + '</span>'
      + '<i class="bi bi-chevron-down" style="color:#94a3b8;font-size:.75rem;transition:transform .2s;"></i>'
      + '</div>'
      + '</button>';
    html += '<div id="' + colId + '" class="collapse ' + (dIdx === 0 ? 'show' : '') + '">';
    html += '<div style="padding:10px 12px;background:' + cBody + ';">';

    if (temPeriodos) {
      var janelaPeriodos = _janelaPeriodosDiaDetalhe(diaNum);
      _PERIODOS_AI_EDIT.forEach(function(per, pidx) {
        if (pidx < janelaPeriodos.inicio || pidx > janelaPeriodos.fim) return;

        var todosItens = diaObj.periodos[per.key] || [];
        var itens = todosItens.filter(function(item, lidx) {
          if (_ehCheckinDetalhe(item) || _ehCheckoutDetalhe(item)) return true;
          if (pidx === janelaPeriodos.inicio && lidx < janelaPeriodos.checkinPos) return false;
          if (pidx === janelaPeriodos.fim && lidx > janelaPeriodos.checkoutPos) return false;
          return true;
        });
        var locaisDestePer = locaisDesteDia.filter(function(l) {
          var hNorm = _normalizarHorarioDetalhe(l.horario);
          if (!hNorm) return false;
          var h = hNorm.slice(0, 5);
          if (per.key === 'manha') return h < '12:00';
          if (per.key === 'tarde') return h >= '12:00' && h < '18:00';
          return h >= '18:00';
        });
        var totalPerContavel = _contarLocaisDetalheEdit(itens) + _contarLocaisDetalheEdit(locaisDestePer);
        var perColId = 'per-' + per.key + '-' + dIdx;
        html += '<div class="mb-1" data-ai-per="' + per.key + '">';
        html += '<button type="button"'
          + ' class="w-100 d-flex align-items-center justify-content-between border-0 px-2 py-1"'
          + ' style="background:' + per.cor + '18;border-radius:8px;cursor:pointer;"'
          + ' data-bs-toggle="collapse" data-bs-target="#' + perColId + '" aria-expanded="true">'
          + '<div style="display:flex;align-items:center;gap:6px;">'
          + '<i class="bi ' + per.icon + '" style="color:' + per.cor + ';font-size:.82rem;"></i>'
          + '<span style="font-size:.78rem;font-weight:700;color:' + per.cor + ';">' + per.label + '</span>'
          + '<span style="font-size:.68rem;font-weight:700;color:' + per.cor + ';opacity:.7;">' + totalPerContavel + ' ' + (totalPerContavel === 1 ? 'local' : 'locais') + '</span>'
          + '</div>'
          + '<i class="bi bi-chevron-down" style="color:' + per.cor + ';font-size:.72rem;transition:transform .2s;opacity:.7;"></i>'
          + '</button>';
        html += '<div id="' + perColId + '" class="collapse show" style="padding:4px 0 0 0;">';
        itens.forEach(function(item, idx) {
          var uid = 'p-' + dIdx + '-' + per.key + '-' + idx;
          var da = 'draggable="true" data-drag-type="ai" data-drag-uid="' + uid + '" data-drag-per="' + per.key + '"';
          html += _renderAIItemCardDet(item, idx, uid, da, isDark);
        });
        locaisDestePer.forEach(function(l, idx) {
          var da = 'draggable="true" data-drag-type="local" data-drag-vid="' + l.idRoteiroLocal + '" data-drag-per="' + per.key + '"';
          html += _renderLocalCardDet(l, itens.length + idx, da, isDark);
        });
        html += '</div></div>';
      });
      var locaisSemPer = locaisDesteDia.filter(function(l) { return !_normalizarHorarioDetalhe(l.horario); });
      if (locaisSemPer.length > 0) {
        html += '<div class="mt-2 pt-2" style="border-top:1px solid #e2e8f0;">'
          + '<div style="font-size:.75rem;font-weight:700;color:#64748b;margin-bottom:5px;"><i class="bi bi-pin-map me-1"></i>Sem período</div>';
        locaisSemPer.forEach(function(l, idx) {
          var da = 'draggable="true" data-drag-type="local" data-drag-vid="' + l.idRoteiroLocal + '" data-drag-per="sem-periodo"';
          html += _renderLocalCardDet(l, idx, da, isDark);
        });
        html += '</div>';
      }
    } else {
      var itens = diaObj.locais || [];
      html += '<div data-ai-per="locais">';
      itens.forEach(function(item, idx) {
        var uid = 'l-' + dIdx + '-' + idx;
        var da = 'draggable="true" data-drag-type="ai" data-drag-uid="' + uid + '" data-drag-per="locais"';
        html += _renderAIItemCardDet(item, idx, uid, da, isDark);
      });
      html += '</div>';
      if (locaisDesteDia.length > 0) {
        html += '<div class="mt-2 pt-2" style="border-top:1px solid #e2e8f0;">'
          + '<div style="font-size:.75rem;font-weight:700;color:#f97316;margin-bottom:5px;"><i class="bi bi-pin-map me-1"></i>Locais adicionados</div>';
        locaisDesteDia.forEach(function(l, idx) {
          var da = 'draggable="true" data-drag-type="local" data-drag-vid="' + l.idRoteiroLocal + '" data-drag-per="locais"';
          html += _renderLocalCardDet(l, itens.length + idx, da, isDark);
        });
        html += '</div>';
      }
    }

    html += '</div></div></div>';
  });

  html += '<button type="button" id="btnSalvarSugestoesAI" class="btn btn-primary-orange w-100 fw-bold mt-2">'
    + '<i class="bi bi-check-lg me-1"></i>Salvar Sugestões IA</button>';

  lista.innerHTML = html;

  lista.querySelectorAll("[data-ai-nome]").forEach(function(input) { _initAIItemAutocompleteDet(input); });

  lista.querySelectorAll("[data-ai-edit]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var uid = btn.getAttribute("data-ai-edit");
      var form = document.getElementById("aiedit-det-" + uid);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-ai-salvar]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var uid = btn.getAttribute("data-ai-salvar");
      var item = btn.closest("[data-ai-item]");
      var custoInput = item && item.querySelector("[data-ai-custo]");
      var costBox = item && item.querySelector("[data-ai-cost-display]");
      var obsInput = item && item.querySelector("[data-ai-obs]");
      var obsBox = item && item.querySelector("[data-ai-obs-display]");
      var obsText = obsBox && obsBox.querySelector("span");
      if (costBox && custoInput) costBox.textContent = custoInput.value.trim() ? "$ " + custoInput.value.trim() : "$";
      var obs = obsInput ? obsInput.value.trim() : "";
      if (obsBox && obsText) {
        obsText.textContent = obs;
        obsBox.style.display = obs ? "" : "none";
      }
      _atualizarObservacaoSugestaoDetalhe(uid, obs);
      if (!_lookupAiDetalhePendente) _salvarSugestoesAISilenciosoDetalhe();
      var form = document.getElementById("aiedit-det-" + uid);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-ai-cancelar]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var uid = btn.getAttribute("data-ai-cancelar");
      var form = document.getElementById("aiedit-det-" + uid);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-ai-custo]").forEach(function(input) {
    input.addEventListener("input", function() {
      var item = input.closest("[data-ai-item]");
      var costBox = item && item.querySelector("[data-ai-cost-display]");
      if (costBox) costBox.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  lista.querySelectorAll("[data-ai-del]").forEach(function(btn) {
    btn.addEventListener("click", function() { btn.closest("[data-ai-item]").remove(); });
  });

  lista.querySelectorAll("[data-edit-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var vid = btn.getAttribute("data-edit-vinculo");
      var form = document.getElementById("ledit-" + vid);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-cancelar-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var vid = btn.getAttribute("data-cancelar-vinculo");
      var form = document.getElementById("ledit-" + vid);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-salvar-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var vid     = btn.getAttribute("data-salvar-vinculo");
      var idLocal = btn.getAttribute("data-salvar-local");
      var ordem   = parseInt(btn.getAttribute("data-salvar-ordem")) || 1;
      var status  = btn.getAttribute("data-salvar-status") || "PLANEJADO";
      var dia     = parseInt(document.getElementById("ledit-dia-" + vid).value) || null;
      var obs     = document.getElementById("ledit-obs-" + vid).value.trim() || null;
      var custoRawDet = document.getElementById("ledit-custo-" + vid) ? document.getElementById("ledit-custo-" + vid).value.trim() : "";
      var custo = custoRawDet !== "" ? parseFloat(custoRawDet) : null;
      var horario = (_locaisDetalheEdit.find(function(l) { return String(l.idRoteiroLocal) === String(vid); }) || {}).horario || null;

      if (!dia) { alert("Informe o dia da atividade."); return; }
      if (_diasTotaisDetalheEdit > 0 && dia > _diasTotaisDetalheEdit) {
        alert("O dia não pode ultrapassar a duração do roteiro (" + _diasTotaisDetalheEdit + " dias)."); return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        var res = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais/" + idLocal, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idLocal: parseInt(idLocal), dia: dia, ordem: ordem, observacoes: obs, horario: horario, status: status, custo: custo })
        });
        if (res.ok) {
          var updated = await res.json();
          var idx = _locaisDetalheEdit.findIndex(function(l) { return String(l.idRoteiroLocal) === String(vid); });
          if (idx !== -1) _locaisDetalheEdit[idx] = updated;
          renderLocaisDetalheEdit();
          _atualizarMapaDetalheEdit();
        } else { alert("Erro ao salvar. HTTP " + res.status); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar'; }
      } catch(e) { alert("Erro ao conectar."); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar'; }
    });
  });

  lista.querySelectorAll("[id^='ledit-custo-']").forEach(function(input) {
    var vid = input.id.replace("ledit-custo-", "");
    input.addEventListener("input", function() {
      var display = document.getElementById("lcusto-display-" + vid);
      if (display) display.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  lista.querySelectorAll("[data-del-local]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var idLocal   = btn.getAttribute("data-del-local");
      var idVinculo = btn.getAttribute("data-del-vinculo");
      btn.disabled = true;
      try {
        var r = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais/" + idLocal, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisDetalheEdit = _locaisDetalheEdit.filter(function(l) { return String(l.idRoteiroLocal) !== String(idVinculo); });
          renderLocaisDetalheEdit();
          _atualizarMapaDetalheEdit();
        } else { alert("Erro ao remover. HTTP " + r.status); btn.disabled = false; }
      } catch(e) { alert("Erro ao conectar."); btn.disabled = false; }
    });
  });

  lista.querySelectorAll("[data-ai-add-item]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var perDiv  = btn.closest("[data-ai-per]");
      var nextIdx = perDiv.querySelectorAll("[data-ai-item]").length;
      var uid = "new-" + Date.now() + "-" + nextIdx;
      var html = _renderAIItemCardDet({ nome: "", endereco: "", placeId: "", custo: "" }, nextIdx, uid);
      btn.insertAdjacentHTML("beforebegin", html);
      var inserted = btn.previousElementSibling;
      inserted.querySelector("[data-ai-del]").addEventListener("click", function() { inserted.remove(); });
      inserted.querySelector("[data-ai-edit]").addEventListener("click", function() {
        var form = document.getElementById("aiedit-det-" + uid);
        if (form) { form.style.display = form.style.display === "none" ? "" : "none"; }
      });
      inserted.querySelector("[data-ai-custo]").addEventListener("input", function() {
        var costBox = inserted.querySelector("[data-ai-cost-display]");
        if (costBox) costBox.textContent = inserted.querySelector("[data-ai-custo]").value.trim() ? "$ " + inserted.querySelector("[data-ai-custo]").value.trim() : "$";
      });
      _initAIItemAutocompleteDet(inserted.querySelector("[data-ai-nome]"));
      var form = document.getElementById("aiedit-det-" + uid);
      if (form) form.style.display = "";
    });
  });

  var btnSalvar = document.getElementById("btnSalvarSugestoesAI");
  if (btnSalvar) btnSalvar.addEventListener("click", _salvarSugestoesAI);

  _initDragDropDet(lista);
  _autoLookupAIAddressesDet(lista, _roteiroDetalheEdit ? _roteiroDetalheEdit.cidade : "");
}

function _initDragDropDet(lista) {
  var _dragSrc = null;

  lista.querySelectorAll("[data-drag-type]").forEach(function(el) {
    el.style.cursor = "grab";

    el.addEventListener("dragstart", function(e) {
      if (e.target.closest("button, input, a")) { e.preventDefault(); return; }
      _dragSrc = el;
      el.style.opacity = "0.45";
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "drag");
    });

    el.addEventListener("dragend", function() {
      el.style.opacity = "";
      lista.querySelectorAll("[data-drag-over]").forEach(function(x) {
        x.style.outline = "";
        x.removeAttribute("data-drag-over");
      });
      _dragSrc = null;
    });

    el.addEventListener("dragover", function(e) {
      if (!_dragSrc || _dragSrc === el) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!el.getAttribute("data-drag-over")) {
        lista.querySelectorAll("[data-drag-over]").forEach(function(x) { x.style.outline = ""; x.removeAttribute("data-drag-over"); });
        el.setAttribute("data-drag-over", "1");
        el.style.outline = "2px dashed #6366f1";
      }
    });

    el.addEventListener("dragleave", function(e) {
      if (!el.contains(e.relatedTarget)) {
        el.style.outline = "";
        el.removeAttribute("data-drag-over");
      }
    });

    el.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      el.style.outline = "";
      el.removeAttribute("data-drag-over");
      if (!_dragSrc || _dragSrc === el) return;

      var srcType  = _dragSrc.getAttribute("data-drag-type");
      var srcPer   = _dragSrc.getAttribute("data-drag-per");
      var tgtPer   = el.getAttribute("data-drag-per");
      var diaEl    = _dragSrc.closest("[data-ai-dia-idx]");
      if (!diaEl) return;
      var diaIdx   = parseInt(diaEl.getAttribute("data-ai-dia-idx"));
      var before   = e.clientY < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;

      // ── AI item ──────────────────────────────────────────────────
      if (srcType === "ai") {
        var srcUid  = _dragSrc.getAttribute("data-drag-uid");
        var parts   = srcUid.split("-"); // "p-0-manha-0" or "l-0-0"
        var srcPerKey = parts[0] === "p" ? parts[2] : "locais";
        var srcIdx  = parseInt(parts[parts.length - 1]);

        var diaObj  = (_roteiroDetalheEdit.sugestoes || [])[diaIdx];
        if (!diaObj) return;
        var pool    = diaObj.periodos || diaObj;
        var srcArr  = (diaObj.periodos ? pool[srcPerKey] : diaObj.locais) || [];
        var moved   = srcArr.splice(srcIdx, 1)[0];
        if (moved === undefined) { srcArr.splice(srcIdx, 0, moved); return; }
        if (diaObj.periodos) pool[srcPerKey] = srcArr; else diaObj.locais = srcArr;

        var tgtPerKey = tgtPer || srcPerKey;
        var tgtArr  = (diaObj.periodos ? (diaObj.periodos[tgtPerKey] || []) : (diaObj.locais || []));

        var insertAt;
        if (el.getAttribute("data-drag-type") === "ai") {
          var tParts = (el.getAttribute("data-drag-uid") || "").split("-");
          var tIdx   = parseInt(tParts[tParts.length - 1]);
          if (srcPerKey === tgtPerKey && srcIdx < tIdx) tIdx--;
          insertAt   = before ? tIdx : tIdx + 1;
        } else {
          insertAt   = tgtArr.length;
        }
        tgtArr.splice(Math.max(0, Math.min(insertAt, tgtArr.length)), 0, moved);
        if (diaObj.periodos) diaObj.periodos[tgtPerKey] = tgtArr; else diaObj.locais = tgtArr;
        renderLocaisDetalheEditAI();

      // ── Real local ───────────────────────────────────────────────
      } else if (srcType === "local") {
        if (srcPer === tgtPer) return;
        var srcVid = _dragSrc.getAttribute("data-drag-vid");
        var local  = _locaisDetalheEdit.find(function(l) { return String(l.idRoteiroLocal) === srcVid; });
        if (!local) return;
        var newHor = tgtPer === "manha" ? "08:00:00" : tgtPer === "tarde" ? "14:00:00" : tgtPer === "noite" ? "20:00:00" : null;
        if (!newHor) return;
        authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais/" + local.idLocal, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idLocal: local.idLocal, dia: local.dia, ordem: local.ordem || 1, observacoes: local.observacoes, horario: newHor, status: local.status || "PLANEJADO", custo: local.custo })
        }).then(function(res) {
          if (!res.ok) { alert("Erro ao mover. HTTP " + res.status); return; }
          return res.json().then(function(updated) {
            var i = _locaisDetalheEdit.findIndex(function(l) { return String(l.idRoteiroLocal) === srcVid; });
            if (i !== -1) _locaisDetalheEdit[i] = updated;
            renderLocaisDetalheEditAI();
          });
        }).catch(function() { alert("Erro de conexão."); });
      }
    });
  });

  // Período vazio como zona de drop
  lista.querySelectorAll("[data-ai-per]").forEach(function(perEl) {
    perEl.addEventListener("dragover", function(e) { if (_dragSrc) e.preventDefault(); });
    perEl.addEventListener("drop", function(e) {
      if (e.target.closest("[data-drag-type]")) return;
      e.preventDefault();
      if (!_dragSrc || _dragSrc.getAttribute("data-drag-type") !== "ai") return;
      var tgtPerKey = perEl.getAttribute("data-ai-per");
      var srcUid    = _dragSrc.getAttribute("data-drag-uid");
      var parts     = srcUid.split("-");
      var srcPerKey = parts[0] === "p" ? parts[2] : "locais";
      if (srcPerKey === tgtPerKey) return;
      var diaEl     = perEl.closest("[data-ai-dia-idx]");
      if (!diaEl) return;
      var diaIdx    = parseInt(diaEl.getAttribute("data-ai-dia-idx"));
      var srcIdx    = parseInt(parts[parts.length - 1]);
      var diaObj    = (_roteiroDetalheEdit.sugestoes || [])[diaIdx];
      if (!diaObj || !diaObj.periodos) return;
      var srcArr    = diaObj.periodos[srcPerKey] || [];
      var moved     = srcArr.splice(srcIdx, 1)[0];
      if (moved === undefined) return;
      diaObj.periodos[srcPerKey] = srcArr;
      var tgtArr    = diaObj.periodos[tgtPerKey] || [];
      tgtArr.push(moved);
      diaObj.periodos[tgtPerKey] = tgtArr;
      renderLocaisDetalheEditAI();
    });
  });
}

function _getAiSugestoesEditadas() {
  var lista = document.getElementById("listaLocaisDetalheEdit");
  if (!lista || !_roteiroDetalheEdit) return null;
  var sugestoes = _roteiroDetalheEdit.sugestoes;
  var result = [];
  function _coordsValidas(latVal, lngVal) {
    var lat = parseFloat(latVal);
    var lng = parseFloat(lngVal);
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  }

  lista.querySelectorAll("[data-ai-dia-idx]").forEach(function(diaEl, dIdx) {
    var diaOriginal = sugestoes[dIdx] || {};
    var temPeriodos = diaOriginal.periodos && typeof diaOriginal.periodos === "object";
    var obj = { dia: diaOriginal.dia || (dIdx + 1) };

    if (temPeriodos) {
      obj.periodos = {};
      diaEl.querySelectorAll("[data-ai-per]").forEach(function(perEl) {
        var perKey = perEl.getAttribute("data-ai-per");
        var itens = [];
        perEl.querySelectorAll("[data-ai-item]").forEach(function(itemEl) {
          var nome     = (itemEl.querySelector("[data-ai-nome]")  || {}).value || "";
          var custoRaw = (itemEl.querySelector("[data-ai-custo]") || {}).value || "";
          var custoNum = custoRaw !== "" ? parseFloat(custoRaw) : null;
          var custo    = custoNum != null ? "R$ " + custoNum.toLocaleString("pt-BR", {minimumFractionDigits: 0, maximumFractionDigits: 2}) : "";
          var endereco = ((itemEl.querySelector("[data-ai-endereco]") || {}).textContent || "").trim();
          var placeId  = ((itemEl.querySelector("[data-ai-place-id]") || {}).value || "").trim();
          var obs      = ((itemEl.querySelector("[data-ai-obs]")  || {}).value || "").trim();
          var latVal   = ((itemEl.querySelector("[data-ai-lat]") || {}).value || "").trim();
          var lngVal   = ((itemEl.querySelector("[data-ai-lng]") || {}).value || "").trim();
          if (!nome.trim() || !_coordsValidas(latVal, lngVal)) return;
          var obj2 = { nome: nome.trim(), custo: custo, latitude: parseFloat(latVal), longitude: parseFloat(lngVal) };
          if (endereco) obj2.endereco = endereco;
          if (placeId) obj2.placeId = placeId;
          if (obs) obj2.observacoes = obs;
          itens.push(obj2);
        });
        obj.periodos[perKey] = itens;
      });
    } else {
      var locais = [];
      diaEl.querySelectorAll("[data-ai-item]").forEach(function(itemEl) {
        var nome     = (itemEl.querySelector("[data-ai-nome]")  || {}).value || "";
        var custoRaw = (itemEl.querySelector("[data-ai-custo]") || {}).value || "";
        var custoNum = custoRaw !== "" ? parseFloat(custoRaw) : null;
        var custo    = custoNum != null ? "R$ " + custoNum.toLocaleString("pt-BR", {minimumFractionDigits: 0, maximumFractionDigits: 2}) : "";
        var endereco = ((itemEl.querySelector("[data-ai-endereco]") || {}).textContent || "").trim();
        var placeId  = ((itemEl.querySelector("[data-ai-place-id]") || {}).value || "").trim();
        var obs      = ((itemEl.querySelector("[data-ai-obs]")  || {}).value || "").trim();
        var latVal   = ((itemEl.querySelector("[data-ai-lat]") || {}).value || "").trim();
        var lngVal   = ((itemEl.querySelector("[data-ai-lng]") || {}).value || "").trim();
        if (!nome.trim() || !_coordsValidas(latVal, lngVal)) return;
        var objL = { nome: nome.trim(), custo: custo, latitude: parseFloat(latVal), longitude: parseFloat(lngVal) };
        if (endereco) objL.endereco = endereco;
        if (placeId) objL.placeId = placeId;
        if (obs) objL.observacoes = obs;
        locais.push(objL);
      });
      obj.locais = locais;
    }

    result.push(obj);
  });

  return result;
}

async function _salvarSugestoesAI() {
  if (_lookupAiDetalhePendente) {
    alert("Aguarde a preparação dos locais no mapa terminar antes de salvar.");
    return;
  }

  var btnSalvar = document.getElementById("btnSalvarSugestoesAI");
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }

  try {
    var sugestoesEditadas = _getAiSugestoesEditadas();
    if (!sugestoesEditadas) throw new Error("Erro ao coletar sugestões.");

    var r = _roteiroDetalheEdit;
    var body = {
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
      sugestoes:           sugestoesEditadas
    };

    var res = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    });

    if (res.ok) {
      var modal = document.getElementById("modalEditarDetalhe");
      if (modal) {
        var bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      }
      window.location.reload();
    } else {
      throw new Error("HTTP " + res.status);
    }
  } catch(e) {
    alert("Erro ao salvar sugestões: " + (e.message || "Erro desconhecido"));
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar Sugestões IA'; }
  }
}

async function _salvarSugestoesAISilenciosoDetalhe() {
  try {
    var sugestoesEditadas = _getAiSugestoesEditadas();
    if (!sugestoesEditadas || !_roteiroDetalheEdit) return;
    var r = _roteiroDetalheEdit;
    var body = {
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
      sugestoes:           sugestoesEditadas
    };
    var res = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    });
    if (res.ok) _roteiroDetalheEdit = Object.assign({}, _roteiroDetalheEdit, { sugestoes: sugestoesEditadas });
  } catch (_) {}
}

function _renderLocaisReaisDetalhe(lista) {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var cCard  = isDark ? "#1e293b" : "#f8fafc";
  var cBorda = isDark ? "#334155" : "#e2e8f0";
  var cForm  = isDark ? "#0f172a" : "#f1f5f9";
  var cLabel = isDark ? "#94a3b8" : "#64748b";
  var cText  = isDark ? "#f1f5f9" : "#0f172a";
  var locaisHtml = _agruparLocaisDetalhe(_locaisDetalheEdit)
    .map(function(grupo) {
      return '<section class="mb-2">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 6px;">'
        + '<div style="font-size:.82rem;font-weight:800;color:' + cText + ';">' + (grupo.dia ? 'Dia ' + grupo.dia : 'Sem dia definido') + '</div>'
        + '<div style="font-size:.72rem;font-weight:700;color:' + cLabel + ';">' + _contarLocaisDetalheEdit(grupo.itens) + ' ' + (_contarLocaisDetalheEdit(grupo.itens) === 1 ? 'local' : 'locais') + '</div>'
        + '</div>'
        + grupo.itens.map(function(l, idx) {
          var vid = String(l.idRoteiroLocal);
          return '<div class="mb-1" id="lwrap-' + vid + '">'
            + '<div class="d-flex align-items-center gap-2 p-2" style="background:' + cCard + ';border:1px solid ' + cBorda + ';border-radius:10px;">'
            + '<div style="background:#f97316;color:#fff;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.85rem;flex-shrink:0;">' + (idx + 1) + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
            + '<div class="fw-bold" style="font-size:.88rem;color:' + cText + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.nome || "Local") + '</div>'
            + (_formatarHorarioDetalhe(l.horario) ? '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:.72rem;font-weight:800;"><i class="bi bi-clock"></i>' + _formatarHorarioDetalhe(l.horario) + '</span>' : '')
            + '</div>'
            + (l.observacoes ? '<div style="font-size:.75rem;color:' + cLabel + ';">' + escapeHtml(l.observacoes) + '</div>' : '')
            + '</div>'
            + '<div style="display:flex;gap:4px;flex-shrink:0;">'
            + '<button class="btn btn-sm btn-outline-secondary" data-edit-vinculo="' + vid + '" title="Editar"><i class="bi bi-pencil"></i></button>'
            + '<button class="btn btn-sm btn-outline-danger" data-del-local="' + l.idLocal + '" data-del-vinculo="' + vid + '" title="Remover"><i class="bi bi-trash"></i></button>'
            + '</div>'
            + '</div>'
            + '<div id="ledit-' + vid + '" style="display:none;background:' + cForm + ';border:1px solid ' + cBorda + ';border-radius:0 0 10px 10px;padding:10px 12px;margin-top:-1px;">'
            + '<div class="row g-2">'
            + '<div class="col-6"><label style="font-size:.75rem;font-weight:700;color:' + cText + ';">Dia</label>'
            + '<input type="number" min="1"' + (_diasTotaisDetalheEdit > 0 ? ' max="' + _diasTotaisDetalheEdit + '"' : '') + ' class="form-control form-control-sm" id="ledit-dia-' + vid + '" value="' + (l.dia || "") + '"></div>'
            + '<div class="col-6"><label style="font-size:.75rem;font-weight:700;color:' + cText + ';">Custo ($)</label>'
            + '<input type="number" min="0" step="0.01" class="form-control form-control-sm" id="ledit-custo-' + vid + '" value="' + (l.custo != null ? String(l.custo) : "") + '" placeholder="$"></div>'
            + '<div class="col-12"><label style="font-size:.75rem;font-weight:700;color:' + cText + ';">Observações</label>'
            + '<input type="text" class="form-control form-control-sm" id="ledit-obs-' + vid + '" value="' + escapeHtml(l.observacoes || "") + '" placeholder="Opcional"></div>'
            + '</div>'
            + '<div class="d-flex gap-2 mt-2">'
            + '<button class="btn btn-sm btn-primary-orange" data-salvar-vinculo="' + vid + '" data-salvar-local="' + l.idLocal + '" data-salvar-ordem="' + (l.ordem || 0) + '" data-salvar-status="' + (l.status || "PLANEJADO") + '"><i class="bi bi-check-lg me-1"></i>Salvar</button>'
            + '<button class="btn btn-sm btn-outline-secondary" data-cancelar-vinculo="' + vid + '">Cancelar</button>'
            + '</div>'
            + '</div>'
            + '</div>';
        }).join("")
        + '</section>';
    }).join("");

  lista.insertAdjacentHTML("beforeend", locaisHtml);

  lista.querySelectorAll("[data-edit-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var vid = btn.getAttribute("data-edit-vinculo");
      var form = document.getElementById("ledit-" + vid);
      if (form) form.style.display = form.style.display === "none" ? "" : "none";
    });
  });

  lista.querySelectorAll("[data-cancelar-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var vid = btn.getAttribute("data-cancelar-vinculo");
      var form = document.getElementById("ledit-" + vid);
      if (form) form.style.display = "none";
    });
  });

  lista.querySelectorAll("[data-salvar-vinculo]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var vid    = btn.getAttribute("data-salvar-vinculo");
      var idLocal = btn.getAttribute("data-salvar-local");
      var ordem  = parseInt(btn.getAttribute("data-salvar-ordem")) || 1;
      var status = btn.getAttribute("data-salvar-status") || "PLANEJADO";
      var dia    = parseInt(document.getElementById("ledit-dia-" + vid).value) || null;
      var obs    = document.getElementById("ledit-obs-" + vid).value.trim() || null;
      var custoRawDet2 = document.getElementById("ledit-custo-" + vid) ? document.getElementById("ledit-custo-" + vid).value.trim() : "";
      var custo2 = custoRawDet2 !== "" ? parseFloat(custoRawDet2) : null;
      var horario = (_locaisDetalheEdit.find(function(l) { return String(l.idRoteiroLocal) === String(vid); }) || {}).horario || null;

      if (!dia) { alert("Informe o dia da atividade."); return; }
      if (_diasTotaisDetalheEdit > 0 && dia > _diasTotaisDetalheEdit) {
        alert("O dia não pode ultrapassar a duração do roteiro (" + _diasTotaisDetalheEdit + " dias).");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        var res = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais/" + idLocal, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idLocal: parseInt(idLocal), dia: dia, ordem: ordem, observacoes: obs, horario: horario, status: status, custo: custo2 })
        });
        if (res.ok) {
          var updated = await res.json();
          var idx = _locaisDetalheEdit.findIndex(function(l) { return String(l.idRoteiroLocal) === String(vid); });
          if (idx !== -1) _locaisDetalheEdit[idx] = updated;
          renderLocaisDetalheEdit();
          _atualizarMapaDetalheEdit();
        } else { alert("Erro ao salvar. HTTP " + res.status); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar'; }
      } catch(e) { alert("Erro ao conectar."); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar'; }
    });
  });

  lista.querySelectorAll("[id^='ledit-custo-']").forEach(function(input) {
    var vid = input.id.replace("ledit-custo-", "");
    input.addEventListener("input", function() {
      var display = document.getElementById("lcusto-display-" + vid);
      if (display) display.textContent = input.value.trim() ? "$ " + input.value.trim() : "$";
    });
  });

  lista.querySelectorAll("[data-del-local]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      var idLocal   = btn.getAttribute("data-del-local");
      var idVinculo = btn.getAttribute("data-del-vinculo");
      btn.disabled = true;
      try {
        var r = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais/" + idLocal, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisDetalheEdit = _locaisDetalheEdit.filter(function(l) { return String(l.idRoteiroLocal) !== String(idVinculo); });
          renderLocaisDetalheEdit();
          _atualizarMapaDetalheEdit();
        } else { alert("Erro ao remover. HTTP " + r.status); btn.disabled = false; }
      } catch(e) { alert("Erro ao conectar."); btn.disabled = false; }
    });
  });
}

var _detRatingCache = {};

function _fetchRatingDetalhe(nome, placeId, spanId) {
  var cacheKey = placeId || nome;
  if (!cacheKey) return;
  var apply = function(rating) {
    var el = document.getElementById(spanId);
    if (!el || !rating) return;
    el.innerHTML = '<i class="bi bi-star-fill" style="color:#facc15;font-size:.65rem;"></i> ' + rating.toFixed(1);
    el.style.display = 'inline-flex';
  };
  if (_detRatingCache[cacheKey] !== undefined) { apply(_detRatingCache[cacheKey]); return; }
  if (!window.google || !google.maps.places || !google.maps.places.PlacesService) return;
  var svc = new google.maps.places.PlacesService(document.createElement('div'));
  if (placeId) {
    svc.getDetails({ placeId: placeId, fields: ['rating'] }, function(place, status) {
      var r = status === google.maps.places.PlacesServiceStatus.OK ? (place && place.rating || null) : null;
      _detRatingCache[cacheKey] = r;
      apply(r);
    });
  } else if (nome) {
    svc.textSearch({ query: nome }, function(results, status) {
      var r = status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].rating ? results[0].rating : null;
      _detRatingCache[cacheKey] = r;
      apply(r);
    });
  }
}

function _iniciarRatingsDetalheEdit() {
  document.querySelectorAll('[data-mr-rating-id]').forEach(function(el) {
    _fetchRatingDetalhe(
      el.getAttribute('data-mr-rating-nome') || '',
      el.getAttribute('data-mr-rating-pid')  || '',
      el.getAttribute('data-mr-rating-id')
    );
  });
}

function renderLocaisDetalheEdit() {
  var lista = document.getElementById("listaLocaisDetalheEdit");
  var vazio = document.getElementById("vazioLocaisDetalheEdit");
  if (!lista) return;
  _configurarRestricoesPeriodoLocalDetalhe();

  var temSugestoes = _hasSugestoesAI();
  var temLocais    = _locaisDetalheEdit.length > 0;

  if (!temSugestoes && !temLocais) {
    lista.innerHTML = "";
    if (vazio) { vazio.style.display = ""; lista.appendChild(vazio); }
    return;
  }

  if (vazio) vazio.style.display = "none";
  lista.innerHTML = "";

  if (temSugestoes) {
    renderLocaisDetalheEditAI(); // locais reais por dia já incluídos dentro de cada accordion
    _iniciarRatingsDetalheEdit();
    return;
  }

  _renderLocaisReaisDetalhe(lista);
  _iniciarRatingsDetalheEdit();
}

// ── Recomendações Inteligentes (Ver Detalhes) ─────────────────────

var _todosLugaresDetalhe = [];
var _POR_PAGINA_DETALHE  = 5;

function _renderRecomendacoesDetalhe(lugares, pagina) {
  var listaEl = document.getElementById("listaRecomendacoesDetalhe");
  if (!listaEl) return;
  if (lugares !== null && lugares.length === 0) {
    _todosLugaresDetalhe = [];
    listaEl.innerHTML = '<div class="text-center py-3 text-secondary" style="font-size:.82rem;"><i class="bi bi-search" style="font-size:1.5rem;color:#cbd5e1;display:block;margin-bottom:6px;"></i>Nenhum lugar encontrado nessa categoria.</div>';
    return;
  }
  if (lugares !== null) { _todosLugaresDetalhe = lugares; pagina = 0; }
  var pg      = Math.max(0, Math.min(pagina || 0, Math.ceil(_todosLugaresDetalhe.length / _POR_PAGINA_DETALHE) - 1));
  var total   = _todosLugaresDetalhe.length;
  var totalPg = Math.ceil(total / _POR_PAGINA_DETALHE);
  var slice   = _todosLugaresDetalhe.slice(pg * _POR_PAGINA_DETALHE, (pg + 1) * _POR_PAGINA_DETALHE);
  var cidade  = (_roteiroDetalheEdit && (_roteiroDetalheEdit.cidade || _roteiroDetalheEdit.pais)) || "";

  listaEl.innerHTML = '<div style="font-size:.78rem;color:#64748b;margin-bottom:8px;"><i class="bi bi-trophy me-1" style="color:#f97316;"></i><strong>' + total + '</strong> lugar' + (total !== 1 ? "es" : "") + ', ordenado' + (total !== 1 ? "s" : "") + ' por avaliação' + (cidade ? ' · <strong>' + escapeHtml(cidade) + '</strong>' : '') + '</div>'
    + slice.map(function(lugar, i) {
      var idx     = pg * _POR_PAGINA_DETALHE + i;
      var rating  = lugar.rating || 0;
      var tot     = lugar.user_ratings_total || 0;
      var addr    = lugar.vicinity || lugar.formatted_address || "";
      var stars   = [0,1,2,3,4].map(function(s) {
        return '<i class="bi bi-star' + (s < Math.round(rating) ? "-fill" : "") + '" style="color:' + (s < Math.round(rating) ? "#f59e0b" : "#cbd5e1") + ';font-size:.72rem;"></i>';
      }).join("");
      return '<div style="background:#fff;border:1px solid #eef2f7;border-radius:10px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;margin-bottom:6px;">'
        + '<div style="background:#f97316;color:#fff;min-width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:.8rem;flex-shrink:0;">' + (idx + 1) + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-weight:800;font-size:.88rem;">' + escapeHtml(lugar.name) + '</div>'
        + '<div style="display:flex;align-items:center;gap:4px;margin-top:2px;">' + stars + '<span style="font-weight:700;font-size:.82rem;">' + rating.toFixed(1) + '</span>' + (tot > 0 ? '<span style="font-size:.72rem;color:#94a3b8;">(' + tot.toLocaleString("pt-BR") + ')</span>' : '') + '</div>'
        + (addr ? '<div style="color:#94a3b8;font-size:.75rem;margin-top:2px;"><i class="bi bi-geo-alt me-1"></i>' + escapeHtml(addr) + '</div>' : '')
        + (window.placeCategoryBadgeHtml ? window.placeCategoryBadgeHtml(lugar.types || []) : '')
        + (lugar.business_status === "OPERATIONAL" ? '<div style="font-size:.72rem;color:#16a34a;margin-top:2px;"><i class="bi bi-clock me-1"></i>Estabelecimento ativo</div>' : '')
        + '</div>'
        + '<button class="btn btn-sm btn-primary-orange flex-shrink-0" style="font-size:.78rem;padding:4px 8px;white-space:nowrap;"'
        + ' data-rec-nome="' + escapeHtml(lugar.name) + '"'
        + ' data-rec-end="' + escapeHtml(addr) + '"'
        + ' data-rec-pid="' + escapeHtml(lugar.place_id || "") + '"'
        + ' data-rec-lat="' + (lugar.geometry && lugar.geometry.location ? lugar.geometry.location.lat() : "") + '"'
        + ' data-rec-lng="' + (lugar.geometry && lugar.geometry.location ? lugar.geometry.location.lng() : "") + '">'
        + '<i class="bi bi-plus-lg"></i>'
        + '</button>'
        + '</div>';
    }).join("")
    + (totalPg > 1
      ? '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">'
        + '<button id="recDetPrev" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:.78rem;font-weight:700;color:#475569;cursor:pointer;"' + (pg === 0 ? " disabled" : "") + '>&#8592; Anterior</button>'
        + '<span style="font-size:.75rem;color:#94a3b8;">' + (pg + 1) + ' / ' + totalPg + '</span>'
        + '<button id="recDetNext" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:.78rem;font-weight:700;color:#475569;cursor:pointer;"' + (pg >= totalPg - 1 ? " disabled" : "") + '>Próximo &#8594;</button>'
        + '</div>'
      : "");

  listaEl.querySelectorAll("[data-rec-pid]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      _localSelecionadoDetalheEdit = {
        placeId:   btn.getAttribute("data-rec-pid"),
        nome:      btn.getAttribute("data-rec-nome"),
        endereco:  btn.getAttribute("data-rec-end"),
        latitude:  parseFloat(btn.getAttribute("data-rec-lat")) || null,
        longitude: parseFloat(btn.getAttribute("data-rec-lng")) || null,
      };
      var inputBusca = document.getElementById("buscaLocalDetalheEdit");
      var preview    = document.getElementById("localPreviewDetalheEdit");
      if (inputBusca) inputBusca.value = _localSelecionadoDetalheEdit.nome;
      if (preview) {
        preview.style.display = "";
        var nEl = document.getElementById("previewNomeDetalheEdit");
        var eEl = document.getElementById("previewEnderecoDetalheEdit");
        if (nEl) nEl.textContent = _localSelecionadoDetalheEdit.nome;
        if (eEl) eEl.textContent = _localSelecionadoDetalheEdit.endereco;
      }
      if (inputBusca) inputBusca.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  var prevBtn = listaEl.querySelector("#recDetPrev");
  var nextBtn = listaEl.querySelector("#recDetNext");
  if (prevBtn) prevBtn.addEventListener("click", function() { _renderRecomendacoesDetalhe(null, pg - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function() { _renderRecomendacoesDetalhe(null, pg + 1); });
}

document.addEventListener("click", function(e) {
  var btn = e.target.closest("#btnBuscarRecomendacoesDetalhe");
  if (!btn) return;

  var categoria  = (document.getElementById("categoriaRecomendacaoDetalhe") || {}).value || "tourist_attraction";
  var loadEl     = document.getElementById("loadingRecomendacoesDetalhe");
  var alertaEl   = document.getElementById("alertaRecomendacoesDetalhe");
  var listaEl    = document.getElementById("listaRecomendacoesDetalhe");
  var cidade     = _roteiroDetalheEdit ? (_roteiroDetalheEdit.cidade || _roteiroDetalheEdit.pais || "") : "";

  if (!cidade) {
    if (alertaEl) { alertaEl.textContent = "O roteiro não possui cidade definida."; alertaEl.style.display = ""; }
    return;
  }
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    if (alertaEl) { alertaEl.textContent = "Google Maps ainda não carregou. Tente novamente."; alertaEl.style.display = ""; }
    return;
  }

  var labelMap = {
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
  var label = labelMap[categoria] || categoria;
  var query = label + " em " + cidade;

  if (alertaEl) alertaEl.style.display = "none";
  if (listaEl)  listaEl.innerHTML = "";
  if (loadEl)   loadEl.style.display = "";
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Buscando...';

  var svc = new google.maps.places.PlacesService(document.createElement("div"));
  svc.textSearch({ query: query }, function(lugares, st) {
    if (loadEl) loadEl.style.display = "none";
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-search me-1"></i>Buscar';
    if (st !== google.maps.places.PlacesServiceStatus.OK || !lugares || !lugares.length) {
      _renderRecomendacoesDetalhe([]);
      return;
    }
    var sorted = lugares.filter(function(l) { return l.rating; }).sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    _renderRecomendacoesDetalhe(sorted.slice(0, 15));
  });
});

// Event delegation no document — garante captura mesmo com modal Bootstrap
document.addEventListener("click", async function(e) {
  var btn = e.target.closest("#btnAdicionarLocalDetalheEdit");
  if (!btn) return;

  var erroEl = document.getElementById("erroLocalDetalheEdit");
  function mostrarErro(msg) {
    if (erroEl) {
      erroEl.textContent      = msg;
      erroEl.style.display    = "";
      erroEl.style.background = "";
      erroEl.style.color      = "";
    }
    console.error("[maps-detalhe] ERRO:", msg);
  }
  function ocultarErro() { if (erroEl) erroEl.style.display = "none"; }
  ocultarErro();

  if (!_localSelecionadoDetalheEdit) { mostrarErro("Busque e selecione um local primeiro!"); return; }
  if (!_roteiroIdDetalheEdit)        { mostrarErro("Nenhum roteiro selecionado."); return; }

  var diaEl     = document.getElementById("localDiaDetalheEdit");
  var obsEl     = document.getElementById("localObsDetalheEdit");
  var periodoEl = document.getElementById("localPeriodoDetalheEdit");
  var dia       = diaEl     ? diaEl.value.trim()     : "";
  var obs       = obsEl     ? obsEl.value.trim()     : "";
  var periodo   = periodoEl ? periodoEl.value        : "";

  if (!dia) { mostrarErro("Selecione o dia da atividade."); return; }
  if (!periodo) { mostrarErro("Selecione o período (Manhã, Tarde ou Noite)."); return; }
  if (!_periodoPermitidoDiaDetalhe(parseInt(dia, 10), periodo)) {
    mostrarErro(_mensagemPeriodoBloqueadoDetalhe(parseInt(dia, 10)));
    _atualizarOpcoesPeriodoLocalDetalhe();
    if (periodoEl) periodoEl.focus();
    return;
  }

  var horario = periodo === "manha" ? "08:00:00"
    : periodo === "tarde" ? "14:00:00"
    : periodo === "noite" ? "20:00:00"
    : null;

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

  try {
    _detLog("Passo 1: salvando local...", "#2563eb");

    var resLocal = await authFetch(_URL_API_DET + "/locais", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        placeId:   _localSelecionadoDetalheEdit.placeId,
        nome:      _localSelecionadoDetalheEdit.nome,
        endereco:  _localSelecionadoDetalheEdit.endereco,
        tipo:      _localSelecionadoDetalheEdit.tipo,
        latitude:  _localSelecionadoDetalheEdit.latitude,
        longitude: _localSelecionadoDetalheEdit.longitude
      })
    });

    var local;
    if (resLocal.ok || resLocal.status === 201) {
      local = await resLocal.json();
    } else {
      var resGet = await authFetch(_URL_API_DET + "/locais/place/" + encodeURIComponent(_localSelecionadoDetalheEdit.placeId));
      if (!resGet.ok) throw new Error("Falha ao buscar local. HTTP " + resGet.status);
      local = await resGet.json();
    }

    if (!local || !local.idLocal) throw new Error("Local retornado sem idLocal.");

    _detLog("Passo 2: vinculando ao roteiro " + _roteiroIdDetalheEdit + "...", "#2563eb");

    var resVinculo = await authFetch(_URL_API_DET + "/roteiros/" + _roteiroIdDetalheEdit + "/locais", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        idLocal:     local.idLocal,
        dia:         parseInt(dia),
        ordem:       _locaisDetalheEdit.length + 1,
        observacoes: obs || null,
        horario:     horario,
        status:      "PLANEJADO"
      })
    });

    if (resVinculo.ok || resVinculo.status === 201) {
      var vinculo = await resVinculo.json();
      if (obs && !vinculo.observacoes) vinculo.observacoes = obs;
      _locaisDetalheEdit.push(vinculo);
      renderLocaisDetalheEdit();
      _atualizarMapaDetalheEdit();
      if (diaEl) diaEl.value = "";
      if (obsEl) obsEl.value = "";
      if (periodoEl) periodoEl.value = "";
      var buscaEl = document.getElementById("buscaLocalDetalheEdit");
      if (buscaEl) buscaEl.value = "";
      var prevEl = document.getElementById("localPreviewDetalheEdit");
      if (prevEl) prevEl.style.display = "none";
      _localSelecionadoDetalheEdit = null;
      ocultarErro();
    } else {
      var errBody = {};
      try { errBody = await resVinculo.json(); } catch(e2) {}
      throw new Error((errBody.message || errBody.error || "") + " (HTTP " + resVinculo.status + ")");
    }

  } catch(e) {
    mostrarErro(e.message || "Erro desconhecido ao salvar local.");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Adicionar Local ao Roteiro';
  }
});
