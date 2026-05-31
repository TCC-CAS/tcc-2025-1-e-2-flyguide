/* ================================================================
   FlyGuide - roteiro-andamento.js
   Lida com duas páginas:
   - roteiros-iniciados  → lista de roteiros em andamento
   - roteiro-em-andamento → checkpoints de um roteiro específico
================================================================ */

(function () {
  const URL_API_BASE = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const pagina = document.body.getAttribute("data-pagina");

  function resolverImagemRoteiro(r) {
    if (typeof obterImagemUrlRoteiro === "function") return obterImagemUrlRoteiro(r);
    if (r.imagemUrl) return r.imagemUrl;
    if (r.idImagem && typeof imagensCache !== "undefined") {
      var img = imagensCache.find(function (i) { return Number(i.idImagem) === Number(r.idImagem); });
      if (img) return img.url;
    }
    if (r.imagemChave && typeof imagensCache !== "undefined") {
      var img2 = imagensCache.find(function (i) { return i.chave === r.imagemChave; });
      if (img2) return img2.url;
    }
    return typeof IMG_FALLBACK !== "undefined" ? IMG_FALLBACK
      : "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75";
  }

  // ================================================================
  // ROTEIROS INICIADOS — lista
  // ================================================================
  if (pagina === "roteiros-iniciados") {
    const userId = getUserIdFromToken();
    if (!userId) { window.location.href = "login.html"; return; }

    function formatarPct(visitados, pulados, total) {
      if (total === 0) return 0;
      return Math.round((visitados + pulados) / total * 100);
    }

    function renderCardIniciado(r, locaisInfo) {
      const total     = locaisInfo ? locaisInfo.total : "—";
      const visitados = locaisInfo ? locaisInfo.visitados : 0;
      const pulados   = locaisInfo ? locaisInfo.pulados : 0;
      const pct       = locaisInfo ? formatarPct(visitados, pulados, total) : 0;
      const imgUrl    = resolverImagemRoteiro(r);

      return `
        <div class="col-12 col-md-6 col-xl-4" id="card-iniciado-${r.idRoteiro}">
          <div class="iniciado-card h-100">
            <div class="iniciado-cover" style="background-image:url('${imgUrl}');">
              <div class="iniciado-cover-overlay"></div>
              <div class="iniciado-cover-title">
                ${escapeHtml(r.titulo || "Sem título")}
                <div class="iniciado-cover-city"><i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(r.cidade || "—")}</div>
              </div>
            </div>
            <div class="iniciado-body">
              ${locaisInfo
                ? `<div class="iniciado-progress-bar">
                     <div class="iniciado-progress-fill" style="width:${pct}%"></div>
                   </div>
                   <div class="iniciado-progress-label">
                     ${visitados} de ${total} locais visitados (${pct}%)
                   </div>`
                : `<div class="iniciado-progress-label text-secondary" id="prog-${r.idRoteiro}">
                     <span class="spinner-border spinner-border-sm me-1" style="color:#f97316;"></span>Carregando progresso...
                   </div>`
              }
              <div class="iniciado-actions">
                <a href="roteiro-em-andamento.html?id=${r.idRoteiro}"
                   class="btn btn-primary-orange fw-bold flex-grow-1" style="font-size:.85rem;">
                  <i class="bi bi-play-circle-fill me-1"></i>Continuar
                </a>
                <button class="btn btn-outline-danger" style="font-size:.85rem;" title="Não continuar"
                        data-abandonar-iniciado="${r.idRoteiro}"
                        data-nome="${escapeHtml(r.titulo || 'este roteiro')}">
                  <i class="bi bi-x-circle"></i>
                </button>
                <a href="detalhes-roteiro.html?id=${r.idRoteiro}"
                   class="btn btn-outline-gray" style="font-size:.85rem;" title="Ver detalhes">
                  <i class="bi bi-eye"></i>
                </a>
              </div>
            </div>
          </div>
        </div>`;
    }

    function contarItensAI(sugestoes) {
      var total = 0;
      if (!Array.isArray(sugestoes)) return 0;
      sugestoes.forEach(function (d) {
        if (d.periodos && typeof d.periodos === "object") {
          ["manha", "tarde", "noite"].forEach(function (per) {
            total += Array.isArray(d.periodos[per]) ? d.periodos[per].length : 0;
          });
        } else {
          total += Array.isArray(d.locais) ? d.locais.length : 0;
        }
      });
      return total;
    }

    function carregarProgressoAsync(r) {
      authFetch(`${URL_API_BASE}/roteiros/${r.idRoteiro}/completo`)
        .then(res => res.json())
        .then(data => {
          const roteiro   = data.roteiro || {};
          const locais    = data.locais  || [];
          const realTotal    = locais.length;
          const realVisit    = locais.filter(l => l.status === "VISITADO").length;
          const realPulados  = locais.filter(l => l.status === "PULADO").length;
          const aiTotal   = contarItensAI(roteiro.sugestoes);
          const savedAi   = (roteiro.aiStatus && typeof roteiro.aiStatus === "object") ? roteiro.aiStatus : {};
          const aiVisit   = Object.keys(savedAi).filter(k => savedAi[k] === "VISITADO").length;
          const aiPulados = Object.keys(savedAi).filter(k => savedAi[k] === "PULADO").length;
          const total     = realTotal + aiTotal;
          const visitados = realVisit + aiVisit;
          const pulados   = realPulados + aiPulados;
          const pct       = formatarPct(visitados, pulados, total);

          const card = document.getElementById(`card-iniciado-${r.idRoteiro}`);
          if (!card) return;

          const progEl = card.querySelector(`#prog-${r.idRoteiro}`);
          if (progEl) {
            progEl.outerHTML = `
              <div class="iniciado-progress-bar">
                <div class="iniciado-progress-fill" style="width:${pct}%"></div>
              </div>
              <div class="iniciado-progress-label">
                ${visitados} de ${total} locais visitados (${pct}%)
              </div>`;
          }
        })
        .catch(() => {
          const el = document.getElementById(`prog-${r.idRoteiro}`);
          if (el) el.textContent = "";
        });
    }

    carregarImagens().then(() => {
      authFetch(`${URL_API_BASE}/roteiros/usuario/${userId}`)
        .then(r => r.json())
        .then(roteiros => {
          const emAndamento = roteiros.filter(r => r.statusRoteiro === "EM_ANDAMENTO");

          const loading = document.getElementById("loadingIniciados");
          const empty   = document.getElementById("emptyIniciados");
          const lista   = document.getElementById("listaIniciados");
          if (loading) loading.style.display = "none";

          if (emAndamento.length === 0) {
            if (empty) empty.style.display = "";
            return;
          }

          lista.style.display = "";
          lista.innerHTML = emAndamento.map(r => renderCardIniciado(r, null)).join("");

          emAndamento.forEach(r => carregarProgressoAsync(r));

          var modalEl = document.getElementById("modalAbandonarIniciado");
          var modal   = modalEl ? new bootstrap.Modal(modalEl) : null;
          var idParaAbandonar = null;

          lista.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-abandonar-iniciado]");
            if (!btn) return;
            idParaAbandonar = btn.getAttribute("data-abandonar-iniciado");
            var nomeEl = document.getElementById("nomeRoteiroAbandonar");
            if (nomeEl) nomeEl.textContent = btn.getAttribute("data-nome") || "este roteiro";
            if (modal) modal.show();
          });

          var btnConfirmar = document.getElementById("btnConfirmarAbandonarIniciado");
          if (btnConfirmar) {
            btnConfirmar.addEventListener("click", function () {
              if (!idParaAbandonar) return;
              btnConfirmar.disabled = true;
              btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Aguarde...';
              authFetch(`${URL_API_BASE}/roteiros/${idParaAbandonar}/status`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ statusRoteiro: "PLANEJADO" }),
              })
                .then(function (r) {
                  if (!r.ok) throw new Error();
                  if (modal) modal.hide();
                  const card = document.getElementById(`card-iniciado-${idParaAbandonar}`);
                  if (card) card.closest(".col-12, .col-md-6, [class*='col']").remove();
                  if (!lista.querySelector("[id^='card-iniciado-']")) {
                    lista.style.display = "none";
                    if (empty) empty.style.display = "";
                  }
                })
                .catch(function () {
                  btnConfirmar.disabled = false;
                  btnConfirmar.innerHTML = '<i class="bi bi-x-circle me-1"></i>Sim, não continuar';
                  alert("Não foi possível atualizar o roteiro. Tente novamente.");
                });
            });
          }
        })
        .catch(() => {
          const loading = document.getElementById("loadingIniciados");
          const empty   = document.getElementById("emptyIniciados");
          if (loading) loading.style.display = "none";
          if (empty)   empty.style.display   = "";
        });
    });
  }

  // ================================================================
  // ROTEIRO EM ANDAMENTO — checkpoints
  // ================================================================
  if (pagina === "roteiro-em-andamento") {
    const userId = getUserIdFromToken();
    if (!userId) { window.location.href = "login.html"; return; }

    const params    = new URLSearchParams(window.location.search);
    const roteiroId = params.get("id");
    if (!roteiroId) { window.location.href = "roteiros-iniciados.html"; return; }

    let locaisData  = [];
    let roteiroData = null;
    let modalConcluir    = null;
    let modalAvaliacao   = null;
    let modalAvaliacaoDia = null;

    // Progressão por dia
    var diaAtual          = 1;
    var diasNumerados     = [];   // dias do roteiro em ordem crescente [1, 2, 3, ...]
    var _notaDia               = 0;     // estrelas selecionadas no modal de avaliação do dia
    var _diaRecemAvancado      = false;  // evita restaurar collapse state do dia recém-desbloqueado
    var _avaliacaoDiaUltimoDia = false;  // true quando o modal do dia é o último passo antes de concluir

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

    // ── Períodos ──
    var PERIODOS_CONFIG_AND = [
      { key: "manha", label: "Manhã",  icon: "bi-sunrise-fill",   cor: "#f59e0b" },
      { key: "tarde", label: "Tarde",  icon: "bi-sun-fill",        cor: "#f97316" },
      { key: "noite", label: "Noite",  icon: "bi-moon-stars-fill", cor: "#6366f1" },
    ];

    // ── Maps cache ──
    var _mapsCache    = {};
    var _enrichSched  = false;

    function _mapsUrlAndamento(placeId, query) {
      var place = String(placeId || "").trim();
      var q = String(query || place || "").trim();
      var url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
      return place ? url + "&query_place_id=" + encodeURIComponent(place) : url;
    }

    function _horarioToPeriodoAnd(horario) {
      if (!horario) return null;
      var hStr = String(horario).slice(0, 5);
      if (hStr < "12:00") return "manha";
      if (hStr < "18:00") return "tarde";
      return "noite";
    }

    function aplicarMapsCache() {
      Object.keys(_mapsCache).forEach(function (cacheKey) {
        var d = _mapsCache[cacheKey];
        if (!d || typeof d !== "object" || Object.keys(d).length === 0) return;
        var elId = cacheKey.indexOf("ai:") === 0
          ? "ai-cp-" + cacheKey.slice(3)
          : "cp-"    + cacheKey;
        var el = document.getElementById(elId);
        if (!el) return;
        if (d.rating) {
          var rEl = el.querySelector(".and-place-rating");
          if (rEl) {
            rEl.innerHTML = "<i class=\"bi bi-star-fill\" style=\"color:#facc15;font-size:.75rem;\"></i> " + d.rating.toFixed(1);
            rEl.style.display = "inline-flex";
          }
        }
        if (d.address) {
          var aEl = el.querySelector(".and-place-addr");
          if (aEl) { aEl.textContent = d.address; aEl.style.display = ""; }
        }
        if (d.types && d.types.length && window.placeCategoryBadgeHtml) {
          var dayMain = el.querySelector(".day-main");
          if (dayMain && !dayMain.querySelector(".place-category-badge")) {
            var addrEl = el.querySelector(".and-place-addr");
            var badgeHtml = window.placeCategoryBadgeHtml(d.types);
            if (badgeHtml) {
              if (addrEl) addrEl.insertAdjacentHTML("afterend", badgeHtml);
              else dayMain.insertAdjacentHTML("afterbegin", badgeHtml);
            }
          }
        }
        if (d.openNow !== null && d.openNow !== undefined) {
          var mainEl = el.querySelector(".day-main");
          if (mainEl && !mainEl.querySelector("[data-abertura]")) {
            var cor = d.openNow ? "#16a34a" : "#dc2626";
            var txt = d.openNow ? "Aberto agora" : "Fechado agora";
            mainEl.insertAdjacentHTML("beforeend",
              "<div data-abertura=\"1\" style=\"font-size:.78rem;margin-top:4px;color:" + cor + ";\"><i class=\"bi bi-clock me-1\"></i>" + txt + "</div>");
          }
        }
        if (d.placeId) {
          var mLink = el.querySelector(".and-maps-link");
          if (mLink) mLink.href = _mapsUrlAndamento(d.placeId, d.address || d.name || d.query);
        }
      });
    }

    function enrichAndamento() {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        if (!_enrichSched) {
          _enrichSched = true;
          setTimeout(function () { _enrichSched = false; enrichAndamento(); }, 700);
        }
        return;
      }
      var service = new google.maps.places.PlacesService(document.createElement("div"));
      var cidade  = roteiroData ? (roteiroData.cidade || "") : "";

      var _BLOCKED_TYPES_AND = new Set([
        "lodging", "supermarket", "grocery_or_supermarket", "convenience_store",
        "gas_station", "bank", "atm", "car_dealer", "car_repair", "car_wash",
        "hardware_store", "laundry", "storage", "moving_company", "electrician",
        "plumber", "locksmith", "insurance_agency", "real_estate_agency",
        "finance", "accounting", "car_rental", "post_office", "courthouse",
        "police", "fire_station", "funeral_home", "cemetery"
      ]);

      function _fetchPlace(cacheKey, query) {
        if (_mapsCache[cacheKey] !== undefined) return;
        _mapsCache[cacheKey] = null;
        service.textSearch({ query: query }, function (results, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length) {
            var filtered = results.filter(function(r) {
              return !(r.types || []).some(function(t) { return _BLOCKED_TYPES_AND.has(t); });
            });
            var pool = filtered.length ? filtered : results;
            var place = pool.find(function (r) { return (r.user_ratings_total || 0) >= 20; }) || pool[0];
            var openNow = null;
            if (place.opening_hours) {
              try {
                openNow = typeof place.opening_hours.isOpen === "function"
                  ? place.opening_hours.isOpen()
                  : place.opening_hours.open_now !== undefined ? place.opening_hours.open_now : null;
              } catch (e) { openNow = null; }
            }
            _mapsCache[cacheKey] = {
              rating:  place.rating || null,
              name:    place.name || null,
              address: place.formatted_address || null,
              openNow: openNow,
              placeId: place.place_id || null,
              query:   query || null,
              types:   place.types || [],
            };
          } else {
            _mapsCache[cacheKey] = {};
          }
          aplicarMapsCache();
        });
      }

      // Real locals
      locaisData.forEach(function (l) {
        _fetchPlace(String(l.idLocal), (l.nome || "") + (cidade ? ", " + cidade : ""));
      });

      // AI items
      if (roteiroData && Array.isArray(roteiroData.sugestoes)) {
        roteiroData.sugestoes.forEach(function (d) {
          var dia = String(d.dia || 0);
          if (d.periodos && typeof d.periodos === "object") {
            PERIODOS_CONFIG_AND.forEach(function (pc) {
              var pLocais = Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : [];
              pLocais.forEach(function (l, idx) {
                var nome = typeof l === "string" ? l : (l.nome || "Local");
                _fetchPlace("ai:" + dia + "-" + pc.key + "-" + idx, nome + (cidade ? ", " + cidade : ""));
              });
            });
          } else {
            (Array.isArray(d.locais) ? d.locais : []).forEach(function (l, idx) {
              var nome = typeof l === "string" ? l : (l.nome || "Local");
              _fetchPlace("ai:" + dia + "-sem-" + idx, nome + (cidade ? ", " + cidade : ""));
            });
          }
        });
      }
    }

    document.addEventListener("DOMContentLoaded", function () {
      const modalEl    = document.getElementById("modalConcluir");
      const modalAvEl  = document.getElementById("modalAvaliacao");
      const modalDiaEl = document.getElementById("modalAvaliacaoDia");
      if (modalEl)    modalConcluir     = new bootstrap.Modal(modalEl);
      if (modalAvEl)  modalAvaliacao    = new bootstrap.Modal(modalAvEl);
      if (modalDiaEl) modalAvaliacaoDia = new bootstrap.Modal(modalDiaEl);
      configurarAvaliacao();
      configurarModalDia();
      configurarProximoDia();
    });

    Promise.all([
      authFetch(`${URL_API_BASE}/roteiros/${roteiroId}`).then(r => r.json()),
      authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`).then(r => r.json()),
    ])
      .then(function ([roteiro, locais]) {
        roteiroData = roteiro;
        locaisData  = locais;

        // Restaurar status das sugestões IA salvo no backend
        if (roteiro.aiStatus && typeof roteiro.aiStatus === "object") {
          Object.keys(roteiro.aiStatus).forEach(function (k) { aiStatus[k] = roteiro.aiStatus[k]; });
        }

        document.getElementById("btnVerDetalhes").href = `detalhes-roteiro.html?id=${roteiroId}`;

        document.getElementById("tituloAndamento").textContent = roteiro.titulo || "—";
        document.getElementById("cidadeAndamento").innerHTML =
          `<i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(roteiro.cidade || "—")}`;

        var imgHdr = resolverImagemRoteiro(roteiro);
        if (imgHdr) {
          var hdr = document.querySelector(".andamento-header");
          if (hdr) hdr.style.background =
            "linear-gradient(135deg,rgba(249,115,22,.88) 0%,rgba(180,60,10,.92) 100%),"
            + "url('" + imgHdr + "') center/cover no-repeat";
        }

        if (roteiro.statusRoteiro === "CONCLUIDO") {
          const btnConcluir = document.getElementById("btnConcluirRoteiro");
          if (btnConcluir) {
            btnConcluir.innerHTML = '<i class="bi bi-arrow-counterclockwise me-2"></i>Reiniciar Roteiro';
            btnConcluir.style.background = "#8b5cf6";
            btnConcluir.style.boxShadow  = "0 12px 20px rgba(139,92,246,.22)";
            btnConcluir.disabled = false;
            btnConcluir.addEventListener("click", async function () {
              btnConcluir.disabled = true;
              btnConcluir.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Reiniciando...';

              try {
                // ── 1. Atualiza backend primeiro ─────────────────────────────
                const r1 = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/status`, {
                  method:  "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body:    JSON.stringify({ statusRoteiro: "EM_ANDAMENTO" }),
                });
                if (!r1.ok) throw new Error("status");

                await Promise.all(locaisData.map(function (_l) {
                  return authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${_l.idLocal}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      idLocal: _l.idLocal, status: "PENDENTE",
                      observacoes: _l.observacoes || null, dia: _l.dia || null,
                      ordem: _l.ordem || null, horario: _l.horario || null,
                    }),
                  });
                }));

                await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/ai-status`, {
                  method:  "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body:    "{}",
                });

                // ── 2. Reset em memória e re-render ──────────────────────────
                roteiroData.statusRoteiro = "EM_ANDAMENTO";
                Object.keys(aiStatus).forEach(function (k) { delete aiStatus[k]; });
                locaisData.forEach(function (l) { l.status = "PENDENTE"; });
                localStorage.removeItem("fg_dia_atual_" + roteiroId);
                localStorage.removeItem("fg_dia_ratings_" + roteiroId);
                determinarDias();
                diaAtual = diasNumerados.length ? diasNumerados[0] : 1;

                var _listaDiasEl = document.getElementById("listaDias");
                if (_listaDiasEl) _listaDiasEl.innerHTML = "";

                var _oldBtn = document.getElementById("btnConcluirRoteiro");
                if (_oldBtn && _oldBtn.parentNode) {
                  var _newBtn = _oldBtn.cloneNode(false);
                  _newBtn.innerHTML = '<i class="bi bi-flag-fill me-2"></i>Concluir Roteiro';
                  _newBtn.style.background = "";
                  _newBtn.style.boxShadow  = "";
                  _newBtn.disabled = false;
                  _oldBtn.parentNode.replaceChild(_newBtn, _oldBtn);
                }

                renderDias();
                configurarConcluir();

              } catch (e) {
                btnConcluir.disabled = false;
                btnConcluir.innerHTML = '<i class="bi bi-arrow-counterclockwise me-2"></i>Reiniciar Roteiro';
                alert("Não foi possível reiniciar o roteiro. Verifique sua conexão e tente novamente.");
              }
            });
          }
        }

        mostrarConteudo();
        determinarDias();
        atualizarProgresso();
        renderDias();
        configurarConcluir();
      })
      .catch(function () {
        document.getElementById("loadingAndamento").innerHTML =
          `<div class="text-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i>Não foi possível carregar o roteiro.</div>`;
      });

    function mostrarConteudo() {
      const loading = document.getElementById("loadingAndamento");
      if (loading) loading.remove();
      const conteudo = document.getElementById("conteudoAndamento");
      if (conteudo) { conteudo.style.display = "flex"; conteudo.style.flexDirection = "column"; }
    }

    function atualizarProgresso() {
      if (locaisData.length === 0 && roteiroData && Array.isArray(roteiroData.sugestoes) && roteiroData.sugestoes.length > 0) return;

      var realTotal     = locaisData.length;
      var realVisitados = locaisData.filter(function (l) { return l.status === "VISITADO"; }).length;
      var realPulados   = locaisData.filter(function (l) { return l.status === "PULADO"; }).length;

      var aiKeys      = Object.keys(aiStatus);
      var aiTotal     = aiKeys.length;
      var aiVisitados = aiKeys.filter(function (k) { return aiStatus[k] === "VISITADO"; }).length;
      var aiPulados   = aiKeys.filter(function (k) { return aiStatus[k] === "PULADO"; }).length;

      var total     = realTotal + aiTotal;
      var visitados = realVisitados + aiVisitados;
      var pulados   = realPulados + aiPulados;
      var restantes = total - visitados - pulados;
      var pct       = total > 0 ? Math.round((visitados + pulados) / total * 100) : 0;

      var barEl = document.getElementById("progressoBar");
      if (barEl) barEl.style.width = pct + "%";
      var txtEl = document.getElementById("progressoTexto");
      if (txtEl) txtEl.textContent = visitados + " de " + total + " locais visitados";
      var pctEl = document.getElementById("progressoPct");
      if (pctEl) pctEl.textContent = pct + "%";
      var svEl = document.getElementById("statVisitados");
      if (svEl) svEl.textContent = visitados + " visitado" + (visitados !== 1 ? "s" : "");
      var spEl = document.getElementById("statPulados");
      if (spEl) spEl.textContent = pulados + " pulado" + (pulados !== 1 ? "s" : "");
      var srEl = document.getElementById("statRestantes");
      if (srEl) srEl.textContent = restantes + " restante" + (restantes !== 1 ? "s" : "");
    }

    var aiStatus = {};
    function saveAiStatus() {
      authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/ai-status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(aiStatus),
      }).catch(function () {});
    }

    function atualizarProgressoAI(todosItens) {
      var total     = todosItens.length;
      var visitados = todosItens.filter(function (it) { return aiStatus[it.key] === "VISITADO"; }).length;
      var pulados   = todosItens.filter(function (it) { return aiStatus[it.key] === "PULADO";   }).length;
      var restantes = total - visitados - pulados;
      var pct       = total > 0 ? Math.round((visitados + pulados) / total * 100) : 0;

      var barEl = document.getElementById("progressoBar");
      if (barEl) barEl.style.width = pct + "%";
      var txtEl = document.getElementById("progressoTexto");
      if (txtEl) txtEl.textContent = visitados + " de " + total + " locais visitados";
      var pctEl = document.getElementById("progressoPct");
      if (pctEl) pctEl.textContent = pct + "%";
      var svEl  = document.getElementById("statVisitados");
      if (svEl)  svEl.textContent  = visitados + " visitado" + (visitados !== 1 ? "s" : "");
      var spEl  = document.getElementById("statPulados");
      if (spEl)  spEl.textContent  = pulados + " pulado" + (pulados !== 1 ? "s" : "");
      var srEl  = document.getElementById("statRestantes");
      if (srEl)  srEl.textContent  = restantes + " restante" + (restantes !== 1 ? "s" : "");
    }

    // ── Render real checkpoint item (day-item visual) ──
    function renderCheckpoint(l, pc, numero) {
      var isVisitado = l.status === "VISITADO";
      var isPulado   = l.status === "PULADO";
      var id         = String(l.idLocal);
      var cor        = pc ? pc.cor : "#f97316";
      var cidade     = roteiroData ? (roteiroData.cidade || "") : "";
      var query      = encodeURIComponent((l.nome || "") + (cidade ? ", " + cidade : ""));
      var mapsHref   = l.latitude && l.longitude
        ? "https://www.google.com/maps/search/?api=1&query=" + l.latitude + "," + l.longitude
        : "https://www.google.com/maps/search/?api=1&query=" + query;

      var bubbleContent = isVisitado
        ? "<i class=\"bi bi-check-lg\"></i>"
        : isPulado ? "<i class=\"bi bi-x-lg\"></i>" : "<i class=\"bi bi-circle\"></i>";
      var bubbleBg    = isVisitado ? "#22c55e22" : isPulado ? "#94a3b822" : cor + "22";
      var bubbleColor = isVisitado ? "#22c55e"   : isPulado ? "#94a3b8"   : cor;
      var itemCls     = isVisitado ? "cp-and-visitado" : isPulado ? "cp-and-pulado" : "";

      var endDB = l.endereco ? escapeHtml(l.endereco) : "";
      return "<div class=\"day-item " + itemCls + "\" id=\"cp-" + escapeHtml(id) + "\""
        + (endDB ? " data-addr=\"" + endDB + "\"" : "") + ">"
        + "<button class=\"check-bubble-and\" data-toggle-cp data-id=\"" + escapeHtml(id) + "\""
        + " title=\"" + (isVisitado ? "Desmarcar visita" : "Marcar como visitado") + "\""
        + " style=\"background:" + bubbleBg + ";color:" + bubbleColor + ";\">"
        + bubbleContent + "</button>"
        + "<div class=\"day-main\">"
        + "<div class=\"topline\" style=\"flex-wrap:wrap;gap:6px;\">"
        + "<div class=\"name\">" + escapeHtml(l.nome || "Local") + "</div>"
        + "<span class=\"and-place-rating\" style=\"display:none;align-items:center;gap:3px;font-size:.75rem;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:999px;\"></span>"
        + "</div>"
        + "<div class=\"and-place-addr\" style=\"" + (endDB ? "" : "display:none;") + "font-size:.78rem;color:#64748b;margin-top:3px;\">"
        + (endDB ? "<i class=\"bi bi-geo-alt me-1\"></i>" + endDB : "") + "</div>"
        + (l.observacoes ? "<div class=\"costline\"><i class=\"bi bi-pencil-fill\" style=\"color:#94a3b8;\"></i><span style=\"font-size:.82rem;color:#64748b;\">" + escapeHtml(l.observacoes) + "</span></div>" : "")
        + "<div style=\"margin-top:6px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;\">"
        + "<a class=\"and-maps-link\" href=\"" + mapsHref + "\" target=\"_blank\" rel=\"noopener\""
        + " style=\"display:inline-flex;align-items:center;gap:5px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;\">"
        + "<i class=\"bi bi-map\"></i> Ver no Maps</a>"
        + (!isVisitado && !isPulado ? "<button class=\"skip-btn\" data-skip-cp data-id=\"" + escapeHtml(id) + "\"><i class=\"bi bi-skip-forward me-1\"></i>Pular</button>" : "")
        + (isPulado ? "<span class=\"pulado-badge\">Pulado</span>" : "")
        + "</div></div></div>";
    }

    // ── Render AI checkpoint item (interactive, day-item visual) ──
    function renderCheckpointAI(it, pc, numero) {
      // Special fixed marker for check-in / checkout
      if (it._checkin || it._checkout) {
        var isCI     = !!it._checkin;
        var ciIcon   = isCI ? "bi-key-fill" : "bi-box-arrow-right";
        var ciBg     = isCI ? "#f0fdf4" : "#fff7ed";
        var ciClr    = isCI ? "#16a34a" : "#ea580c";
        var ciBorder = isCI ? "#bbf7d0" : "#fed7aa";
        var ciLabel  = isCI ? "Check-in" : "Checkout";
        var status   = aiStatus[it.key] || "PENDENTE";
        var isDone   = status === "VISITADO";
        var bubbleBg  = isDone ? "#22c55e22" : ciClr + "22";
        var bubbleClr = isDone ? "#22c55e"   : ciClr;
        var bubbleCnt = isDone ? "<i class=\"bi bi-check-lg\"></i>" : "<i class=\"bi " + ciIcon + "\"></i>";
        return "<div class=\"day-item" + (isDone ? " cp-and-visitado" : "") + "\" id=\"ai-cp-" + it.key + "\""
          + " style=\"border-left:3px solid " + ciClr + ";background:" + ciBg + ";border-radius:10px;margin-bottom:6px;\">"
          + "<button class=\"check-bubble-and\" data-ai-toggle=\"" + it.key + "\""
          + " title=\"" + (isDone ? "Desmarcar" : "Marcar como concluído") + "\""
          + " style=\"background:" + bubbleBg + ";color:" + bubbleClr + ";\">"
          + bubbleCnt + "</button>"
          + "<div class=\"day-main\">"
          + "<div class=\"topline\"><div class=\"name\" style=\"color:" + ciClr + ";font-weight:800;\">" + escapeHtml(ciLabel) + "</div></div>"
          + "</div></div>";
      }

      var status     = aiStatus[it.key] || "PENDENTE";
      var isVisitado = status === "VISITADO";
      var isPulado   = status === "PULADO";
      var cor        = pc ? pc.cor : "#6366f1";
      var cidade     = roteiroData ? (roteiroData.cidade || "") : "";
      var bubbleContent = isVisitado
        ? "<i class=\"bi bi-check-lg\"></i>"
        : isPulado ? "<i class=\"bi bi-x-lg\"></i>" : "<i class=\"bi bi-circle\"></i>";
      var bubbleBg    = isVisitado ? "#22c55e22" : isPulado ? "#94a3b822" : cor + "22";
      var bubbleColor = isVisitado ? "#22c55e"   : isPulado ? "#94a3b8"   : cor;
      var itemCls     = isVisitado ? "cp-and-visitado" : isPulado ? "cp-and-pulado" : "";
      var mapsQuery   = encodeURIComponent((it.nome || "") + (cidade ? ", " + cidade : ""));
      var mapsHref    = "https://www.google.com/maps/search/?api=1&query=" + mapsQuery;

      var endAI = it.endereco ? escapeHtml(it.endereco) : "";
      var obsAI = it.observacoes ? escapeHtml(it.observacoes) : "";
      return "<div class=\"day-item " + itemCls + "\" id=\"ai-cp-" + it.key + "\""
        + (endAI ? " data-addr=\"" + endAI + "\"" : "") + ">"
        + "<button class=\"check-bubble-and\" data-ai-toggle=\"" + it.key + "\""
        + " title=\"" + (isVisitado ? "Desmarcar visita" : "Marcar como visitado") + "\""
        + " style=\"background:" + bubbleBg + ";color:" + bubbleColor + ";\">"
        + bubbleContent + "</button>"
        + "<div class=\"day-main\">"
        + "<div class=\"topline\" style=\"flex-wrap:wrap;gap:6px;\">"
        + "<div class=\"name\">" + escapeHtml(it.nome) + "</div>"
        + "<span class=\"and-place-rating\" style=\"display:none;align-items:center;gap:3px;font-size:.75rem;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:999px;\"></span>"
        + "</div>"
        + "<div class=\"and-place-addr\" style=\"" + (endAI ? "" : "display:none;") + "font-size:.78rem;color:#64748b;margin-top:3px;\">"
        + (endAI ? "<i class=\"bi bi-geo-alt me-1\"></i>" + endAI : "") + "</div>"
        + (obsAI ? "<div class=\"costline\"><i class=\"bi bi-pencil-fill\" style=\"color:#94a3b8;\"></i><span style=\"font-size:.82rem;color:#64748b;\">" + obsAI + "</span></div>" : "")
        + "<div style=\"margin-top:6px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;\">"
        + "<a class=\"and-maps-link\" href=\"" + mapsHref + "\" target=\"_blank\" rel=\"noopener\""
        + " style=\"display:inline-flex;align-items:center;gap:5px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;\">"
        + "<i class=\"bi bi-map\"></i> Ver no Maps</a>"
        + (!isVisitado && !isPulado ? "<button class=\"skip-btn\" data-ai-skip=\"" + it.key + "\"><i class=\"bi bi-skip-forward me-1\"></i>Pular</button>" : "")
        + (isPulado ? "<span class=\"pulado-badge\">Pulado</span>" : "")
        + "</div></div></div>";
    }

    // ── Render period accordion header ──
    function _perHeader(pc, colId, count) {
      return "<button class=\"w-100 d-flex align-items-center justify-content-between border-0 px-2 py-1\""
        + " style=\"background:" + pc.cor + "18;border-radius:8px;cursor:pointer;\""
        + " data-bs-toggle=\"collapse\" data-bs-target=\"#" + colId + "\" aria-expanded=\"true\">"
        + "<div style=\"display:flex;align-items:center;gap:6px;\">"
        + "<i class=\"bi " + pc.icon + "\" style=\"color:" + pc.cor + ";font-size:.82rem;\"></i>"
        + "<span style=\"font-size:.78rem;font-weight:700;color:" + pc.cor + ";\">" + pc.label + "</span>"
        + "<span style=\"font-size:.68rem;font-weight:700;color:" + pc.cor + ";opacity:.7;\">" + count + " " + (count === 1 ? "local" : "locais") + "</span>"
        + "</div>"
        + "<i class=\"bi bi-chevron-down\" style=\"color:" + pc.cor + ";font-size:.72rem;transition:transform .2s;\"></i>"
        + "</button>";
    }

    // ── Render AI-only full page (interactive checkboxes) ──
    function renderDiasAI(dias) {
      var container = document.getElementById("listaDias");
      if (!container) return;

      var collapseStates = {};
      container.querySelectorAll(".collapse[id]").forEach(function (el) {
        collapseStates[el.id] = el.classList.contains("show");
      });

      var todosItens = [];
      dias.forEach(function (d) {
        if (d.periodos && typeof d.periodos === "object") {
          PERIODOS_CONFIG_AND.forEach(function (pc) {
            var perLocais = Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : [];
            perLocais.forEach(function (l, idx) {
              var obj = typeof l === "object" && l !== null ? l : {};
              todosItens.push({ key: d.dia + "-" + pc.key + "-" + idx, dia: d.dia, periodo: pc.key,
                nome:     typeof l === "string" ? l : (obj.nome || "Local"),
                custo:    obj.custo || null,
                endereco: obj.endereco || null,
                observacoes: obj.observacoes || null,
                _checkin:  !!obj._checkin,
                _checkout: !!obj._checkout });
            });
          });
        } else {
          (Array.isArray(d.locais) ? d.locais : []).forEach(function (l, idx) {
            var obj = typeof l === "object" && l !== null ? l : {};
            todosItens.push({ key: d.dia + "-" + idx, dia: d.dia,
              nome:     typeof l === "string" ? l : (obj.nome || "Local"),
              custo:    obj.custo || null,
              endereco: obj.endereco || null,
              observacoes: obj.observacoes || null,
              _checkin:  !!obj._checkin,
              _checkout: !!obj._checkout });
          });
        }
      });

      todosItens.forEach(function (it) { if (!aiStatus[it.key]) aiStatus[it.key] = "PENDENTE"; });

      container.innerHTML =
        "<div style=\"background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;\">"
        + "<i class=\"bi bi-robot\" style=\"color:#6366f1;font-size:1.1rem;flex-shrink:0;\"></i>"
        + "<span style=\"font-size:.85rem;color:#4338ca;font-weight:600;\">Sugest&otilde;es geradas por IA &mdash; marque as atividades conforme visita.</span>"
        + "</div>"
        + dias.map(function (d) {
          var itensDia = todosItens.filter(function (it) { return it.dia === d.dia; });
          var feitos   = itensDia.filter(function (it) { return aiStatus[it.key] === "VISITADO" || aiStatus[it.key] === "PULADO"; }).length;
          var completo = feitos === itensDia.length && itensDia.length > 0;
          var colId    = "ai-dia-and-" + d.dia;

          var bodyHtml = "";
          if (d.periodos && typeof d.periodos === "object") {
            PERIODOS_CONFIG_AND.forEach(function (pc) {
              var perItens = itensDia.filter(function (it) { return it.periodo === pc.key; });
              if (!perItens.length) return;
              var perColId = "ai-per-and-" + d.dia + "-" + pc.key;
              bodyHtml += "<div style=\"margin-bottom:8px;\">"
                + _perHeader(pc, perColId, perItens.length)
                + "<div id=\"" + perColId + "\" class=\"collapse show\" style=\"padding:4px 0 0 0;\">";
              perItens.forEach(function (it, i) { bodyHtml += renderCheckpointAI(it, pc, i + 1); });
              bodyHtml += "</div></div>";
            });
          } else {
            itensDia.forEach(function (it, i) { bodyHtml += renderCheckpointAI(it, null, i + 1); });
          }

          var dNum         = Number(d.dia);
          var estaBloqueado = dNum > diaAtual && roteiroData.statusRoteiro !== "CONCLUIDO";
          var estaCompleto  = dNum < diaAtual;
          var expandido     = (!estaBloqueado && dNum === diaAtual) ? "show" : "";

          var statusBadge = estaBloqueado
            ? "<span style=\"font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px;color:#94a3b8;background:#f1f5f9;\"><i class=\"bi bi-lock-fill me-1\"></i>Bloqueado</span>"
            : completo
              ? "<span style=\"font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:999px;color:#22c55e;background:#dcfce7;\"><i class=\"bi bi-check-circle-fill me-1\"></i>Concluído</span>"
              : "<span style=\"font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:999px;"
                + "color:#6366f1;background:#f0f4ff;\">" + feitos + "/" + itensDia.length + "</span>";

          return "<section class=\"" + (estaBloqueado ? "dia-bloqueado-section" : "") + "\" style=\"margin-bottom:12px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;\">"
            + "<button class=\"w-100 d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 bg-transparent\""
            + " style=\"cursor:pointer;\" data-bs-toggle=\"collapse\" data-bs-target=\"#" + colId + "\" aria-expanded=\"" + (!estaBloqueado ? "true" : "false") + "\">"
            + "<div style=\"font-size:1rem;font-weight:800;color:" + (document.documentElement.getAttribute("data-theme") === "dark" ? "#f1f5f9" : "#1e293b") + ";\">Dia " + escapeHtml(String(d.dia)) + "</div>"
            + "<div style=\"display:flex;align-items:center;gap:10px;\">"
            + statusBadge
            + "<i class=\"bi bi-chevron-down\" style=\"color:#94a3b8;transition:transform .2s;\"></i>"
            + "</div></button>"
            + (estaBloqueado ? "<div class=\"dia-lock-aviso\"><i class=\"bi bi-lock-fill\"></i>Conclua o dia anterior para desbloquear</div>" : "")
            + "<div id=\"" + colId + "\" class=\"collapse " + expandido + "\"><div style=\"padding:0 16px 16px;\">" + bodyHtml + "</div></div>"
            + "</section>";
        }).join("");

      Object.keys(collapseStates).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (_diaRecemAvancado && id === "ai-dia-and-" + diaAtual) return;
        if (collapseStates[id]) el.classList.add("show");
        else                    el.classList.remove("show");
      });

      container.querySelectorAll("[data-ai-toggle]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-ai-toggle");
          aiStatus[key] = aiStatus[key] === "VISITADO" ? "PENDENTE" : "VISITADO";
          saveAiStatus();
          atualizarProgressoAI(todosItens);
          renderDiasAI(dias);
          setTimeout(_abrirModalDiaSeCompleto, 300);
        });
      });
      container.querySelectorAll("[data-ai-skip]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-ai-skip");
          aiStatus[key] = "PULADO";
          saveAiStatus();
          atualizarProgressoAI(todosItens);
          renderDiasAI(dias);
          setTimeout(_abrirModalDiaSeCompleto, 300);
        });
      });
      atualizarProgressoAI(todosItens);
      atualizarFooter();
    }

    // ── Render checkpoints — real locals + AI merged into same period buckets ──
    function renderDias() {
      var container = document.getElementById("listaDias");
      if (!container) return;

      // Save open/closed state of all collapse elements before rebuild
      var collapseStates = {};
      container.querySelectorAll(".collapse[id]").forEach(function (el) {
        collapseStates[el.id] = el.classList.contains("show");
      });

      var sugestoes = roteiroData && Array.isArray(roteiroData.sugestoes) && roteiroData.sugestoes.length > 0
        ? roteiroData.sugestoes : null;

      if (locaisData.length === 0 && !sugestoes) {
        document.getElementById("semLocais").style.display = "";
        return;
      }
      if (locaisData.length === 0 && sugestoes) {
        renderDiasAI(sugestoes);
        return;
      }

      // ── Build merged diasMap: dia → { manha/tarde/noite/sem: [{type, ...}] } ──
      // AI suggestions go first (matching the order in Ver Detalhes),
      // then real locals are appended at the end of each period.
      var diasMap = {};

      if (sugestoes) {
        sugestoes.forEach(function (d) {
          var dia = String(d.dia || 0);
          if (!diasMap[dia]) diasMap[dia] = { manha: [], tarde: [], noite: [], sem: [] };
          if (d.periodos && typeof d.periodos === "object") {
            PERIODOS_CONFIG_AND.forEach(function (pc) {
              var pLocais = Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : [];
              pLocais.forEach(function (l, idx) {
                var key = dia + "-" + pc.key + "-" + idx;
                if (!aiStatus[key]) aiStatus[key] = "PENDENTE";
                diasMap[dia][pc.key].push({ type: "ai", key: key,
                  nome:  typeof l === "string" ? l : (l.nome || "Local"),
                  custo: typeof l === "object" ? (l.custo || null) : null });
              });
            });
          } else {
            (Array.isArray(d.locais) ? d.locais : []).forEach(function (l, idx) {
              var key = dia + "-sem-" + idx;
              if (!aiStatus[key]) aiStatus[key] = "PENDENTE";
              diasMap[dia]["sem"].push({ type: "ai", key: key,
                nome:  typeof l === "string" ? l : (l.nome || "Local"),
                custo: typeof l === "object" ? (l.custo || null) : null });
            });
          }
        });
      }

      locaisData.forEach(function (l) {
        var dia = String(l.dia || 0);
        if (!diasMap[dia]) diasMap[dia] = { manha: [], tarde: [], noite: [], sem: [] };
        var per = _horarioToPeriodoAnd(l.horario) || "sem";
        diasMap[dia][per].push({ type: "real", local: l });
      });

      var diasOrdenados = Object.keys(diasMap).sort(function (a, b) { return Number(a) - Number(b); });

      container.innerHTML = diasOrdenados.map(function (dia, diaIdx) {
        var dData = diasMap[dia];

        // Progress counter for all items in this day (real + AI)
        var todosItemsDia = [];
        ["manha", "tarde", "noite", "sem"].forEach(function (p) {
          (dData[p] || []).forEach(function (it) { todosItemsDia.push(it); });
        });
        var visitadosDia = todosItemsDia.filter(function (it) {
          return it.type === "real" ? it.local.status === "VISITADO" : aiStatus[it.key] === "VISITADO";
        }).length;
        var puladosDia = todosItemsDia.filter(function (it) {
          return it.type === "real" ? it.local.status === "PULADO" : aiStatus[it.key] === "PULADO";
        }).length;
        var totalDia = todosItemsDia.length;
        var completo = totalDia > 0 && (visitadosDia + puladosDia) === totalDia;
        var collapseId    = "dia-and-" + dia;
        var dNum          = Number(dia);
        var estaBloqueado = dNum > diaAtual && roteiroData.statusRoteiro !== "CONCLUIDO";
        var estaCompleto  = dNum < diaAtual;
        var expandido     = (!estaBloqueado && dNum === diaAtual) ? "show" : "";

        var bodyHtml = "";
        PERIODOS_CONFIG_AND.forEach(function (pc) {
          var items = dData[pc.key] || [];
          if (!items.length) return;
          var perColId = "per-and-" + dia + "-" + pc.key;
          bodyHtml += "<div style=\"margin-bottom:8px;\">"
            + _perHeader(pc, perColId, items.length)
            + "<div id=\"" + perColId + "\" class=\"collapse show\" style=\"padding:4px 0 0 0;\">";
          items.forEach(function (item, i) {
            if (item.type === "real") bodyHtml += renderCheckpoint(item.local, pc, i + 1);
            else                      bodyHtml += renderCheckpointAI(item, pc, i + 1);
          });
          bodyHtml += "</div></div>";
        });

        // Items with no period
        (dData.sem || []).forEach(function (item, i) {
          if (item.type === "real") bodyHtml += renderCheckpoint(item.local, null, i + 1);
          else                      bodyHtml += renderCheckpointAI(item, null, i + 1);
        });

        var statusBadge = estaBloqueado
          ? "<span style=\"font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px;color:#94a3b8;background:#f1f5f9;\"><i class=\"bi bi-lock-fill me-1\"></i>Bloqueado</span>"
          : completo
            ? "<span style=\"font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:999px;color:#22c55e;background:#dcfce7;\"><i class=\"bi bi-check-circle-fill me-1\"></i>Concluído</span>"
            : "<span style=\"font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:999px;"
              + "color:#64748b;background:#f1f5f9;\">"
              + (visitadosDia + puladosDia) + "/" + totalDia + "</span>";

        return "<section class=\"" + (estaBloqueado ? "dia-bloqueado-section" : "") + "\" style=\"margin-bottom:16px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;\">"
          + "<button class=\"w-100 d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 bg-transparent\""
          + " style=\"cursor:pointer;\" data-bs-toggle=\"collapse\" data-bs-target=\"#" + collapseId + "\" aria-expanded=\"" + (!estaBloqueado ? "true" : "false") + "\">"
          + "<div style=\"font-size:1rem;font-weight:800;color:" + (document.documentElement.getAttribute("data-theme") === "dark" ? "#f1f5f9" : "#1e293b") + ";\">Dia " + escapeHtml(String(dia)) + "</div>"
          + "<div style=\"display:flex;align-items:center;gap:10px;\">"
          + statusBadge
          + "<i class=\"bi bi-chevron-down\" style=\"color:#94a3b8;transition:transform .2s;\"></i>"
          + "</div></button>"
          + (estaBloqueado ? "<div class=\"dia-lock-aviso\"><i class=\"bi bi-lock-fill\"></i>Conclua o dia anterior para desbloquear</div>" : "")
          + "<div id=\"" + collapseId + "\" class=\"collapse " + expandido + "\">"
          + "<div style=\"padding:0 16px 16px;\">" + bodyHtml + "</div>"
          + "</div></section>";
      }).join("");

      // Restore collapse states (only for elements that existed before rebuild)
      Object.keys(collapseStates).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (_diaRecemAvancado && id === "dia-and-" + diaAtual) return;
        if (collapseStates[id]) el.classList.add("show");
        else                    el.classList.remove("show");
      });

      container.querySelectorAll("[data-toggle-cp]").forEach(function (btn) {
        btn.addEventListener("click", function () { toggleCheckpoint(btn.getAttribute("data-id")); });
      });
      container.querySelectorAll("[data-skip-cp]").forEach(function (btn) {
        btn.addEventListener("click", function () { skipCheckpoint(btn.getAttribute("data-id")); });
      });
      container.querySelectorAll("[data-ai-toggle]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-ai-toggle");
          aiStatus[key] = aiStatus[key] === "VISITADO" ? "PENDENTE" : "VISITADO";
          saveAiStatus();
          renderDias();
          setTimeout(_abrirModalDiaSeCompleto, 300);
        });
      });
      container.querySelectorAll("[data-ai-skip]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-ai-skip");
          aiStatus[key] = "PULADO";
          saveAiStatus();
          renderDias();
          setTimeout(_abrirModalDiaSeCompleto, 300);
        });
      });

      aplicarMapsCache();
      enrichAndamento();
      atualizarProgresso();
      atualizarFooter();
    }

    function toggleCheckpoint(idLocal) {
      var local = locaisData.find(function (l) { return String(l.idLocal) === String(idLocal); });
      if (!local) return;
      salvarStatus(local, local.status === "VISITADO" ? "PENDENTE" : "VISITADO");
    }

    function skipCheckpoint(idLocal) {
      var local = locaisData.find(function (l) { return String(l.idLocal) === String(idLocal); });
      if (!local) return;
      salvarStatus(local, "PULADO");
    }

    function salvarStatus(local, novoStatus) {
      var cpEl = document.getElementById("cp-" + local.idLocal);
      if (cpEl) cpEl.style.opacity = "0.5";

      authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${local.idLocal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idLocal:     local.idLocal,
          status:      novoStatus,
          observacoes: local.observacoes || null,
          dia:         local.dia         || null,
          ordem:       local.ordem       || null,
          horario:     local.horario     || null,
        }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error();
          local.status = novoStatus;
          atualizarProgresso();
          renderDias();
          setTimeout(_abrirModalDiaSeCompleto, 300);
        })
        .catch(function () {
          if (cpEl) cpEl.style.opacity = "";
          alert("Não foi possível atualizar o status. Tente novamente.");
        });
    }

    function configurarConcluir() {
      var btnConcluir = document.getElementById("btnConcluirRoteiro");
      if (!btnConcluir) return;
      if (roteiroData && roteiroData.statusRoteiro === "CONCLUIDO") return;

      btnConcluir.addEventListener("click", function () {
        var realPendentes = locaisData.filter(function (l) { return !l.status || l.status === "PENDENTE"; }).length;
        var aiPendentes   = Object.keys(aiStatus).filter(function (k) { return aiStatus[k] === "PENDENTE"; }).length;
        var pendentes     = realPendentes + aiPendentes;
        var aviso     = document.getElementById("avisoPendentes");
        var txtAv     = document.getElementById("txtPendentes");
        if (aviso && txtAv) {
          if (pendentes > 0) {
            txtAv.textContent = pendentes + " local(is) ainda não foi(ram) visitado(s) nem pulado(s).";
            aviso.style.display = "";
          } else {
            aviso.style.display = "none";
          }
        }
        if (modalConcluir) modalConcluir.show();
        else confirmarConclusao();
      });

      var btnConfirmar = document.getElementById("btnConfirmarConcluir");
      if (btnConfirmar) {
        btnConfirmar.addEventListener("click", confirmarConclusao);
      }
    }

    const LEGENDAS_NOTA = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

    function configurarAvaliacao() {
      var notaSelecionada = 0;
      var stars    = document.querySelectorAll(".star-av");
      var legenda  = document.getElementById("legendaNotaAvaliacao");
      var btnSalvar = document.getElementById("btnSalvarAvaliacao");
      var btnPular  = document.getElementById("btnPularAvaliacao");

      function pintarEstrelas(ate) {
        stars.forEach(function (s, i) {
          var ativo = i < ate;
          s.className = (ativo ? "bi bi-star-fill" : "bi bi-star") + " star-av";
          s.style.color = ativo ? "#facc15" : "#cbd5e1";
        });
      }

      stars.forEach(function (s) {
        s.addEventListener("mouseenter", function () { pintarEstrelas(parseInt(s.dataset.nota)); });
        s.addEventListener("mouseleave", function () { pintarEstrelas(notaSelecionada); });
        s.addEventListener("click", function () {
          notaSelecionada = parseInt(s.dataset.nota);
          pintarEstrelas(notaSelecionada);
          if (legenda) legenda.textContent = LEGENDAS_NOTA[notaSelecionada] || "";
          if (btnSalvar) btnSalvar.disabled = false;
        });
      });

      if (btnPular) {
        btnPular.addEventListener("click", function () {
          window.location.href = "meus-roteiros.html";
        });
      }

      if (btnSalvar) {
        btnSalvar.addEventListener("click", async function () {
          if (!notaSelecionada) return;
          var texto   = (document.getElementById("textoAvaliacaoInput")?.value || "").trim();
          var erroEl  = document.getElementById("erroAvaliacao");
          if (erroEl) erroEl.style.display = "none";
          btnSalvar.disabled = true;
          btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando…';
          try {
            var res = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/avaliacoes/${userId}`, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ nota: notaSelecionada, texto: texto || null }),
            });
            if (!res.ok) {
              var data = null;
              try { data = await res.json(); } catch (_) {}
              var msg = (data && (data.message || data.error)) || "Comentário contém linguagem inapropriada.";
              var _m = msg.match(/^\d+\s+\S+\s+"(.+)"$/); if (_m) msg = _m[1];
              if (erroEl) { erroEl.textContent = msg; erroEl.style.display = ""; }
              btnSalvar.disabled = false;
              btnSalvar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar avaliação';
              return;
            }
          } catch (_) {}
          window.location.href = "meus-roteiros.html";
        });
      }
    }

    var btnConfirmarAbandonar = document.getElementById("btnConfirmarAbandonar");
    if (btnConfirmarAbandonar) {
      btnConfirmarAbandonar.addEventListener("click", function () {
        btnConfirmarAbandonar.disabled = true;
        btnConfirmarAbandonar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Aguarde...';
        authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/status`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ statusRoteiro: "PLANEJADO" }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error();
            window.location.href = "roteiros-iniciados.html";
          })
          .catch(function () {
            btnConfirmarAbandonar.disabled = false;
            btnConfirmarAbandonar.innerHTML = '<i class="bi bi-x-circle me-1"></i>Sim, não continuar';
            alert("Não foi possível abandonar o roteiro. Tente novamente.");
          });
      });
    }

    // ── Determina dias disponíveis e restaura posição atual do usuário ──
    function determinarDias() {
      var diasSet = new Set();
      locaisData.forEach(function (l) { if (l.dia != null) diasSet.add(Number(l.dia)); });
      if (roteiroData && Array.isArray(roteiroData.sugestoes)) {
        roteiroData.sugestoes.forEach(function (d) { if (d.dia != null) diasSet.add(Number(d.dia)); });
      }
      diasNumerados = Array.from(diasSet).filter(function (n) { return !isNaN(n) && n > 0; })
                          .sort(function (a, b) { return a - b; });
      if (!diasNumerados.length) diasNumerados = [1];

      // Se roteiro concluído, usuário pode ver todos os dias
      if (roteiroData && roteiroData.statusRoteiro === "CONCLUIDO") {
        diaAtual = diasNumerados[diasNumerados.length - 1];
        return;
      }

      var saved = localStorage.getItem("fg_dia_atual_" + roteiroId);
      if (saved) {
        var n = Number(saved);
        diaAtual = diasNumerados.includes(n) ? n : diasNumerados[0];
      } else {
        diaAtual = diasNumerados[0];
      }
    }

    // ── Verifica se todos os itens do dia foram concluídos (visitado ou pulado) ──
    function isDiaCompleto(diaNum) {
      var strDia = String(diaNum);
      var itens  = [];

      locaisData.forEach(function (l) {
        if (String(l.dia || 0) === strDia) itens.push({ type: "real", local: l });
      });

      if (roteiroData && Array.isArray(roteiroData.sugestoes)) {
        roteiroData.sugestoes.forEach(function (d) {
          if (String(d.dia || 0) !== strDia) return;
          if (d.periodos && typeof d.periodos === "object") {
            PERIODOS_CONFIG_AND.forEach(function (pc) {
              var pLocais = Array.isArray(d.periodos[pc.key]) ? d.periodos[pc.key] : [];
              pLocais.forEach(function (l, idx) {
                itens.push({ type: "ai", key: strDia + "-" + pc.key + "-" + idx });
              });
            });
          } else {
            (Array.isArray(d.locais) ? d.locais : []).forEach(function (l, idx) {
              itens.push({ type: "ai", key: strDia + "-sem-" + idx });
            });
          }
        });
      }

      if (!itens.length) return false;
      return itens.every(function (it) {
        if (it.type === "real") return it.local.status === "VISITADO" || it.local.status === "PULADO";
        return aiStatus[it.key] === "VISITADO" || aiStatus[it.key] === "PULADO";
      });
    }

    // ── Atualiza visibilidade dos botões do footer ──
    function atualizarFooter() {
      var btnConcluir = document.getElementById("btnConcluirRoteiro");
      var btnProximo  = document.getElementById("btnProximoDia");
      if (btnProximo)  btnProximo.style.display  = "none";
      var isConcluido = roteiroData && roteiroData.statusRoteiro === "CONCLUIDO";
      if (btnConcluir) btnConcluir.style.display = isConcluido ? "" : "none";
    }

    // ── Abre modal de avaliação automaticamente quando o dia está completo ──
    function _abrirModalDiaSeCompleto() {
      if (roteiroData && roteiroData.statusRoteiro === "CONCLUIDO") return;
      if (!isDiaCompleto(diaAtual)) return;
      if (document.querySelector(".modal.show")) return;

      var isUltimoDia = diasNumerados[diasNumerados.length - 1] === diaAtual;

      if (isUltimoDia) {
        confirmarConclusao();
      } else {
        var idx        = diasNumerados.indexOf(diaAtual);
        var proximoDia = diasNumerados[idx + 1];

        var nomeDiaEl = document.getElementById("nomeDiaAvaliacao");
        if (nomeDiaEl) nomeDiaEl.textContent = "Dia " + diaAtual;
        var lblBtn = document.getElementById("lblBtnProximo");
        if (lblBtn) lblBtn.textContent = "Avançar para o Dia " + proximoDia;

        _notaDia = 0;
        _pintarEstrelasDia(0);
        var txt = document.getElementById("textoDiaInput");
        if (txt) txt.value = "";
        var erro = document.getElementById("erroDia");
        if (erro) erro.style.display = "none";
        var btnConf = document.getElementById("btnConfirmarProximoDia");
        if (btnConf) btnConf.disabled = true;
        var btnPularReset = document.getElementById("btnPularAvaliacaoDia");
        if (btnPularReset) btnPularReset.textContent = "Pular avaliação e avançar";

        if (modalAvaliacaoDia) modalAvaliacaoDia.show();
      }
    }

    // ── Avança para o próximo dia após avaliação ──
    function avancarDia(proximoDia) {
      _diaRecemAvancado = true;
      diaAtual = proximoDia;
      localStorage.setItem("fg_dia_atual_" + roteiroId, String(diaAtual));
      if (modalAvaliacaoDia) modalAvaliacaoDia.hide();
      renderDias();
      _diaRecemAvancado = false;

      setTimeout(function () {
        var colEl = document.getElementById("dia-and-" + diaAtual)
                 || document.getElementById("ai-dia-and-" + diaAtual);
        if (colEl) {
          var section = colEl.closest("section");
          if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    }

    // ── Botão "Seguir para o Próximo Dia" ──
    function configurarProximoDia() {
      var btn = document.getElementById("btnProximoDia");
      if (!btn) return;
      btn.addEventListener("click", function () {
        if (!isDiaCompleto(diaAtual)) return;
        var idx         = diasNumerados.indexOf(diaAtual);
        var proximoDia  = idx >= 0 && idx < diasNumerados.length - 1 ? diasNumerados[idx + 1] : null;
        if (!proximoDia) return;

        // Prepara o modal de avaliação do dia
        var nomeDiaEl = document.getElementById("nomeDiaAvaliacao");
        if (nomeDiaEl) nomeDiaEl.textContent = "Dia " + diaAtual;
        var lblBtn = document.getElementById("lblBtnProximo");
        if (lblBtn) lblBtn.textContent = "Avançar para o Dia " + proximoDia;

        // Reseta estado do modal
        _notaDia = 0;
        _pintarEstrelasDia(0);
        var txt = document.getElementById("textoDiaInput");
        if (txt) txt.value = "";
        var erro = document.getElementById("erroDia");
        if (erro) erro.style.display = "none";
        var btnConf = document.getElementById("btnConfirmarProximoDia");
        if (btnConf) btnConf.disabled = true;
        var btnPularReset = document.getElementById("btnPularAvaliacaoDia");
        if (btnPularReset) btnPularReset.textContent = "Pular avaliação e avançar";

        if (modalAvaliacaoDia) modalAvaliacaoDia.show();
        else avancarDia(proximoDia);
      });
    }

    // ── Modal de avaliação do dia ──
    var _pintarEstrelasDia = function (ate) {
      document.querySelectorAll(".star-dia").forEach(function (s, i) {
        var ativo = i < ate;
        s.className = (ativo ? "bi bi-star-fill" : "bi bi-star") + " star-dia";
        s.style.color = ativo ? "#facc15" : "#cbd5e1";
      });
    };

    var LEGENDAS_DIA = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

    function configurarModalDia() {
      document.querySelectorAll(".star-dia").forEach(function (s) {
        s.addEventListener("mouseenter", function () { _pintarEstrelasDia(parseInt(s.dataset.nota)); });
        s.addEventListener("mouseleave", function () { _pintarEstrelasDia(_notaDia); });
        s.addEventListener("click", function () {
          _notaDia = parseInt(s.dataset.nota);
          _pintarEstrelasDia(_notaDia);
          var leg = document.getElementById("legendaNotaDia");
          if (leg) leg.textContent = LEGENDAS_DIA[_notaDia] || "";
          var btnConf = document.getElementById("btnConfirmarProximoDia");
          if (btnConf) btnConf.disabled = false;
        });
      });

      var btnPular = document.getElementById("btnPularAvaliacaoDia");
      if (btnPular) {
        btnPular.addEventListener("click", function () {
          if (_avaliacaoDiaUltimoDia) {
            _avaliacaoDiaUltimoDia = false;
            if (modalAvaliacaoDia) modalAvaliacaoDia.hide();
            if (modalAvaliacao) modalAvaliacao.show();
          } else {
            var idx  = diasNumerados.indexOf(diaAtual);
            var prox = idx >= 0 && idx < diasNumerados.length - 1 ? diasNumerados[idx + 1] : null;
            if (prox) avancarDia(prox);
          }
        });
      }

      var btnConf = document.getElementById("btnConfirmarProximoDia");
      if (btnConf) {
        btnConf.addEventListener("click", async function () {
          if (!_notaDia) return;
          var texto  = (document.getElementById("textoDiaInput")?.value || "").trim();
          var erroEl = document.getElementById("erroDia");
          if (erroEl) erroEl.style.display = "none";

          if (texto) {
            var htmlOriginal = btnConf.innerHTML;
            btnConf.disabled = true;
            btnConf.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
            var valido = await _validarTexto(texto);
            btnConf.disabled = false;
            btnConf.innerHTML = htmlOriginal;
            if (!valido) {
              if (erroEl) {
                erroEl.textContent = "Seu comentário contém linguagem inapropriada. Por favor, revise o texto.";
                erroEl.style.display = "";
              }
              return;
            }
          }

          // Salva avaliação do dia no localStorage
          try {
            var nomeAvaliador = (document.getElementById("sidebarNome")?.textContent || "").trim();
            var saved = JSON.parse(localStorage.getItem("fg_dia_ratings_" + roteiroId) || "{}");
            saved[diaAtual] = { nota: _notaDia, texto: texto, ts: Date.now(), nome: nomeAvaliador };
            localStorage.setItem("fg_dia_ratings_" + roteiroId, JSON.stringify(saved));
          } catch (_) {}

          if (_avaliacaoDiaUltimoDia) {
            _avaliacaoDiaUltimoDia = false;
            if (modalAvaliacaoDia) modalAvaliacaoDia.hide();
            if (modalAvaliacao) modalAvaliacao.show();
          } else {
            var idx  = diasNumerados.indexOf(diaAtual);
            var prox = idx >= 0 && idx < diasNumerados.length - 1 ? diasNumerados[idx + 1] : null;
            if (prox) avancarDia(prox);
          }
        });
      }
    }

    function confirmarConclusao() {
      var btn = document.getElementById("btnConfirmarConcluir") || document.getElementById("btnConcluirRoteiro");
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Concluindo...'; }

      authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ statusRoteiro: "CONCLUIDO" }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error();
          if (modalConcluir) modalConcluir.hide();
          var btnConcluir = document.getElementById("btnConcluirRoteiro");
          if (btnConcluir) {
            btnConcluir.disabled = true;
            btnConcluir.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Roteiro Concluído!';
            btnConcluir.style.background = "#22c55e";
          }
          // Verifica se o último dia ainda não foi avaliado
          var ultimoDia = diasNumerados.length ? diasNumerados[diasNumerados.length - 1] : null;
          var ratingsExistentes = {};
          try { ratingsExistentes = JSON.parse(localStorage.getItem("fg_dia_ratings_" + roteiroId) || "{}"); } catch (_) {}

          if (ultimoDia && !ratingsExistentes[ultimoDia] && modalAvaliacaoDia) {
            // Abre modal de avaliação do último dia antes do modal final
            _avaliacaoDiaUltimoDia = true;
            _notaDia = 0;
            _pintarEstrelasDia(0);
            var txtEl2 = document.getElementById("textoDiaInput");
            if (txtEl2) txtEl2.value = "";
            var erroEl2 = document.getElementById("erroDia");
            if (erroEl2) erroEl2.style.display = "none";
            var nomeDiaEl2 = document.getElementById("nomeDiaAvaliacao");
            if (nomeDiaEl2) nomeDiaEl2.textContent = "Dia " + ultimoDia;
            var lblBtn2 = document.getElementById("lblBtnProximo");
            if (lblBtn2) lblBtn2.textContent = "Salvar e avaliar o roteiro";
            var btnConf2 = document.getElementById("btnConfirmarProximoDia");
            if (btnConf2) btnConf2.disabled = true;
            var btnPular2 = document.getElementById("btnPularAvaliacaoDia");
            if (btnPular2) btnPular2.textContent = "Pular e avaliar o roteiro";
            modalAvaliacaoDia.show();
          } else {
            if (modalAvaliacao) modalAvaliacao.show();
            else window.location.href = "meus-roteiros.html";
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-flag-fill me-1"></i>Concluir'; }
          alert("Não foi possível concluir o roteiro. Tente novamente.");
        });
    }
  }
})();

