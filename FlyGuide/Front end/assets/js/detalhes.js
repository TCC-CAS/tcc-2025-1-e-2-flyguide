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
// ── Módulo de Comentários ──────────────────────────────────────────────────
(function iniciarComentarios() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");
  const userId       = sessionStorage.getItem(SESSION_KEY);

  if (!roteiroId) return;

  // Exibe formulário ou aviso de login
  if (userId) {
    document.getElementById("formComentario").style.display = "";
  } else {
    document.getElementById("avisoLoginComentario").style.display = "";
  }

  // Carrega comentários existentes
  async function carregarComentarios() {
    const loading = document.getElementById("loadingComentarios");
    const lista   = document.getElementById("listaComentarios");
    const vazio   = document.getElementById("semComentarios");

    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/comentarios`);
      if (!res.ok) {
        console.error(`[FlyGuide] GET comentarios falhou - status: ${res.status}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const comentarios = await res.json();

      loading.style.display = "none";

      if (!comentarios || comentarios.length === 0) {
        vazio.style.display = "";
        return;
      }

      lista.innerHTML = comentarios.map(c => `
        <div class="comentario-item" id="comentario-${c.idComentario}" style="
          display:flex; gap:12px; padding:12px 0;
          border-bottom:1px solid #f1f5f9; align-items:flex-start;">
          <div style="
            width:36px; height:36px; border-radius:50%; background:#f97316;
            display:flex; align-items:center; justify-content:center;
            color:#fff; font-weight:700; font-size:.85rem; flex-shrink:0;">
            ${escapeHtml((c.nomeExibicao || c.emailUsuario || "?")[0].toUpperCase())}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <span style="font-weight:600; font-size:.88rem;">${escapeHtml(c.nomeExibicao || c.emailUsuario || "Usuário")}</span>
              <span style="font-size:.75rem; color:#94a3b8;">${formatarDataHora(c.criadoEm)}${c.editadoEm ? " · <em>editado</em>" : ""}</span>
            </div>
            <div id="texto-${c.idComentario}" style="font-size:.88rem; margin-top:4px; word-break:break-word;">
              ${escapeHtml(c.texto)}
            </div>
          </div>
          ${String(c.idUsuario) === String(userId) ? `
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
              <button
                onclick="editarComentario(${c.idComentario})"
                title="Editar comentário"
                style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.85rem;padding:2px 6px;"
              ><i class="bi bi-pencil"></i></button>
              <button
                onclick="excluirComentario(${c.idComentario})"
                title="Excluir comentário"
                style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.85rem;padding:2px 6px;"
              ><i class="bi bi-trash"></i></button>
            </div>
          ` : ""}
        </div>
      `).join("");

    } catch (e) {
      console.error("[FlyGuide] Erro ao carregar comentários:", e);
      loading.style.display = "none";
      document.getElementById("listaComentarios").innerHTML =
        `<div class="text-secondary text-center py-2" style="font-size:.85rem;">Não foi possível carregar os comentários.</div>`;
    }
  }

  function formatarDataHora(str) {
    if (!str) return "";
    try {
      const d = new Date(str);
      return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  // Enviar comentário
  document.getElementById("btnEnviarComentario")?.addEventListener("click", async () => {
    const input  = document.getElementById("inputComentario");
    const erroEl = document.getElementById("erroComentario");
    const erroTx = document.getElementById("erroComentarioTexto");
    const btn    = document.getElementById("btnEnviarComentario");
    const texto  = input.value.trim();

    erroEl.style.display = "none";

    if (!texto) {
      erroTx.textContent = "Escreva algo antes de publicar.";
      erroEl.style.display = "";
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Publicando...`;

    let novoDTO = null;

    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idUsuario: parseInt(userId), texto })
      });

      if (res.ok || res.status === 201) {
        try { novoDTO = await res.json(); } catch (_) {}
        publicouComSucesso = true;
        input.value = "";
        document.getElementById("semComentarios").style.display = "none";
      } else if (res.status === 422) {
        erroTx.textContent = "Comentário contém linguagem inapropriada. Por favor, revise o texto.";
        erroEl.style.display = "";
      } else if (res.status === 400) {
        erroTx.textContent = "O comentário não pode estar vazio.";
        erroEl.style.display = "";
      } else {
        erroTx.textContent = "Erro ao publicar comentário. Tente novamente.";
        erroEl.style.display = "";
      }
    } catch (e) {
      publicouComSucesso = true;
      input.value = "";
      console.warn("[FlyGuide] Erro na resposta do POST, verificando se foi salvo...", e);
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="bi bi-send-fill me-1"></i>Publicar`;
    }

    if (publicouComSucesso) {
      if (novoDTO) {
        // Adiciona direto na lista usando a resposta do backend
        const lista = document.getElementById("listaComentarios");
        const vazio = document.getElementById("semComentarios");
        vazio.style.display = "none";

        const novoEl = document.createElement("div");
        novoEl.className = "comentario-item";
        novoEl.id = `comentario-${novoDTO.idComentario}`;
        novoEl.style.cssText = "display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;align-items:flex-start;";
        novoEl.innerHTML = `
          <div style="width:36px;height:36px;border-radius:50%;background:#f97316;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0;">
            ${escapeHtml((novoDTO.nomeExibicao || novoDTO.emailUsuario || "?")[0].toUpperCase())}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
              <span style="font-weight:600;font-size:.88rem;">${escapeHtml(novoDTO.nomeExibicao || novoDTO.emailUsuario || "Usuário")}</span>
              <span style="font-size:.75rem;color:#94a3b8;">${formatarDataHora(novoDTO.criadoEm)}</span>
            </div>
            <div id="texto-${novoDTO.idComentario}" style="font-size:.88rem;margin-top:4px;word-break:break-word;">${escapeHtml(novoDTO.texto)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
            <button onclick="editarComentario(${novoDTO.idComentario})" title="Editar comentário"
              style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.85rem;padding:2px 6px;">
              <i class="bi bi-pencil"></i>
            </button>
            <button onclick="excluirComentario(${novoDTO.idComentario})" title="Excluir comentário"
              style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:.85rem;padding:2px 6px;">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
        lista.insertBefore(novoEl, lista.firstChild);
      } else {
        // Fallback: se não veio o DTO, recarrega tudo
        await carregarComentarios();
      }
    }
  });

  // Excluir comentário (global para o onclick inline)
  window.excluirComentario = async function(idComentario) {
    if (!confirm("Excluir este comentário?")) return;
    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/comentarios/${idComentario}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        const el = document.getElementById(`comentario-${idComentario}`);
        if (el) el.remove();
        // Se não sobrou nenhum, mostra estado vazio
        const lista = document.getElementById("listaComentarios");
        if (!lista.querySelector(".comentario-item")) {
          document.getElementById("semComentarios").style.display = "";
        }
      }
    } catch {
      alert("Erro ao excluir comentário.");
    }
  };

  carregarComentarios();
})();
// ── Módulo de Curtidas ─────────────────────────────────────────────────────
(function iniciarCurtidas() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");
  const userId       = sessionStorage.getItem(SESSION_KEY);

  if (!roteiroId) return;

  const btn        = document.getElementById("btnCurtir");
  const btnTexto   = document.getElementById("btnCurtirTexto");
  const totalEl    = document.getElementById("totalCurtidas");

  let curtido = false;

  function atualizarBotao() {
    if (curtido) {
      btn.style.background = "#dc2626";
      btn.innerHTML = `<i class="bi bi-heart-fill"></i> <span>Curtido</span>`;
    } else {
      btn.style.background = "#ef4444";
      btn.innerHTML = `<i class="bi bi-heart"></i> <span>Curtir</span>`;
    }
  }

  function atualizarTotal(count) {
    if (count === 0) {
      totalEl.textContent = "";
    } else {
      totalEl.textContent = `${count} ${count === 1 ? "pessoa curtiu" : "pessoas curtiram"}`;
    }
  }

  async function carregarCurtidas() {
    try {
      // Busca total
      const resCount = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/count`);
      if (resCount.ok) {
        const count = await resCount.json();
        atualizarTotal(count);
      }

      // Verifica se o usuário já curtiu
      if (userId) {
        const resJa = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/${userId}`);
        if (resJa.ok) {
          curtido = await resJa.json();
          atualizarBotao();
        }
      } else {
        // Não logado — botão desabilitado
        btn.disabled = true;
        btn.title = "Faça login para curtir";
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
      }
    } catch (e) {
      console.error("[FlyGuide] Erro ao carregar curtidas:", e);
    }
  }

  btn.addEventListener("click", async () => {
    if (!userId) return;

    const eraCurtido = curtido;
    curtido = !curtido;
    atualizarBotao();

    // Atualiza o total otimisticamente
    const resCount = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/count`).catch(() => null);
    let countAtual = resCount?.ok ? await resCount.json() : 0;
    atualizarTotal(eraCurtido ? countAtual - 1 : countAtual + 1);

    try {
      const method = eraCurtido ? "DELETE" : "POST";
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/likes/${userId}`, { method });

      if (!res.ok && res.status !== 204) {
        // Reverte em caso de erro
        curtido = eraCurtido;
        atualizarBotao();
        atualizarTotal(countAtual);
      }
    } catch {
      curtido = eraCurtido;
      atualizarBotao();
      atualizarTotal(countAtual);
    }
  });

  carregarCurtidas();
})();
// ── Edição de Comentários ─────────────────────────────────────────────────
(function iniciarEdicaoComentarios() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "http://localhost:8080";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");

  window.editarComentario = function(idComentario) {
    const textoEl = document.getElementById(`texto-${idComentario}`);
    if (!textoEl) return;

    const textoAtual = textoEl.textContent.trim();

    textoEl.innerHTML = `
      <textarea id="edit-input-${idComentario}"
        style="width:100%;resize:none;border-radius:8px;padding:6px 10px;font-size:.88rem;border:1px solid #f97316;outline:none;background:inherit;color:inherit;margin-top:4px;"
        rows="2" maxlength="500"
      >${escapeHtml(textoAtual)}</textarea>
      <div style="display:flex;gap:8px;margin-top:6px;justify-content:flex-end;">
        <button onclick="cancelarEdicao(${idComentario}, \`${textoAtual.replace(/`/g, '\\`')}\`)"
          style="background:none;border:1px solid #94a3b8;border-radius:8px;padding:4px 12px;font-size:.8rem;cursor:pointer;color:#94a3b8;">
          Cancelar
        </button>
        <button onclick="salvarEdicao(${idComentario})"
          style="background:#f97316;border:none;border-radius:8px;padding:4px 12px;font-size:.8rem;cursor:pointer;color:#fff;font-weight:600;">
          Salvar
        </button>
      </div>
      <div id="edit-erro-${idComentario}" style="display:none;color:#ef4444;font-size:.8rem;margin-top:4px;"></div>
    `;
    document.getElementById(`edit-input-${idComentario}`)?.focus();
  };

  window.cancelarEdicao = function(idComentario, textoOriginal) {
    const textoEl = document.getElementById(`texto-${idComentario}`);
    if (textoEl) textoEl.innerHTML = escapeHtml(textoOriginal);
  };

  window.salvarEdicao = async function(idComentario) {
    const input    = document.getElementById(`edit-input-${idComentario}`);
    const erroEl   = document.getElementById(`edit-erro-${idComentario}`);
    const novoTexto = input?.value.trim();

    if (!novoTexto) {
      erroEl.textContent = "O comentário não pode estar vazio.";
      erroEl.style.display = "";
      return;
    }

    try {
      const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/comentarios/${idComentario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: novoTexto })
      });

      if (res.ok) {
        const textoEl = document.getElementById(`texto-${idComentario}`);
        if (textoEl) textoEl.innerHTML = escapeHtml(novoTexto);

        const item = document.getElementById(`comentario-${idComentario}`);
        const dataSpan = item?.querySelector("span[style*='94a3b8']");
        if (dataSpan && !dataSpan.innerHTML.includes("editado")) {
          dataSpan.innerHTML += " · <em>editado</em>";
        }
      } else if (res.status === 422) {
        erroEl.textContent = "Comentário contém linguagem inapropriada.";
        erroEl.style.display = "";
      } else {
        erroEl.textContent = "Erro ao salvar. Tente novamente.";
        erroEl.style.display = "";
      }
    } catch {
      erroEl.textContent = "Erro ao conectar ao servidor.";
      erroEl.style.display = "";
    }
  };
})();
// ── Módulo de Avaliação por Estrelas ──────────────────────────────────────
(function iniciarAvaliacao() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";
  const params       = new URLSearchParams(window.location.search);
  const roteiroId    = params.get("id");
  const userId       = sessionStorage.getItem(SESSION_KEY);

  if (!roteiroId) return;

  const estrelasEl = document.getElementById("estrelasAvaliacao");
  const mediaEl    = document.getElementById("mediaAvaliacao");
  if (!estrelasEl) return;

  const estrelas = estrelasEl.querySelectorAll("i[data-nota]");
  let notaAtual  = 0;

  function renderEstrelas(nota, hover) {
    estrelas.forEach(s => {
      const n = parseInt(s.getAttribute("data-nota"));
      s.className = n <= nota ? "bi bi-star-fill" : "bi bi-star";
      s.style.color = "#facc15";
      if (hover) s.style.transform = n <= nota ? "scale(1.2)" : "scale(1)";
    });
  }

  async function carregarAvaliacao() {
    try {
      // Carrega média
      const resMedia = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/avaliacoes`);
      if (resMedia.ok) {
        const dados = await resMedia.json();
        const media = dados.media || 0;
        const total = dados.total || 0;
        if (total > 0) {
          mediaEl.textContent = `${media.toFixed(1)} ★ (${total} avaliação${total !== 1 ? "ões" : ""})`;
        } else {
          mediaEl.textContent = "Sem avaliações ainda";
        }
      }

      // Carrega nota do usuário logado
      if (userId) {
        const resNota = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/avaliacoes/${userId}`);
        if (resNota.ok) {
          notaAtual = await resNota.json();
          renderEstrelas(notaAtual, false);
        }
      } else {
        // Não logado: desabilita estrelas
        estrelas.forEach(s => s.style.cursor = "not-allowed");
        estrelasEl.title = "Faça login para avaliar";
      }
    } catch (e) {
      console.error("[FlyGuide] Erro ao carregar avaliação:", e);
    }
  }

  // Hover nas estrelas
  estrelas.forEach(s => {
    s.addEventListener("mouseenter", () => {
      if (!userId) return;
      renderEstrelas(parseInt(s.getAttribute("data-nota")), true);
    });
    s.addEventListener("mouseleave", () => {
      renderEstrelas(notaAtual, false);
    });
  });

  // Clique para avaliar
  estrelas.forEach(s => {
    s.addEventListener("click", async () => {
      if (!userId) { window.location.href = "login.html"; return; }

      const nota = parseInt(s.getAttribute("data-nota"));
      notaAtual  = nota;
      renderEstrelas(nota, false);

      try {
        const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/avaliacoes/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nota })
        });
        if (res.ok) {
          // Recarrega a média
          const resMedia = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/avaliacoes`);
          if (resMedia.ok) {
            const dados = await resMedia.json();
            const media = dados.media || 0;
            const total = dados.total || 0;
            mediaEl.textContent = `${media.toFixed(1)} ★ (${total} avaliação${total !== 1 ? "ões" : ""})`;
          }
        }
      } catch (e) {
        console.error("[FlyGuide] Erro ao avaliar:", e);
      }
    });
  });

  carregarAvaliacao();
})();