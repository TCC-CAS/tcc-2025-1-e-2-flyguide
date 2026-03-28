/* FlyGuide Front - only UI behaviors (no backend) */
(function(){
  const qs = (s, el=document)=>el.querySelector(s);
  const qsa = (s, el=document)=>Array.from(el.querySelectorAll(s));

  // Mobile sidebar toggle
  const sidebar = qs(".sidebar");
  const btnOpen = qs("[data-sidebar-open]");
  const btnClose = qs("[data-sidebar-close]");
  if(btnOpen && sidebar){
    btnOpen.addEventListener("click", ()=> sidebar.classList.add("open"));
  }
  if(btnClose && sidebar){
    btnClose.addEventListener("click", ()=> sidebar.classList.remove("open"));
  }
  // close sidebar on backdrop click (simple)
  const mobileBackdrop = qs("[data-sidebar-backdrop]");
  if(mobileBackdrop && sidebar){
    mobileBackdrop.addEventListener("click", ()=> sidebar.classList.remove("open"));
  }

  // Like toggles (cards + details)
  qsa("[data-like]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      btn.classList.toggle("liked");
      const icon = qs("i", btn);
      if(icon){
        icon.classList.toggle("bi-heart");
        icon.classList.toggle("bi-heart-fill");
      }
      // Update optional counters
      const counterSel = btn.getAttribute("data-like-count-target");
      if(counterSel){
        const el = qs(counterSel);
        if(el){
          const cur = parseInt(el.textContent.trim(),10) || 0;
          const next = btn.classList.contains("liked") ? cur+1 : Math.max(0,cur-1);
          el.textContent = String(next);
        }
      }
    });
  });

  // Filter dropdown label sync
  const typeSelect = qs("#typeSelect");
  const typeLabel = qs("#typeLabel");
  if(typeSelect && typeLabel){
    typeSelect.addEventListener("change", ()=>{
      typeLabel.textContent = typeSelect.value;
    });
  }

  // Premium subscribe simulation
  const subscribeBtn = qs("[data-subscribe]");
  if(subscribeBtn){
    subscribeBtn.addEventListener("click", ()=>{
      if(subscribeBtn.disabled) return;
      subscribeBtn.disabled = true;
      const old = subscribeBtn.innerHTML;
      subscribeBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processando...`;
      setTimeout(()=>{
        subscribeBtn.disabled = false;
        subscribeBtn.innerHTML = old;
        alert("Bem-vindo ao Premium! Aproveite todos os recursos exclusivos.");
      }, 1200);
    });
  }

  // Help page: tabs + accordion
  const tabPills = qsa("[data-help-tab]");
  const helpSections = qsa("[data-help-section]");
  if(tabPills.length && helpSections.length){
    const activate = (key)=>{
      tabPills.forEach(t=>t.classList.toggle("active", t.getAttribute("data-help-tab")==key));
      helpSections.forEach(s=>{
        const show = (key==="all") || (s.getAttribute("data-help-section")==key);
        s.style.display = show ? "" : "none";
      });
    };
    tabPills.forEach(t=>{
      t.addEventListener("click", ()=> activate(t.getAttribute("data-help-tab")));
    });
    activate("all");
  }
  qsa(".faq-item .faq-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      btn.closest(".faq-item")?.classList.toggle("open");
    });
  });

  // =============================================================
  // Create itinerary (front-only)
  // - Etapa 1: informações básicas (salvas em localStorage)
  // - Etapa 2: atividades (lista dinâmica)
  // =============================================================

  const DRAFT_KEY = "flyguide.draft.itinerary";
  const ACT_KEY = "flyguide.draft.activities";

  const activities = [];
  const tips = []; // (mantido para compatibilidade; a UI de dicas pode ser removida/ativada depois)

  function safeParse(json){
    try{ return JSON.parse(json); }catch{ return null; }
  }

  function saveDraftFromForm(){
    const title = qs("#itTitle")?.value?.trim() || "";
    const destination = qs("#itDestination")?.value?.trim() || "";
    const country = qs("#itCountry")?.value?.trim() || "";
    const start = qs("#itStart")?.value?.trim() || "";
    const end = qs("#itEnd")?.value?.trim() || "";
    const type = qs("#itType")?.value?.trim() || "";
    const budget = qs("#itBudget")?.value?.trim() || "";
    const description = qs("#itDescription")?.value?.trim() || "";
    const coverUrl = qs("#itCoverUrl")?.value?.trim() || "";
    const isPublic = !!qs("#itPublic")?.checked;

    const draft = { title, destination, country, start, end, type, budget, description, coverUrl, isPublic };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return draft;
  }

  function hydrateFormFromDraft(){
    const draft = safeParse(localStorage.getItem(DRAFT_KEY));
    if(!draft) return;

    const setVal = (sel, val)=>{ const el = qs(sel); if(el && typeof val === "string") el.value = val; };
    setVal("#itTitle", draft.title || "");
    setVal("#itDestination", draft.destination || "");
    setVal("#itCountry", draft.country || "");
    setVal("#itStart", draft.start || "");
    setVal("#itEnd", draft.end || "");
    if(qs("#itType") && draft.type) qs("#itType").value = draft.type;
    setVal("#itBudget", draft.budget || "");
    setVal("#itDescription", draft.description || "");
    setVal("#itCoverUrl", draft.coverUrl || "");
    if(qs("#itPublic")) qs("#itPublic").checked = !!draft.isPublic;
  }

  function loadActivities(){
    const data = safeParse(localStorage.getItem(ACT_KEY));
    if(Array.isArray(data)){
      activities.splice(0, activities.length, ...data);
    }
  }

  function saveActivities(){
    localStorage.setItem(ACT_KEY, JSON.stringify(activities));
  }

  function clearDraft(){
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(ACT_KEY);
  }

  // Etapa 1: ao clicar em "Avançar", salvar rascunho
  const btnSaveDraft = qs("[data-save-draft]");
  if(btnSaveDraft){
    btnSaveDraft.addEventListener("click", ()=>{
      saveDraftFromForm();
    });
    // Se já existe rascunho, preencher o formulário automaticamente
    hydrateFormFromDraft();
  }

  // Etapa 2: mostrar um resumo do rascunho (se existir)
  const draftSummary = qs("#draftSummary");
  if(draftSummary){
    const d = safeParse(localStorage.getItem(DRAFT_KEY));
    if(d){
      const title = d.title ? `<span class="pill"><i class="bi bi-card-text"></i>${escapeHtml(d.title)}</span>` : "";
      const dest = d.destination ? `<span class="pill"><i class="bi bi-geo-alt"></i>${escapeHtml(d.destination)}</span>` : "";
      const dates = (d.start || d.end) ? `<span class="pill"><i class="bi bi-calendar-event"></i>${escapeHtml((d.start||"?") + " → " + (d.end||"?"))}</span>` : "";
      draftSummary.innerHTML = `${title}${dest}${dates}`;
      draftSummary.style.display = "inline-flex";
    }
    // carrega atividades persistidas
    loadActivities();
  }

  function renderList(containerId, items, kind){
    const box = qs(containerId);
    if(!box) return;
    const list = qs("[data-list]", box);
    const empty = qs("[data-empty]", box);
    if(!list || !empty) return;

    if(items.length===0){
      list.innerHTML = "";
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";
    list.innerHTML = items.map((it, idx)=>{
      if(kind==="activity"){
        return `
          <div class="day-item bg-white border" style="background:#fff; border-color:#eef2f7 !important;">
            <div class="day-bubble" style="background:#f97316">${it.dia}</div>
            <div class="day-main">
              <div class="topline">
                <div class="name">${escapeHtml(it.titulo)}</div>
                <div class="time-pill"><i class="bi bi-clock"></i>${escapeHtml(it.hora||"--:--")}</div>
              </div>
              <div class="small text-secondary mt-1">${escapeHtml(it.descricao||"")}</div>
              ${it.custo ? `<div class="costline"><i class="bi bi-coin"></i>Custo: R$ ${escapeHtml(it.custo)}</div>` : ``}
            </div>
            <button class="btn btn-sm btn-outline-danger ms-2" data-remove-activity="${idx}" title="Remover"><i class="bi bi-trash"></i></button>
          </div>
        `;
      }
      // tip
      return `
        <div class="tip-item bg-white border" style="background:#fff; border-color:#eef2f7 !important;">
          <i class="bi bi-lightbulb-fill"></i>
          <div class="flex-grow-1">${escapeHtml(it.texto)}</div>
          <button class="btn btn-sm btn-outline-danger ms-2" data-remove-tip="${idx}" title="Remover"><i class="bi bi-trash"></i></button>
        </div>
      `;
    }).join("");

    // bind remove
    qsa("[data-remove-activity]", list).forEach(b=>{
      b.addEventListener("click", ()=>{
        const i = parseInt(b.getAttribute("data-remove-activity"),10);
        activities.splice(i,1);
        saveActivities();
        renderList("#boxActivities", activities, "activity");
      });
    });
    qsa("[data-remove-tip]", list).forEach(b=>{
      b.addEventListener("click", ()=>{
        const i = parseInt(b.getAttribute("data-remove-tip"),10);
        tips.splice(i,1);
        renderList("#boxTips", tips, "tip");
      });
    });
  }

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // Modals
  const btnAddAct = qs("[data-add-activity]");
  const btnAddTip = qs("[data-add-tip]");
  const modalActEl = qs("#modalActivity");
  const modalTipEl = qs("#modalTip");
  const modalAct = modalActEl ? new bootstrap.Modal(modalActEl) : null;
  const modalTip = modalTipEl ? new bootstrap.Modal(modalTipEl) : null;

  if(btnAddAct && modalAct){
    btnAddAct.addEventListener("click", ()=> modalAct.show());
  }
  if(btnAddTip && modalTip){
    btnAddTip.addEventListener("click", ()=> modalTip.show());
  }

  const saveAct = qs("[data-save-activity]");
  if(saveAct && modalActEl){
    saveAct.addEventListener("click", ()=>{
      const dia = qs("#actDay")?.value?.trim();
      const titulo = qs("#actTitle")?.value?.trim();
      const hora = qs("#actTime")?.value?.trim();
      const descricao = qs("#actDesc")?.value?.trim();
      const custo = qs("#actCost")?.value?.trim();
      if(!dia || !titulo){
        qs("#actError").style.display = "";
        return;
      }
      qs("#actError").style.display = "none";
      activities.push({dia, titulo, hora, descricao, custo});
      saveActivities();
      // reset
      ["#actDay","#actTitle","#actTime","#actDesc","#actCost"].forEach(id=>{ const el=qs(id); if(el) el.value=""; });
      modalAct.hide();
      renderList("#boxActivities", activities, "activity");
    });
  }

  // Botão final: Criar Roteiro (simulação front-only)
  const btnCreate = qs("[data-create-itinerary]");
  if(btnCreate){
    btnCreate.addEventListener("click", ()=>{
      const draft = safeParse(localStorage.getItem(DRAFT_KEY)) || {};
      const payload = {
        ...draft,
        activities: activities
      };
      console.log("[FlyGuide] Payload (simulação):", payload);
      alert("Roteiro criado (simulação)!\n\nAbra o console para ver o JSON.");
      clearDraft();
      // opcional: redireciona para Meus Roteiros
      // window.location.href = "meus-roteiros.html";
    });
  }

  const saveTip = qs("[data-save-tip]");
  if(saveTip && modalTipEl){
    saveTip.addEventListener("click", ()=>{
      const texto = qs("#tipText")?.value?.trim();
      if(!texto){
        qs("#tipError").style.display = "";
        return;
      }
      qs("#tipError").style.display = "none";
      tips.push({texto});
      const el=qs("#tipText"); if(el) el.value="";
      modalTip.hide();
      renderList("#boxTips", tips, "tip");
    });
  }

  // initial renders if page has create boxes
  renderList("#boxActivities", activities, "activity");
  renderList("#boxTips", tips, "tip");
})();

