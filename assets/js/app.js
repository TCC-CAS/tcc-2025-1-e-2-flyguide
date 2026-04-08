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

  // ================================================================
  // SIDEBAR: busca dados do usuário no backend e preenche dinamicamente
  // ================================================================
  (function preencherSidebarUsuario() {
    const SESSION_KEY  = "flyguide.userId";
    const URL_API_BASE = "http://localhost:8080";
    const paginaAtual  = document.body.getAttribute("data-pagina");

    const userId    = sessionStorage.getItem(SESSION_KEY);
    const profileEl = qs(".profile");
    if (!profileEl) return;

    // Clique no perfil leva para perfil.html (exceto se já estiver lá)
    if (paginaAtual !== "perfil") {
      profileEl.style.cursor = "pointer";
      profileEl.addEventListener("click", () => { window.location.href = "perfil.html"; });
    }

    // Sem sessão: redireciona para login (exceto na própria página de login/cadastro)
    if (!userId) {
      if (paginaAtual !== "login" && paginaAtual !== "cadastro") {
        window.location.href = "login.html";
      }
      return;
    }

    // Busca dados da sidebar — sem redirecionar em caso de erro
    fetch(`${URL_API_BASE}/users/search-completo/${userId}`)
      .then(r => r.json())
      .then(dados => {
        const pf = dados.pessoaFisica;
        const pj = dados.pessoaJuridica;
        let nome = "";
        if (pf) nome = `${pf.primeiroNome || ""} ${pf.ultimoNome || ""}`.trim();
        else if (pj) nome = pj.nomeFantasia || pj.razaoSocial || "";
        if (!nome) nome = dados.usuario?.email || "Usuário";

        const email   = dados.usuario?.email || "";
        const inicial = nome.charAt(0).toUpperCase();

        // Na página de perfil, atualiza pelos IDs específicos
        if (paginaAtual === "perfil") {
          const av = document.getElementById("sidebarAvatar");
          const nm = document.getElementById("sidebarNome");
          const em = document.getElementById("sidebarEmail");
          if (av) av.textContent = inicial;
          if (nm) nm.textContent = nome;
          if (em) em.textContent = email;
        } else {
          // Nas outras páginas substitui o innerHTML do .profile
          profileEl.innerHTML = `
            <div class="avatar">${inicial}</div>
            <div>
              <div class="name">${nome}</div>
              <div class="email">${email}</div>
            </div>
          `;
        }
      })
      .catch(() => {
        // Falha silenciosa na sidebar — não redireciona
        profileEl.innerHTML = `<div class="avatar">?</div><div><div class="name">Usuário</div></div>`;
      });
  })();

  // ================================================================
  // PERFIL: preenche e edita dados na página perfil.html
  // ================================================================
  (function iniciarPaginaPerfil() {
    if (document.body.getAttribute("data-pagina") !== "perfil") return;

    const SESSION_KEY  = "flyguide.userId";
    const URL_API_BASE = "http://localhost:8080";

    const userId = sessionStorage.getItem(SESSION_KEY);
    if (!userId) { window.location.href = "login.html"; return; }

    let dadosAtuais = null;

    function formatarData(dataStr) {
      if (!dataStr) return "—";
      const d = new Date(dataStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    }

    function mostrarAlerta(tipo, msg) {
      const el = document.getElementById("perfilAlerta");
      if (!el) return;
      el.className = `alert alert-${tipo} mt-3`;
      el.textContent = msg;
      el.style.display = "block";
      setTimeout(() => { el.style.display = "none"; }, 4000);
    }

    function linha(label, valor, icon, nota) {
      return `
        <div class="perfil-field">
          <label>${icon ? `<i class="${icon} me-1"></i>` : ""}${label}</label>
          <div class="valor">${valor || "—"}</div>
          ${nota ? `<div class="valor-muted">${nota}</div>` : ""}
        </div>`;
    }

    function inputEl(id, label, valor, icon, desabilitado) {
      return `
        <div class="perfil-field">
          <label for="${id}">${icon ? `<i class="${icon} me-1"></i>` : ""}${label}</label>
          <input id="${id}" type="text" class="form-control" value="${valor || ""}" ${desabilitado ? "disabled" : ""}>
        </div>`;
    }

    function renderVisualizacao(dados) {
      const pf  = dados.pessoaFisica;
      const pj  = dados.pessoaJuridica;
      const usr = dados.usuario;
      const grid = document.getElementById("perfilGrid");
      if (!grid) return;

      if (pf) {
        grid.innerHTML =
          linha("Nome Completo", `${pf.primeiroNome || ""} ${pf.ultimoNome || ""}`.trim(), "bi bi-person") +
          linha("E-mail", usr?.email, "bi bi-envelope", "O e-mail não pode ser alterado") +
          linha("CEP", usr?.cep, "bi bi-geo-alt") +
          linha("Endereço", usr?.endereco, "bi bi-house") +
          linha("Cidade", usr?.cidade, "bi bi-building") +
          linha("País", usr?.pais, "bi bi-globe") +
          linha("Membro desde", formatarData(usr?.dataCadastro), "bi bi-calendar");
      } else if (pj) {
        grid.innerHTML =
          linha("Razão Social", pj.razaoSocial, "bi bi-building") +
          linha("Nome Fantasia", pj.nomeFantasia, "bi bi-tag") +
          linha("E-mail", usr?.email, "bi bi-envelope", "O e-mail não pode ser alterado") +
          linha("CEP", usr?.cep, "bi bi-geo-alt") +
          linha("Endereço", usr?.endereco, "bi bi-house") +
          linha("Cidade", usr?.cidade, "bi bi-building") +
          linha("País", usr?.pais, "bi bi-globe") +
          linha("Membro desde", formatarData(usr?.dataCadastro), "bi bi-calendar");
      }
    }

    function renderEdicao(dados) {
      const pf  = dados.pessoaFisica;
      const pj  = dados.pessoaJuridica;
      const usr = dados.usuario;
      const grid = document.getElementById("perfilGrid");
      if (!grid) return;

      if (pf) {
        grid.innerHTML =
          inputEl("editPrimeiroNome", "Primeiro Nome", pf.primeiroNome, "bi bi-person") +
          inputEl("editUltimoNome",   "Sobrenome",     pf.ultimoNome,   "bi bi-person") +
          inputEl("editEmail",        "E-mail",        usr?.email,      "bi bi-envelope", true) +
          inputEl("editCep",          "CEP",           usr?.cep,        "bi bi-geo-alt") +
          inputEl("editEndereco",     "Endereço",      usr?.endereco,   "bi bi-house") +
          inputEl("editCidade",       "Cidade",        usr?.cidade,     "bi bi-building") +
          inputEl("editPais",         "País",          usr?.pais,       "bi bi-globe");
      } else if (pj) {
        grid.innerHTML =
          inputEl("editRazaoSocial",  "Razão Social",  pj.razaoSocial,  "bi bi-building") +
          inputEl("editNomeFantasia", "Nome Fantasia", pj.nomeFantasia, "bi bi-tag") +
          inputEl("editEmail",        "E-mail",        usr?.email,      "bi bi-envelope", true) +
          inputEl("editCep",          "CEP",           usr?.cep,        "bi bi-geo-alt") +
          inputEl("editEndereco",     "Endereço",      usr?.endereco,   "bi bi-house") +
          inputEl("editCidade",       "Cidade",        usr?.cidade,     "bi bi-building") +
          inputEl("editPais",         "País",          usr?.pais,       "bi bi-globe");
      }
    }

    function ativarEdicao() {
      renderEdicao(dadosAtuais);
      document.getElementById("editActions")?.classList.add("visivel");
      document.getElementById("btnEditar").style.display = "none";
    }

    function cancelarEdicao() {
      renderVisualizacao(dadosAtuais);
      document.getElementById("editActions")?.classList.remove("visivel");
      document.getElementById("btnEditar").style.display = "";
    }

    function atualizarNome(nome, email) {
      const inicial = nome.charAt(0).toUpperCase();
      const av = document.getElementById("sidebarAvatar");
      const nm = document.getElementById("sidebarNome");
      const em = document.getElementById("sidebarEmail");
      if (av) av.textContent = inicial;
      if (nm) nm.textContent = nome;
      if (em) em.textContent = email;
      const pa = document.getElementById("perfilAvatar");
      const pn = document.getElementById("perfilNome");
      if (pa) pa.textContent = inicial;
      if (pn) pn.textContent = nome;
    }

    async function salvarEdicao() {
      const btn = document.getElementById("btnSalvar");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Salvando...`;

      const val = (id) => document.getElementById(id)?.value?.trim() || "";
      const pf  = dadosAtuais.pessoaFisica;
      const pj  = dadosAtuais.pessoaJuridica;
      const usr = dadosAtuais.usuario;

      let payload = {}, endpoint = "";

      if (pf) {
        payload  = { primeiroNome: val("editPrimeiroNome"), ultimoNome: val("editUltimoNome"), cep: val("editCep").replace(/\D/g,""), endereco: val("editEndereco"), cidade: val("editCidade"), pais: val("editPais") };
        endpoint = `${URL_API_BASE}/users/update/pf/${userId}`;
      } else if (pj) {
        payload  = { razaoSocial: val("editRazaoSocial"), nomeFantasia: val("editNomeFantasia"), cep: val("editCep").replace(/\D/g,""), endereco: val("editEndereco"), cidade: val("editCidade"), pais: val("editPais") };
        endpoint = `${URL_API_BASE}/users/update/pj/${userId}`;
      }

      try {
        const r = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

        if (r.ok || r.status === 204) {
          const res = await fetch(`${URL_API_BASE}/users/search-completo/${userId}`);
          dadosAtuais = await res.json();
          cancelarEdicao();
          mostrarAlerta("success", "Dados atualizados com sucesso!");

          const novoPf = dadosAtuais.pessoaFisica;
          const novoPj = dadosAtuais.pessoaJuridica;
          let novoNome = "";
          if (novoPf) novoNome = `${novoPf.primeiroNome || ""} ${novoPf.ultimoNome || ""}`.trim();
          else if (novoPj) novoNome = novoPj.nomeFantasia || novoPj.razaoSocial || "";
          atualizarNome(novoNome || usr?.email, usr?.email);
        } else {
          mostrarAlerta("danger", "Não foi possível salvar. Tente novamente.");
        }
      } catch {
        mostrarAlerta("danger", "Erro ao conectar ao servidor.");
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-lg"></i> Salvar alterações`;
      }
    }

    // Carrega dados iniciais
    fetch(`${URL_API_BASE}/users/search-completo/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(dados => {
        dadosAtuais = dados;
        const pf  = dados.pessoaFisica;
        const pj  = dados.pessoaJuridica;
        const usr = dados.usuario;

        let nomeExibicao = "";
        if (pf) nomeExibicao = `${pf.primeiroNome || ""} ${pf.ultimoNome || ""}`.trim();
        else if (pj) nomeExibicao = pj.nomeFantasia || pj.razaoSocial || "";
        if (!nomeExibicao) nomeExibicao = usr?.email || "Usuário";

        const tipoConta = usr?.tipoConta || "FREE";
        atualizarNome(nomeExibicao, usr?.email || "");

        // Badges
        const badgesEl = document.getElementById("perfilBadges");
        if (badgesEl) {
          badgesEl.innerHTML = tipoConta === "PREMIUM"
            ? `<span class="badge-tipo badge-premium">⭐ Premium</span>`
            : `<span class="badge-tipo badge-free">FREE</span>`;
          if (pf) badgesEl.innerHTML += `<span class="badge-tipo badge-pf"><i class="bi bi-person"></i> Pessoa Física</span>`;
          if (pj) badgesEl.innerHTML += `<span class="badge-tipo badge-pj"><i class="bi bi-building"></i> Pessoa Jurídica</span>`;
        }

        renderVisualizacao(dados);

        document.getElementById("btnEditar")?.addEventListener("click", ativarEdicao);
        document.getElementById("btnCancelar")?.addEventListener("click", cancelarEdicao);
        document.getElementById("btnSalvar")?.addEventListener("click", salvarEdicao);
      })
      .catch(() => {
        // Só redireciona para login se falhar ao carregar a página de perfil
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "login.html";
      });

    // Sair
    document.getElementById("btnSair")?.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "login.html";
    });

    // Excluir conta
    const modal = new bootstrap.Modal(document.getElementById("modalConfirmar"));
    document.getElementById("btnExcluirConta")?.addEventListener("click", () => modal.show());
    document.getElementById("btnConfirmarExclusao")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnConfirmarExclusao");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Excluindo...`;
      try {
        const r = await fetch(`${URL_API_BASE}/users/delete/${userId}`, { method: "DELETE" });
        if (r.ok || r.status === 204) {
          sessionStorage.removeItem(SESSION_KEY);
          alert("Conta excluída com sucesso.");
          window.location.href = "login.html";
        } else {
          alert("Não foi possível excluir a conta.");
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-trash me-1"></i> Sim, excluir minha conta`;
        }
      } catch {
        alert("Erro ao conectar ao servidor.");
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-trash me-1"></i> Sim, excluir minha conta`;
      }
    });
  })();

  // initial renders if page has create boxes
  renderList("#boxActivities", activities, "activity");
  renderList("#boxTips", tips, "tip");
})();