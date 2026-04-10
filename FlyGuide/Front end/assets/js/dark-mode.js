// assets/js/dark-mode.js
(function () {
  const STORAGE_KEY = "flyguide.theme";
  const html = document.documentElement;

  // ── CSS injetado ──────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = "flyguide-dark-style";
  style.textContent = `
    html[data-theme="dark"] body { background: #0f172a !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .app-shell { background: #0f172a !important; }

    html[data-theme="dark"] .sidebar { background: #1e293b !important; border-right-color: #334155 !important; }
    html[data-theme="dark"] .brand-title { color: #f1f5f9 !important; }
    html[data-theme="dark"] .brand-sub { color: #64748b !important; }
    html[data-theme="dark"] .navlist a { color: #cbd5e1 !important; }
    html[data-theme="dark"] .navlist a:hover { background: rgba(255,255,255,.06) !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .navlist a.active { background: rgba(249,115,22,.15) !important; color: #fb923c !important; }
    html[data-theme="dark"] .navlist i { color: #94a3b8 !important; }
    html[data-theme="dark"] .navlist a.active i { color: #fb923c !important; }
    html[data-theme="dark"] .profile { background: #0f172a !important; border-color: #334155 !important; }
    html[data-theme="dark"] .profile:hover { background: rgba(249,115,22,.1) !important; border-color: #f97316 !important; }
    html[data-theme="dark"] .profile .name { color: #f1f5f9 !important; }
    html[data-theme="dark"] .profile .email { color: #94a3b8 !important; }
    html[data-theme="dark"] .profile::before { color: #475569 !important; }
    html[data-theme="dark"] .profile::after { color: #475569 !important; }

    html[data-theme="dark"] .main { background: #0f172a !important; }
    html[data-theme="dark"] .mobile-topbar { background: #1e293b !important; border-bottom-color: #334155 !important; }

    html[data-theme="dark"] .searchbar .panel { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .searchbar .form-control,
    html[data-theme="dark"] .searchbar .form-select { background: #0f172a !important; border-color: #475569 !important; color: #f1f5f9 !important; }

    html[data-theme="dark"] .trip-card { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .trip-body { color: #f1f5f9 !important; }
    html[data-theme="dark"] .trip-footer { border-top-color: #334155 !important; color: #94a3b8 !important; }
    html[data-theme="dark"] .meta-row { color: #94a3b8 !important; }
    html[data-theme="dark"] .like-btn { background: rgba(30,41,59,.92) !important; border-color: rgba(71,85,105,.9) !important; }

    html[data-theme="dark"] .badge-pill { background: #334155 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .badge-green { background: #14532d !important; color: #86efac !important; }
    html[data-theme="dark"] .badge-purple { background: #3b0764 !important; color: #d8b4fe !important; }
    html[data-theme="dark"] .badge-yellow { background: #713f12 !important; color: #fde68a !important; }

    html[data-theme="dark"] label,
    html[data-theme="dark"] .form-label { color: #e2e8f0 !important; }
    html[data-theme="dark"] .form-control,
    html[data-theme="dark"] .form-select,
    html[data-theme="dark"] textarea { background-color: #0f172a !important; border-color: #475569 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .form-control::placeholder,
    html[data-theme="dark"] textarea::placeholder { color: #64748b !important; opacity: 1 !important; }
    html[data-theme="dark"] .form-control:focus,
    html[data-theme="dark"] .form-select:focus,
    html[data-theme="dark"] textarea:focus { background-color: #0f172a !important; color: #f1f5f9 !important; border-color: #f97316 !important; box-shadow: 0 0 0 .2rem rgba(249,115,22,.15) !important; }
    html[data-theme="dark"] .form-control[type="date"],
    html[data-theme="dark"] .form-control[type="time"] { color-scheme: dark; }
    html[data-theme="dark"] .input-group-text,
    html[data-theme="dark"] .bg-white { background: #1e293b !important; border-color: #475569 !important; color: #94a3b8 !important; }
    html[data-theme="dark"] .local-search-box { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .local-preview { background: #0f172a !important; border-color: #334155 !important; }

    html[data-theme="dark"] .modal-content { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .modal-header { border-bottom-color: #334155 !important; background: #1e293b !important; }
    html[data-theme="dark"] .modal-footer { border-top-color: #334155 !important; background: #1e293b !important; }
    html[data-theme="dark"] .modal-body { background: #1e293b !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .modal-title { color: #f1f5f9 !important; }
    html[data-theme="dark"] .nav-tabs { border-bottom-color: #334155 !important; }
    html[data-theme="dark"] .nav-tabs .nav-link { color: #94a3b8 !important; border-color: transparent !important; }
    html[data-theme="dark"] .nav-tabs .nav-link.active { color: #f97316 !important; background: transparent !important; }

    html[data-theme="dark"] .alert-success { background: rgba(22,163,74,.15) !important; color: #86efac !important; border-color: rgba(22,163,74,.3) !important; }
    html[data-theme="dark"] .alert-danger  { background: rgba(220,38,38,.15) !important; color: #fca5a5 !important; border-color: rgba(220,38,38,.3) !important; }
    html[data-theme="dark"] .alert-info    { background: rgba(59,130,246,.15) !important; color: #93c5fd !important; border-color: rgba(59,130,246,.3) !important; }
    html[data-theme="dark"] .alert-warning { background: rgba(234,179,8,.15) !important; color: #fde68a !important; border-color: rgba(234,179,8,.3) !important; }

    html[data-theme="dark"] .offcanvas { background: #1e293b !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .offcanvas-header { border-bottom-color: #334155 !important; }
    html[data-theme="dark"] .btn-close { filter: invert(1) !important; }
    html[data-theme="dark"] .dropdown-menu { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .dropdown-item { color: #cbd5e1 !important; }
    html[data-theme="dark"] .dropdown-item:hover { background: #334155 !important; color: #f1f5f9 !important; }

    html[data-theme="dark"] .btn-outline-soft,
    html[data-theme="dark"] .btn-outline-gray,
    html[data-theme="dark"] .btn-outline-secondary { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .btn-secondary { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .btn-light { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .btn-danger-soft { background: #1e293b !important; border-color: rgba(239,68,68,.3) !important; color: #f87171 !important; }

    html[data-theme="dark"] h1, html[data-theme="dark"] h2, html[data-theme="dark"] h3,
    html[data-theme="dark"] h4, html[data-theme="dark"] h5, html[data-theme="dark"] h6 { color: #f1f5f9 !important; }
    html[data-theme="dark"] .text-muted, html[data-theme="dark"] .text-secondary { color: #94a3b8 !important; }
    html[data-theme="dark"] small { color: #94a3b8 !important; }

    html[data-theme="dark"] .day-item { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .day-main .name { color: #f1f5f9 !important; }
    html[data-theme="dark"] .time-pill { background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; }
    html[data-theme="dark"] .costline { color: #94a3b8 !important; }

    html[data-theme="dark"] .perfil-card { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .perfil-page-title, html[data-theme="dark"] .perfil-card-title,
    html[data-theme="dark"] .perfil-nome { color: #f1f5f9 !important; }
    html[data-theme="dark"] .perfil-field .valor { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .acao-item { border-bottom-color: #334155 !important; }
    html[data-theme="dark"] .acao-icone { background: #0f172a !important; border-color: #334155 !important; }
    html[data-theme="dark"] .acao-titulo { color: #f1f5f9 !important; }
    html[data-theme="dark"] .danger-zone { background: rgba(220,38,38,.08) !important; border-color: rgba(220,38,38,.3) !important; }
    html[data-theme="dark"] .btn-editar { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }

    html[data-theme="dark"] .form-card, html[data-theme="dark"] .big-box { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .soft-strip { background: rgba(249,115,22,.08) !important; border-color: rgba(249,115,22,.2) !important; }
    html[data-theme="dark"] .soft-strip .label, html[data-theme="dark"] .soft-strip .desc { color: #f1f5f9 !important; }
    html[data-theme="dark"] .helper { color: #94a3b8 !important; }
    html[data-theme="dark"] .page-head .back-center { color: #f1f5f9 !important; }
    html[data-theme="dark"] .footer-actions { border-top-color: #334155 !important; }
    html[data-theme="dark"] .draft-summary { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .draft-summary .pill { background: #0f172a !important; border-color: #334155 !important; }

    html[data-theme="dark"] .stat-card, html[data-theme="dark"] .section-card { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .section-title { color: #f1f5f9 !important; }
    html[data-theme="dark"] .stat-big { color: #f1f5f9 !important; }
    html[data-theme="dark"] .tip-item { background: rgba(59,130,246,.1) !important; border-color: rgba(59,130,246,.2) !important; }
    html[data-theme="dark"] .icon-btn { background: rgba(30,41,59,.92) !important; border-color: rgba(71,85,105,.9) !important; }
    html[data-theme="dark"] .icon-btn i { color: #f1f5f9 !important; }

    html[data-theme="dark"] .pill-card, html[data-theme="dark"] .premium-feature,
    html[data-theme="dark"] .plan-card { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .plan-card.premium { border-color: #f97316 !important; }
    html[data-theme="dark"] .plan-price { color: #f1f5f9 !important; }
    html[data-theme="dark"] .plan-list .it { color: #cbd5e1 !important; }

    html[data-theme="dark"] .cat-card, html[data-theme="dark"] .mini-card { background: #1e293b !important; border-color: #334155 !important; }
    html[data-theme="dark"] .help-cta { background: rgba(249,115,22,.08) !important; border-color: rgba(249,115,22,.2) !important; }
    html[data-theme="dark"] .faq-btn { background: #1e293b !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] .faq-btn:hover { background: #334155 !important; }
    html[data-theme="dark"] .faq-item { border-top-color: #334155 !important; }
    html[data-theme="dark"] .faq-body { color: #94a3b8 !important; }
    html[data-theme="dark"] .tab-pill { background: #1e293b !important; border-color: #334155 !important; color: #cbd5e1 !important; }
    html[data-theme="dark"] .cat-beige  { background: rgba(249,115,22,.15) !important; }
    html[data-theme="dark"] .cat-blue   { background: rgba(59,130,246,.15) !important; }
    html[data-theme="dark"] .cat-purple { background: rgba(124,58,237,.15) !important; }
    html[data-theme="dark"] .cat-green  { background: rgba(22,163,74,.15) !important; }
    html[data-theme="dark"] .cat-pink   { background: rgba(236,72,153,.15) !important; }

    #darkToggleSeparator { margin: 12px 6px 10px 6px; border: none; border-top: 1px solid #e5e7eb; }
    html[data-theme="dark"] #darkToggleSeparator { border-top-color: #334155 !important; }

    #darkToggle {
      display: flex; align-items: center; justify-content: space-between;
      width: calc(100% - 12px); margin: 0 6px 10px 6px;
      padding: 10px 14px; border-radius: 12px;
      border: 1px solid #e5e7eb; background: #f1f5f9; color: #334155;
      font-size: .84rem; font-weight: 700; cursor: pointer;
      transition: background .2s, border-color .2s; font-family: inherit;
    }
    #darkToggle:hover { background: #e2e8f0; border-color: #cbd5e1; }
    #darkToggle .toggle-label { display: flex; align-items: center; gap: 8px; }
    #darkToggle .toggle-switch {
      position: relative; width: 40px; height: 22px; border-radius: 999px;
      background: #cbd5e1; flex-shrink: 0; transition: background .25s;
    }
    #darkToggle .toggle-switch::after {
      content: ""; position: absolute; top: 4px; left: 4px;
      width: 14px; height: 14px; border-radius: 999px;
      background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); transition: transform .25s;
    }
    html[data-theme="dark"] #darkToggle { background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; }
    html[data-theme="dark"] #darkToggle:hover { background: #1e293b !important; border-color: #475569 !important; color: #f1f5f9 !important; }
    html[data-theme="dark"] #darkToggle .toggle-switch { background: #f97316 !important; }
    html[data-theme="dark"] #darkToggle .toggle-switch::after { transform: translateX(18px); }
  `;
  document.head.appendChild(style);

  // ── Aplica tema salvo ─────────────────────────────────────────
  if (localStorage.getItem(STORAGE_KEY) === "dark") {
    html.setAttribute("data-theme", "dark");
  } else {
    html.removeAttribute("data-theme");
  }

  // ── Cores claras que precisam ser sobrescritas via JS ─────────
  // Lê o atributo style como STRING para preservar o hex original
  var LIGHT_PATTERNS = [
    "#fff", "#ffffff", "#f8fafc", "#f0fdf4",
    "#fef2f2", "#f1f5f9", "#f9fafb", "#f5f5f5"
  ];

  function styleAttrHasLightBg(el) {
    var attr = (el.getAttribute("style") || "").toLowerCase().replace(/\s/g, "");
    // Procura por background: ou background-color: com cor clara
    return LIGHT_PATTERNS.some(function (c) {
      return attr.indexOf("background:" + c) !== -1 ||
             attr.indexOf("background-color:" + c) !== -1;
    });
  }

  function fixInlineStyles(on) {
    document.querySelectorAll("[style]").forEach(function (el) {
      // Nunca mexe no botão toggle
      if (el.id === "darkToggle" || el.id === "darkToggleSeparator") return;

      if (on) {
        if (styleAttrHasLightBg(el)) {
          // Salva o style original e sobrescreve com !important via JS
          el.dataset.darkOrigStyle = el.getAttribute("style");
          el.style.setProperty("background", "#1e293b", "important");
          el.style.setProperty("background-color", "#1e293b", "important");
          el.style.setProperty("color", "#f1f5f9", "important");
          el.style.setProperty("border-color", "#334155", "important");
        }
      } else {
        if (el.dataset.darkOrigStyle !== undefined) {
          el.setAttribute("style", el.dataset.darkOrigStyle);
          delete el.dataset.darkOrigStyle;
        }
      }
    });
  }

  // ── DOMContentLoaded ──────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    // Aplica fix nos elementos que já estão na página
    if (html.getAttribute("data-theme") === "dark") fixInlineStyles(true);

    // Observa novos elementos adicionados dinamicamente (modais, etc.)
    var observer = new MutationObserver(function (mutations) {
      if (html.getAttribute("data-theme") !== "dark") return;
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          // Verifica o próprio nó
          if (node.getAttribute && node.getAttribute("style") && styleAttrHasLightBg(node)) {
            if (!node.dataset.darkOrigStyle) {
              node.dataset.darkOrigStyle = node.getAttribute("style");
              node.style.setProperty("background", "#1e293b", "important");
              node.style.setProperty("background-color", "#1e293b", "important");
              node.style.setProperty("color", "#f1f5f9", "important");
              node.style.setProperty("border-color", "#334155", "important");
            }
          }
          // Verifica filhos
          node.querySelectorAll && node.querySelectorAll("[style]").forEach(function (child) {
            if (child.id === "darkToggle" || child.id === "darkToggleSeparator") return;
            if (styleAttrHasLightBg(child) && !child.dataset.darkOrigStyle) {
              child.dataset.darkOrigStyle = child.getAttribute("style");
              child.style.setProperty("background", "#1e293b", "important");
              child.style.setProperty("background-color", "#1e293b", "important");
              child.style.setProperty("color", "#f1f5f9", "important");
              child.style.setProperty("border-color", "#334155", "important");
            }
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Botão toggle
    if (document.getElementById("darkToggle")) return;
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    var hr = document.createElement("hr");
    hr.id = "darkToggleSeparator";

    var btn = document.createElement("button");
    btn.id = "darkToggle";
    btn.type = "button";
    renderBtn(btn);

    var profile = sidebar.querySelector(".profile");
    if (profile) {
      sidebar.insertBefore(hr, profile);
      sidebar.insertBefore(btn, profile);
    } else {
      sidebar.appendChild(hr);
      sidebar.appendChild(btn);
    }

    btn.addEventListener("click", function () {
      var isDark = html.getAttribute("data-theme") === "dark";
      if (isDark) {
        html.removeAttribute("data-theme");
        localStorage.setItem(STORAGE_KEY, "light");
        fixInlineStyles(false);
      } else {
        html.setAttribute("data-theme", "dark");
        localStorage.setItem(STORAGE_KEY, "dark");
        fixInlineStyles(true);
      }
      renderBtn(btn);
    });
  });

  function renderBtn(btn) {
    var isDark = html.getAttribute("data-theme") === "dark";
    btn.innerHTML =
      '<span class="toggle-label">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">' +
          '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' +
        '</svg>' +
        "Modo Escuro" +
      "</span>" +
      '<span class="toggle-switch"></span>';
  }
})();