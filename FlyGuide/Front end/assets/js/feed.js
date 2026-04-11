/* ================================================================
   FlyGuide - feed.js
   Feed público de roteiros (pages/index.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarFeed() {
  if (document.body.getAttribute("data-pagina") !== "feed") return;

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const userId       = sessionStorage.getItem(SESSION_KEY);
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
            <div class="like-btn" data-like data-roteiro-id="${r.idRoteiro}" title="Curtir"><i class="bi bi-heart"></i></div>
            <div class="like-btn" data-save data-roteiro-id="${r.idRoteiro}" title="Salvar roteiro" style="right:54px;"><i class="bi bi-bookmark"></i></div>
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
            <div style="display:flex;align-items:center;gap:12px;">
              <span id="count-likes-${r.idRoteiro}" style="display:flex;align-items:center;gap:4px;font-size:.82rem;color:#94a3b8;">
                <i class="bi bi-heart-fill" style="color:#f97316;"></i>${r.totalLikes || 0}
              </span>
              <span style="display:flex;align-items:center;gap:4px;font-size:.82rem;color:#94a3b8;">
                <i class="bi bi-chat-fill" style="color:#f97316;"></i>${r.totalComentarios || 0}
              </span>
              ${r.mediaAvaliacao > 0 ? `<span style="display:flex;align-items:center;gap:3px;font-size:.82rem;"><i class="bi bi-star-fill" style="color:#facc15;"></i><span style="color:#facc15;font-weight:600;">${r.mediaAvaliacao.toFixed(1)}</span><span style="color:#94a3b8;">(${r.totalAvaliacoes || 0})</span></span>` : ""}
              <a href="detalhes-roteiro.html?id=${r.idRoteiro}">
                <i class="bi bi-eye"></i>Ver Detalhes
              </a>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function clonarRoteiro(roteiroId, btn, icon, marcarSalvo) {
    icon.className = "bi bi-hourglass-split";
    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/clonar?idUsuario=${userId}`, {
        method: "POST"
      });
      if (res.ok || res.status === 201) {
        if (marcarSalvo) {
          btn.classList.add("saved");
          btn.style.background = "rgba(249,115,22,.92)";
          btn.style.borderColor = "#f97316";
        }
        icon.className = "bi bi-bookmark-fill";
        icon.style.color = "#fff";

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
        icon.className = "bi bi-bookmark";
        alert("Não foi possível salvar o roteiro.");
      }
    } catch (_) {
      icon.className = "bi bi-bookmark";
      alert("Erro ao conectar ao servidor.");
    }
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
    vazio.style.display = "none";
    lista.style.display = "";
    lista.innerHTML     = roteiros.map(renderCardFeed).join("");

    // Bind botões de salvar
    lista.querySelectorAll("[data-save]").forEach(async btn => {
      const roteiroId = btn.getAttribute("data-roteiro-id");
      const icon = btn.querySelector("i");

      // Verifica se o usuário já clonou este roteiro
      if (userId) {
        try {
          const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/clonou?idUsuario=${userId}`);
          if (res.ok) {
            const jaClonou = await res.json();
            if (jaClonou) {
              btn.classList.add("saved");
              btn.style.background = "rgba(249,115,22,.92)";
              btn.style.borderColor = "#f97316";
              icon.className = "bi bi-bookmark-fill";
              icon.style.color = "#fff";
            }
          }
        } catch (_) {}
      }

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userId) { window.location.href = "login.html"; return; }

        const roteiroId = btn.getAttribute("data-roteiro-id");
        const icon = btn.querySelector("i");

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

    // Bind botões de curtir
    lista.querySelectorAll("[data-like]").forEach(async btn => {
      const roteiroId = btn.getAttribute("data-roteiro-id");
      const icon = btn.querySelector("i");

      try {
        const resCount = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/count`);
        if (resCount.ok) {
          const count = await resCount.json();
          if (count > 0) {
            btn.setAttribute("data-count", count);
            btn.title = `${count} ${count === 1 ? "pessoa curtiu" : "pessoas curtiram"}`;
          }
        }
      } catch (_) {}

      if (userId) {
        try {
          const resJa = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/${userId}`);
          if (resJa.ok) {
            const jaCurtiu = await resJa.json();
            if (jaCurtiu) {
              btn.classList.add("liked");
              icon?.classList.replace("bi-heart", "bi-heart-fill");
            }
          }
        } catch (_) {}
      }

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userId) { window.location.href = "login.html"; return; }

        const curtido = btn.classList.contains("liked");
        btn.classList.toggle("liked");
        icon?.classList.toggle("bi-heart");
        icon?.classList.toggle("bi-heart-fill");

        const countEl = document.getElementById(`count-likes-${roteiroId}`);
        if (countEl) {
          const atual = parseInt(countEl.textContent.trim()) || 0;
          const novo  = curtido ? Math.max(0, atual - 1) : atual + 1;
          countEl.innerHTML = `<i class="bi bi-heart-fill" style="color:#f97316;"></i>${novo}`;
        }

        try {
          const method = curtido ? "DELETE" : "POST";
          await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/${userId}`, { method });
        } catch (_) {
          btn.classList.toggle("liked");
          icon?.classList.toggle("bi-heart");
          icon?.classList.toggle("bi-heart-fill");
          if (countEl) {
            const atual = parseInt(countEl.textContent.trim()) || 0;
            const revert = curtido ? atual + 1 : Math.max(0, atual - 1);
            countEl.innerHTML = `<i class="bi bi-heart-fill" style="color:#f97316;"></i>${revert}`;
          }
        }
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