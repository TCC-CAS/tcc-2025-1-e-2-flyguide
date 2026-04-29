/* ================================================================
   FlyGuide - imagens.js
   Funções de imagem compartilhadas entre páginas:
   - Carrega imagens do backend (GET /imagens)
   - Renderiza seletor visual de imagens
================================================================ */

const IMG_FALLBACK = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75";

let imagensCache = [];

function carregarImagens() {
  return fetch("http://localhost:8080/imagens")
    .then(r => r.json())
    .then(data => { imagensCache = data; return data; })
    .catch(() => { imagensCache = []; return []; });
}

function renderSeletorImagens(containerId, hiddenId, idSelecionado) {
  const container = document.getElementById(containerId);
  if (!container || imagensCache.length === 0) return;

  container.innerHTML = imagensCache.map(img => `
    <div class="img-option ${img.idImagem === idSelecionado ? "selected" : ""}"
         data-id="${img.idImagem}"
         style="position:relative;border-radius:14px;overflow:hidden;cursor:pointer;
                border:3px solid ${img.idImagem === idSelecionado ? "#f97316" : "transparent"};
                transition:border-color .2s,transform .15s;aspect-ratio:16/9;">
      <img src="${img.url.replace("w=800", "w=300")}" alt="${img.nome}"
           style="width:100%;height:100%;object-fit:cover;display:block;">
      <div style="position:absolute;bottom:0;left:0;right:0;
                  background:linear-gradient(0deg,rgba(0,0,0,.65),transparent);
                  color:#fff;font-size:.75rem;font-weight:700;padding:6px 8px;">
        ${img.emoji || ""} ${img.nome}
      </div>
      <div class="chk-icon"
           style="position:absolute;top:8px;right:8px;background:#f97316;color:#fff;
                  border-radius:50%;width:22px;height:22px;
                  display:${img.idImagem === idSelecionado ? "flex" : "none"};
                  align-items:center;justify-content:center;font-size:.75rem;">
        <i class="bi bi-check"></i>
      </div>
    </div>`).join("");

  container.querySelectorAll(".img-option").forEach(opt => {
    opt.addEventListener("click", () => {
      container.querySelectorAll(".img-option").forEach(o => {
        o.style.borderColor = "transparent";
        o.style.boxShadow   = "";
        o.classList.remove("selected");
        const chk = o.querySelector(".chk-icon");
        if (chk) chk.style.display = "none";
      });
      opt.style.borderColor = "#f97316";
      opt.style.boxShadow   = "0 0 0 3px rgba(249,115,22,.25)";
      opt.classList.add("selected");
      const chk = opt.querySelector(".chk-icon");
      if (chk) chk.style.display = "flex";
      const hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = opt.getAttribute("data-id");
    });
  });
}