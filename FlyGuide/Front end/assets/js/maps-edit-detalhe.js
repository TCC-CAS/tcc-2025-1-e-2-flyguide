/* ================================================================
   FlyGuide - maps-edit-detalhe.js
   Google Maps Places no modal de edição da página de detalhes
================================================================ */

const _URL_API_DET = "http://localhost:8080";
let _autocompleteDetalheEdit = null;
let _localSelecionadoDetalheEdit = null;
let _locaisDetalheEdit = [];
let _roteiroIdDetalheEdit = null;

window.initMapsDetalheEdit = function () {
  const input = document.getElementById("buscaLocalDetalheEdit");
  if (!input || !window.google) return;

  // Evita criar múltiplos autocompletes no mesmo input
  if (_autocompleteDetalheEdit) return;

  _autocompleteDetalheEdit = new google.maps.places.Autocomplete(input, {
    fields:   ["place_id", "name", "formatted_address", "geometry", "types"],
    language: "pt-BR",
  });

  _autocompleteDetalheEdit.addListener("place_changed", () => {
    const place = _autocompleteDetalheEdit.getPlace();
    if (!place.place_id) return;

    _localSelecionadoDetalheEdit = {
      placeId:   place.place_id,
      nome:      place.name,
      endereco:  place.formatted_address,
      tipo:      (place.types || [])[0] || "establishment",
      latitude:  place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    };

    const preview = document.getElementById("localPreviewDetalheEdit");
    if (preview) {
      preview.style.display = "";
      document.getElementById("previewNomeDetalheEdit").textContent     = _localSelecionadoDetalheEdit.nome;
      document.getElementById("previewEnderecoDetalheEdit").textContent = _localSelecionadoDetalheEdit.endereco;
    }
  });
};

window.abrirLocaisEditDetalhe = function (roteiroId) {
  _roteiroIdDetalheEdit = roteiroId;
  _localSelecionadoDetalheEdit = null;

  const buscaEl = document.getElementById("buscaLocalDetalheEdit");
  if (buscaEl) buscaEl.value = "";
  const diaEl = document.getElementById("localDiaDetalheEdit");
  if (diaEl) diaEl.value = "";
  const obsEl = document.getElementById("localObsDetalheEdit");
  if (obsEl) obsEl.value = "";
  const prevEl = document.getElementById("localPreviewDetalheEdit");
  if (prevEl) prevEl.style.display = "none";

  fetch(`${_URL_API_DET}/roteiros/${roteiroId}/locais`)
    .then(r => r.json())
    .then(data => { _locaisDetalheEdit = data; renderLocaisDetalheEdit(); })
    .catch(() => { _locaisDetalheEdit = []; renderLocaisDetalheEdit(); });
};

function renderLocaisDetalheEdit() {
  const lista = document.getElementById("listaLocaisDetalheEdit");
  const vazio = document.getElementById("vazioLocaisDetalheEdit");
  if (!lista) return;

  if (_locaisDetalheEdit.length === 0) {
    lista.innerHTML = "";
    if (vazio) { vazio.style.display = ""; lista.appendChild(vazio); }
    return;
  }
  if (vazio) vazio.style.display = "none";

  lista.innerHTML = _locaisDetalheEdit
    .sort((a, b) => (a.dia || 0) - (b.dia || 0))
    .map(l => `
      <div class="d-flex align-items-center gap-2 p-2 mb-1"
           style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
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
        <button class="btn btn-sm btn-outline-danger" data-rm-local-detalhe="${l.idRoteiroLocal}" title="Remover">
          <i class="bi bi-trash"></i>
        </button>
      </div>`).join("");

  lista.querySelectorAll("[data-rm-local-detalhe]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-rm-local-detalhe");
      btn.disabled = true;
      try {
        const r = await fetch(`${_URL_API_DET}/roteiros/${_roteiroIdDetalheEdit}/locais/${id}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          _locaisDetalheEdit = _locaisDetalheEdit.filter(l => String(l.idRoteiroLocal) !== String(id));
          renderLocaisDetalheEdit();
        } else { alert("Não foi possível remover."); btn.disabled = false; }
      } catch { alert("Erro ao conectar."); btn.disabled = false; }
    });
  });
}

document.getElementById("btnAdicionarLocalDetalheEdit")?.addEventListener("click", async () => {
  const erroEl = document.getElementById("erroLocalDetalheEdit");

  if (!_localSelecionadoDetalheEdit) {
    erroEl.textContent = "Busque e selecione um local primeiro!";
    erroEl.style.display = "";
    return;
  }

  const dia = document.getElementById("localDiaDetalheEdit")?.value?.trim();
  const obs = document.getElementById("localObsDetalheEdit")?.value?.trim();

  if (!dia) {
    erroEl.textContent = "Informe o dia da atividade.";
    erroEl.style.display = "";
    return;
  }
  erroEl.style.display = "none";

  const btn = document.getElementById("btnAdicionarLocalDetalheEdit");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

  try {
    const resLocal = await fetch(`${_URL_API_DET}/locais`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId:   _localSelecionadoDetalheEdit.placeId,
        nome:      _localSelecionadoDetalheEdit.nome,
        endereco:  _localSelecionadoDetalheEdit.endereco,
        tipo:      _localSelecionadoDetalheEdit.tipo,
        latitude:  _localSelecionadoDetalheEdit.latitude,
        longitude: _localSelecionadoDetalheEdit.longitude,
      }),
    });

    let local;
    if (resLocal.ok || resLocal.status === 201) {
      local = await resLocal.json();
    } else {
      const resGet = await fetch(`${_URL_API_DET}/locais/place/${_localSelecionadoDetalheEdit.placeId}`);
      local = await resGet.json();
    }

    const resVinculo = await fetch(`${_URL_API_DET}/roteiros/${_roteiroIdDetalheEdit}/locais`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idLocal:     local.idLocal,
        dia:         parseInt(dia),
        ordem:       _locaisDetalheEdit.length + 1,
        observacoes: obs || null,
        horario:     document.getElementById("localHorarioDetalheEdit")?.value || null,
        status:      "PLANEJADO",
      }),
    });

    if (resVinculo.ok || resVinculo.status === 201) {
      const vinculo = await resVinculo.json();
      _locaisDetalheEdit.push(vinculo);
      renderLocaisDetalheEdit();

      document.getElementById("buscaLocalDetalheEdit").value     = "";
      document.getElementById("localDiaDetalheEdit").value       = "";
      document.getElementById("localObsDetalheEdit").value       = "";
      document.getElementById("localHorarioDetalheEdit").value   = "";
      document.getElementById("localPreviewDetalheEdit").style.display = "none";
      _localSelecionadoDetalheEdit = null;
    } else { throw new Error(); }
  } catch {
    erroEl.textContent = "Erro ao salvar local.";
    erroEl.style.display = "";
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="bi bi-plus-lg me-1"></i>Adicionar Local ao Roteiro`;
  }
});