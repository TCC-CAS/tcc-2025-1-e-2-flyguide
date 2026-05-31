/* ================================================================
   FlyGuide - feed.js
   Feed público de roteiros (pages/index.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarFeed() {
  if (document.body.getAttribute("data-pagina") !== "feed") return;

  const URL_API_BASE    = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const userId          = getUserIdFromToken();
  let todosRoteiros     = [];
  let roteirosVisiveis  = [];
  let paginaFeed        = 0;
  const POR_PAGINA      = 12;
  const ROTEIROS_SALVOS_CACHE = "flyguide.roteirosSalvos";

  const badgeClasse = {
    "Aventura": "badge-green", "Cultural": "badge-purple", "Mochilão": "badge-yellow",
    "Praia": "", "Natureza": "badge-green", "Gastronomia": "badge-purple",
    "Luxo": "badge-yellow", "Cidade": "",
  };

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

  function aplicarEstadoBotaoSalvarFeed(btn, salvo) {
    const icon = btn?.querySelector("i");
    if (!btn || !icon) return;
    btn.classList.toggle("saved", !!salvo);
    btn.style.background = "";
    btn.style.borderColor = "";
    btn.setAttribute("aria-pressed", salvo ? "true" : "false");
    btn.setAttribute("title", salvo ? "Roteiro salvo" : "Salvar roteiro");
    icon.className = salvo ? "bi bi-bookmark-fill" : "bi bi-bookmark-plus";
    icon.style.color = "";
  }

  async function sincronizarBotaoSalvarFeed(btn) {
    const roteiroId = btn?.getAttribute("data-roteiro-id");
    if (!roteiroId) return;
    const iniciadoEm = Date.now();
    if (roteiroSalvoCache(roteiroId)) aplicarEstadoBotaoSalvarFeed(btn, true);
    if (!userId) return;
    try {
      const res = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/clonou?idUsuario=${userId}`);
      if (res.ok) {
        const jaClonou = await res.json();
        if (!jaClonou && Number(btn.dataset.saveStateChangedAt || 0) > iniciadoEm) return;
        definirRoteiroSalvoCache(roteiroId, !!jaClonou);
        aplicarEstadoBotaoSalvarFeed(btn, !!jaClonou);
      }
    } catch (_) {}
  }

  function formatarDataCurta(dataStr) {
    if (!dataStr) return "—";
    const [y, m, d] = dataStr.split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
  }

  function formatarPeriodo(dataInicio, dataFim) {
    if (!dataInicio) return "—";
    if (!dataFim) return formatarDataCurta(dataInicio);
    return `${formatarDataCurta(dataInicio)} → ${formatarDataCurta(dataFim)}`;
  }

  function renderCardFeed(r) {
    const imgUrl  = typeof obterImagemUrlRoteiro === "function" ? obterImagemUrlRoteiro(r) : (r.imagemUrl || IMG_FALLBACK);
    const badge   = badgeClasse[r.tipoRoteiro] || "";
    const dias    = r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : "—";
    const desc    = (r.observacoes || "Sem descrição").substring(0, 120);
    const reticencias = r.observacoes && r.observacoes.length > 120 ? "..." : "";
    const isOwner = userId && String(r.idUsuario) === String(userId);

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <div class="trip-card h-100" onclick="if(!event.target.closest('button,a')){window.location.href='detalhes-roteiro.html?id=${r.idRoteiro}'}">
          <div class="trip-cover" style="background-image:url('${imgUrl}');" role="img" aria-label="Imagem de capa do roteiro ${escapeHtml(r.titulo || "Sem título")}">
            <span class="badge-pill ${badge}">${r.tipoRoteiro || "Viagem"}</span>
            ${!isOwner ? `<button class="like-btn" data-save data-roteiro-id="${r.idRoteiro}" aria-label="Salvar roteiro: ${escapeHtml(r.titulo || "Sem título")}" title="Salvar roteiro" type="button"><i class="bi bi-bookmark-plus" aria-hidden="true"></i></button>` : ""}
            <div class="trip-title">
              <h5>${escapeHtml(r.titulo || "Sem título")}</h5>
              <div class="loc"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i>${escapeHtml(r.cidade || "—")}</div>
            </div>
          </div>
          <div class="trip-body">
            <div class="small text-secondary">${escapeHtml(desc)}${reticencias}</div>
            <div class="meta-row mt-3">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-calendar-event"></i><span>${dias}</span>
              </div>
            </div>
          </div>
          <div class="trip-footer">
            <div style="display:flex;flex-direction:column;gap:4px;">
              ${r.nomeUsuario ? `<div style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:#64748b;"><i class="bi bi-person-fill" style="color:#94a3b8;"></i>${escapeHtml(r.nomeUsuario)}</div>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="display:flex;align-items:center;gap:4px;font-size:.82rem;color:#94a3b8;">
                <i class="bi bi-star-fill" style="color:#facc15;"></i>
                <span style="color:#facc15;font-weight:600;">${r.mediaAvaliacao > 0 ? r.mediaAvaliacao.toFixed(1) : "—"}</span>
              </span>
              <span style="display:flex;align-items:center;gap:4px;font-size:.82rem;color:#94a3b8;">
                <i class="bi bi-chat-fill" style="color:#f97316;"></i>${r.totalAvaliacoes || 0}
              </span>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function clonarRoteiro(roteiroId, btn, icon, marcarSalvo) {
    icon.className = "bi bi-hourglass-split";
    try {
      const res = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/clonar?idUsuario=${userId}`, {
        method: "POST"
      });
      if (res.ok || res.status === 201) {
        definirRoteiroSalvoCache(roteiroId, true);
        if (btn) btn.dataset.saveStateChangedAt = String(Date.now());
        if (marcarSalvo) {
          aplicarEstadoBotaoSalvarFeed(btn, true);
        }
        icon.className = "bi bi-bookmark-fill";
        icon.style.color = "";

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
      } else {
        icon.className = "bi bi-bookmark-plus";
        alert("Não foi possível salvar o roteiro.");
      }
    } catch (_) {
      icon.className = "bi bi-bookmark-plus";
      alert("Erro ao conectar ao servidor.");
    }
  }

  function renderPaginacaoFeed(container, total) {
    const totalPags = Math.ceil(total / POR_PAGINA);
    let pag = document.getElementById("feedPaginacao");
    if (!pag) {
      pag = document.createElement("div");
      pag.id = "feedPaginacao";
      pag.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;margin-top:28px;flex-wrap:wrap;";
      container.after(pag);
    }
    pag.innerHTML = `
      ${paginaFeed > 0 ? `<button id="feedPrev" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 18px;font-weight:700;">← Anterior</button>` : ""}
      <span style="font-size:.88rem;color:#64748b;">Página ${paginaFeed + 1} de ${totalPags}</span>
      ${paginaFeed < totalPags - 1 ? `<button id="feedNext" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 18px;font-weight:700;">Próxima →</button>` : ""}
    `;
    document.getElementById("feedPrev")?.addEventListener("click", () => {
      paginaFeed--; renderFeed(roteirosVisiveis);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("feedNext")?.addEventListener("click", () => {
      paginaFeed++; renderFeed(roteirosVisiveis);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function renderFeed(roteiros) {
    const lista   = document.getElementById("feedLista");
    const loading = document.getElementById("feedLoading");
    const vazio   = document.getElementById("feedVazio");
    if (!lista) return;
    loading.style.display = "none";

    if (roteiros.length === 0) {
      lista.style.display = "none";
      vazio.style.display = "";
      document.getElementById("feedPaginacao")?.remove();
      return;
    }
    vazio.style.display = "none";
    lista.style.display = "";
    const inicio = paginaFeed * POR_PAGINA;
    lista.innerHTML = roteiros.slice(inicio, inicio + POR_PAGINA).map(renderCardFeed).join("");
    renderPaginacaoFeed(lista, roteiros.length);

    // Bind botões de salvar
    lista.querySelectorAll("[data-save]").forEach(async btn => {
      // Verifica se o usuário já clonou este roteiro
      sincronizarBotaoSalvarFeed(btn);

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userId) { window.location.href = "login.html"; return; }

        const roteiroId = btn.getAttribute("data-roteiro-id");
        const icon = btn.querySelector("i");

        const permitido = await verificarLimiteFree();
        if (!permitido) { mostrarModalLimite(); return; }

        if (btn.classList.contains("saved")) {
          const modal = document.createElement("div");
          modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;";
          modal.innerHTML = '<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 24px;max-width:360px;width:90%;text-align:center;">'
            + '<i class="bi bi-bookmark-fill" style="font-size:2rem;color:#f97316;"></i>'
            + '<h5 style="color:#f1f5f9;margin:12px 0 8px;">Salvar novamente?</h5>'
            + '<p style="color:#94a3b8;font-size:.88rem;margin-bottom:20px;">Você já salvou este roteiro. Deseja criar outra cópia em Meus Roteiros?</p>'
            + '<div style="display:flex;gap:10px;justify-content:center;">'
            + '<button id="modalNao" style="background:none;border:1px solid #334155;border-radius:10px;padding:8px 20px;color:#94a3b8;cursor:pointer;font-size:.9rem;">Não</button>'
            + '<button id="modalSim" style="background:#f97316;border:none;border-radius:10px;padding:8px 20px;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;">Salvar cópia</button>'
            + '</div></div>';
          document.body.appendChild(modal);
          modal.querySelector("#modalNao").onclick = () => modal.remove();
          modal.querySelector("#modalSim").onclick = async () => { modal.remove(); await clonarRoteiro(roteiroId, btn, icon, false); };
          modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
          return;
        }

        await clonarRoteiro(roteiroId, btn, icon, true);
      });
    });
  }

  window.addEventListener("pageshow", () => {
    const lista = document.getElementById("feedLista");
    if (!lista || lista.style.display === "none") return;
    lista.querySelectorAll("[data-save]").forEach(btn => sincronizarBotaoSalvarFeed(btn));
  });

  // ── Limite de roteiros (FREE = 20 total em Meus Roteiros) ────────
  const LIMITE_FREE = 20;

  async function verificarLimiteFree() {
    if (!userId) return true;
    try {
      const [resR, resU] = await Promise.all([
        authFetch(`${URL_API_BASE}/roteiros/usuario/${userId}`),
        authFetch(`${URL_API_BASE}/users/search-completo/${userId}`)
      ]);
      const lista = resR.ok ? await resR.json() : [];
      const usr   = resU.ok ? await resU.json() : null;
      if ((usr?.usuario?.tipoConta || "FREE") === "PREMIUM") return true;
      return !Array.isArray(lista) || lista.length < LIMITE_FREE;
    } catch { return true; }
  }

  function mostrarModalLimite() {
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;";
    modal.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:32px 28px;max-width:380px;width:92%;text-align:center;">'
      + '<div style="font-size:2.4rem;margin-bottom:10px;">🗺️</div>'
      + '<h5 style="color:#f1f5f9;margin-bottom:8px;font-weight:800;">Limite atingido</h5>'
      + '<p style="color:#94a3b8;font-size:.9rem;margin-bottom:20px;">Você já possui <strong style="color:#f97316;">20 roteiros</strong> no plano gratuito.<br>Assine o Premium para criar e salvar roteiros ilimitados.</p>'
      + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'
      + '<button id="_limBtn1" style="background:none;border:1px solid #334155;border-radius:10px;padding:9px 20px;color:#94a3b8;cursor:pointer;font-size:.9rem;">Fechar</button>'
      + '<a href="planos-premium.html" style="background:#f97316;border:none;border-radius:10px;padding:9px 20px;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;text-decoration:none;">⭐ Ver Planos</a>'
      + '</div></div>';
    document.body.appendChild(modal);
    modal.querySelector("#_limBtn1").onclick = () => modal.remove();
    modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
  }

  // ── Filtros premium ──────────────────────────────────────────────
  let _premiumChecked    = false;
  let _isPremium         = false;
  let _filtroPais        = null;
  let _filtroDiasMin     = null;
  let _filtroDiasMax     = null;
  let _filtroAvalMin     = null;
  let _filtroTotalAvalMin = null;

  async function _verificarPremium() {
    if (_premiumChecked) return _isPremium;
    if (!userId) { _premiumChecked = true; return false; }
    try {
      const res = await authFetch(`${URL_API_BASE}/users/search-completo/${userId}`);
      const usr = await res.json();
      _isPremium = (usr?.usuario?.tipoConta || "FREE") === "PREMIUM";
    } catch { _isPremium = false; }
    _premiumChecked = true;
    return _isPremium;
  }

  function _mostrarSecaoFiltros(secao) {
    ["filtrosVerificando","filtrosBloqueados","filtrosPremium"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = el.id === secao ? "" : "none";
    });
  }

  function _inicializarFiltrosPremium() {
    const sliderDiasMin = document.getElementById("filtroDiasMin");
    const sliderDiasMax = document.getElementById("filtroDiasMax");
    const sliderAval    = document.getElementById("filtroAvaliacao");
    const sliderTotAval = document.getElementById("filtroTotalAval");
    const inputPais     = document.getElementById("filtroPais");
    if (!sliderDiasMax || sliderDiasMax.dataset.inicializado) return;
    sliderDiasMax.dataset.inicializado = "1";

    function atualizarLabels() {
      const diasMin = parseInt(sliderDiasMin.value);
      const diasMax = parseInt(sliderDiasMax.value);
      const aval    = parseFloat(sliderAval.value);
      const totAval = parseInt(sliderTotAval.value);

      document.getElementById("filtroDiasMinVal").textContent = `${diasMin} dia${diasMin > 1 ? "s" : ""}`;
      document.getElementById("filtroDiasMaxVal").textContent = diasMax >= 30    ? "Sem limite" : `${diasMax} dia${diasMax > 1 ? "s" : ""}`;
      document.getElementById("filtroAvaliacaoVal").textContent = aval  > 0    ? `${aval.toFixed(1)} ⭐` : "Qualquer";
      document.getElementById("filtroTotalAvalVal").textContent = totAval > 0  ? `${totAval} ou mais` : "Sem filtro";
    }

    [sliderDiasMin, sliderDiasMax, sliderAval, sliderTotAval]
      .forEach(el => el.addEventListener("input", atualizarLabels));

    document.getElementById("btnAplicarFiltros")?.addEventListener("click", () => {
      const diasMin = parseInt(sliderDiasMin.value);
      const diasMax = parseInt(sliderDiasMax.value);
      const aval    = parseFloat(sliderAval.value);
      const totAval = parseInt(sliderTotAval.value);

      _filtroPais        = (inputPais?.value || "").trim() || null;
      _filtroDiasMin     = diasMin > 1     ? diasMin : null;
      _filtroDiasMax     = diasMax < 30    ? diasMax : null;
      _filtroAvalMin     = aval    > 0     ? aval    : null;
      _filtroTotalAvalMin = totAval > 0    ? totAval : null;

      const temFiltro = _filtroPais || _filtroDiasMin != null || _filtroDiasMax != null
        || _filtroAvalMin != null || _filtroTotalAvalMin != null;
      const aviso = document.getElementById("filtrosAtivosAviso");
      if (aviso) aviso.style.display = temFiltro ? "" : "none";
      filtrarEAplicar();
      bootstrap.Offcanvas.getInstance(document.getElementById("offcanvasFilters"))?.hide();
    });

    document.getElementById("btnLimparFiltros")?.addEventListener("click", () => {
      sliderDiasMin.value = 1;
      sliderDiasMax.value = 30;
      sliderAval.value    = 0;
      sliderTotAval.value = 0;
      if (inputPais) inputPais.value = "";
      _filtroPais = null;
      _filtroDiasMin = _filtroDiasMax = _filtroAvalMin = _filtroTotalAvalMin = null;
      atualizarLabels();
      const aviso = document.getElementById("filtrosAtivosAviso");
      if (aviso) aviso.style.display = "none";
      filtrarEAplicar();
    });
  }

  document.getElementById("btnFiltrosAvancados")?.addEventListener("click", () => {
    const offcanvasEl = document.getElementById("offcanvasFilters");
    if (!offcanvasEl) return;
    bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
    _inicializarFiltrosPremium();
  });

  // ── Filtro principal ─────────────────────────────────────────────
  function filtrarEAplicar() {
    const busca = (document.getElementById("feedBusca")?.value || "").toLowerCase().trim();
    const tipo  = document.getElementById("feedTipo")?.value || "";

    roteirosVisiveis = todosRoteiros.filter(r => {
      const matchBusca = !busca
        || (r.titulo     || "").toLowerCase().includes(busca)
        || (r.cidade     || "").toLowerCase().includes(busca)
        || (r.observacoes|| "").toLowerCase().includes(busca);
      const matchTipo     = !tipo || r.tipoRoteiro === tipo;
      const matchPais     = !_filtroPais || (r.pais || "").toLowerCase().includes(_filtroPais.toLowerCase());
      const matchDiasMin  = _filtroDiasMin     == null || (r.diasTotais    != null && Number(r.diasTotais)    >= _filtroDiasMin);
      const matchDiasMax  = _filtroDiasMax     == null || (r.diasTotais    != null && Number(r.diasTotais)    <= _filtroDiasMax);
      const matchAval     = _filtroAvalMin     == null || (Number(r.mediaAvaliacao || 0) >= _filtroAvalMin);
      const matchTotAval  = _filtroTotalAvalMin == null || (Number(r.totalAvaliacoes || 0) >= _filtroTotalAvalMin);
      return matchBusca && matchTipo && matchPais && matchDiasMin && matchDiasMax && matchAval && matchTotAval;
    });
    paginaFeed = 0;
    renderFeed(roteirosVisiveis);
  }

  document.getElementById("feedBusca")?.addEventListener("input",  filtrarEAplicar);
  document.getElementById("feedTipo")?.addEventListener("change",   filtrarEAplicar);

  Promise.all([
    typeof carregarImagens === "function" ? carregarImagens() : Promise.resolve(),
    fetch(`${URL_API_BASE}/roteiros/publicos`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
  ])
    .then(([, data]) => {
      const lista = Array.isArray(data) ? data : (data.content || []);
      // Nunca exibe RASCUNHO no feed público — roteiro só aparece após Finalizar
      todosRoteiros = lista.filter(r => r.statusRoteiro !== "RASCUNHO");
      filtrarEAplicar();
    })
    .catch(() => {
      document.getElementById("feedLoading").style.display = "none";
      document.getElementById("feedVazio").style.display   = "";
    });
})();
