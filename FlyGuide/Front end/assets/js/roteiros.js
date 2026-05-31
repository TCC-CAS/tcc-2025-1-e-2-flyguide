/* ================================================================
   FlyGuide - roteiros.js
   Gerenciamento de roteiros do usuÃ¡rio:
   - Meus Roteiros (pages/meus-roteiros.html)
   - Criar Roteiro (pages/criar-roteiro.html)
   - Atividades (pages/atividades-roteiro.html)
   Depende de: app.js, imagens.js
================================================================ */

(function iniciarModuloRoteiros() {
  const URL_API_BASE = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const pagina       = document.body.getAttribute("data-pagina");
  const EMPTY_TEXT  = "\u2014";
  const PUBLICO     = "P\u00fablico";
  const PRIVADO     = "Privado";
  const ARROW       = "\u2192";

  const badgeClasse = {
    "Aventura": "badge-green", "Cultural": "badge-purple", ["Mochil\u00e3o"]: "badge-yellow",
    "Praia": "", "Natureza": "badge-green", "Gastronomia": "badge-purple",
    "Luxo": "badge-yellow", "Cidade": "",
  };

  function normalizarVisibilidadeRoteiro(valor) {
    const texto = String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    if (texto === "privado" || texto === "private" || texto === "privada") return PRIVADO;
    return PUBLICO;
  }

  function formatarDataCurta(dataStr) {
    if (!dataStr) return EMPTY_TEXT;
    const [y, m, d] = dataStr.split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
  }

  function formatarPeriodo(dataInicio, dataFim) {
    if (!dataInicio) return EMPTY_TEXT;
    if (!dataFim) return formatarDataCurta(dataInicio);
    return `${formatarDataCurta(dataInicio)} ${ARROW} ${formatarDataCurta(dataFim)}`;
  }

  function atualizarLabelPorInput(inputId, texto) {
    const input = document.getElementById(inputId);
    const label = input?.previousElementSibling;
    if (label && label.tagName === "LABEL") label.textContent = texto;
  }

  function corrigirTextosCriarRoteiro() {
    const subtitulo = document.querySelector('.grid-wrap .small.text-secondary.mt-2');
    if (subtitulo) subtitulo.textContent = "Etapa 1 de 2 - informa\u00e7\u00f5es b\u00e1sicas";

    atualizarLabelPorInput("itCountry", "Pa\u00eds Principal *");

    const paisInput = document.getElementById("itCountry");
    if (paisInput) paisInput.placeholder = "Ex: Fran\u00e7a";

    const destinoInput = document.getElementById("itDestination");
    const helper = destinoInput?.nextElementSibling;
    if (helper && helper.classList.contains("helper")) {
      helper.textContent = "Pa\u00edses e cidades extras podem ser adicionados na etapa de atividades.";
    }
  }

  function corrigirTextosAtividadesRoteiro() {
    atualizarLabelPorInput("basePais", "Pa\u00eds");
    atualizarLabelPorInput("raioBaseKm", "Raio M\u00e1ximo (km)");
  }

  function normalizarTextoLugar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function extrairComponentePlaceGoogle(place, tipos) {
    return (place?.address_components || []).find((comp) =>
      (comp.types || []).some((tipo) => tipos.includes(tipo))
    ) || null;
  }

  function extrairPaisGooglePlace(place) {
    const componente = extrairComponentePlaceGoogle(place, ["country"]);
    if (!componente) return null;

    const nome = (componente.long_name || place?.name || "").trim();
    const codigo = String(componente.short_name || "").trim().toLowerCase();
    return nome ? { nome, codigo } : null;
  }

  function extrairEstadoGooglePlace(place) {
    const comp = extrairComponentePlaceGoogle(place, ["administrative_area_level_1"]);
    return (comp?.long_name || "").trim();
  }

  function extrairCidadeGooglePlace(place) {
    const componente = extrairComponentePlaceGoogle(place, [
      "locality",
      "administrative_area_level_2",
      "postal_town",
      "administrative_area_level_1",
    ]);

    return (componente?.long_name || place?.name || "").trim();
  }

  function criarAutocompletePaisCidade(inputPaisId, inputCidadeId) {
    const inputPais = document.getElementById(inputPaisId);
    const inputCidade = document.getElementById(inputCidadeId);

    if (!inputPais || !inputCidade || !window.google || !google.maps?.places) return null;

    let paisSelecionado = null;
    let cidadeSelecionada = null;
    let autocompletePais = null;
    let autocompleteCidade = null;

    function limparCidade(limparInput) {
      cidadeSelecionada = null;
      if (limparInput) inputCidade.value = "";
    }

    function atualizarRestricaoCidade() {
      inputCidade.placeholder = paisSelecionado?.nome
        ? `Ex: cidade em ${paisSelecionado.nome}`
        : inputCidadeId === "itDestination"
          ? "Ex: Paris"
          : "Ex: Madrid";

      if (!autocompleteCidade) return;

      const restricao = paisSelecionado?.codigo
        ? { country: paisSelecionado.codigo }
        : {};

      if (typeof autocompleteCidade.setComponentRestrictions === "function") {
        autocompleteCidade.setComponentRestrictions(restricao);
        return;
      }

      autocompleteCidade.setOptions({ componentRestrictions: restricao });
    }

    async function resolverPaisDigitado(texto) {
      if (!google.maps?.Geocoder) return null;

      const consulta = String(texto || "").trim();
      if (!consulta) return null;

      const geocoder = new google.maps.Geocoder();
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address: consulta }, (results, status) => {
          if (status !== "OK" || !Array.isArray(results) || results.length === 0) {
            reject(new Error("Pais invalido"));
            return;
          }

          const pais = results
            .map(extrairPaisGooglePlace)
            .find(Boolean);

          if (!pais) {
            reject(new Error("Pais invalido"));
            return;
          }

          resolve(pais);
        });
      });
    }

    async function sincronizarPaisDigitado(opcoes) {
      const configuracao = {
        limparCidade: false,
        canonizarInput: true,
        ...(opcoes || {}),
      };

      const valorDigitado = inputPais.value.trim();
      if (!valorDigitado) {
        const tinhaPais = !!paisSelecionado;
        paisSelecionado = null;
        atualizarRestricaoCidade();
        if (configuracao.limparCidade && tinhaPais) limparCidade(true);
        return null;
      }

      const valorNormalizado = normalizarTextoLugar(valorDigitado);
      if (paisSelecionado?.codigo) {
        const nomeAtual = normalizarTextoLugar(paisSelecionado.nome);
        const codigoAtual = normalizarTextoLugar(paisSelecionado.codigo);
        if (valorNormalizado === nomeAtual || valorNormalizado === codigoAtual) {
          atualizarRestricaoCidade();
          return paisSelecionado;
        }
      }

      try {
        const paisResolvido = await resolverPaisDigitado(valorDigitado);
        const paisMudou = !paisSelecionado
          || normalizarTextoLugar(paisSelecionado.nome) !== normalizarTextoLugar(paisResolvido.nome)
          || normalizarTextoLugar(paisSelecionado.codigo) !== normalizarTextoLugar(paisResolvido.codigo);

        paisSelecionado = paisResolvido;
        if (configuracao.canonizarInput) inputPais.value = paisResolvido.nome;
        atualizarRestricaoCidade();
        if (configuracao.limparCidade && paisMudou) limparCidade(true);
        return paisResolvido;
      } catch (_) {
        paisSelecionado = null;
        atualizarRestricaoCidade();
        if (configuracao.limparCidade) limparCidade(true);
        return null;
      }
    }

    autocompletePais = new google.maps.places.Autocomplete(inputPais, {
      fields: ["address_components", "name", "types"],
      types: ["(regions)"],
      language: "pt-BR",
    });

    autocompletePais.addListener("place_changed", () => {
      const pais = extrairPaisGooglePlace(autocompletePais.getPlace());
      if (!pais) return;

      const paisMudou = !paisSelecionado
        || normalizarTextoLugar(paisSelecionado.nome) !== normalizarTextoLugar(pais.nome)
        || normalizarTextoLugar(paisSelecionado.codigo) !== normalizarTextoLugar(pais.codigo);

      paisSelecionado = pais;
      inputPais.value = pais.nome;
      atualizarRestricaoCidade();
      if (paisMudou) limparCidade(true);
      setTimeout(() => inputCidade.focus(), 0);
    });

    inputPais.addEventListener("input", () => {
      const valor = inputPais.value.trim();
      if (!valor) {
        paisSelecionado = null;
        atualizarRestricaoCidade();
        limparCidade(true);
        return;
      }

      if (paisSelecionado && normalizarTextoLugar(valor) === normalizarTextoLugar(paisSelecionado.nome)) {
        return;
      }

      paisSelecionado = null;
      atualizarRestricaoCidade();
      if (inputCidade.value.trim()) limparCidade(true);
    });

    inputPais.addEventListener("blur", () => {
      sincronizarPaisDigitado({ limparCidade: true, canonizarInput: true });
    });

    autocompleteCidade = new google.maps.places.Autocomplete(inputCidade, {
      fields: ["place_id", "name", "formatted_address", "address_components", "geometry", "types"],
      types: ["(cities)"],
      language: "pt-BR",
    });

    autocompleteCidade.addListener("place_changed", () => {
      const place = autocompleteCidade.getPlace();
      if (!place.place_id) return;

      const cidadeNome = extrairCidadeGooglePlace(place) || place.name || inputCidade.value.trim();
      const pais = extrairPaisGooglePlace(place);

      cidadeSelecionada = {
        nome: cidadeNome,
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
        placeId: place.place_id,
      };
      inputCidade.value = cidadeNome;

      if (pais) {
        paisSelecionado = pais;
        inputPais.value = pais.nome;
        atualizarRestricaoCidade();
      }
    });

    inputCidade.addEventListener("focus", () => {
      sincronizarPaisDigitado({ limparCidade: false, canonizarInput: true });
    });

    inputCidade.addEventListener("input", () => {
      if (!inputCidade.value.trim()) {
        cidadeSelecionada = null;
        return;
      }

      if (cidadeSelecionada && normalizarTextoLugar(inputCidade.value) !== normalizarTextoLugar(cidadeSelecionada.nome)) {
        cidadeSelecionada = null;
      }
    });

    atualizarRestricaoCidade();

    return {
      obterPais() {
        return paisSelecionado?.nome || inputPais.value.trim();
      },
      obterCidade() {
        return cidadeSelecionada?.nome || inputCidade.value.trim();
      },
      sincronizarPaisDigitado,
      aplicarValores(pais, cidade) {
        inputPais.value = pais || "";
        inputCidade.value = cidade || "";
        paisSelecionado = pais ? { nome: pais, codigo: "" } : null;
        cidadeSelecionada = cidade ? { nome: cidade } : null;
        atualizarRestricaoCidade();
        if (pais) sincronizarPaisDigitado({ limparCidade: false, canonizarInput: false });
      },
    };
  }

  function lerBasesRoteiro(roteiroId) {
    return [];
  }

  function salvarBasesRoteiro(roteiroId, bases) {
    return;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MEUS ROTEIROS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (pagina === "meus-roteiros") {
    const userId = getUserIdFromToken();
    if (!userId) { window.location.href = "login.html"; return; }

    let todosRoteiros     = [];
    let filtroAtivo       = "todos";
    let roteiroParaEditar = null;
    let paginaMR          = 0;
    let _ordemMR          = "mais-novo";
    const POR_PAGINA_MR   = 12;

    const modalEditar  = new bootstrap.Modal(document.getElementById("modalEditarRoteiro"));

    function _confirmarExclusaoRoteiro(nome) {
      return new Promise(function(resolve) {
        var overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
        overlay.innerHTML =
          '<div style="background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">'
          + '<div style="width:52px;height:52px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
          + '<i class="bi bi-trash3-fill" style="font-size:1.4rem;color:#dc2626;"></i>'
          + '</div>'
          + '<div style="font-size:1.05rem;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Excluir Roteiro?</div>'
          + '<div style="font-size:.88rem;color:#94a3b8;margin-bottom:24px;">Tem certeza que deseja excluir o roteiro <strong style="color:#f1f5f9;">' + escapeHtml(nome || "este roteiro") + '</strong>? Esta ação não pode ser desfeita.</div>'
          + '<div style="display:flex;gap:10px;">'
          + '<button id="_excRotNao" style="flex:1;background:none;border:1px solid #334155;border-radius:10px;padding:10px 0;color:#94a3b8;cursor:pointer;font-size:.9rem;font-weight:600;">Cancelar</button>'
          + '<button id="_excRotSim" style="flex:1;background:#dc2626;border:none;border-radius:10px;padding:10px 0;color:#fff;cursor:pointer;font-size:.9rem;font-weight:700;"><i class="bi bi-trash3 me-1"></i>Excluir</button>'
          + '</div></div>';
        document.body.appendChild(overlay);
        function fechar(res) { overlay.remove(); resolve(res); }
        overlay.querySelector("#_excRotSim").onclick = function() { fechar(true); };
        overlay.querySelector("#_excRotNao").onclick = function() { fechar(false); };
        overlay.addEventListener("click", function(e) { if (e.target === overlay) fechar(false); });
      });
    }

    function renderCard(r) {
      const imgUrl  = typeof obterImagemUrlRoteiro === "function" ? obterImagemUrlRoteiro(r) : (r.imagemUrl || IMG_FALLBACK);
      const badge   = badgeClasse[r.tipoRoteiro] || "";
      const dias    = r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : EMPTY_TEXT;
      const visibilidade = normalizarVisibilidadeRoteiro(r.visibilidadeRoteiro);
      const visIcon = visibilidade === PUBLICO
        ? `<i class="bi bi-globe" title="${PUBLICO}"></i>`
        : `<i class="bi bi-lock-fill" title="${PRIVADO}"></i>`;

      const bottomHtml = r.statusRoteiro === "CONCLUIDO"
        ? `<button class="btn fw-bold w-100"
                   style="background:#8b5cf6;color:#fff;border-radius:10px;padding:10px 0;font-size:.9rem;"
                   data-iniciar-roteiro="${r.idRoteiro}" data-status="CONCLUIDO">
             <i class="bi bi-arrow-counterclockwise me-1"></i>Reiniciar
           </button>`
        : `<button class="btn fw-bold w-100"
                   style="background:${r.statusRoteiro === "EM_ANDAMENTO" ? "#22c55e" : "#f97316"};color:#fff;border-radius:10px;padding:10px 0;font-size:.9rem;"
                   data-iniciar-roteiro="${r.idRoteiro}"
                   data-status="${r.statusRoteiro || "PLANEJADO"}">
             <i class="bi bi-play-circle-fill me-1"></i>${r.statusRoteiro === "EM_ANDAMENTO" ? "Iniciar / Continuar" : "Iniciar"}
           </button>`;

      return `
        <div class="col-12 col-md-6 col-xl-4"
             data-roteiro-id="${r.idRoteiro}"
             data-vis="${visibilidade}">
          <div class="trip-card h-100" onclick="if(!event.target.closest('button,a')){window.location.href='detalhes-roteiro.html?id=${r.idRoteiro}'}">
            <div class="trip-cover" style="background-image:url('${imgUrl}');">
              <span class="badge-pill ${badge}">${r.tipoRoteiro || "Viagem"}</span>
              <div class="trip-cover-actions">
                <a class="trip-card-edit"
                   href="editar-roteiro.html?id=${r.idRoteiro}"
                   title="Editar roteiro">
                  <i class="bi bi-pencil"></i>
                </a>
                <button class="trip-card-delete"
                        data-excluir-roteiro="${r.idRoteiro}"
                        data-nome="${escapeHtml(r.titulo || "este roteiro")}"
                        title="Excluir">
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
              <div class="trip-title">
                <h5>${escapeHtml(r.titulo || "Sem t\u00edtulo")}</h5>
                <div class="loc"><i class="bi bi-geo-alt-fill"></i>${escapeHtml(r.cidade || EMPTY_TEXT)}</div>
              </div>
            </div>
            <div class="trip-body">
              <div class="desc-grow">
                <div class="small text-secondary">${escapeHtml(r.observacoes || "Sem descri\u00e7\u00e3o")}</div>
              </div>
              <div class="meta-row mt-3">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-calendar-event"></i><span>${dias}</span>
                </div>
                <div class="d-flex align-items-center gap-2" style="color:#64748b;">${visIcon}</div>
              </div>
              <hr style="margin:10px 0;border-color:#f1f5f9;opacity:1;">
              <div class="footer-info">
                ${r.dataInicio ? `<span style="display:flex;align-items:center;gap:4px;"><i class="bi bi-calendar-event" style="color:#f97316;font-size:.85rem;"></i>${formatarPeriodo(r.dataInicio, r.dataFim)}</span>` : ""}
                ${r.nomeUsuario ? `<span style="display:flex;align-items:center;gap:4px;font-size:.78rem;color:#64748b;"><i class="bi bi-person-fill" style="color:#94a3b8;"></i>${escapeHtml(r.nomeUsuario)}</span>` : ""}
                <span style="display:flex;align-items:center;gap:4px;">
                  <i class="bi bi-star-fill" style="color:#facc15;"></i>
                  <span style="color:#facc15;font-weight:600;">${r.mediaAvaliacao > 0 ? r.mediaAvaliacao.toFixed(1) : EMPTY_TEXT}</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                  <i class="bi bi-chat-fill" style="color:#f97316;"></i>${r.totalAvaliacoes || 0}
                </span>
                ${r.statusRoteiro === "CONCLUIDO"
                  ? r._jaAvaliou
                    ? `<span style="display:flex;align-items:center;gap:3px;font-size:.78rem;font-weight:700;color:#22c55e;">
                         <i class="bi bi-patch-check-fill"></i>Avaliado
                       </span>`
                    : `<button class="btn p-0 fw-bold"
                               style="color:#facc15;font-size:.78rem;display:flex;align-items:center;gap:3px;"
                               data-avaliar-roteiro="${r.idRoteiro}">
                         <i class="bi bi-star-fill"></i>Avaliar
                       </button>`
                  : ""}
              </div>
            </div>
            <div class="trip-bottom">
              ${bottomHtml}
            </div>
          </div>
        </div>`;
    }

    function _pagHtml(totalPags, prefixo) {
      return `
        ${paginaMR > 0 ? `<button id="${prefixo}Prev" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 18px;font-weight:700;">← Anterior</button>` : ""}
        <span style="font-size:.88rem;color:#64748b;">Página ${paginaMR + 1} de ${totalPags}</span>
        ${paginaMR < totalPags - 1 ? `<button id="${prefixo}Next" class="btn btn-outline-secondary" style="border-radius:999px;padding:6px 18px;font-weight:700;">Próxima →</button>` : ""}
      `;
    }

    function renderPaginacaoMR(lista, total) {
      const totalPags = Math.ceil(total / POR_PAGINA_MR);
      const estilo = "display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;";

      // Paginação topo
      const pagTopo = document.getElementById("mrPaginacaoTopo");
      if (pagTopo) {
        pagTopo.style.cssText = estilo + "margin-bottom:16px;";
        pagTopo.innerHTML = _pagHtml(totalPags, "mrT");
        document.getElementById("mrTPrev")?.addEventListener("click", () => {
          paginaMR--; aplicarFiltro(filtroAtivo);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        document.getElementById("mrTNext")?.addEventListener("click", () => {
          paginaMR++; aplicarFiltro(filtroAtivo);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      // Paginação rodapé
      let pag = document.getElementById("mrPaginacao");
      if (!pag) {
        pag = document.createElement("div");
        pag.id = "mrPaginacao";
        lista.after(pag);
      }
      pag.style.cssText = estilo + "margin-top:24px;";
      pag.innerHTML = _pagHtml(totalPags, "mr");
      document.getElementById("mrPrev")?.addEventListener("click", () => {
        paginaMR--; aplicarFiltro(filtroAtivo);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      document.getElementById("mrNext")?.addEventListener("click", () => {
        paginaMR++; aplicarFiltro(filtroAtivo);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    function renderLista(roteiros) {
      const lista   = document.getElementById("listaRoteiros");
      const loading = document.getElementById("loadingRoteiros");
      const empty   = document.getElementById("emptyRoteiros");
      if (!lista) return;
      loading.style.display = "none";

      if (roteiros.length === 0) {
        const emptyTitulo = document.getElementById("emptyRoteirosTitulo");
        const emptyTexto  = document.getElementById("emptyRoteirosTexto");
        const mensagens = {
          [PUBLICO]: {
            titulo: "Nenhum roteiro público encontrado",
            texto:  "Marque algum roteiro como público para ele aparecer aqui.",
          },
          [PRIVADO]: {
            titulo: "Nenhum roteiro privado encontrado",
            texto:  "Roteiros privados ficam visíveis apenas para você.",
          },
          todos: {
            titulo: "Nenhum roteiro criado ainda",
            texto:  "Crie seu primeiro roteiro e comece a explorar o mundo!",
          },
        };
        const msg = mensagens[filtroAtivo] || mensagens.todos;
        if (emptyTitulo) emptyTitulo.textContent = msg.titulo;
        if (emptyTexto)  emptyTexto.textContent  = msg.texto;
        lista.style.display = "none"; empty.style.display = "";
        document.getElementById("mrPaginacao")?.remove();
        const pt = document.getElementById("mrPaginacaoTopo"); if (pt) pt.innerHTML = "";
        return;
      }
      empty.style.display = "none";
      lista.style.display = "";
      const ordenados = [...roteiros].sort((a, b) =>
        _ordemMR === "mais-velho"
          ? (a.idRoteiro || 0) - (b.idRoteiro || 0)
          : (b.idRoteiro || 0) - (a.idRoteiro || 0)
      );
      const inicio = paginaMR * POR_PAGINA_MR;
      lista.innerHTML = ordenados.slice(inicio, inicio + POR_PAGINA_MR).map(renderCard).join("");
      if (roteiros.length > POR_PAGINA_MR) renderPaginacaoMR(lista, roteiros.length);
      else {
        document.getElementById("mrPaginacao")?.remove();
        const pt = document.getElementById("mrPaginacaoTopo"); if (pt) pt.innerHTML = "";
      }

      lista.querySelectorAll("[data-excluir-roteiro]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id   = btn.getAttribute("data-excluir-roteiro");
          const nome = btn.getAttribute("data-nome");
          if (!await _confirmarExclusaoRoteiro(nome)) return;
          try {
            const r = await authFetch(`${URL_API_BASE}/roteiros/${id}?idUsuario=${userId}`, { method: "DELETE" });
            if (r.ok || r.status === 204) {
              todosRoteiros = todosRoteiros.filter(r => String(r.idRoteiro) !== String(id));
              atualizarContadores(todosRoteiros);
              aplicarFiltro(filtroAtivo);
            } else { alert("Não foi possível excluir."); }
          } catch { alert("Erro ao conectar ao servidor."); }
        });
      });



      lista.querySelectorAll("[data-avaliar-roteiro]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-avaliar-roteiro");
          abrirModalAvaliar(id);
        });
      });

      lista.querySelectorAll("[data-iniciar-roteiro]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id     = btn.getAttribute("data-iniciar-roteiro");
          const status = btn.getAttribute("data-status");
          if (status === "EM_ANDAMENTO") {
            window.location.href = `roteiro-em-andamento.html?id=${id}`;
            return;
          }
          btn.disabled = true;
          const icone = btn.querySelector("i");
          if (icone) icone.className = "bi bi-hourglass-split";
          try {
            // Reiniciar: zerar todos os checkpoints antes de volcar para EM_ANDAMENTO
            if (status === "CONCLUIDO") {
              const res    = await authFetch(`${URL_API_BASE}/roteiros/${id}/locais`);
              const locais = await res.json();
              await Promise.all(locais.map(l =>
                authFetch(`${URL_API_BASE}/roteiros/${id}/locais/${l.idLocal}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    idLocal:     l.idLocal,
                    status:      "PENDENTE",
                    observacoes: l.observacoes || null,
                    dia:         l.dia         || null,
                    ordem:       l.ordem       || null,
                    horario:     l.horario     || null,
                  }),
                }).catch(() => {})
              ));
              await authFetch(`${URL_API_BASE}/roteiros/${id}/ai-status`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    "{}",
              });
            }
            await authFetch(`${URL_API_BASE}/roteiros/${id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ statusRoteiro: "EM_ANDAMENTO" }),
            });
            window.location.href = `roteiro-em-andamento.html?id=${id}`;
          } catch {
            btn.disabled = false;
            if (icone) icone.className = "bi bi-play-circle-fill";
            alert("Não foi possível iniciar o roteiro.");
          }
        });
      });
    }

    const LEGENDAS_AV = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];
    let _modalAvaliarMR     = null;
    let _roteiroIdAvaliarMR = null;
    let _notaAvaliarMR      = 0;

    function abrirModalAvaliar(roteiroId) {
      _roteiroIdAvaliarMR = roteiroId;
      _notaAvaliarMR      = 0;

      const modalEl = document.getElementById("modalAvaliarMR");
      if (!modalEl) return;
      if (!_modalAvaliarMR) _modalAvaliarMR = new bootstrap.Modal(modalEl);

      // Reset UI
      modalEl.querySelectorAll(".star-mr").forEach(s => {
        s.className = "bi bi-star star-mr";
        s.style.color = "#cbd5e1";
      });
      const legenda = document.getElementById("legendaNotaMR");
      if (legenda) legenda.textContent = "";
      const textarea = document.getElementById("textoAvaliacaoMR");
      if (textarea) textarea.value = "";
      const btnSalvar = document.getElementById("btnSalvarAvaliacaoMR");
      if (btnSalvar) btnSalvar.disabled = true;

      _modalAvaliarMR.show();
    }

    document.addEventListener("DOMContentLoaded", () => {
      const stars   = document.querySelectorAll(".star-mr");
      const legenda = document.getElementById("legendaNotaMR");
      const btnSalvar = document.getElementById("btnSalvarAvaliacaoMR");

      function pintarEstrelasMR(ate) {
        stars.forEach((s, i) => {
          const ativo = i < ate;
          s.className  = (ativo ? "bi bi-star-fill" : "bi bi-star") + " star-mr";
          s.style.color = ativo ? "#facc15" : "#cbd5e1";
        });
      }

      stars.forEach(s => {
        s.addEventListener("mouseenter", () => pintarEstrelasMR(parseInt(s.dataset.nota)));
        s.addEventListener("mouseleave", () => pintarEstrelasMR(_notaAvaliarMR));
        s.addEventListener("click", () => {
          _notaAvaliarMR = parseInt(s.dataset.nota);
          pintarEstrelasMR(_notaAvaliarMR);
          if (legenda) legenda.textContent = LEGENDAS_AV[_notaAvaliarMR] || "";
          if (btnSalvar) btnSalvar.disabled = false;
        });
      });

      btnSalvar?.addEventListener("click", async () => {
        if (!_notaAvaliarMR || !_roteiroIdAvaliarMR) return;
        const texto = document.getElementById("textoAvaliacaoMR")?.value.trim() || null;
        const erroMR = document.getElementById("erroAvaliacaoMR");
        if (erroMR) erroMR.style.display = "none";
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Salvando…`;
        try {
          const res = await authFetch(`${URL_API_BASE}/roteiros/${_roteiroIdAvaliarMR}/avaliacoes/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nota: _notaAvaliarMR, texto }),
          });
          if (res.ok) {
            _modalAvaliarMR.hide();
            const r = todosRoteiros.find(x => String(x.idRoteiro) === String(_roteiroIdAvaliarMR));
            if (r) { r._jaAvaliou = true; aplicarFiltro(filtroAtivo); }
          } else {
            var errData = null;
            try { errData = await res.json(); } catch (_) {}
            var msg = (errData && (errData.message || errData.error)) || "Não foi possível salvar a avaliação.";
            var _m = msg.match(/^\d+\s+\S+\s+"(.+)"$/); if (_m) msg = _m[1];
            if (erroMR) { erroMR.textContent = msg; erroMR.style.display = ""; }
          }
        } catch { if (erroMR) { erroMR.textContent = "Erro ao conectar ao servidor."; erroMR.style.display = ""; } }
        finally {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar avaliação`;
        }
      });
    });

    function preencherModalEditar(r) {
      document.getElementById("editRoteiroId").value    = r.idRoteiro;
      document.getElementById("editTitulo").value       = r.titulo || "";
      document.getElementById("editDuracao").value      = r.diasTotais || "";
      document.getElementById("editTipo").value         = r.tipoRoteiro || "Cidade";
      document.getElementById("editDescricao").value    = r.observacoes || "";
      document.getElementById("editImagem").value       = r.idImagem || "";
      const isPublico = r.visibilidadeRoteiro === PUBLICO;
      document.getElementById("editVisibilidade").value = isPublico ? PUBLICO : PRIVADO;
      document.getElementById("editPublico").checked    = isPublico;
      atualizarVisibilityStrip(isPublico);
      document.getElementById("editRoteiroErro").style.display = "none";
      renderSeletorImagens("imgSelectorEdit", "editImagem", r.idImagem || r.imagemChave);

      if (!window._autocompletePaisCidadeMR && typeof criarAutocompletePaisCidadeGlobal === "function") {
        window._autocompletePaisCidadeMR = criarAutocompletePaisCidadeGlobal("editPais", "editCidade");
      }
      if (window._autocompletePaisCidadeMR && typeof window._autocompletePaisCidadeMR.aplicarValores === "function") {
        window._autocompletePaisCidadeMR.aplicarValores(r.pais || "", r.cidade || "");
      } else {
        const paisEl   = document.getElementById("editPais");
        const cidadeEl = document.getElementById("editCidade");
        if (paisEl)   paisEl.value   = r.pais   || "";
        if (cidadeEl) cidadeEl.value = r.cidade  || "";
      }
    }

    function atualizarContadores(roteiros) {
      const s = id => document.getElementById(id);
      if (s("cntTodos"))    s("cntTodos").textContent    = roteiros.length;
      if (s("cntPublicos")) s("cntPublicos").textContent = roteiros.filter(r => normalizarVisibilidadeRoteiro(r.visibilidadeRoteiro) === PUBLICO).length;
      if (s("cntPrivados")) s("cntPrivados").textContent = roteiros.filter(r => normalizarVisibilidadeRoteiro(r.visibilidadeRoteiro) === PRIVADO).length;
    }

    let todosRascunhos = [];

    function renderCardRascunho(r) {
      const dias = r.diasTotais ? `${r.diasTotais} dia${r.diasTotais > 1 ? "s" : ""}` : "—";
      return `
        <div class="rascunho-card">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:.95rem;">${escapeHtml(r.titulo || "Sem título")}</span>
              <span class="rascunho-badge"><i class="bi bi-bookmark-fill"></i>Rascunho</span>
            </div>
            <div class="rascunho-meta">
              <span><i class="bi bi-geo-alt-fill" style="color:#f97316;"></i> ${escapeHtml(r.cidade || "—")}</span>
              <span><i class="bi bi-calendar-event" style="color:#f97316;"></i> ${dias}</span>
            </div>
          </div>
          <div class="rascunho-actions">
            <a href="criar-roteiro.html?id=${r.idRoteiro}" class="btn-edit-info">
              <i class="bi bi-pencil-square"></i>Editar info
            </a>
            <a href="atividades-roteiro.html?id=${r.idRoteiro}&dias=${r.diasTotais || 1}"
               class="btn btn-sm btn-primary-orange fw-bold"
               style="font-size:.8rem;border-radius:10px;padding:5px 12px;">
              <i class="bi bi-play-fill me-1"></i>Continuar editando
            </a>
            <button class="btn btn-sm btn-outline-danger"
                    data-excluir-rascunho="${r.idRoteiro}"
                    data-nome="${escapeHtml(r.titulo || "este rascunho")}"
                    style="font-size:.8rem;border-radius:10px;padding:5px 10px;">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>`;
    }

    function renderRascunhos(lista) {
      const section = document.getElementById("listaRascunhos");
      if (!section) return;
      if (!lista || lista.length === 0) { section.innerHTML = ""; return; }

      section.innerHTML = lista.map(renderCardRascunho).join("");

      section.querySelectorAll("[data-excluir-rascunho]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id   = btn.getAttribute("data-excluir-rascunho");
          const nome = btn.getAttribute("data-nome");
          if (!await _confirmarExclusaoRoteiro(nome)) return;
          try {
            const r = await authFetch(`${URL_API_BASE}/roteiros/${id}?idUsuario=${userId}`, { method: "DELETE" });
            if (r.ok || r.status === 204) {
              todosRascunhos = todosRascunhos.filter(r => String(r.idRoteiro) !== String(id));
              atualizarContadorRascunhos(todosRascunhos);
              renderRascunhos(todosRascunhos);
              if (todosRascunhos.length === 0) aplicarFiltro("todos", false);
            } else { alert("Não foi possível excluir."); }
          } catch { alert("Erro ao conectar ao servidor."); }
        });
      });
    }

    function atualizarContadorRascunhos(lista) {
      const cnt = document.getElementById("cntRascunhos");
      const tab = document.getElementById("btnFiltroRascunhos");
      if (cnt) cnt.textContent = lista.length;
      if (tab) tab.style.display = lista.length > 0 ? "" : "none";
    }

    function aplicarFiltro(filtro, resetPagina = false) {
      filtroAtivo = filtro;
      if (resetPagina) paginaMR = 0;
      document.querySelectorAll("[data-filtro]").forEach(b =>
        b.classList.toggle("active-filter", b.getAttribute("data-filtro") === filtro));

      const listaEl     = document.getElementById("listaRoteiros");
      const rascunhosEl = document.getElementById("listaRascunhos");

      if (filtro === "rascunhos") {
        const loadEl  = document.getElementById("loadingRoteiros");
        const emptyEl = document.getElementById("emptyRoteiros");
        if (loadEl)  loadEl.style.display  = "none";
        if (emptyEl) emptyEl.style.display = "none";
        if (listaEl)     listaEl.style.display     = "none";
        if (rascunhosEl) rascunhosEl.style.display = "";
        renderRascunhos(todosRascunhos);
        return;
      }

      if (listaEl)     listaEl.style.display     = "";
      if (rascunhosEl) rascunhosEl.style.display = "none";
      renderLista(filtro === "todos" ? todosRoteiros : todosRoteiros.filter(r => normalizarVisibilidadeRoteiro(r.visibilidadeRoteiro) === filtro));
    }

    document.querySelectorAll("[data-filtro]").forEach(b =>
      b.addEventListener("click", () => aplicarFiltro(b.getAttribute("data-filtro"), true)));

    document.querySelectorAll("[data-ordem]").forEach(item => {
      item.addEventListener("click", e => {
        e.preventDefault();
        _ordemMR = item.getAttribute("data-ordem");
        paginaMR = 0;
        const label = document.getElementById("ordenacaoMRLabel");
        if (label) label.textContent = item.textContent.trim();
        aplicarFiltro(filtroAtivo);
      });
    });

    function atualizarVisibilityStrip(isPublico) {
      const strip = document.getElementById("visibilityStrip");
      const icon  = document.getElementById("visIcon");
      const label = document.getElementById("visLabel");
      const desc  = document.getElementById("visDesc");
      const badge = document.getElementById("visBadge");
      if (!strip) return;
      strip.classList.toggle("is-public", isPublico);
      icon.className    = isPublico ? "bi bi-globe2" : "bi bi-lock-fill";
      label.textContent = isPublico ? "Compartilhar no Feed Público" : "Roteiro Privado";
      desc.textContent  = isPublico ? "Outras pessoas poderão ver seu roteiro" : "Somente você pode ver este roteiro";
      badge.textContent = isPublico ? "Público" : "Privado";
    }

    document.getElementById("editPublico")?.addEventListener("change", e => {
      const pub = e.target.checked;
      document.getElementById("editVisibilidade").value = pub ? PUBLICO : PRIVADO;
      atualizarVisibilityStrip(pub);
    });

    // Salvar ediÃ§Ã£o
    document.getElementById("btnSalvarEdicaoRoteiro")?.addEventListener("click", async () => {
      if (!roteiroParaEditar) return;
      const id     = document.getElementById("editRoteiroId").value;
      const titulo = document.getElementById("editTitulo").value.trim();
      const erroEl = document.getElementById("editRoteiroErro");

      let pais   = "";
      let cidade = "";
      if (window._autocompletePaisCidadeMR && typeof window._autocompletePaisCidadeMR.obterPais === "function") {
        pais   = window._autocompletePaisCidadeMR.obterPais()   || document.getElementById("editPais").value.trim();
        cidade = window._autocompletePaisCidadeMR.obterCidade() || document.getElementById("editCidade").value.trim();
      } else {
        pais   = document.getElementById("editPais").value.trim();
        cidade = document.getElementById("editCidade").value.trim();
      }

      if (!titulo || !pais || !cidade) { erroEl.textContent = "Preencha pelo menos o T\u00edtulo, o Pa\u00eds e o Destino."; erroEl.style.display = ""; return; }
      erroEl.style.display = "none";

      const duracao  = parseInt(document.getElementById("editDuracao").value) || null;
      const idImagem = document.getElementById("editImagem").value;
      const imagemSelecionada = typeof obterImagemSelecionada === "function"
        ? obterImagemSelecionada("editImagem")
        : null;
      const isPublico = document.getElementById("editPublico").checked;

      const payload = {
        idUsuario:           parseInt(userId),
        titulo, pais, cidade,
        tipoRoteiro:         document.getElementById("editTipo").value,
        statusRoteiro:       roteiroParaEditar.statusRoteiro || "PLANEJADO",
        visibilidadeRoteiro: isPublico ? PUBLICO : PRIVADO,
        diasTotais:  duracao,
        orcamento:   null,
        observacoes: document.getElementById("editDescricao").value.trim() || null,
        idImagem:    imagemSelecionada?.idImagem ?? (typeof normalizarIdImagem === "function" ? normalizarIdImagem(idImagem) : (idImagem ? parseInt(idImagem) : null)),
        imagemChave: imagemSelecionada?.imagemChave || null,
      };

      const btn = document.getElementById("btnSalvarEdicaoRoteiro");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;
      try {
        const r = await authFetch(`${URL_API_BASE}/roteiros/${id}`, {
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
      finally { btn.disabled = false; btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Salvar Altera\u00e7\u00f5es`; }
    });

    const LIMITE_FREE_MR = 20;

    function exibirBannerLimiteMR(total, isPremium) {
      const existente = document.getElementById("bannerLimiteMR");
      if (existente) existente.remove();
      if (isPremium || total < LIMITE_FREE_MR) return;

      const wrapper = document.querySelector(".meus-roteiros-header, .page-header, main, #listaRoteiros")
        || document.body;
      const banner = document.createElement("div");
      banner.id = "bannerLimiteMR";
      banner.style.cssText = "margin:16px 0;padding:14px 18px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;";
      banner.innerHTML = `
        <i class="bi bi-lock-fill" style="color:#f97316;font-size:1.2rem;flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.9rem;color:#92400e;">Limite do plano gratuito atingido</div>
          <div style="font-size:.82rem;color:#b45309;margin-top:2px;">
            Você possui <strong>${total}</strong> de <strong>${LIMITE_FREE_MR}</strong> roteiros permitidos no plano gratuito.
            Faça upgrade para criar roteiros ilimitados.
          </div>
        </div>
        <a href="planos-premium.html"
           style="background:#f97316;color:#fff;border:none;border-radius:10px;padding:8px 18px;font-size:.85rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">
          <i class="bi bi-star-fill me-1"></i>Ver Planos
        </a>`;

      const listaEl = document.getElementById("listaRoteiros");
      if (listaEl && listaEl.parentNode) {
        listaEl.parentNode.insertBefore(banner, listaEl);
      } else {
        wrapper.prepend(banner);
      }
    }

    function carregarListaRoteiros(manterFiltroAtual) {
      authFetch(`${URL_API_BASE}/roteiros/usuario/${userId}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(async data => {
          // RASCUNHO nunca aparece em Meus Roteiros — só exibido após Finalizar Roteiro
          const rascunhos  = [];
          const roteiros   = data.filter(r => r.statusRoteiro !== "RASCUNHO");
          const concluidos = roteiros.filter(r => r.statusRoteiro === "CONCLUIDO");
          const checks     = await Promise.all(
            concluidos.map(r =>
              authFetch(`${URL_API_BASE}/roteiros/${r.idRoteiro}/avaliacoes/${userId}`)
                .then(res => ({ id: r.idRoteiro, avaliou: res.ok && res.status !== 204 }))
                .catch(() => ({ id: r.idRoteiro, avaliou: false }))
            )
          );
          const avaliouMap = Object.fromEntries(checks.map(c => [c.id, c.avaliou]));
          roteiros.forEach(r => { r._jaAvaliou = avaliouMap[r.idRoteiro] ?? false; });

          todosRascunhos = rascunhos;
          todosRoteiros  = roteiros;
          atualizarContadores(todosRoteiros);
          atualizarContadorRascunhos(todosRascunhos);

          // Banner de limite para usuários FREE
          try {
            const resU = await authFetch(`${URL_API_BASE}/users/search-completo/${userId}`);
            const usr  = resU.ok ? await resU.json() : null;
            const isPremium = (usr?.usuario?.tipoConta || "FREE") === "PREMIUM";
            exibirBannerLimiteMR(roteiros.length, isPremium);
          } catch (_) {}

          let filtroInicial = manterFiltroAtual ? filtroAtivo : "todos";
          try {
            if (sessionStorage.getItem("flyguide:abrir-rascunhos")) {
              sessionStorage.removeItem("flyguide:abrir-rascunhos");
              filtroInicial = "rascunhos";
            }
          } catch (_) {}

          aplicarFiltro(filtroInicial);
        })
        .catch(() => {
          document.getElementById("loadingRoteiros").style.display = "none";
          document.getElementById("emptyRoteiros").style.display   = "";
        });
    }

    window.addEventListener("pageshow", () => {
      try {
        if (!sessionStorage.getItem("flyguide:refresh-meus-roteiros")) return;
        sessionStorage.removeItem("flyguide:refresh-meus-roteiros");
      } catch(e) {
        return;
      }
      carregarListaRoteiros(true);
    });

    // Carregar
    carregarImagens().then(() => {
      carregarListaRoteiros(false);
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CRIAR ROTEIRO (Etapa 1)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (pagina === "criar-roteiro") {
    const userId = getUserIdFromToken();
    if (!userId) { window.location.href = "login.html"; return; }

    // ── elementos do wizard ──────────────────────────────────────
    const passo1El  = document.getElementById("passo1");
    const loadingEl = document.getElementById("passoLoading");
    const passo2El  = document.getElementById("passo2");
    const passo3El  = document.getElementById("passo3");
    const erroEl    = document.getElementById("criarRoteiroErro");

    // ── estado ───────────────────────────────────────────────────
    const urlParams       = new URLSearchParams(window.location.search);
    const roteiroIdEdicao = urlParams.get("id");
    let modoEdicao  = !!roteiroIdEdicao;
    let roteiroIdCriado = null;
    let destinoAbertoNoResumo = null;
    let cidadeGerada = "", paisGerado = "", estadoGerado = "", estadoGeradoCode = "", codigoPaisGerado = "", diasGerados = 0, tipoGerado = "Cidade";
    let aiSugestoes = null, latGerada = null, lngGerada = null, destinoPOIGerado = false, ruaGerada = null;
    let destinoPlaceIdGerado = null, destinoEnderecoGerado = null;
    let autocompleteCidadeGen = null;

    // ── Seletores de período (check-in / checkout) ────────────────
    const ORDEM_PERIODOS_ROTEIRO = { manha: 1, tarde: 2, noite: 3 };

    function getDiasGeracaoRoteiro() {
      return parseInt(document.getElementById("genDias")?.value || "0", 10) || 0;
    }

    function selecionarPeriodoRoteiro(selectorId, valor) {
      const selector = document.getElementById(selectorId);
      if (!selector) return;
      selector.querySelectorAll(".period-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.value === valor);
      });
      const hiddenId = selectorId === "checkinSelector" ? "genCheckin" : "genCheckout";
      const hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = valor;
    }

    function mostrarAvisoPeriodoRoteiro(msg) {
      const aviso = document.getElementById("periodoRoteiroAviso");
      if (aviso) {
        const texto = aviso.querySelector("span") || aviso;
        texto.textContent = msg;
        aviso.style.display = "";
        return;
      }
      if (erroEl) {
        erroEl.textContent = msg;
        erroEl.style.display = "";
      }
    }

    function ocultarAvisoPeriodoRoteiro() {
      const aviso = document.getElementById("periodoRoteiroAviso");
      if (aviso) aviso.style.display = "none";
    }

    function checkoutPermitidoParaRoteiro(checkin, checkout) {
      if (getDiasGeracaoRoteiro() !== 1) return true;
      if (!checkin || checkin === "sem" || !checkout || checkout === "sem") return true;
      return (ORDEM_PERIODOS_ROTEIRO[checkout] || 0) >= (ORDEM_PERIODOS_ROTEIRO[checkin] || 0);
    }

    function mensagemPeriodoInvalido(checkin) {
      if (checkin === "noite") {
        return "Em roteiros de 1 dia com check-in à noite, o check-out só pode ser à noite ou sem check-out.";
      }
      if (checkin === "tarde") {
        return "Em roteiros de 1 dia com check-in à tarde, o check-out só pode ser à tarde, à noite ou sem check-out.";
      }
      return "Em roteiros de 1 dia, o check-out não pode ser antes do período de check-in.";
    }

    function validarPeriodosRoteiro(mostrarAviso) {
      const checkin  = document.getElementById("genCheckin")?.value || "sem";
      const checkout = document.getElementById("genCheckout")?.value || "sem";
      const valido = checkoutPermitidoParaRoteiro(checkin, checkout);
      if (!valido && mostrarAviso) mostrarAvisoPeriodoRoteiro(mensagemPeriodoInvalido(checkin));
      if (valido) ocultarAvisoPeriodoRoteiro();
      return valido;
    }

    function atualizarRestricoesPeriodoRoteiro(mostrarAviso) {
      const checkin = document.getElementById("genCheckin")?.value || "sem";
      const checkoutAtual = document.getElementById("genCheckout")?.value || "sem";
      const dias = getDiasGeracaoRoteiro();
      const checkoutSelector = document.getElementById("checkoutSelector");
      let temBloqueioCheckout = false;

      checkoutSelector?.querySelectorAll(".period-btn").forEach(btn => {
        const valor = btn.dataset.value;
        const bloquear = dias === 1 && checkin !== "sem" && valor !== "sem"
          && (ORDEM_PERIODOS_ROTEIRO[valor] || 0) < (ORDEM_PERIODOS_ROTEIRO[checkin] || 0);
        if (bloquear) temBloqueioCheckout = true;
        btn.disabled = bloquear;
        btn.setAttribute("aria-disabled", bloquear ? "true" : "false");
        btn.title = bloquear ? mensagemPeriodoInvalido(checkin) : "";
      });

      if (!checkoutPermitidoParaRoteiro(checkin, checkoutAtual)) {
        selecionarPeriodoRoteiro("checkoutSelector", "sem");
        if (mostrarAviso) mostrarAvisoPeriodoRoteiro(mensagemPeriodoInvalido(checkin));
        return;
      }

      if (mostrarAviso && temBloqueioCheckout) {
        mostrarAvisoPeriodoRoteiro(mensagemPeriodoInvalido(checkin));
      } else {
        ocultarAvisoPeriodoRoteiro();
      }
    }

    window.atualizarRestricoesPeriodoRoteiro = atualizarRestricoesPeriodoRoteiro;

    document.querySelectorAll("#checkinSelector .period-btn, #checkoutSelector .period-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const selector = btn.closest(".period-selector");
        const valor = btn.dataset.value;
        if (selector.id === "checkoutSelector") {
          const checkin = document.getElementById("genCheckin")?.value || "sem";
          if (!checkoutPermitidoParaRoteiro(checkin, valor)) {
            mostrarAvisoPeriodoRoteiro(mensagemPeriodoInvalido(checkin));
            return;
          }
        }
        selecionarPeriodoRoteiro(selector.id, valor);
        atualizarRestricoesPeriodoRoteiro(selector.id === "checkinSelector");
      });
    });
    atualizarRestricoesPeriodoRoteiro(false);

    let passoAtivo = "passo1";

    function mostrarPasso(nome) {
      passoAtivo = nome;
      passo1El.style.display  = nome === "passo1"   ? "" : "none";
      loadingEl.style.display = nome === "loading"  ? "" : "none";
      passo2El.style.display  = nome === "passo2"   ? "" : "none";
      if (passo3El) passo3El.style.display = nome === "passo3" ? "" : "none";
      erroEl.style.display = "none";
    }

    function chaveDestinoResumo() {
      return [
        cidadeGerada,
        paisGerado,
        estadoGeradoCode || estadoGerado,
        latGerada == null ? "" : Number(latGerada).toFixed(6),
        lngGerada == null ? "" : Number(lngGerada).toFixed(6),
      ].map(v => normalizarTextoLugar(v)).join("|");
    }

    async function limparLocaisRoteiro(roteiroId) {
      if (!roteiroId) return;
      const resp = await authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`);
      if (!resp.ok) return;
      const locais = await resp.json();
      if (!Array.isArray(locais) || locais.length === 0) return;
      await Promise.all(locais.map(local => {
        const idLocal = local?.idLocal;
        if (!idLocal) return Promise.resolve();
        return authFetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${idLocal}`, { method: "DELETE" }).catch(() => null);
      }));
    }

    // ── Google Autocomplete (passo 1) ─────────────────────────────
    window.initCriarRoteiro = function () {
      if (!window.google?.maps?.places) return;
      const inputCidade = document.getElementById("genCidade");
      if (!inputCidade || autocompleteCidadeGen) return;

      autocompleteCidadeGen = new google.maps.places.Autocomplete(inputCidade, {
        fields: ["place_id", "name", "formatted_address", "address_components", "geometry", "types"],
        types:  [],
        language: "pt-BR",
      });

      autocompleteCidadeGen.addListener("place_changed", () => {
        const place = autocompleteCidadeGen.getPlace();
        if (!place.place_id) return;

        // Se o lugar é uma cidade/região usa o nome da cidade extraído;
        // se é um POI (parque, atração, etc.) mantém o nome exato do lugar.
        const tiposCidade = ["locality", "administrative_area_level_1", "administrative_area_level_2", "postal_town", "country"];
        const isCidade    = (place.types || []).some(t => tiposCidade.includes(t));
        const displayNome = isCidade ? (extrairCidadeGooglePlace(place) || place.name) : place.name;
        const cidadeBadgeNome = extrairCidadeGooglePlace(place) || displayNome;

        const pais      = extrairPaisGooglePlace(place);
        const estado    = extrairEstadoGooglePlace(place);
        const estadoComp = extrairComponentePlaceGoogle(place, ["administrative_area_level_1"]);
        estadoGeradoCode = estadoComp?.short_name || "";

        latGerada        = place.geometry?.location?.lat() ?? null;
        lngGerada        = place.geometry?.location?.lng() ?? null;
        destinoPOIGerado = !isCidade;
        destinoPlaceIdGerado = place.place_id || null;
        destinoEnderecoGerado = !isCidade ? (place.formatted_address || null) : null;
        inputCidade.value = displayNome;

        // Captura rua quando for um POI específico (melhora precisão no prompt da IA)
        if (!isCidade) {
          const compRua    = extrairComponentePlaceGoogle(place, ["route"]);
          const compNum    = extrairComponentePlaceGoogle(place, ["street_number"]);
          const compBairro = extrairComponentePlaceGoogle(place, ["sublocality_level_1", "sublocality"]);
          if (compRua) {
            ruaGerada = [compNum?.long_name, compRua.long_name, compBairro?.long_name]
              .filter(Boolean).join(", ");
          } else {
            ruaGerada = place.formatted_address || place.vicinity || null;
          }
        } else {
          ruaGerada = null;
          destinoEnderecoGerado = null;
        }

        if (pais) {
          codigoPaisGerado = (pais.codigo || "").toLowerCase();
          document.getElementById("genPais").value            = pais.nome;
          document.getElementById("genPaisLabel").textContent = pais.nome;
          document.getElementById("genPaisContainer").style.display = "";
        }

        const cidadeBadge = document.getElementById("genCidadeContainer");
        const cidadeLabel = document.getElementById("genCidadeLabel");
        if (cidadeBadge && cidadeLabel) {
          if (cidadeBadgeNome) {
            cidadeLabel.textContent = cidadeBadgeNome;
            cidadeBadge.style.display = "";
          } else {
            cidadeBadge.style.display = "none";
          }
        }

        document.getElementById("genEstado").value = estado;
        const estadoBadge = document.getElementById("genEstadoContainer");
        if (estadoBadge) {
          if (estado) {
            document.getElementById("genEstadoLabel").textContent = estado;
            estadoBadge.style.display = "";
          } else {
            estadoBadge.style.display = "none";
          }
        }

        const localBadge = document.getElementById("genLocalContainer");
        const localLabel = document.getElementById("genLocalLabel");
        if (localBadge && localLabel) {
          if (!isCidade && displayNome) {
            localLabel.textContent = ruaGerada ? `${displayNome} · ${ruaGerada}` : displayNome;
            localBadge.style.display = "";
          } else {
            localBadge.style.display = "none";
          }
        }
      });

      inputCidade.addEventListener("input", () => {
        if (!inputCidade.value.trim()) {
          latGerada = null;
          lngGerada = null;
          destinoPOIGerado = false;
          ruaGerada = null;
          destinoPlaceIdGerado = null;
          destinoEnderecoGerado = null;
          document.getElementById("genPais").value   = "";
          document.getElementById("genEstado").value = "";
          document.getElementById("genPaisContainer").style.display = "none";
          const eb = document.getElementById("genEstadoContainer");
          if (eb) eb.style.display = "none";
          const cb = document.getElementById("genCidadeContainer");
          if (cb) cb.style.display = "none";
          const lb = document.getElementById("genLocalContainer");
          if (lb) lb.style.display = "none";
        }
      });
    };

    if (window.google?.maps?.places) window.initCriarRoteiro();


    // Pré-carregar imagens para o seletor de capa (passo 2)
    carregarImagens().then(imgs => {
      renderSeletorImagens("imgSelector2", "itImagem2", imgs.length > 0 ? imgs[0].idImagem : null);
    });

    if (modoEdicao) {
      authFetch(URL_API_BASE + "/roteiros/" + roteiroIdEdicao)
        .then(r => r.json())
        .then(r => {
          document.getElementById("genCidade").value = r.cidade || "";
          if (window.setGenDias) window.setGenDias(r.diasTotais); else document.getElementById("genDias").value = r.diasTotais || "";
          document.getElementById("genTipo").value   = r.tipoRoteiro || "Cidade";
        })
        .catch(() => {});
    }

    document.getElementById("btnGerar")?.addEventListener("click", async () => {
      const cidade   = document.getElementById("genCidade")?.value?.trim();
      const pais     = document.getElementById("genPais")?.value?.trim();
      const estado   = document.getElementById("genEstado")?.value?.trim();
      const diasVal  = parseInt(document.getElementById("genDias")?.value || "0");
      const tipo     = document.getElementById("genTipo")?.value || "Cidade";
      const checkin  = document.getElementById("genCheckin")?.value || "sem";
      const checkout = document.getElementById("genCheckout")?.value || "sem";

      if (!cidade || diasVal < 1) {
        erroEl.textContent = !cidade ? "Informe o destino da viagem." : "Informe a duração em dias.";
        erroEl.style.display = "";
        return;
      }
      if (!validarPeriodosRoteiro(true)) return;
      erroEl.style.display = "none";

      if (!modoEdicao) {
        try {
          const [resR, resU] = await Promise.all([
            authFetch(`${URL_API_BASE}/roteiros/usuario/${userId}`),
            authFetch(`${URL_API_BASE}/users/search-completo/${userId}`)
          ]);
          const lista = resR.ok ? await resR.json() : [];
          const usr   = resU.ok ? await resU.json() : null;
          const isPremium = (usr?.usuario?.tipoConta || "FREE") === "PREMIUM";
          if (!isPremium && Array.isArray(lista) && lista.length >= LIMITE_FREE_MR) {
            erroEl.innerHTML = `<i class="bi bi-lock-fill me-2"></i>Você já possui <strong>${LIMITE_FREE_MR} roteiros</strong> no plano gratuito. <a href="planos-premium.html" style="color:#f97316;font-weight:700;">Assine o Premium</a> para criar roteiros ilimitados.`;
            erroEl.style.display = "";
            return;
          }
        } catch (_) {}
      }

      cidadeGerada  = cidade;
      paisGerado    = pais;
      estadoGerado  = estado;
      diasGerados   = diasVal;
      tipoGerado    = tipo;

      mostrarPasso("loading");

      try {
        const resp = await authFetch(`${URL_API_BASE}/roteiros/gerar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cidade, pais, estado, diasTotais: diasVal, tipoRoteiro: tipo,
            periodoCheckin: checkin !== "sem" ? checkin : null,
            periodoCheckout: checkout !== "sem" ? checkout : null,
            destinoPontoTuristico: destinoPOIGerado,
            latitude: latGerada,
            longitude: lngGerada,
            stateCode: estadoGeradoCode || null,
            enderecoDestino: ruaGerada || null })
        });
        if (!resp.ok) {
          let msg = `Erro ${resp.status} ao gerar roteiro.`;
          try {
            const erroApi = await resp.json();
            msg = erroApi.message || erroApi.error || msg;
          } catch (_) {}
          throw new Error(msg);
        }
        const data = await resp.json();
        await popularPasso2(data);
        mostrarPasso("passo2");
      } catch (err) {
        console.error("[FlyGuide] Falha ao gerar roteiro:", err);
        mostrarPasso("passo1");
        erroEl.textContent = err?.message || "Não foi possível gerar o roteiro. Verifique sua conexão.";
        erroEl.style.display = "";
      }
    });

    function _deduplicarSugestoes(sugestoes, isPOI, cidade, dias) {
      if (!Array.isArray(sugestoes)) return sugestoes;
      const usados  = new Set();
      const cidNorm = (cidade || "").toLowerCase().trim();

      const _isPoiVariante = (nomeLow, diaNum) =>
        isPOI && dias > 1 && diaNum === 1 && cidNorm &&
        (nomeLow.startsWith(cidNorm) || cidNorm.startsWith(nomeLow));

      return sugestoes.map(diaObj => {
        const diaNum = diaObj.dia || 1;

        if (diaObj.periodos && typeof diaObj.periodos === "object") {
          const novosPeriodos = {};
          for (const [periodo, locais] of Object.entries(diaObj.periodos)) {
            if (!Array.isArray(locais)) { novosPeriodos[periodo] = locais; continue; }
            novosPeriodos[periodo] = locais.filter(local => {
              const nome = (local.nome || "").trim();
              if (!nome) return false;
              const nomeLow = nome.toLowerCase();
              // Bloqueia variante do POI no Dia 1 — mas NÃO adiciona ao set (para Dia 2+ poder usar)
              if (_isPoiVariante(nomeLow, diaNum)) return false;
              // Descarta duplicata global (já usada em outro dia/período)
              if (usados.has(nomeLow)) return false;
              usados.add(nomeLow);
              return true;
            });
          }
          return { ...diaObj, periodos: novosPeriodos };
        }

        if (Array.isArray(diaObj.locais)) {
          return {
            ...diaObj,
            locais: diaObj.locais.filter(local => {
              const nome = ((typeof local === "string" ? local : local.nome) || "").trim();
              if (!nome) return false;
              const nomeLow = nome.toLowerCase();
              if (_isPoiVariante(nomeLow, diaNum)) return false;
              if (usados.has(nomeLow)) return false;
              usados.add(nomeLow);
              return true;
            })
          };
        }
        return diaObj;
      });
    }

    async function popularPasso2(data) {
      // Deduplica antes de armazenar: nenhum local repete entre dias/períodos
      aiSugestoes = data.sugestoes
        ? _deduplicarSugestoes(data.sugestoes, destinoPOIGerado, cidadeGerada, diasGerados)
        : null;

      document.getElementById("p2Destino").textContent =
        cidadeGerada
        + (estadoGerado ? ", " + estadoGerado : "")
        + (paisGerado   ? " — " + paisGerado  : "");
      document.getElementById("p2Info").textContent =
        diasGerados + (diasGerados === 1 ? " dia" : " dias") + " • " + tipoGerado;

      const p2LocalBadge = document.getElementById("p2LocalBadge");
      const p2LocalLabel = document.getElementById("p2LocalLabel");
      if (p2LocalBadge && p2LocalLabel) {
        if (destinoPOIGerado && cidadeGerada) {
          p2LocalLabel.textContent = "Local principal: " + cidadeGerada;
          p2LocalBadge.style.display = "";
        } else {
          p2LocalBadge.style.display = "none";
        }
      }

      document.getElementById("genTitulo").value    = data.titulo || "";
      document.getElementById("genDescricao").value = data.descricao || "";

      const imgs = await carregarImagens();
      renderSeletorImagens("imgSelector2", "itImagem2", data.idImagem || data.imagemChave || (imgs[0]?.idImagem ?? null));
      const itPublicEl = document.getElementById("itPublic");
      if (itPublicEl) itPublicEl.checked = true;
      atualizarCriarVisibilityStrip(true);
    }

    document.getElementById("btnVoltarTopo")?.addEventListener("click", (e) => {
      if (passoAtivo === "passo3") {
        e.preventDefault();
        mostrarPasso("passo2");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (passoAtivo === "passo2") {
        e.preventDefault();
        mostrarPasso("passo1");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    document.getElementById("btnVoltarPasso1")?.addEventListener("click", () => {
      mostrarPasso("passo1");
    });

    document.getElementById("btnVoltarPasso2")?.addEventListener("click", () => {
      mostrarPasso("passo2");
    });

    document.getElementById("btnFinalizarRoteiro")?.addEventListener("click", async () => {
      if (typeof window.flyguideAiLookupPendente === "function" && window.flyguideAiLookupPendente()) {
        erroEl.textContent = "Aguarde a preparação dos locais no mapa terminar antes de finalizar.";
        erroEl.style.display = "";
        return;
      }

      const btn = document.getElementById("btnFinalizarRoteiro");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Finalizando...`;

      // Promove de RASCUNHO → PLANEJADO e aplica a visibilidade real escolhida pelo usuário
      if (roteiroIdCriado && !modoEdicao) {
        try {
          await authFetch(`${URL_API_BASE}/roteiros/${roteiroIdCriado}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusRoteiro: "PLANEJADO" }),
          });
          // Salva a versao revisada dos locais da IA e aplica a visibilidade escolhida.
          const isPublicFinal = document.getElementById("itPublic")?.checked;
          const sugestoesRevisadas = typeof window.getSugestoesEditadasLocais === "function"
            ? window.getSugestoesEditadasLocais()
            : null;
          const imagemSelecionadaFinal = typeof obterImagemSelecionada === "function"
            ? obterImagemSelecionada("itImagem2")
            : null;
          const idImagemFinal = document.getElementById("itImagem2")?.value;
          await authFetch(`${URL_API_BASE}/roteiros/${roteiroIdCriado}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idUsuario:           parseInt(userId),
              titulo:              document.getElementById("genTitulo")?.value || "",
              pais:                paisGerado || null,
              cidade:              cidadeGerada,
              tipoRoteiro:         tipoGerado,
              statusRoteiro:       "PLANEJADO",
              visibilidadeRoteiro: isPublicFinal ? PUBLICO : "Privado",
              diasTotais:          diasGerados,
              orcamento:           null,
              observacoes:         document.getElementById("genDescricao")?.value || null,
              idImagem:            imagemSelecionadaFinal?.idImagem ?? (typeof normalizarIdImagem === "function" ? normalizarIdImagem(idImagemFinal) : (idImagemFinal ? parseInt(idImagemFinal) : null)),
              imagemChave:         imagemSelecionadaFinal?.imagemChave || null,
              sugestoes:           sugestoesRevisadas || null,
              latDestino:          latGerada,
              lngDestino:          lngGerada,
            }),
          });
        } catch (_) {
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-check-lg me-2"></i>Finalizar Roteiro`;
          erroEl.textContent = "Não foi possível finalizar o roteiro. Tente novamente.";
          erroEl.style.display = "";
          return;
        }
      }

      try { sessionStorage.setItem("flyguide:refresh-meus-roteiros", "1"); } catch (_) {}
      window.location.href = "meus-roteiros.html";
    });

    function atualizarCriarVisibilityStrip(isPublico) {
      const strip = document.getElementById("criarVisibilityStrip");
      const icon  = document.getElementById("criarVisIcon");
      const label = document.getElementById("criarVisLabel");
      const desc  = document.getElementById("criarVisDesc");
      const badge = document.getElementById("criarVisBadge");
      if (!strip) return;
      strip.classList.toggle("is-public", isPublico);
      icon.className    = isPublico ? "bi bi-globe2" : "bi bi-lock-fill";
      label.textContent = isPublico ? "Compartilhar no Feed Público" : "Roteiro Privado";
      desc.textContent  = isPublico ? "Outras pessoas poderão ver seu roteiro" : "Somente você pode ver este roteiro";
      badge.textContent = isPublico ? "Público" : "Privado";
    }

    document.getElementById("itPublic")?.addEventListener("change", e => {
      atualizarCriarVisibilityStrip(e.target.checked);
    });

    document.getElementById("btnConfirmar")?.addEventListener("click", async () => {
      const titulo    = document.getElementById("genTitulo")?.value?.trim();
      const descricao = document.getElementById("genDescricao")?.value?.trim();
      const isPublic  = document.getElementById("itPublic")?.checked;
      const idImagem  = document.getElementById("itImagem2")?.value;
      const imagemSelecionada = typeof obterImagemSelecionada === "function"
        ? obterImagemSelecionada("itImagem2")
        : null;
      const btn       = document.getElementById("btnConfirmar");

      if (!titulo) {
        erroEl.textContent = "O título do roteiro é obrigatório.";
        erroEl.style.display = "";
        return;
      }
      erroEl.style.display = "none";

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Verificando...`;
      const textoParaValidar = titulo;
      try {
        const resVal = await authFetch(`${URL_API_BASE}/validar/texto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: textoParaValidar })
        });
        if (resVal.ok) {
          const val = await resVal.json();
          if (!val.valido) {
            erroEl.textContent = "O título contém linguagem inapropriada. Por favor, revise.";
            erroEl.style.display = "";
            btn.disabled = false;
            btn.innerHTML = `Salvar Roteiro <i class="bi bi-check-lg ms-1"></i>`;
            return;
          }
        }
      } catch (_) {}

      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

      const payload = {
        idUsuario:           parseInt(userId),
        titulo,
        pais:                paisGerado || null,
        cidade:              cidadeGerada,
        tipoRoteiro:         tipoGerado,
        // Salva como RASCUNHO + Privado até "Finalizar Roteiro"
        // A visibilidade real (Público/Privado) é aplicada apenas ao Finalizar
        statusRoteiro:       modoEdicao ? "PLANEJADO" : "RASCUNHO",
        visibilidadeRoteiro: modoEdicao ? (isPublic ? PUBLICO : "Privado") : "Privado",
        diasTotais:          diasGerados,
        orcamento:           null,
        observacoes:         descricao || null,
        idImagem:            imagemSelecionada?.idImagem ?? (typeof normalizarIdImagem === "function" ? normalizarIdImagem(idImagem) : (idImagem ? parseInt(idImagem) : null)),
        imagemChave:         imagemSelecionada?.imagemChave || null,
        sugestoes:           aiSugestoes || null,
        latDestino:          latGerada,
        lngDestino:          lngGerada,
      };

      try {
        let resp, criado;
        if (modoEdicao) {
          resp = await authFetch(`${URL_API_BASE}/roteiros/${roteiroIdEdicao}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error();
          criado = await resp.json();
        } else if (roteiroIdCriado) {
          // Já criado (usuário voltou do passo3 e clicou em Próximo novamente)
          resp = await authFetch(`${URL_API_BASE}/roteiros/${roteiroIdCriado}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error();
          criado = await resp.json();
        } else {
          resp = await authFetch(`${URL_API_BASE}/roteiros`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error();
          criado = await resp.json();
          roteiroIdCriado = criado.idRoteiro;
        }

        const destinoResumoAtual = chaveDestinoResumo();
        if (!modoEdicao && destinoAbertoNoResumo && destinoAbertoNoResumo !== destinoResumoAtual) {
          await limparLocaisRoteiro(criado.idRoteiro);
        }
        destinoAbertoNoResumo = destinoResumoAtual;

        // Preenche cabeçalho do passo3
        const p3Destino = document.getElementById("p3Destino");
        const p3Info    = document.getElementById("p3Info");
        if (p3Destino) p3Destino.textContent =
          cidadeGerada + (estadoGerado ? ", " + estadoGerado : "") + (paisGerado ? " — " + paisGerado : "");
        if (p3Info) p3Info.textContent =
          diasGerados + (diasGerados === 1 ? " dia" : " dias") + " • " + tipoGerado;

        mostrarPasso("passo3");
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Abre interface de edição de locais com o roteiro recém-criado
        if (typeof window.abrirLocaisEdit === "function") {
          window.abrirLocaisEdit(criado.idRoteiro, cidadeGerada, {
            diasTotais:              diasGerados,
            userId:                  parseInt(userId),
            roteiro:                 criado,
            pais:                    paisGerado       || null,
            codigoPais:              codigoPaisGerado || null,
            stateCode:               estadoGeradoCode || null,
            stateName:               estadoGerado     || null,
            latDestino:              latGerada,
            lngDestino:              lngGerada,
            destinoPOI:              !!destinoPOIGerado,
            localBase:               destinoPOIGerado ? {
              nome:      cidadeGerada,
              endereco:  destinoEnderecoGerado || ruaGerada || null,
              placeId:   destinoPlaceIdGerado || null,
              latitude:  latGerada,
              longitude: lngGerada,
            } : null,
            ocultarBtnSalvarSugestoes: true,
          });
        }

        btn.disabled  = false;
        btn.innerHTML = `<i class="bi bi-arrow-right me-2"></i>Próximo: Revisar Locais`;
      } catch {
        erroEl.textContent = "Não foi possível salvar o roteiro. Verifique se o backend está rodando.";
        erroEl.style.display = "";
        btn.disabled  = false;
        btn.innerHTML = `<i class="bi bi-arrow-right me-2"></i>Próximo: Revisar Locais`;
      }
    });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ATIVIDADES (Etapa 2)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (pagina === "atividades-roteiro") {
    const userId = getUserIdFromToken();
    if (!userId) { window.location.href = "login.html"; return; }
    corrigirTextosAtividadesRoteiro();

    // Ler ID do roteiro da URL
    const urlParamsAtiv = new URLSearchParams(window.location.search);
    const roteiroIdAtiv = urlParamsAtiv.get("id");
    if (!roteiroIdAtiv) { window.location.href = "criar-roteiro.html"; return; }

    const summaryEl = document.getElementById("draftSummary");
    const alertEl   = document.getElementById("roteiroSalvoAlert");

    // Ler dias da URL (passado pelo redirect) como fallback rápido
    (function popularSelectDias() {
      const diasUrl = parseInt(new URLSearchParams(window.location.search).get("dias")) || 0;
      if (diasUrl > 0) {
        window.flyguide_diasTotais = diasUrl;
        const sel = document.getElementById("localDia");
        if (sel) {
          sel.innerHTML = '<option value="">— selecione o dia —</option>' +
            Array.from({ length: diasUrl }, (_, i) =>
              `<option value="${i+1}">Dia ${i+1}</option>`
            ).join("");
        }
      }
    })();

    // Buscar dados do roteiro no backend para mostrar resumo
    authFetch(URL_API_BASE + "/roteiros/" + roteiroIdAtiv)
      .then(function(r) { return r.ok ?r.json() : null; })
      .then(function(r) {
        if (!r || !summaryEl) return;

        // Atualizar select de dias com o valor real do backend
        var dias = r.diasTotais || 0;
        if (dias > 0) {
          window.flyguide_diasTotais = dias;
          var sel = document.getElementById("localDia");
          if (sel) {
            sel.innerHTML = '<option value="">— selecione o dia —</option>' +
              Array.from({ length: dias }, function(_, i) {
                return '<option value="' + (i+1) + '">Dia ' + (i+1) + '</option>';
              }).join("");
          }
        }
        const bases = lerBasesRoteiro(roteiroIdAtiv);
        const basePrincipal = bases[0] || null;
        const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
        const fmtD  = function(s) { if (!s) return "?"; const parts = s.split("-"); return parseInt(parts[2]) + " " + meses[parseInt(parts[1])-1]; };
        summaryEl.innerHTML =
          '<span class="pill"><i class="bi bi-card-text"></i>' + escapeHtml(r.titulo) + '</span>' +
          ((basePrincipal && basePrincipal.country)
            ? '<span class="pill"><i class="bi bi-geo-alt"></i>' + escapeHtml(basePrincipal.city + ", " + basePrincipal.country) + '</span>'
            : (r.cidade ?'<span class="pill"><i class="bi bi-geo-alt"></i>' + escapeHtml(r.cidade) + '</span>' : '')) +
          (bases.length > 1 ? '<span class="pill"><i class="bi bi-signpost-2"></i>' + (bases.length - 1) + ' base(s) extra</span>' : '') +
          (r.dataInicio ?'<span class="pill"><i class="bi bi-calendar-event"></i>' + fmtD(r.dataInicio) + ' \u2192 ' + fmtD(r.dataFim) + '</span>' : '');
        summaryEl.style.display = "inline-flex";
        if (alertEl) alertEl.style.display = "";

        // Atualizar botÃ£o Voltar com o ID correto
        var btnVoltar = document.querySelector(".back-center");
        if (btnVoltar) btnVoltar.href = "criar-roteiro.html?id=" + roteiroIdAtiv;
      })
      .catch(function() {});

    document.getElementById("btnSalvarPrevia")?.addEventListener("click", () => {
      const btn = document.getElementById("btnSalvarPrevia");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="bi bi-bookmark-check-fill me-1"></i>Prévia salva!`;
      }
      try { sessionStorage.setItem("flyguide:abrir-rascunhos", "1"); } catch (_) {}
      setTimeout(() => { window.location.href = "meus-roteiros.html"; }, 700);
    });

    document.getElementById("btnConcluirRoteiro")?.addEventListener("click", async () => {
      if (roteiroIdAtiv) {
        try {
          await authFetch(`${URL_API_BASE}/roteiros/${roteiroIdAtiv}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusRoteiro: "PLANEJADO" }),
          });
        } catch (_) {}
      }
      window.location.href = "meus-roteiros.html";
    });

    // Sugestões da IA: mostrar somente quando há &novo=1 na URL
    const isNovo = urlParamsAtiv.get("novo") === "1";
    if (isNovo) {
      try {
        const aiKey  = `flyguide:ai-sugestoes:${roteiroIdAtiv}`;
        const raw    = localStorage.getItem(aiKey);
        const dias   = raw ? JSON.parse(raw) : null;
        const box    = document.getElementById("aiSugestoesBox");
        const cont   = document.getElementById("aiSugestoesDias");

        if (Array.isArray(dias) && dias.length > 0 && box && cont) {
          cont.innerHTML = dias.map(d => {
            const locais = Array.isArray(d.locais) ? d.locais : [];
            const chips  = locais.map(local =>
              `<button type="button" class="btn btn-sm ai-chip"
                 style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;font-size:.8rem;padding:4px 12px;cursor:pointer;"
                 data-local="${escapeHtml(local)}">${escapeHtml(local)}</button>`
            ).join("");
            return `<div class="mb-3">
              <div class="fw-bold mb-2" style="font-size:.85rem;color:#64748b;">Dia ${d.dia}</div>
              <div class="d-flex flex-wrap gap-2">${chips}</div>
            </div>`;
          }).join("");

          box.style.display = "";

          cont.addEventListener("click", e => {
            const btn = e.target.closest("[data-local]");
            if (!btn) return;
            const campo = document.getElementById("buscaLocal");
            if (campo) {
              campo.value = btn.getAttribute("data-local");
              campo.dispatchEvent(new Event("input", { bubbles: true }));
              campo.focus();
              campo.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });

          document.getElementById("btnFecharSugestoes")?.addEventListener("click", () => {
            box.style.display = "none";
            try { localStorage.removeItem(aiKey); } catch (_) {}
          });
        }
      } catch (_) {}
    }
  }
})();
