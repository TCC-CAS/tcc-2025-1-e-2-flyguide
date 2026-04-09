/* ================================================================
   FlyGuide - feed.js
   Feed público de roteiros (pages/index.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarFeed() {
  if (document.body.getAttribute("data-pagina") !== "feed") return;

  const URL_API_BASE = "http://localhost:8080";
  let todosRoteiros  = [];

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

  function renderCardFeed(r) {
    const imgUrl = r.imagemUrl || IMG_FALLBACK;
    const badge  = badgeClasse[r.tipoRoteiro] || "";
    const dias   = r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : "—";
    const orc    = r.orcamento  ? `R$ ${Number(r.orcamento).toLocaleString("pt-BR")}` : "—";
    const desc   = (r.observacoes || "Sem descrição").substring(0, 120);
    const reticencias = r.observacoes && r.observacoes.length > 120 ? "..." : "";

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <div class="trip-card h-100">
          <div class="trip-cover" style="background-image:url('${imgUrl}');">
            <span class="badge-pill ${badge}">${r.tipoRoteiro || "Viagem"}</span>
            <div class="like-btn" data-like title="Curtir"><i class="bi bi-heart"></i></div>
            <div class="trip-title">
              <h5>${escapeHtml(r.titulo || "Sem título")}</h5>
              <div class="loc"><i class="bi bi-geo-alt-fill"></i>${escapeHtml(r.cidade || "—")}</div>
            </div>
          </div>
          <div class="trip-body">
            <div class="small text-secondary">${escapeHtml(desc)}${reticencias}</div>
            <div class="meta-row mt-3">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-calendar-event"></i><span>${dias}</span>
              </div>
              <div class="d-flex align-items-center gap-2 money">
                <i class="bi bi-currency-dollar"></i><span>${orc}</span>
              </div>
            </div>
          </div>
          <div class="trip-footer">
            <div><i class="bi bi-calendar-event me-1" style="color:#f97316;font-size:.85rem;"></i>${formatarPeriodo(r.dataInicio, r.dataFim)}</div>
            <a href="detalhes-roteiro.html?id=${r.idRoteiro}">
              <i class="bi bi-eye"></i>Ver Detalhes
            </a>
          </div>
        </div>
      </div>`;
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
      return;
    }
    vazio.style.display  = "none";
    lista.style.display  = "";
    lista.innerHTML      = roteiros.map(renderCardFeed).join("");

    // Rebind likes (cards novos não têm listener ainda)
    lista.querySelectorAll("[data-like]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("liked");
        const icon = btn.querySelector("i");
        if (icon) { icon.classList.toggle("bi-heart"); icon.classList.toggle("bi-heart-fill"); }
      });
    });
  }

  function filtrarEAplicar() {
    const busca = (document.getElementById("feedBusca")?.value || "").toLowerCase().trim();
    const tipo  = document.getElementById("feedTipo")?.value || "";

    renderFeed(todosRoteiros.filter(r => {
      const matchBusca = !busca
        || (r.titulo     || "").toLowerCase().includes(busca)
        || (r.cidade     || "").toLowerCase().includes(busca)
        || (r.observacoes|| "").toLowerCase().includes(busca);
      const matchTipo = !tipo || r.tipoRoteiro === tipo;
      return matchBusca && matchTipo;
    }));
  }

  document.getElementById("feedBusca")?.addEventListener("input",  filtrarEAplicar);
  document.getElementById("feedTipo")?.addEventListener("change",   filtrarEAplicar);

  fetch(`${URL_API_BASE}/roteiros`)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      todosRoteiros = data.filter(r => r.visibilidadeRoteiro === "PUBLIC");
      filtrarEAplicar();
    })
    .catch(() => {
      document.getElementById("feedLoading").style.display = "none";
      document.getElementById("feedVazio").style.display   = "";
    });
})();