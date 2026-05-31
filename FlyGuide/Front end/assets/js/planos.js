/* ================================================================
   FlyGuide - planos.js
   Lógica de planos e assinatura Premium
   Integra com: POST /assinatura/assinar/{userId}
                GET  /assinatura/status/{userId}
                DELETE /assinatura/cancelar/{userId}
================================================================ */

(function () {
  if (document.body.getAttribute("data-pagina") !== "planos") return;

  const URL_API = "https://tcc-2025-1-e-2-flyguide-production.up.railway.app";
  const userId  = getUserIdFromToken();
  if (!userId) return;

  let _modalPagamento = null;

  // ── Popular select de ano ────────────────────────────────────────
  (function popularAnos() {
    const el = document.getElementById("cardAno");
    if (!el) return;
    const ano = new Date().getFullYear();
    for (let y = ano; y <= ano + 10; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      el.appendChild(opt);
    }
  })();

  // ── Entrada ──────────────────────────────────────────────────────
  async function carregarEstado() {
    _mostrarLoading(true);
    try {
      const resUser = await authFetch(`${URL_API}/users/search-completo/${userId}`);
      if (!resUser.ok) throw new Error();
      const dados     = await resUser.json();
      const usuario   = dados.usuario || {};
      const isPJ      = !!dados.pessoaJuridica;
      const tipoConta = usuario.tipoConta || "FREE";

      let assinatura = null;
      try {
        const resAs = await authFetch(`${URL_API}/assinatura/status/${userId}`);
        if (resAs.ok) assinatura = await resAs.json();
      } catch (_) {}

      _renderTudo(tipoConta, isPJ, assinatura, usuario);
    } catch (_) {
      _mostrarErro("Não foi possível carregar os dados do seu plano.");
    } finally {
      _mostrarLoading(false);
    }
  }

  // ── Render principal ─────────────────────────────────────────────
  function _renderTudo(tipoConta, isPJ, assinatura, usuario) {
    _renderPillCard(tipoConta, isPJ, usuario);
    _renderPainelStatus(tipoConta, isPJ, assinatura, usuario);
    _renderCartaoFree(tipoConta, isPJ);
    _renderCartaoPremium(tipoConta, isPJ, assinatura, usuario);
    _renderBannerCta(tipoConta, isPJ);
  }

  // ── Pill card (topo) ─────────────────────────────────────────────
  function _renderPillCard(tipoConta, isPJ, usuario) {
    const el = document.getElementById("pillCard");
    if (!el) return;

    if (tipoConta === "PREMIUM") {
      el.innerHTML = `
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <div class="ico"><i class="bi bi-star-fill" style="color:#f97316;"></i></div>
          <div>
            <div class="fw-bold" style="font-size:1.2rem;">Plano Premium Ativo</div>
            <div class="small-muted">Você tem acesso completo a todos os recursos exclusivos</div>
          </div>
          <span style="margin-left:auto;padding:6px 16px;border-radius:999px;background:#f0fdf4;color:#15803d;font-size:.85rem;font-weight:700;border:1px solid #86efac;flex-shrink:0;">
            <i class="bi bi-check-circle-fill me-1"></i>Premium
          </span>
        </div>`;
      return;
    }

    if (tipoConta === "TRIAL") {
      const dias = _diasRestantesTrial(usuario.dataExpiracaoTrial);
      el.innerHTML = `
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <div class="ico"><i class="bi bi-hourglass-split" style="color:#f97316;"></i></div>
          <div>
            <div class="fw-bold" style="font-size:1.2rem;">Trial Gratuito em Andamento</div>
            <div class="small-muted">${dias > 0
              ? `${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""} · expira em ${_fmtData(usuario.dataExpiracaoTrial)}`
              : "Expira hoje — assine para não perder o acesso"}</div>
          </div>
          <span style="margin-left:auto;padding:6px 16px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:.85rem;font-weight:700;border:1px solid #fed7aa;flex-shrink:0;">
            <i class="bi bi-hourglass me-1"></i>Trial
          </span>
        </div>`;
      return;
    }

    const subtitulo = isPJ
      ? "Seu trial expirou — assine o Premium para recuperar todos os recursos"
      : "Faça upgrade para desbloquear recursos exclusivos";
    el.innerHTML = `
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div class="ico"><i class="bi bi-star-fill" style="color:#64748b;"></i></div>
        <div>
          <div class="fw-bold" style="font-size:1.2rem;">Plano Gratuito</div>
          <div class="small-muted">${subtitulo}</div>
        </div>
        <span style="margin-left:auto;padding:6px 16px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:.85rem;font-weight:700;border:1px solid #e2e8f0;flex-shrink:0;">
          FREE
        </span>
      </div>`;
  }

  // ── Painel de status (banner contextual) ─────────────────────────
  function _renderPainelStatus(tipoConta, isPJ, assinatura, usuario) {
    const el = document.getElementById("painelStatus");
    if (!el) return;

    if (tipoConta === "TRIAL") {
      const dias    = _diasRestantesTrial(usuario.dataExpiracaoTrial);
      const urgente = dias <= 7;
      el.innerHTML = `
        <div style="background:${urgente ? "#fef2f2" : "#fff7ed"};border:1px solid ${urgente ? "#fecaca" : "#fed7aa"};border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:24px;">
          <i class="bi bi-${urgente ? "exclamation-triangle-fill" : "hourglass-split"}" style="color:${urgente ? "#dc2626" : "#f97316"};font-size:1.4rem;flex-shrink:0;"></i>
          <div style="flex:1;min-width:180px;">
            <div style="font-weight:800;color:${urgente ? "#991b1b" : "#92400e"};">Trial Gratuito — ${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}</div>
            <div style="font-size:.85rem;color:${urgente ? "#b91c1c" : "#78350f"};margin-top:3px;">
              ${urgente
                ? "Seu trial está acabando! Assine agora para não perder o acesso ao Premium."
                : "Você está no período de avaliação gratuita de 30 dias. Assine antes do fim para manter o acesso."}
            </div>
          </div>
          <div style="font-size:.82rem;font-weight:600;color:${urgente ? "#b91c1c" : "#b45309"};white-space:nowrap;">
            Expira: ${_fmtData(usuario.dataExpiracaoTrial)}
          </div>
        </div>`;
      el.style.display = "";
      return;
    }

    if (assinatura?.status === "OVERDUE") {
      el.innerHTML = `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:24px;">
          <i class="bi bi-exclamation-triangle-fill" style="color:#dc2626;font-size:1.4rem;flex-shrink:0;"></i>
          <div style="flex:1;min-width:180px;">
            <div style="font-weight:800;color:#991b1b;">Pagamento Vencido</div>
            <div style="font-size:.85rem;color:#b91c1c;margin-top:3px;">Seu plano Premium foi suspenso por falta de pagamento. Reative abaixo para recuperar o acesso.</div>
          </div>
        </div>`;
      el.style.display = "";
      return;
    }

    if (tipoConta === "PREMIUM" && assinatura?.status === "ACTIVE") {
      const bandeira = assinatura.cartaoBandeira
        ? `<strong>${assinatura.cartaoBandeira}</strong> ····${assinatura.cartaoUltimos4} · `
        : "";
      el.innerHTML = `
        <div style="
          background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);
          border:1px solid #bbf7d0;border-left:4px solid #16a34a;
          border-radius:16px;padding:20px 24px;
          display:flex;align-items:center;gap:16px;flex-wrap:wrap;
          margin-bottom:24px;box-shadow:0 4px 20px rgba(22,163,74,.1);
          position:relative;overflow:hidden;">
          <div style="position:absolute;right:0;top:0;width:160px;height:160px;
               background:radial-gradient(circle at top right,rgba(22,163,74,.09) 0%,transparent 65%);
               pointer-events:none;"></div>
          <div style="width:52px;height:52px;border-radius:14px;flex-shrink:0;
               background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);
               display:grid;place-items:center;
               box-shadow:0 6px 18px rgba(22,163,74,.35);">
            <i class="bi bi-patch-check-fill" style="color:#fff;font-size:1.3rem;"></i>
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-weight:800;font-size:1rem;color:#14532d;">Assinatura Premium</span>
              <span style="font-size:.68rem;font-weight:800;letter-spacing:.8px;
                   background:#16a34a;color:#fff;padding:2px 10px;border-radius:999px;">ATIVA</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:.82rem;color:#166534;">
              ${assinatura.cartaoBandeira ? `
                <span style="display:flex;align-items:center;gap:5px;">
                  <i class="bi bi-credit-card-fill"></i>
                  <strong>${assinatura.cartaoBandeira}</strong>&nbsp;····${assinatura.cartaoUltimos4}
                </span>` : ""}
              <span style="display:flex;align-items:center;gap:5px;">
                <i class="bi bi-calendar-check"></i>
                Assinante desde ${_fmtData(assinatura.dataInicio)}
              </span>
              <span style="display:flex;align-items:center;gap:5px;">
                <i class="bi bi-arrow-clockwise"></i>
                Próxima cobrança:&nbsp;<strong style="color:#15803d;">${_fmtData(assinatura.proximoVencimento)}</strong>
              </span>
            </div>
          </div>
          <button id="btnCancelarAssinatura" class="btn btn-sm flex-shrink-0"
                  style="border:1.5px solid #fca5a5;color:#dc2626;background:transparent;
                         border-radius:10px;font-size:.82rem;font-weight:600;
                         padding:7px 16px;white-space:nowrap;">
            <i class="bi bi-x-circle me-1"></i>Cancelar assinatura
          </button>
        </div>`;
      el.style.display = "";
      document.getElementById("btnCancelarAssinatura")?.addEventListener("click", _cancelarAssinatura);
      return;
    }

    el.style.display = "none";
  }

  // ── Cartão Plano Free ────────────────────────────────────────────
  function _renderCartaoFree(tipoConta, isPJ) {
    const el = document.getElementById("freePlanFooter");
    if (!el) return;

    if (tipoConta === "PREMIUM") {
      el.innerHTML = `<div class="text-center mt-4 text-secondary" style="font-size:.9rem;"><i class="bi bi-check-circle me-1" style="color:#16a34a;"></i>Incluído no seu plano Premium</div>`;
    } else if (tipoConta === "TRIAL") {
      el.innerHTML = `<div class="text-center mt-4 text-secondary" style="font-size:.9rem;">Disponível se não renovar o Premium</div>`;
    } else if (isPJ) {
      el.innerHTML = `
        <div class="text-center mt-4" style="background:#fef2f2;border-radius:10px;padding:10px;border:1px solid #fecaca;">
          <div style="font-size:.85rem;font-weight:700;color:#991b1b;"><i class="bi bi-exclamation-triangle me-1"></i>Acesso limitado</div>
          <div style="font-size:.78rem;color:#b91c1c;margin-top:2px;">Trial expirado — assine o Premium para continuar</div>
        </div>`;
    } else {
      el.innerHTML = `<div class="text-center mt-4 fw-bold text-secondary">Plano atual</div>`;
    }
  }

  // ── Cartão Plano Premium ─────────────────────────────────────────
  function _renderCartaoPremium(tipoConta, isPJ, assinatura, usuario) {
    const el = document.getElementById("premiumPlanFooter");
    if (!el) return;

    if (tipoConta === "PREMIUM") {
      el.innerHTML = `
        <div class="text-center mt-4">
          <span style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:12px;background:#f0fdf4;border:1px solid #86efac;color:#15803d;font-weight:800;font-size:.95rem;">
            <i class="bi bi-check-circle-fill"></i>Plano atual
          </span>
        </div>`;
      return;
    }

    if (tipoConta === "TRIAL") {
      const dias = _diasRestantesTrial(usuario?.dataExpiracaoTrial);
      el.innerHTML = `
        <button class="btn btn-primary-orange w-100 mt-4 fw-bold" id="btnAssinarPremium">
          <i class="bi bi-star me-2"></i>Assinar Agora — R$ 19,90/mês
        </button>
        <div style="font-size:.78rem;color:#64748b;text-align:center;margin-top:8px;">
          ${dias > 0 ? `Trial expira em ${dias} dia${dias !== 1 ? "s" : ""}` : "Trial expira hoje"} · Cancele quando quiser
        </div>`;
      document.getElementById("btnAssinarPremium")?.addEventListener("click", _iniciarAssinatura);
      return;
    }

    if (assinatura?.status === "OVERDUE" || assinatura?.status === "CANCELLED") {
      el.innerHTML = `
        <button class="btn btn-primary-orange w-100 mt-4 fw-bold" id="btnAssinarPremium">
          <i class="bi bi-arrow-repeat me-2"></i>Reativar Premium — R$ 19,90/mês
        </button>
        <div style="font-size:.78rem;color:#64748b;text-align:center;margin-top:8px;">Cancele quando quiser</div>`;
      document.getElementById("btnAssinarPremium")?.addEventListener("click", _iniciarAssinatura);
      return;
    }

    el.innerHTML = `
      <button class="btn btn-primary-orange w-100 mt-4 fw-bold" id="btnAssinarPremium">
        <i class="bi bi-star me-2"></i>${isPJ ? "Assinar Premium — R$ 19,90/mês" : "Fazer Upgrade — R$ 19,90/mês"}
      </button>
      <div style="font-size:.78rem;color:#64748b;text-align:center;margin-top:8px;">
        ${isPJ ? "Necessário para acesso completo" : "Cancele quando quiser"} · Pague com cartão de crédito
      </div>`;
    document.getElementById("btnAssinarPremium")?.addEventListener("click", _iniciarAssinatura);
  }

  // ── Banner CTA ──────────────────────────────────────────────────
  function _renderBannerCta(tipoConta, isPJ) {
    const el = document.getElementById("bannerCtaBtn");
    if (!el) return;

    if (tipoConta === "PREMIUM") {
      el.innerHTML = `<i class="bi bi-check-circle me-2"></i>Você já é Premium!`;
      el.disabled = true;
      el.style.opacity = "0.75";
      return;
    }

    el.innerHTML = `<i class="bi bi-star me-2"></i>${isPJ ? "Assinar Premium" : "Começar Agora"}`;
    el.disabled = false;
    el.style.opacity = "";
    el.onclick = () => {
      document.getElementById("premiumPlanFooter")
        ?.closest(".plan-card")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  }

  // ── Modal de pagamento ────────────────────────────────────────────
  function _getModal() {
    if (!_modalPagamento) {
      const el = document.getElementById("modalPagamento");
      if (el) _modalPagamento = new bootstrap.Modal(el);
    }
    return _modalPagamento;
  }

  function _limparModal() {
    ["cardNumero", "cardNome", "cardCvv"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const mesEl = document.getElementById("cardMes");
    const anoEl = document.getElementById("cardAno");
    if (mesEl) mesEl.selectedIndex = 0;
    if (anoEl) anoEl.selectedIndex = 0;
    const erroEl = document.getElementById("erroModalPagamento");
    if (erroEl) erroEl.style.display = "none";
    _atualizarBandeira("");
    const lista = document.getElementById("testCardsList");
    const icon  = document.getElementById("iconTestCards");
    if (lista) lista.style.display = "none";
    if (icon)  icon.className = "bi bi-chevron-down";
  }

  function _mostrarErroModal(msg) {
    const el = document.getElementById("erroModalPagamento");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "";
  }

  // ── Detecção de bandeira ──────────────────────────────────────────
  const ELO_PREFIXOS = ["4011","4312","4389","4514","4576","5041","5066","5067",
                         "6277","6362","6363","6504","6505","6516","6550"];

  function _detectarBandeira(numero) {
    const n = numero.replace(/\D/g, "");
    if (/^4[0-9]{12}$/.test(n) || /^4[0-9]{15}$/.test(n)) return "VISA";
    if (/^5[1-5][0-9]{14}$/.test(n)) return "MASTERCARD";
    if (/^2(2[2-9][1-9]|[3-6][0-9]{2}|7[01][0-9]|720)[0-9]{12}$/.test(n)) return "MASTERCARD";
    if (/^3[47][0-9]{13}$/.test(n)) return "AMEX";
    if (n.length >= 4 && ELO_PREFIXOS.includes(n.slice(0, 4))) return "ELO";
    if (/^606282[0-9]{10}$/.test(n)) return "HIPERCARD";
    return null;
  }

  function _atualizarBandeira(numero) {
    const el = document.getElementById("cardBandeira");
    if (!el) return;
    const bandeira = _detectarBandeira(numero);
    const mapa = {
      VISA:       { icon: "bi-credit-card-2-front", cor: "#1a1f71" },
      MASTERCARD: { icon: "bi-credit-card",          cor: "#eb001b" },
      AMEX:       { icon: "bi-credit-card-fill",     cor: "#007bc1" },
      ELO:        { icon: "bi-credit-card-2-back",   cor: "#d4a800" },
      HIPERCARD:  { icon: "bi-credit-card-2-back",   cor: "#b3131b" },
    };
    if (bandeira && mapa[bandeira]) {
      el.innerHTML = `<i class="bi ${mapa[bandeira].icon} me-1" style="color:${mapa[bandeira].cor};font-size:1.1rem;"></i><strong>${bandeira}</strong>`;
    } else {
      el.innerHTML = `<i class="bi bi-credit-card me-1 text-secondary"></i><span class="text-secondary" style="font-size:.85rem;">Bandeira</span>`;
    }
  }

  // ── Ações ────────────────────────────────────────────────────────
  function _iniciarAssinatura() {
    _limparModal();
    const modal = _getModal();
    if (modal) modal.show();
  }

  async function _processarPagamento() {
    const btn    = document.getElementById("btnConfirmarPagamento");
    const erroEl = document.getElementById("erroModalPagamento");

    const numeroRaw = (document.getElementById("cardNumero")?.value || "").replace(/\D/g, "");
    const nome      = (document.getElementById("cardNome")?.value || "").trim();
    const mes       = parseInt(document.getElementById("cardMes")?.value || "0", 10);
    const ano       = parseInt(document.getElementById("cardAno")?.value || "0", 10);
    const cvv       = (document.getElementById("cardCvv")?.value || "").trim();

    if (!numeroRaw || !nome || !mes || !ano || !cvv) {
      _mostrarErroModal("Preencha todos os campos do cartão.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processando...`;
    }
    if (erroEl) erroEl.style.display = "none";

    try {
      const res = await authFetch(`${URL_API}/assinatura/assinar/${userId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          numeroCartao: numeroRaw,
          nomeTitular:  nome,
          mesExpiracao: mes,
          anoExpiracao: ano,
          cvv:          cvv,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        _mostrarErroModal(data.message || "Pagamento recusado. Verifique os dados e tente novamente.");
        return;
      }

      const modal = _getModal();
      if (modal) modal.hide();
      await carregarEstado();

    } catch (_) {
      _mostrarErroModal("Erro ao conectar ao servidor. Verifique sua conexão.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-lock-fill me-2"></i>Pagar R$ 19,90`;
      }
    }
  }

  function _cancelarAssinatura() {
    const modalEl = document.getElementById("modalCancelarAssinatura");
    if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  async function _executarCancelamento() {
    const modalEl = document.getElementById("modalCancelarAssinatura");
    const modal   = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
    const btnConf = document.getElementById("btnConfirmarCancelar");
    const btn     = document.getElementById("btnCancelarAssinatura");

    if (btnConf) { btnConf.disabled = true; btnConf.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Cancelando...`; }

    try {
      const res = await authFetch(`${URL_API}/assinatura/cancelar/${userId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        if (modal) modal.hide();
        await carregarEstado();
      } else {
        if (modal) modal.hide();
        _mostrarErro("Não foi possível cancelar a assinatura. Tente novamente.");
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="bi bi-x-circle me-1"></i>Cancelar assinatura`; }
      }
    } catch (_) {
      if (modal) modal.hide();
      _mostrarErro("Erro ao conectar ao servidor.");
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="bi bi-x-circle me-1"></i>Cancelar assinatura`; }
    } finally {
      if (btnConf) { btnConf.disabled = false; btnConf.innerHTML = `<i class="bi bi-x-circle me-1"></i>Sim, cancelar`; }
    }
  }

  // ── Event listeners dos modais ───────────────────────────────────
  document.getElementById("btnConfirmarPagamento")
    ?.addEventListener("click", _processarPagamento);

  document.getElementById("btnConfirmarCancelar")
    ?.addEventListener("click", _executarCancelamento);

  document.getElementById("cardNumero")?.addEventListener("input", function () {
    const digits = this.value.replace(/\D/g, "").slice(0, 16);
    this.value   = digits.match(/.{1,4}/g)?.join(" ") || digits;
    _atualizarBandeira(digits);
    const cvvEl = document.getElementById("cardCvv");
    if (cvvEl) cvvEl.maxLength = _detectarBandeira(digits) === "AMEX" ? 4 : 3;
  });

  document.getElementById("cardNome")?.addEventListener("input", function () {
    this.value = this.value.toUpperCase();
  });

  document.getElementById("cardCvv")?.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
  });

  document.getElementById("btnToggleTestCards")?.addEventListener("click", function () {
    const lista = document.getElementById("testCardsList");
    const icon  = document.getElementById("iconTestCards");
    if (!lista) return;
    const aberto = lista.style.display !== "none";
    lista.style.display = aberto ? "none" : "";
    if (icon) icon.className = aberto ? "bi bi-chevron-down" : "bi bi-chevron-up";
  });

  document.getElementById("modalPagamento")
    ?.addEventListener("hidden.bs.modal", _limparModal);

  // ── Helpers ───────────────────────────────────────────────────────
  function _diasRestantesTrial(dataExpiracao) {
    if (!dataExpiracao) return 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const exp  = new Date(dataExpiracao + "T00:00:00");
    const diff = Math.ceil((exp - hoje) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  function _fmtData(dataStr) {
    if (!dataStr) return "—";
    try {
      const d = new Date(dataStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    } catch (_) { return dataStr; }
  }

  function _mostrarLoading(show) {
    const el = document.getElementById("loadingPlanos");
    if (el) el.style.display = show ? "" : "none";
  }

  function _mostrarErro(msg) {
    const el = document.getElementById("erroGlobalPlanos");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "";
    clearTimeout(_mostrarErro._t);
    _mostrarErro._t = setTimeout(() => { el.style.display = "none"; }, 6000);
  }

  // ── Inicia ────────────────────────────────────────────────────────
  carregarEstado();
})();




