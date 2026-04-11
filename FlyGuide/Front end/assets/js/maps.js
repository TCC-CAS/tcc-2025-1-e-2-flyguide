/* ================================================================
   FlyGuide - maps.js
   Integração com Google Maps e Places API
   - Busca de locais por autocomplete
   - Salva locais no banco via POST /roteiros/{id}/locais
   - Exibe mapa com pins na página de detalhes
   Depende de: app.js
================================================================ */

const MAPS_API_KEY  = "AIzaSyDJDXcLhGd99ryVpWwvkVpeFaKuzDWbvwI";
const URL_API_BASE  = "http://localhost:8080";
const SESSION_KEY   = "flyguide.userId";
const ROTEIRO_KEY   = "flyguide.roteiroAtual";

// ================================================================
// ATIVIDADES — busca de locais e listagem
// ================================================================
(function iniciarMapsAtividades() {
  if (document.body.getAttribute("data-pagina") !== "atividades-roteiro") return;

  const userId       = sessionStorage.getItem(SESSION_KEY);
  const roteiroAtual = JSON.parse(sessionStorage.getItem(ROTEIRO_KEY) || "null");
  const roteiroId    = roteiroAtual?.id;

  if (!userId || !roteiroId) return;

  let locaisSalvos = [];
  let autocomplete = null;
  let localSelecionado = null;

  // Carrega locais já salvos no banco
  function carregarLocais() {
    fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`)
      .then(r => r.json())
      .then(data => {
        locaisSalvos = data;
        renderLocais();
        atualizarMapaAtividades();
      })
      .catch(() => {});
  }

  function renderLocais() {
    const lista  = document.getElementById("listaLocaisMaps");
    const vazio  = document.getElementById("vazioLocais");
    if (!lista) return;

    if (locaisSalvos.length === 0) {
      lista.innerHTML = "";
      if (vazio) vazio.style.display = "";
      return;
    }
    if (vazio) vazio.style.display = "none";

    lista.innerHTML = locaisSalvos
      .sort((a, b) => (a.dia || 0) - (b.dia || 0) || (a.ordem || 0) - (b.ordem || 0))
      .map((l, idx) => `
        <div class="day-item" id="local-item-${l.idRoteiroLocal}" style="background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:14px;display:flex;gap:14px;align-items:flex-start;margin-top:12px;">
          <div class="day-bubble" style="background:#f97316;color:#fff;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:900;flex-shrink:0;">
            ${l.dia || "?"}
          </div>
          <div style="flex:1;" id="local-info-${l.idRoteiroLocal}">
            <div style="font-weight:800;font-size:1.05rem;">${escapeHtml(l.nome || "Local")}</div>
            ${l.observacoes ? `<div class="text-secondary mt-1" style="font-size:.9rem;">${escapeHtml(l.observacoes)}</div>` : ""}
            ${l.endereco ? `<div style="color:#94a3b8;font-size:.82rem;margin-top:4px;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(l.endereco)}</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-sm btn-outline-secondary" data-editar-local="${l.idRoteiroLocal}" data-dia="${l.dia || ''}" data-obs="${escapeHtml(l.observacoes || '')}" data-horario="${l.horario || ''}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-remover-local="${l.idLocal}" data-vinculo="${l.idRoteiroLocal}" title="Remover">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>`).join("");

    // Editar local
    lista.querySelectorAll("[data-editar-local]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idVinculo = btn.getAttribute("data-editar-local");
        const diaAtual  = btn.getAttribute("data-dia");
        const obsAtual  = btn.getAttribute("data-obs");
        const infoEl    = document.getElementById(`local-info-${idVinculo}`);
        const l         = locaisSalvos.find(x => String(x.idRoteiroLocal) === String(idVinculo));

        let novoLocalSelecionado = null;

        infoEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:.8rem;color:#94a3b8;font-weight:600;">Trocar local (opcional)</div>
            <input id="edit-busca-${idVinculo}" type="text" placeholder="${escapeHtml(l?.nome || 'Buscar novo local...')}"
              style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
            <div id="edit-preview-${idVinculo}" style="font-size:.78rem;color:#f97316;display:none;"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <input id="edit-dia-${idVinculo}" type="number" min="1" value="${diaAtual}" placeholder="Dia"
                style="width:70px;padding:4px 8px;border-radius:8px;border:1px solid #f97316;font-size:.88rem;background:inherit;color:inherit;">
              <input id="edit-horario-${idVinculo}" type="time" value="${l?.horario || ''}"
                style="width:110px;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
              <input id="edit-obs-${idVinculo}" type="text" value="${obsAtual}" placeholder="Observações"
                style="flex:1;min-width:120px;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;font-size:.88rem;background:inherit;color:inherit;">
              <button id="edit-salvar-${idVinculo}" style="background:#f97316;border:none;border-radius:8px;padding:4px 12px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;">Salvar</button>
              <button id="edit-cancelar-${idVinculo}" style="background:none;border:1px solid #94a3b8;border-radius:8px;padding:4px 10px;color:#94a3b8;font-size:.85rem;cursor:pointer;">Cancelar</button>
            </div>
          </div>
        `;

        // Autocomplete no campo de busca de novo local
        if (window.google) {
          const inputBusca = document.getElementById(`edit-busca-${idVinculo}`);
          const previewEl  = document.getElementById(`edit-preview-${idVinculo}`);
          const ac = new google.maps.places.Autocomplete(inputBusca, {
            fields: ["place_id", "name", "formatted_address", "geometry", "types"],
            language: "pt-BR"
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.place_id) return;
            novoLocalSelecionado = {
              placeId:   place.place_id,
              nome:      place.name,
              endereco:  place.formatted_address,
              tipo:      (place.types || [])[0] || "establishment",
              latitude:  place.geometry?.location?.lat(),
              longitude: place.geometry?.location?.lng(),
            };
            previewEl.textContent = `✔ ${place.name}`;
            previewEl.style.display = "";
          });
        }

        document.getElementById(`edit-cancelar-${idVinculo}`).onclick = () => { renderLocais(); atualizarMapaAtividades(); };

        document.getElementById(`edit-salvar-${idVinculo}`).onclick = async () => {
          const novoDia     = document.getElementById(`edit-dia-${idVinculo}`).value.trim();
          const novaObs     = document.getElementById(`edit-obs-${idVinculo}`).value.trim();
          const novoHorario = document.getElementById(`edit-horario-${idVinculo}`)?.value || null;
          if (!novoDia || !l) return;

          try {
            // Se trocou o local: DELETE + POST em 2 etapas
            if (novoLocalSelecionado) {
              const resDel = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${l.idLocal}`, { method: "DELETE" });
              if (!resDel.ok && resDel.status !== 204) { alert("Erro ao trocar o local."); return; }

              // 1. Cria/busca o local no banco
              const resLocal = await fetch(`${URL_API_BASE}/locais`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  placeId:   novoLocalSelecionado.placeId,
                  nome:      novoLocalSelecionado.nome,
                  endereco:  novoLocalSelecionado.endereco,
                  tipo:      novoLocalSelecionado.tipo,
                  latitude:  novoLocalSelecionado.latitude,
                  longitude: novoLocalSelecionado.longitude,
                })
              });
              if (!resLocal.ok) { alert("Erro ao salvar novo local."); return; }
              const localSalvo = await resLocal.json();

              // 2. Vincula ao roteiro
              const resVinculo = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  idLocal:     localSalvo.idLocal,
                  dia:         parseInt(novoDia),
                  ordem:       locaisSalvos.length + 1,
                  observacoes: novaObs || null,
                  horario:     novoHorario || null,
                  status:      "PLANEJADO",
                })
              });
              if (resVinculo.ok || resVinculo.status === 201) {
                await carregarLocais();
              } else { alert("Erro ao vincular novo local."); }
            } else {
              // Só atualiza dia/obs/horario
              const res = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${l.idLocal}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dia: parseInt(novoDia), observacoes: novaObs || null, horario: novoHorario || null, idLocal: l.idLocal })
              });
              if (res.ok) {
                l.dia = parseInt(novoDia);
                l.observacoes = novaObs;
                l.horario = novoHorario;
                renderLocais();
                atualizarMapaAtividades();
              } else { alert("Erro ao salvar."); }
            }
          } catch { alert("Erro ao conectar."); }
        };
      });
    });

    // Remover local
    lista.querySelectorAll("[data-remover-local]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idLocal   = btn.getAttribute("data-remover-local");
        const idVinculo = btn.getAttribute("data-vinculo");
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
        try {
          const r = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais/${idLocal}`, { method: "DELETE" });
          if (r.ok || r.status === 204) {
            locaisSalvos = locaisSalvos.filter(l => String(l.idRoteiroLocal) !== String(idVinculo));
            renderLocais();
            atualizarMapaAtividades();
          } else { alert("Não foi possível remover o local."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-trash"></i>`; }
        } catch { alert("Erro ao conectar ao servidor."); btn.disabled = false; btn.innerHTML = `<i class="bi bi-trash"></i>`; }
      });
    });
  }

  // Atualiza mini-mapa na página de atividades (stub — sem mapa nessa tela por ora)
  function atualizarMapaAtividades() {
    const box   = document.getElementById("mapaAtividadesBox");
    const mapEl = document.getElementById("mapaAtividades");
    if (!box || !mapEl || !window.google) return;

    const locaisComCoordenadas = locaisSalvos
      .filter(l => l.latitude && l.longitude)
      .sort((a, b) => (a.dia || 0) - (b.dia || 0) || (a.ordem || 0) - (b.ordem || 0));

    if (locaisComCoordenadas.length === 0) {
      box.style.display = "none";
      return;
    }

    box.style.display = "";

    const map = new google.maps.Map(mapEl, {
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const infoWindow = new google.maps.InfoWindow();

    // Adiciona markers numerados
    const bounds = new google.maps.LatLngBounds();
    locaisComCoordenadas.forEach((l, idx) => {
      const pos = { lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) };
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: l.nome,
        label: {
          text: String(l.dia || idx + 1),
          color: "#fff",
          fontWeight: "bold",
          fontSize: "13px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: "#f97316",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 10,
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:Inter,sans-serif;min-width:160px;">
            <strong style="font-size:.9rem;">${l.nome}</strong>
            ${l.endereco ? `<div style="font-size:.78rem;color:#64748b;margin-top:4px;">${l.endereco}</div>` : ""}
            ${l.observacoes ? `<div style="font-size:.78rem;margin-top:4px;color:#334155;">${l.observacoes}</div>` : ""}
            ${l.horario ? `<div style="font-size:.78rem;margin-top:4px;color:#f97316;">🕐 ${l.horario}</div>` : ""}
          </div>
        `);
        infoWindow.open(map, marker);
      });

      bounds.extend(pos);
    });

    // Traça rota em sequência se tiver 2+ locais
    if (locaisComCoordenadas.length >= 2) {
      const directionsService  = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // mantém nossos markers customizados
        polylineOptions: {
          strokeColor: "#f97316",
          strokeWeight: 4,
          strokeOpacity: 0.7,
        },
      });
      directionsRenderer.setMap(map);

      const origem  = locaisComCoordenadas[0];
      const destino = locaisComCoordenadas[locaisComCoordenadas.length - 1];
      const paradas = locaisComCoordenadas.slice(1, -1).map(l => ({
        location: new google.maps.LatLng(parseFloat(l.latitude), parseFloat(l.longitude)),
        stopover: true,
      }));

      directionsService.route({
        origin:      new google.maps.LatLng(parseFloat(origem.latitude), parseFloat(origem.longitude)),
        destination: new google.maps.LatLng(parseFloat(destino.latitude), parseFloat(destino.longitude)),
        waypoints:   paradas,
        travelMode:  google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      }, (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
        } else {
          // Fallback: só ajusta bounds sem rota
          map.fitBounds(bounds);
        }
      });
    } else {
      // 1 local apenas
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    }
  }

  // Inicializa Google Maps Autocomplete
  window.initMapsAtividades = function () {
    const input = document.getElementById("buscaLocal");
    if (!input || !window.google) return;

    autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["place_id", "name", "formatted_address", "geometry", "types"],
      language: "pt-BR",
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.place_id) return;

      localSelecionado = {
        placeId:  place.place_id,
        nome:     place.name,
        endereco: place.formatted_address,
        tipo:     (place.types || [])[0] || "establishment",
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
      };

      // Preenche preview
      const preview = document.getElementById("localPreview");
      if (preview) {
        preview.style.display = "";
        document.getElementById("previewNome").textContent     = localSelecionado.nome;
        document.getElementById("previewEndereco").textContent = localSelecionado.endereco;
      }
    });
  };

  // Salvar local no banco
  document.getElementById("btnSalvarLocal")?.addEventListener("click", async () => {
    if (!localSelecionado) {
      alert("Busque e selecione um local primeiro!");
      return;
    }

    const dia       = document.getElementById("localDia")?.value?.trim();
    const observ    = document.getElementById("localObs")?.value?.trim();
    const erroEl    = document.getElementById("erroLocal");

    if (!dia) {
      if (erroEl) { erroEl.textContent = "Informe o dia da atividade."; erroEl.style.display = ""; }
      return;
    }
    if (erroEl) erroEl.style.display = "none";

    const btn = document.getElementById("btnSalvarLocal");
    btn.disabled  = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

    try {
      // 1. Criar/buscar local no banco (LocalService faz upsert — sempre retorna 200)
      const resLocal = await fetch(`${URL_API_BASE}/locais`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          placeId:   localSelecionado.placeId,
          nome:      localSelecionado.nome,
          endereco:  localSelecionado.endereco,
          tipo:      localSelecionado.tipo,
          latitude:  localSelecionado.latitude,
          longitude: localSelecionado.longitude,
        }),
      });

      if (!resLocal.ok) throw new Error("Erro ao salvar local");
      const local = await resLocal.json();

      // 2. Vincular local ao roteiro
      const resVinculo = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          idLocal:     local.idLocal,
          dia:         parseInt(dia),
          ordem:       locaisSalvos.length + 1,
          observacoes: observ || null,
          status:      "PLANEJADO",
        }),
      });

      if (resVinculo.ok || resVinculo.status === 201) {
        const vinculo = await resVinculo.json();
        locaisSalvos.push(vinculo);
        renderLocais();
        atualizarMapaAtividades();
      } else if (resVinculo.status === 422 || resVinculo.status === 500) {
        // Local já vinculado ou erro de integridade — recarrega lista do banco
        const resList = await fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`);
        if (resList.ok) { locaisSalvos = await resList.json(); renderLocais(); atualizarMapaAtividades(); }
      } else {
        const erroEl = document.getElementById("erroLocal");
        if (erroEl) { erroEl.textContent = "Não foi possível adicionar o local. Tente novamente."; erroEl.style.display = ""; }
        return;
      }

      // Reset form
      document.getElementById("buscaLocal").value = "";
      document.getElementById("localDia").value   = "";
      document.getElementById("localObs").value   = "";
      document.getElementById("localHorario").value = "";
      document.getElementById("localPreview").style.display = "none";
      localSelecionado = null;

    } catch (err) {
      const erroEl = document.getElementById("erroLocal");
      if (erroEl) { erroEl.textContent = "Erro ao conectar ao servidor. Verifique se o backend está rodando."; erroEl.style.display = ""; }
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="bi bi-plus-lg me-1"></i>Adicionar ao Roteiro`;
    }
  });

  carregarLocais();
})();

// ================================================================
// DETALHES — mapa com pins dos locais
// ================================================================
(function iniciarMapsDetalhes() {
  if (document.body.getAttribute("data-pagina") !== "detalhes-roteiro") return;

  window.initMapsDetalhes = function () {
    // Inicializa autocomplete do modal de edição (mesmo carregamento da API)
    if (typeof initMapsDetalheEdit === "function") initMapsDetalheEdit();

    const mapEl = document.getElementById("mapaRoteiro");
    if (!mapEl || !window.google) return;

    const params    = new URLSearchParams(window.location.search);
    const roteiroId = params.get("id");
    if (!roteiroId) return;

    fetch(`${URL_API_BASE}/roteiros/${roteiroId}/locais`)
      .then(r => r.json())
      .then(locais => {
        if (!locais || locais.length === 0) {
          mapEl.style.display = "none";
          return;
        }

        // Centro inicial: média das coordenadas
        const lats = locais.filter(l => l.latitude).map(l => parseFloat(l.latitude));
        const lngs = locais.filter(l => l.longitude).map(l => parseFloat(l.longitude));

        if (lats.length === 0) { mapEl.style.display = "none"; return; }

        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        const map = new google.maps.Map(mapEl, {
          center:    { lat: centerLat, lng: centerLng },
          zoom:      13,
          mapTypeId: "roadmap",
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
          ],
        });

        const bounds   = new google.maps.LatLngBounds();
        const infoWindow = new google.maps.InfoWindow();

        locais
          .filter(l => l.latitude && l.longitude)
          .sort((a, b) => (a.dia || 0) - (b.dia || 0))
          .forEach((l, idx) => {
            const pos = { lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) };

            const marker = new google.maps.Marker({
              position: pos,
              map,
              title:  l.nome,
              label: {
                text:      String(l.dia || idx + 1),
                color:     "#fff",
                fontWeight: "bold",
                fontSize:  "13px",
              },
              icon: {
                path:        google.maps.SymbolPath.CIRCLE,
                scale:       18,
                fillColor:   "#f97316",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
            });

            marker.addListener("click", () => {
              infoWindow.setContent(`
                <div style="font-family:Inter,sans-serif;max-width:200px;">
                  <div style="font-weight:700;font-size:.95rem;">${escapeHtml(l.nome || "Local")}</div>
                  ${l.endereco ? `<div style="color:#64748b;font-size:.82rem;margin-top:4px;">${escapeHtml(l.endereco)}</div>` : ""}
                  ${l.observacoes ? `<div style="margin-top:6px;font-size:.85rem;">${escapeHtml(l.observacoes)}</div>` : ""}
                  <div style="color:#f97316;font-size:.8rem;margin-top:4px;">Dia ${l.dia || "?"}</div>
                </div>`);
              infoWindow.open(map, marker);
            });

            bounds.extend(pos);
          });

        if (lats.length > 1) {
          map.fitBounds(bounds);

          // Traça rota em sequência
          const locaisOrdenados = locais
            .filter(l => l.latitude && l.longitude)
            .sort((a, b) => (a.dia || 0) - (b.dia || 0));

          if (locaisOrdenados.length >= 2) {
            const directionsService  = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: {
                strokeColor:   "#f97316",
                strokeWeight:  4,
                strokeOpacity: 0.7,
              },
            });
            directionsRenderer.setMap(map);

            const origem  = locaisOrdenados[0];
            const destino = locaisOrdenados[locaisOrdenados.length - 1];
            const paradas = locaisOrdenados.slice(1, -1).map(l => ({
              location: new google.maps.LatLng(parseFloat(l.latitude), parseFloat(l.longitude)),
              stopover: true,
            }));

            directionsService.route({
              origin:            new google.maps.LatLng(parseFloat(origem.latitude), parseFloat(origem.longitude)),
              destination:       new google.maps.LatLng(parseFloat(destino.latitude), parseFloat(destino.longitude)),
              waypoints:         paradas,
              travelMode:        google.maps.TravelMode.DRIVING,
              optimizeWaypoints: false,
            }, (result, status) => {
              if (status === "OK") directionsRenderer.setDirections(result);
            });
          }
        }
      })
      .catch(() => { mapEl.style.display = "none"; });
  };
})();