/* ================================================================
   FlyGuide - editar-roteiro.js
   Carrega o roteiro existente e abre o editor de locais usando a
   mesma infra de maps-edit.js do passo 3 de criar-roteiro.
================================================================ */
(function () {
  const URL_API   = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const params    = new URLSearchParams(window.location.search);
  const roteiroId = params.get("id");
  const PUBLICO   = "Público";
  const PRIVADO   = "Privado";

  if (!roteiroId) { window.location.href = "meus-roteiros.html"; return; }

  const userId = getUserIdFromToken();
  if (!userId) { window.location.href = "login.html"; return; }

  function atualizarVisibilidade(pub) {
    const strip = document.getElementById("erVisStrip");
    const check = document.getElementById("erVisPublico");
    const label = document.getElementById("erVisLabel");
    const desc  = document.getElementById("erVisDesc");
    const icon  = document.getElementById("erVisIcon");
    const badge = document.getElementById("erVisBadge");

    if (strip) strip.classList.toggle("is-public", !!pub);
    if (check) check.checked = !!pub;
    if (label) label.textContent = pub ? "Compartilhar no Feed Público" : "Roteiro Privado";
    if (desc)  desc.textContent  = pub ? "Outras pessoas poderão ver seu roteiro" : "Somente você pode ver este roteiro";
    if (icon)  icon.className    = pub ? "bi bi-globe2" : "bi bi-lock-fill";
    if (badge) badge.textContent = pub ? "Público" : "Privado";
  }

  function preencherInfoRoteiro(roteiro) {
    const tituloEl = document.getElementById("erTitulo");
    const descEl   = document.getElementById("erDescricao");
    const imgEl    = document.getElementById("erImagem");
    const visEl    = document.getElementById("erVisPublico");

    if (tituloEl) tituloEl.value = roteiro.titulo || "";
    if (descEl)   descEl.value   = roteiro.observacoes || "";
    if (imgEl)    imgEl.value    = roteiro.idImagem || roteiro.imagemChave || "";

    atualizarVisibilidade(roteiro.visibilidadeRoteiro === PUBLICO);
    if (visEl) visEl.onchange = e => atualizarVisibilidade(e.target.checked);

    if (typeof carregarImagens === "function" && typeof renderSeletorImagens === "function") {
      carregarImagens().then(() => {
        const idSelecionado = roteiro.idImagem || roteiro.imagemChave || null;
        renderSeletorImagens("erImgSelector", "erImagem", idSelecionado);
      });
    }
  }

  async function salvarInfoRoteiro(roteiro) {
    const erroEl = document.getElementById("erroLocalEdit");
    const titulo = (document.getElementById("erTitulo")?.value || "").trim();

    if (!titulo) {
      if (erroEl) {
        erroEl.textContent = "Informe um nome para o roteiro antes de salvar.";
        erroEl.style.display = "";
      }
      return false;
    }
    if (typeof window.flyguideAiLookupPendente === "function" && window.flyguideAiLookupPendente()) {
      if (erroEl) {
        erroEl.textContent = "Aguarde a preparação dos locais no mapa terminar antes de salvar.";
        erroEl.style.display = "";
      }
      return false;
    }
    if (erroEl) erroEl.style.display = "none";

    const idImg     = document.getElementById("erImagem")?.value || "";
    const imagemSelecionada = typeof obterImagemSelecionada === "function"
      ? obterImagemSelecionada("erImagem")
      : null;
    const idImagem  = imagemSelecionada?.idImagem
      ?? (typeof normalizarIdImagem === "function"
        ? normalizarIdImagem(idImg || roteiro.idImagem)
        : (idImg ? parseInt(idImg) : (roteiro.idImagem ? parseInt(roteiro.idImagem) : null)));
    const isPublico = !!document.getElementById("erVisPublico")?.checked;
    const descricao = (document.getElementById("erDescricao")?.value || "").trim();
    const sugestoesEditadas = typeof window.getSugestoesEditadasLocais === "function"
      ? window.getSugestoesEditadasLocais()
      : null;

    const payload = {
      idUsuario:           roteiro.idUsuario || parseInt(userId),
      titulo,
      pais:                roteiro.pais || null,
      cidade:              roteiro.cidade || null,
      tipoRoteiro:         roteiro.tipoRoteiro || null,
      statusRoteiro:       roteiro.statusRoteiro || "PLANEJADO",
      visibilidadeRoteiro: isPublico ? PUBLICO : PRIVADO,
      dataInicio:          roteiro.dataInicio || null,
      dataFim:             roteiro.dataFim || null,
      observacoes:         descricao || null,
      diasTotais:          roteiro.diasTotais || null,
      orcamento:           null,
      idImagem:            idImagem,
      imagemChave:         imagemSelecionada?.imagemChave || roteiro.imagemChave || null,
      sugestoes:           sugestoesEditadas || roteiro.sugestoes || null,
    };

    const res = await authFetch(URL_API + "/roteiros/" + roteiroId, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("HTTP " + res.status);
    return true;
  }

  authFetch(URL_API + "/roteiros/" + roteiroId)
    .then(r => r.json())
    .then(roteiro => {
      preencherInfoRoteiro(roteiro);

      const destEl = document.getElementById("p3Destino");
      const infoEl = document.getElementById("p3Info");
      const destino = [roteiro.cidade, roteiro.pais].filter(Boolean).join(", ");
      if (destEl) destEl.textContent = destino || "-";
      if (infoEl) {
        infoEl.textContent = (roteiro.diasTotais ? roteiro.diasTotais + " dia" + (roteiro.diasTotais > 1 ? "s" : "") : "")
          + (roteiro.tipoRoteiro ? " • " + roteiro.tipoRoteiro : "");
      }

      document.getElementById("erLoading").style.display  = "none";
      document.getElementById("erConteudo").style.display = "";

      const optsLocais = {
        diasTotais:                roteiro.diasTotais || 0,
        userId:                    parseInt(userId),
        roteiro:                   roteiro,
        pais:                      roteiro.pais || null,
        stateCode:                 roteiro.stateCode || null,
        latDestino:                roteiro.latDestino || null,
        lngDestino:                roteiro.lngDestino || null,
        ocultarBtnSalvarSugestoes: true,
      };

      if (typeof window.abrirLocaisEdit === "function") {
        window.abrirLocaisEdit(roteiroId, roteiro.cidade, optsLocais);
      } else {
        const checkMapsEdit = setInterval(() => {
          if (typeof window.abrirLocaisEdit === "function") {
            clearInterval(checkMapsEdit);
            window.abrirLocaisEdit(roteiroId, roteiro.cidade, optsLocais);
          }
        }, 100);
      }

      const btnSalvar = document.getElementById("btnSalvarRoteiro");
      if (btnSalvar) {
        btnSalvar.addEventListener("click", async () => {
          btnSalvar.disabled  = true;
          btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

          try {
            const salvo = await salvarInfoRoteiro(roteiro);
            if (!salvo) {
              btnSalvar.disabled  = false;
              btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i>Salvar Roteiro';
              return;
            }
            window.location.href = "meus-roteiros.html";
          } catch (e) {
            const erroEl = document.getElementById("erroLocalEdit");
            if (erroEl) {
              erroEl.textContent = "Não foi possível salvar as informações do roteiro. Tente novamente.";
              erroEl.style.display = "";
            }
            btnSalvar.disabled  = false;
            btnSalvar.innerHTML = '<i class="bi bi-check-lg me-2"></i>Salvar Roteiro';
          }
        });
      }
    })
    .catch(() => {
      document.getElementById("erLoading").style.display = "none";
      document.getElementById("erErro").style.display   = "";
    });
})();
