/* ================================================================
   FlyGuide - roteiros.js
   Gerenciamento de roteiros do usuário:
   - Meus Roteiros (pages/meus-roteiros.html)
   - Criar Roteiro (pages/criar-roteiro.html)
   - Atividades (pages/atividades-roteiro.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarModuloRoteiros() {
  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const ROTEIRO_KEY  = "flyguide.roteiroAtual";
  const pagina       = document.body.getAttribute("data-pagina");

  const badgeClasse = {
    "Aventura": "badge-green", "Cultural": "badge-purple", "Mochilão": "badge-yellow",
    "Praia": "", "Natureza": "badge-green", "Gastronomia": "badge-purple",
    "Luxo": "badge-yellow", "Cidade": "",
  };

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

  // ════════════════════════════════════════════════════════════
  // MEUS ROTEIROS
  // ════════════════════════════════════════════════════════════
  if (pagina === "meus-roteiros") {
    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) { window.location.href = "login.html"; return; }

    let todosRoteiros     = [];
    let filtroAtivo       = "todos";
    let idParaExcluir     = null;
    let roteiroParaEditar = null;

    const modalExcluir = new bootstrap.Modal(document.getElementById("modalExcluirRoteiro"));
    const modalEditar  = new bootstrap.Modal(document.getElementById("modalEditarRoteiro"));

    function renderCard(r) {
      const imgUrl  = r.imagemUrl || IMG_FALLBACK;
      const badge   = badgeClasse[r.tipoRoteiro] || "";
      const dias    = r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : "—";
      const orc     = r.orcamento  ? `R$ ${Number(r.orcamento).toLocaleString("pt-BR")}` : "—";
      const visIcon = r.visibilidadeRoteiro === "PUBLIC"
        ? `<i class="bi bi-globe" title="Público"></i>`
        : `<i class="bi bi-lock-fill" title="Privado"></i>`;

      return `
        <div class="col-12 col-md-6 col-xl-4"
             data-roteiro-id="${r.idRoteiro}"
             data-vis="${r.visibilidadeRoteiro || "PUBLIC"}">
          <div class="trip-card h-100">
            <div class="trip-cover" style="background-image:url('${imgUrl}');">
              <span class="badge-pill ${badge}">${r.tipoRoteiro || "Viagem"}</span>
              <div class="trip-title">
                <h5>${escapeHtml(r.titulo || "Sem título")}</h5>
                <div class="loc"><i class="bi bi-geo-alt-fill"></i>${escapeHtml(r.cidade || "—")}</div>
              </div>
            </div>
            <div class="trip-body">
              <div class="small text-secondary">${escapeHtml(r.observacoes || "Sem descrição")}</div>
              <div class="meta-row mt-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-calendar-event"></i><span>${dias}</span>
                </div>
                <div class="d-flex align-items-center gap-2 money">
                  <i class="bi bi-currency-dollar"></i><span>${orc}</span>
                </div>
                <div class="d-flex align-items-center gap-2" style="color:#64748b;">${visIcon}</div>
              </div>
            </div>
            <div class="trip-footer">
              <div><i class="bi bi-calendar-event me-1" style="color:#f97316;font-size:.85rem;"></i>${formatarPeriodo(r.dataInicio, r.dataFim)}</div>
              <div class="d-flex gap-3 align-items-center">
                <button class="btn btn-link p-0 fw-bold" style="color:#3b82f6;font-size:.85rem;"
                        data-editar-roteiro="${r.idRoteiro}" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-link p-0 fw-bold" style="color:#ef4444;font-size:.85rem;"
                        data-excluir-roteiro="${r.idRoteiro}"
                        data-nome="${escapeHtml(r.titulo || "este roteiro")}" title="Excluir">
                  <i class="bi bi-trash"></i>
                </button>
                <a href="detalhes-roteiro.html?id=${r.idRoteiro}"
                   style="color:#f97316;font-weight:700;font-size:.88rem;display:flex;align-items:center;gap:6px;">
                  <i class="bi bi-eye"></i>Ver Detalhes
                </a>
              </div>
            </div>
          </div>
        </div>`;
    }

    function renderLista(roteiros) {
      const lista   = document.getElementById("listaRoteiros");
      const loading = document.getElementById("loadingRoteiros");
      const empty   = document.getElementById("emptyRoteiros");
      if (!lista) return;
      loading.style.display = "none";

      if (roteiros.length === 0) { lista.style.display = "none"; empty.style.display = ""; return; }
      empty.style.display = "none";
      lista.style.display = "";
      lista.innerHTML = roteiros.map(renderCard).join("");

      lista.querySelectorAll("[data-excluir-roteiro]").forEach(btn => {
        btn.addEventListener("click", () => {
          idParaExcluir = btn.getAttribute("data-excluir-roteiro");
          document.getElementById("nomeRoteiroExcluir").textContent = btn.getAttribute("data-nome");
          modalExcluir.show();
        });
      });

      lista.querySelectorAll("[data-editar-roteiro]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-editar-roteiro");
          roteiroParaEditar = todosRoteiros.find(r => String(r.idRoteiro) === String(id));
          if (!roteiroParaEditar) return;
          preencherModalEditar(roteiroParaEditar);
          modalEditar.show();
        });
      });
    }

    function preencherModalEditar(r) {
      document.getElementById("editRoteiroId").value     = r.idRoteiro;
      document.getElementById("editTitulo").value        = r.titulo || "";
      document.getElementById("editCidade").value        = r.cidade || "";
      document.getElementById("editDataInicio").value    = r.dataInicio || "";
      document.getElementById("editDataFim").value       = r.dataFim || "";
      document.getElementById("editTipo").value          = r.tipoRoteiro || "Cidade";
      document.getElementById("editOrcamento").value     = r.orcamento || "";
      document.getElementById("editVisibilidade").value  = r.visibilidadeRoteiro || "PUBLIC";
      document.getElementById("editDescricao").value     = r.observacoes || "";
      document.getElementById("editImagem").value        = r.idImagem || "";
      document.getElementById("editRoteiroErro").style.display = "none";
      renderSeletorImagens("imgSelectorEdit", "editImagem", r.idImagem);
    }

    function atualizarContadores(roteiros) {
      const s = id => document.getElementById(id);
      if (s("cntTodos"))    s("cntTodos").textContent    = roteiros.length;
      if (s("cntPublicos")) s("cntPublicos").textContent = roteiros.filter(r => r.visibilidadeRoteiro === "PUBLIC").length;
      if (s("cntPrivados")) s("cntPrivados").textContent = roteiros.filter(r => r.visibilidadeRoteiro === "PRIVATE").length;
    }

    function aplicarFiltro(filtro) {
      filtroAtivo = filtro;
      document.querySelectorAll("[data-filtro]").forEach(b =>
        b.classList.toggle("active-filter", b.getAttribute("data-filtro") === filtro));
      renderLista(filtro === "todos" ? todosRoteiros : todosRoteiros.filter(r => r.visibilidadeRoteiro === filtro));
    }

    document.querySelectorAll("[data-filtro]").forEach(b =>
      b.addEventListener("click", () => aplicarFiltro(b.getAttribute("data-filtro"))));

    // Excluir
    document.getElementById("btnConfirmarExcluirRoteiro")?.addEventListener("click", async () => {
      if (!idParaExcluir) return;
      const btn = document.getElementById("btnConfirmarExcluirRoteiro");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Excluindo...`;
      try {
        const r = await fetch(`${URL_API_BASE}/roteiros/${idParaExcluir}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          modalExcluir.hide();
          todosRoteiros = todosRoteiros.filter(r => String(r.idRoteiro) !== String(idParaExcluir));
          atualizarContadores(todosRoteiros);
          aplicarFiltro(filtroAtivo);
        } else { alert("Não foi possível excluir."); }
      } catch { alert("Erro ao conectar ao servidor."); }
      finally { btn.disabled = false; btn.innerHTML = `<i class="bi bi-trash me-1"></i>Excluir`; idParaExcluir = null; }
    });

    // Salvar edição
    document.getElementById("btnSalvarEdicaoRoteiro")?.addEventListener("click", async () => {
      if (!roteiroParaEditar) return;
      const id     = document.getElementById("editRoteiroId").value;
      const titulo = document.getElementById("editTitulo").value.trim();
      const cidade = document.getElementById("editCidade").value.trim();
      const erroEl = document.getElementById("editRoteiroErro");

      if (!titulo || !cidade) { erroEl.textContent = "Preencha pelo menos o Título e o Destino."; erroEl.style.display = ""; return; }
      erroEl.style.display = "none";

      const dI      = document.getElementById("editDataInicio").value;
      const dF      = document.getElementById("editDataFim").value;
      const dias    = (dI && dF) ? Math.round((new Date(dF) - new Date(dI)) / 864e5) + 1 : roteiroParaEditar.diasTotais;
      const idImagem = document.getElementById("editImagem").value;

      const payload = {
        idUsuario:           parseInt(userId),
        titulo, cidade,
        tipoRoteiro:         document.getElementById("editTipo").value,
        statusRoteiro:       roteiroParaEditar.statusRoteiro || "PLANEJADO",
        visibilidadeRoteiro: document.getElementById("editVisibilidade").value,
        dataInicio:  dI || null,
        dataFim:     dF || null,
        diasTotais:  dias > 0 ? dias : null,
        orcamento:   parseFloat(document.getElementById("editOrcamento").value) || null,
        observacoes: document.getElementById("editDescricao").value.trim() || null,
        idImagem:    idImagem ? parseInt(idImagem) : null,
      };

      const btn = document.getElementById("btnSalvarEdicaoRoteiro");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;
      try {
        const r = await fetch(`${URL_API_BASE}/roteiros/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (r.ok) {
          const atualizado = await r.json();
          const idx = todosRoteiros.findIndex(r => String(r.idRoteiro) === String(id));
          if (idx !== -1) todosRoteiros[idx] = atualizado;
          atualizarContadores(todosRoteiros);
          aplicarFiltro(filtroAtivo);
          modalEditar.hide();
        } else { erroEl.textContent = "Erro ao salvar."; erroEl.style.display = ""; }
      } catch { erroEl.textContent = "Erro ao conectar ao servidor."; erroEl.style.display = ""; }
      finally { btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar Alterações`; }
    });

    // Carregar
    carregarImagens().then(() => {
      fetch(`${URL_API_BASE}/roteiros/usuario/${userId}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { todosRoteiros = data; atualizarContadores(data); aplicarFiltro("todos"); })
        .catch(() => {
          document.getElementById("loadingRoteiros").style.display = "none";
          document.getElementById("emptyRoteiros").style.display   = "";
        });
    });
  }

  // ════════════════════════════════════════════════════════════
  // CRIAR ROTEIRO (Etapa 1)
  // ════════════════════════════════════════════════════════════
  if (pagina === "criar-roteiro") {
    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) { window.location.href = "login.html"; return; }

    carregarImagens().then(imgs => {
      if (imgs.length > 0) {
        renderSeletorImagens("imgSelector", "itImagem", imgs[0].idImagem);
        document.getElementById("itImagem").value = imgs[0].idImagem;
      }
    });

    function calcDias(i, f) {
      if (!i || !f) return null;
      const diff = Math.round((new Date(f) - new Date(i)) / 864e5);
      return diff > 0 ? diff + 1 : null;
    }

    document.getElementById("btnAvancar")?.addEventListener("click", async () => {
      const titulo      = document.getElementById("itTitle")?.value?.trim();
      const cidade      = document.getElementById("itDestination")?.value?.trim();
      const tipoRoteiro = document.getElementById("itType")?.value || "Cidade";
      const dataInicio  = document.getElementById("itStart")?.value || null;
      const dataFim     = document.getElementById("itEnd")?.value   || null;
      const orcamento   = document.getElementById("itBudget")?.value?.trim();
      const observacoes = document.getElementById("itDescription")?.value?.trim();
      const isPublic    = document.getElementById("itPublic")?.checked;
      const idImagem    = document.getElementById("itImagem")?.value;
      const erroEl      = document.getElementById("criarRoteiroErro");

      if (!titulo || !cidade) {
        erroEl.textContent = "Preencha pelo menos o Título e o Destino.";
        erroEl.style.display = "";
        erroEl.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      erroEl.style.display = "none";

      const payload = {
        idUsuario:           parseInt(userId),
        titulo, cidade, tipoRoteiro,
        statusRoteiro:       "PLANEJADO",
        visibilidadeRoteiro: isPublic ? "PUBLIC" : "PRIVATE",
        dataInicio:  dataInicio || null,
        dataFim:     dataFim    || null,
        diasTotais:  calcDias(dataInicio, dataFim),
        orcamento:   orcamento ? parseFloat(orcamento) : null,
        observacoes: observacoes || null,
        idImagem:    idImagem ? parseInt(idImagem) : null,
      };

      const btn = document.getElementById("btnAvancar");
      btn.disabled  = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

      try {
        const resp = await fetch(`${URL_API_BASE}/roteiros`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error();
        const criado = await resp.json();

        sessionStorage.setItem(ROTEIRO_KEY, JSON.stringify({
          id:         criado.idRoteiro,
          titulo:     criado.titulo,
          cidade:     criado.cidade,
          dataInicio: criado.dataInicio,
          dataFim:    criado.dataFim,
        }));
        sessionStorage.removeItem("flyguide.draft.activities");
        window.location.href = "atividades-roteiro.html";
      } catch {
        erroEl.textContent = "Não foi possível salvar o roteiro. Verifique se o backend está rodando.";
        erroEl.style.display = "";
        btn.disabled  = false;
        btn.innerHTML = `Avançar <i class="bi bi-arrow-right ms-1"></i>`;
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // ATIVIDADES (Etapa 2)
  // ════════════════════════════════════════════════════════════
  if (pagina === "atividades-roteiro") {
    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) { window.location.href = "login.html"; return; }

    const roteiroAtual = JSON.parse(sessionStorage.getItem(ROTEIRO_KEY) || "null");
    const summaryEl    = document.getElementById("draftSummary");
    const alertEl      = document.getElementById("roteiroSalvoAlert");

    if (roteiroAtual && summaryEl) {
      const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
      const fmtD  = s => { if (!s) return "?"; const [y,m,d] = s.split("-"); return `${parseInt(d)} ${meses[parseInt(m)-1]}`; };
      summaryEl.innerHTML = `
        <span class="pill"><i class="bi bi-card-text"></i>${escapeHtml(roteiroAtual.titulo)}</span>
        ${roteiroAtual.cidade    ? `<span class="pill"><i class="bi bi-geo-alt"></i>${escapeHtml(roteiroAtual.cidade)}</span>` : ""}
        ${roteiroAtual.dataInicio ? `<span class="pill"><i class="bi bi-calendar-event"></i>${fmtD(roteiroAtual.dataInicio)} → ${fmtD(roteiroAtual.dataFim)}</span>` : ""}
      `;
      summaryEl.style.display = "inline-flex";
      if (alertEl) alertEl.style.display = "";
    }

    document.getElementById("btnConcluirRoteiro")?.addEventListener("click", () => {
      sessionStorage.removeItem(ROTEIRO_KEY);
      sessionStorage.removeItem("flyguide.draft.activities");
      window.location.href = "meus-roteiros.html";
    });
  }
})();