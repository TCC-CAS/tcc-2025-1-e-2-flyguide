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
      .map(l => `
        <div class="day-item">
          <div class="day-bubble">${l.dia || "?"}</div>
          <div class="day-main">
            <div class="topline">
              <div class="name">${escapeHtml(l.nome || "Local")}</div>
            </div>
            ${l.observacoes ? `<div class="text-secondary mt-1">${escapeHtml(l.observacoes)}</div>` : ""}
            ${l.endereco    ? `<div class="costline"><i class="bi bi-geo-alt"></i>${escapeHtml(l.endereco)}</div>` : ""}
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
          window.location.href = `criar-roteiro.html?id=${r.idRoteiro}`;
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