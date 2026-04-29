// assets/js/transitions.js
// Adiciona fade suave ao navegar entre páginas.
// Não interfere com links externos, âncoras, modais ou downloads.

(function () {

  // ── Injeta o CSS de transição ─────────────────────────────────
  var style = document.createElement("style");
  style.textContent = `
    body {
      opacity: 0;
      transition: opacity 220ms ease;
    }
    body.fg-visible {
      opacity: 1;
    }
    body.fg-leaving {
      opacity: 0;
      transition: opacity 160ms ease;
    }
  `;
  document.head.appendChild(style);

  // ── Mostra a página com fade-in ao carregar ───────────────────
  document.addEventListener("DOMContentLoaded", function () {
    // Pequeno delay para garantir que o render já aconteceu
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add("fg-visible");
      });
    });
  });

  // ── Intercepta cliques em links internos ──────────────────────
  document.addEventListener("click", function (e) {
    // Busca o <a> mais próximo do elemento clicado
    var link = e.target.closest("a");
    if (!link) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // Ignora: âncoras, links externos, javascript:, mailto:, download, target _blank
    if (
      href.startsWith("#") ||
      href.startsWith("javascript") ||
      href.startsWith("mailto") ||
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      link.hasAttribute("download") ||
      link.target === "_blank" ||
      e.ctrlKey || e.metaKey || e.shiftKey
    ) return;

    // Ignora links que abrem modais Bootstrap
    if (link.hasAttribute("data-bs-toggle") || link.hasAttribute("data-bs-dismiss")) return;

    e.preventDefault();

    var destino = href;

    // Fade-out e navega
    document.body.classList.remove("fg-visible");
    document.body.classList.add("fg-leaving");

    setTimeout(function () {
      window.location.href = destino;
    }, 160);
  });

  // ── Também trata navegação pelo histórico (voltar/avançar) ────
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      document.body.classList.remove("fg-leaving");
      document.body.classList.add("fg-visible");
    }
  });

})();