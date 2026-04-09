/* ================================================================
   FlyGuide - maps-edit.js
   Google Maps Places no modal de edição de roteiro (meus-roteiros)
   Depende de: app.js, maps.js (para escapeHtml e URL_API_BASE)
================================================================ */

const _URL_API = "http://localhost:8080";
let _autocompleteEdit = null;
let _localSelecionadoEdit = null;
let _locaisEdit = [];
let _roteiroIdEdit = null;

// Chamada pelo Google Maps API callback
window.initMapsEdit = function () {
  const input = document.getElementById("buscaLocalEdit");
  if (!input || !window.google) return;

  _autocompleteEdit = new google.maps.places.Autocomplete(input, {
    fields:   ["place_id", "name", "formatted_address", "geometry", "types"],
    language: "pt-BR",
  });

  _autocompleteEdit.addListener("place_changed", () => {
    const place = _autocompleteEdit.getPlace();
    if (!place.place_id) return;

    _localSelecionadoEdit = {
      placeId:   place.place_id,
      nome:      place.name,
      endereco:  place.formatted_address,
      tipo:      (place.types || [])[0] || "establishment",
      latitude:  place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    };

    const preview = document.getElementById("localPreviewEdit");
    if (preview) {
      preview.style.display = "";
      document.getElementById("previewNomeEdit").textContent     = _localSelecionadoEdit.nome;
      document.getElementById("previewEnderecoEdit").textContent = _localSelecionadoEdit.endereco;
    }
  });
};

// Carrega locais do roteiro no modal
function carregarLocaisEdit(roteiroId) {
  _roteiroIdEdit = roteiroId;
  _locaisEdit    = [];

  fetch(`${_URL_API}/roteiros/${roteiroId}/locais`)
    .then(r => r.json())
    .then(data => { _locaisEdit = data; renderLocaisEdit(); })
    .catch(() => { _locaisEdit = []; renderLocaisEdit(); });
}

function renderLocaisEdit() {
  const lista = document.getElementById("listaLocaisEdit");
  const vazio = document.getElementById("vazioLocaisEdit");
  if (!lista) return;

  if (_locaisEdit.length === 0) {
    lista.innerHTML = "";
    if (vazio) { vazio.style.display = ""; lista.appendChild(vazio); }
    return;
  }

  if (vazio) vazio.style.display = "none";

  lista.innerHTML = _locaisEdit
    .sort((a, b) => (a.dia || 0) - (b.dia || 0))
    .map(l => `
      <div class="d-flex align-items-center gap-2 p-2 mb-1"
           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <div style="background:#f97316;color:#fff;width:32px;height:32px;border-radius:50%;
                    display:grid;place-items:center;font-weight:800;font-size:.85rem;flex-shrink:0;">
          ${l.dia || "?"}
        </div>
        <div style="flex:1;min-width:0;">
          <div class="fw-bold" style="font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(l.nome || "Local")}
          </div>
          ${l.observacoes ? `<div class="text-secondary" style="font-size:.75rem;">${escapeHtml(l.observacoes)}</div>` : ""}
        </div>
        <button class="btn btn-sm btn-outline-danger" data-rm-local-edit="${l.idRoteiroLocal}" title="Remover">
          <i class="bi bi-trash"></i>
        </button>
      </div>`).join("");

  lista.querySelectorAll("[data-rm-local-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-rm-local-edit");
      btn.disabled = true;
      try {
        const r = await fetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais/${id}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisEdit = _locaisEdit.filter(l => String(l.idRoteiroLocal) !== String(id));
          renderLocaisEdit();
        } else { alert("Não foi possível remover."); btn.disabled = false; }
      } catch { alert("Erro ao conectar ao servidor."); btn.disabled = false; }
    });
  });
}

// Adicionar local no modal de edição
document.getElementById("btnAdicionarLocalEdit")?.addEventListener("click", async () => {
  const erroEl = document.getElementById("erroLocalEdit");

  if (!_localSelecionadoEdit) {
    erroEl.textContent = "Busque e selecione um local primeiro!";
    erroEl.style.display = "";
    return;
  }
  if (!_roteiroIdEdit) {
    erroEl.textContent = "Nenhum roteiro selecionado.";
    erroEl.style.display = "";
    return;
  }

  const dia   = document.getElementById("localDiaEdit")?.value?.trim();
  const obs   = document.getElementById("localObsEdit")?.value?.trim();

  if (!dia) {
    erroEl.textContent = "Informe o dia da atividade.";
    erroEl.style.display = "";
    return;
  }
  erroEl.style.display = "none";

  const btn = document.getElementById("btnAdicionarLocalEdit");
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

  try {
    // 1. Criar/buscar local no banco
    const resLocal = await fetch(`${_URL_API}/locais`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        placeId:   _localSelecionadoEdit.placeId,
        nome:      _localSelecionadoEdit.nome,
        endereco:  _localSelecionadoEdit.endereco,
        tipo:      _localSelecionadoEdit.tipo,
        latitude:  _localSelecionadoEdit.latitude,
        longitude: _localSelecionadoEdit.longitude,
      }),
    });

    let local;
    if (resLocal.ok || resLocal.status === 201) {
      local = await resLocal.json();
    } else {
      const resGet = await fetch(`${_URL_API}/locais/place/${_localSelecionadoEdit.placeId}`);
      local = await resGet.json();
    }

    // 2. Vincular ao roteiro
    const resVinculo = await fetch(`${_URL_API}/roteiros/${_roteiroIdEdit}/locais`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        idLocal:     local.idLocal,
        dia:         parseInt(dia),
        ordem:       _locaisEdit.length + 1,
        observacoes: obs || null,
        horario:     document.getElementById("localHorarioEdit")?.value || null,
        status:      "PLANEJADO",
      }),
    });

    if (resVinculo.ok || resVinculo.status === 201) {
      const vinculo = await resVinculo.json();
      _locaisEdit.push(vinculo);
      renderLocaisEdit();

      // Reset
      document.getElementById("buscaLocalEdit").value     = "";
      document.getElementById("localDiaEdit").value       = "";
      document.getElementById("localObsEdit").value       = "";
      document.getElementById("localHorarioEdit").value   = "";
      document.getElementById("localPreviewEdit").style.display = "none";
      _localSelecionadoEdit = null;
    } else {
      throw new Error("Erro ao vincular");
    }
  } catch {
    erroEl.textContent = "Erro ao salvar local. Verifique o backend.";
    erroEl.style.display = "";
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="bi bi-plus-lg"></i> Add`;
  }
});

// Expõe função para roteiros.js chamar ao abrir o modal
window.abrirLocaisEdit = function (roteiroId) {
  // Reset campos
  const buscaEl = document.getElementById("buscaLocalEdit");
  if (buscaEl) buscaEl.value = "";
  const diaEl = document.getElementById("localDiaEdit");
  if (diaEl) diaEl.value = "";
  const obsEl = document.getElementById("localObsEdit");
  if (obsEl) obsEl.value = "";
  const horarioEl = document.getElementById("localHorarioEdit");
  if (horarioEl) horarioEl.value = "";
  const prevEl = document.getElementById("localPreviewEdit");
  if (prevEl) prevEl.style.display = "none";
  _localSelecionadoEdit = null;

  carregarLocaisEdit(roteiroId);
};