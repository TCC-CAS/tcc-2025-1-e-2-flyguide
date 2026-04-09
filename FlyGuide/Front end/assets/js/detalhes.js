/* ================================================================
   FlyGuide - detalhes.js
   Página de detalhes de um roteiro (pages/detalhes-roteiro.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarDetalhes() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");
  const userId       = sessionStorage.getItem(SESSION_KEY);

  const loading  = document.getElementById("detalhesLoading");
  const erro     = document.getElementById("detalhesErro");
  const conteudo = document.getElementById("detalhesConteudo");

  if (!roteiroId) { loading.style.display = "none"; erro.style.display = ""; return; }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "—";
  }

  function formatarData(dataStr) {
    if (!dataStr) return "—";
    const [y, m, d] = dataStr.split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  }

  function renderLocais(locais) {
    if (!locais || locais.length === 0) {
      document.getElementById("secaoSemLocais").style.display = "";
      return;
    }
    document.getElementById("secaoLocais").style.display = "";
    const lista = document.getElementById("listaLocais");
    lista.innerHTML = locais
      .sort((a, b) => (a.dia || 0) - (b.dia || 0) || (a.ordem || 0) - (b.ordem || 0))
      .map((l, idx) => `
        <div class="day-item">
          <div class="day-bubble">${l.dia || idx + 1}</div>
          <div class="day-main">
            <div class="topline">
              <div class="name">${escapeHtml(l.nome || "Local")}</div>
            </div>
            ${l.observacoes ? `<div class="text-secondary mt-1" style="font-size:.9rem;">${escapeHtml(l.observacoes)}</div>` : ""}
            ${l.endereco ? `
              <div class="costline mt-1">
                <i class="bi bi-geo-alt-fill" style="color:#f97316;"></i>
                <span style="font-size:.82rem;color:#64748b;">${escapeHtml(l.endereco)}</span>
              </div>` : ""}
            ${l.latitude && l.longitude ? `
              <a href="https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}"
                 target="_blank"
                 style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-size:.78rem;color:#f97316;font-weight:700;text-decoration:none;">
                <i class="bi bi-map"></i> Ver no Google Maps
              </a>` : ""}
          </div>
        </div>`).join("");
  }

  fetch(`${URL_API_BASE}/roteiros/${roteiroId}/completo`)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      const r      = data.roteiro;
      const locais = data.locais || [];

      loading.style.display  = "none";
      conteudo.style.display = "";

      // Hero com imagem
      const imgUrl = r.imagemUrl || IMG_FALLBACK;
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
      setText("detalheVis",     r.visibilidadeRoteiro === "PUBLIC" ? "Público" : "Privado");

      // Stats
      setText("detalheDias", r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : "—");
      if (r.dataInicio && r.dataFim) {
        setText("detalhePeriodo", `${formatarData(r.dataInicio)} - ${formatarData(r.dataFim)}`);
      }
      setText("detalheOrcamento", r.orcamento ? `R$ ${Number(r.orcamento).toLocaleString("pt-BR")}` : "—");

      // Descrição
      if (r.observacoes) {
        document.getElementById("secaoSobre").style.display = "";
        setText("detalheDescricao", r.observacoes);
      }

      // Locais/atividades
      renderLocais(locais);

      // Botões editar/excluir — só para o dono
      if (userId && String(r.idUsuario) === String(userId)) {
        const acoes = document.getElementById("detalhesAcoes");
        if (acoes) acoes.style.display = "";

        document.getElementById("btnEditarDetalhes")?.addEventListener("click", () => {
          abrirModalEdicaoDetalhes(r);
        });

        const modalExcluir = new bootstrap.Modal(document.getElementById("modalExcluirDetalhe"));
        document.getElementById("btnExcluirDetalhes")?.addEventListener("click", () => modalExcluir.show());
        document.getElementById("btnConfirmarExclusaoDetalhe")?.addEventListener("click", async () => {
          const btn = document.getElementById("btnConfirmarExclusaoDetalhe");
          btn.disabled  = true;
          btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Excluindo...`;
          try {
            const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
              alert("Roteiro excluído com sucesso!");
              window.location.href = "meus-roteiros.html";
            } else { alert("Não foi possível excluir."); }
          } catch { alert("Erro ao conectar ao servidor."); }
          finally {
            btn.disabled  = false;
            btn.innerHTML = `<i class="bi bi-trash me-1"></i>Excluir`;
          }
        });
      }
    })
    .catch(() => { loading.style.display = "none"; erro.style.display = ""; });
})();
// ── Edição inline nos detalhes ─────────────────────────────────
function abrirModalEdicaoDetalhes(roteiro) {
  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const userId       = sessionStorage.getItem(SESSION_KEY);

  // Preenche campos
  document.getElementById("detalheEditId").value          = roteiro.idRoteiro;
  document.getElementById("detalheEditTitulo").value      = roteiro.titulo || "";
  document.getElementById("detalheEditCidade").value      = roteiro.cidade || "";
  document.getElementById("detalheEditDataInicio").value  = roteiro.dataInicio || "";
  document.getElementById("detalheEditDataFim").value     = roteiro.dataFim || "";
  document.getElementById("detalheEditTipo").value        = roteiro.tipoRoteiro || "Cidade";
  document.getElementById("detalheEditOrcamento").value   = roteiro.orcamento || "";
  document.getElementById("detalheEditVis").value         = roteiro.visibilidadeRoteiro || "PUBLIC";
  document.getElementById("detalheEditDesc").value        = roteiro.observacoes || "";
  document.getElementById("detalheEditErro").style.display = "none";

  // Seletor de imagens
  if (typeof renderSeletorImagens === "function") {
    carregarImagens().then(() => renderSeletorImagens("detalheImgSelector", "detalheEditImagem", roteiro.idImagem));
  }

  // Locais
  if (typeof window.abrirLocaisEditDetalhe === "function") {
    window.abrirLocaisEditDetalhe(roteiro.idRoteiro);
  }

  const modal = new bootstrap.Modal(document.getElementById("modalEditarDetalhe"));
  modal.show();

  // Salvar
  document.getElementById("btnSalvarDetalheEdit").onclick = async () => {
    const titulo = document.getElementById("detalheEditTitulo").value.trim();
    const cidade = document.getElementById("detalheEditCidade").value.trim();
    const erroEl = document.getElementById("detalheEditErro");
    if (!titulo || !cidade) { erroEl.textContent = "Preencha Título e Destino."; erroEl.style.display = ""; return; }
    erroEl.style.display = "none";

    const dI    = document.getElementById("detalheEditDataInicio").value;
    const dF    = document.getElementById("detalheEditDataFim").value;
    const dias  = (dI && dF) ? Math.round((new Date(dF) - new Date(dI)) / 864e5) : roteiro.diasTotais;
    const idImg = document.getElementById("detalheEditImagem").value;

    const payload = {
      idUsuario:           parseInt(userId),
      titulo, cidade,
      tipoRoteiro:         document.getElementById("detalheEditTipo").value,
      statusRoteiro:       roteiro.statusRoteiro || "PLANEJADO",
      visibilidadeRoteiro: document.getElementById("detalheEditVis").value,
      dataInicio:          dI || null, dataFim: dF || null,
      diasTotais:          dias > 0 ? dias : null,
      orcamento:           parseFloat(document.getElementById("detalheEditOrcamento").value) || null,
      observacoes:         document.getElementById("detalheEditDesc").value.trim() || null,
      idImagem:            idImg ? parseInt(idImg) : null,
    };

    const btn = document.getElementById("btnSalvarDetalheEdit");
    btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiro.idRoteiro}`, {
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