/* ================================================================
   FlyGuide - imagens.js
   Funções de imagem compartilhadas entre páginas:
   - Carrega imagens do backend (GET /imagens)
   - Renderiza seletor visual de imagens
================================================================ */

const IMG_FALLBACK = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75";

const IMAGENS_DEFAULT = [
  { idImagem: 1,  chave: "cidade",      nome: "Cidade",       emoji: "🏙️", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=75" },
  { idImagem: 2,  chave: "praia",       nome: "Praia",        emoji: "🏖️", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=75" },
  { idImagem: 3,  chave: "natureza",    nome: "Natureza",     emoji: "🌿", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=75" },
  { idImagem: 4,  chave: "montanha",    nome: "Montanha",     emoji: "🏔️", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=75" },
  { idImagem: 5,  chave: "aventura",    nome: "Aventura",     emoji: "🧗", url: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=75" },
  { idImagem: 6,  chave: "cultural",    nome: "Cultural",     emoji: "🏛️", url: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=75" },
  { idImagem: 7,  chave: "gastronomia", nome: "Gastronomia",  emoji: "🍽️", url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=75" },
  { idImagem: 8,  chave: "luxo",        nome: "Luxo",         emoji: "✨", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=75" },
  { idImagem: 9,  chave: "neve",        nome: "Neve / Frio",  emoji: "❄️", url: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=75" },
  { idImagem: 10, chave: "mochilao",    nome: "Mochilão",     emoji: "🎒", url: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=75" },
  { idImagem: 11, chave: "deserto",    nome: "Deserto",      emoji: "🏜️", url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=75" },
  { idImagem: 12, chave: "fazenda",    nome: "Fazenda",      emoji: "🌾", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=75" },
  { idImagem: 13, chave: "cruzeiro",   nome: "Cruzeiro",     emoji: "🚢", url: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&q=75" },
  { idImagem: 14, chave: "festival",   nome: "Festival",     emoji: "🎪", url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=75" },
  { idImagem: 15, chave: "spa",        nome: "Spa",          emoji: "💆", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=75" },
  { idImagem: 16, chave: "parque",    nome: "Parque de Diversão", emoji: "🎢", url: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=75" },
  { idImagem: 17, chave: "estadio",   nome: "Estádio",      emoji: "⚽", url: "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=800&q=75" },
  { idImagem: 18, chave: "oriental",  nome: "Oriental",     emoji: "🏯", url: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=75" },
  { idImagem: 19, chave: "europa",    nome: "Europa Clássica", emoji: "🏰", url: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=75" },
];

function imagensLocais() {
  return IMAGENS_DEFAULT.map(img => ({ ...img, idImagem: null, persistida: false }));
}

// Pré-populado para renderizar imediatamente sem esperar o backend
let imagensCache = imagensLocais();

// Renderiza o seletor assim que o DOM estiver pronto (sem esperar fetch)
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("imgSelector");
  if (container) renderSeletorImagens("imgSelector", "itImagem", IMAGENS_DEFAULT[0].idImagem);
});

function carregarImagens() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  return fetch("https://tcc-2025-1-e-2-flyguide-production.up.railway.app/imagens", { signal: controller.signal })
    .then(r => r.json())
    .then(data => {
      clearTimeout(timeout);
      if (Array.isArray(data) && data.length > 0) {
        const imagensBackend = data.map(img => ({ ...img, persistida: true }));
        const backendChaves = new Set(imagensBackend.map(img => img.chave));
        const extras = IMAGENS_DEFAULT
          .filter(img => !backendChaves.has(img.chave))
          .map(img => ({ ...img, idImagem: null, persistida: false }));
        imagensCache = [...imagensBackend, ...extras];
      } else {
        imagensCache = imagensLocais();
      }
      return imagensCache;
    })
    .catch(() => {
      clearTimeout(timeout);
      imagensCache = imagensLocais();
      return imagensCache;
    });
}

function normalizarIdImagem(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function encontrarImagemPorIdOuChave(idImagem, imagemChave) {
  const chave = String(imagemChave || "").trim();
  if (chave) {
    const porChave = imagensCache.find(img => String(img.chave || "") === chave);
    if (porChave) return porChave;
  }

  const id = normalizarIdImagem(idImagem);
  if (id != null) {
    const porId = imagensCache.find(img => normalizarIdImagem(img.idImagem) === id);
    if (porId) return porId;
  }

  return null;
}

function imagemTemIdPersistido(img) {
  return img?.persistida === true && normalizarIdImagem(img.idImagem) != null;
}

function preencherHiddenImagem(hidden, img) {
  if (!hidden || !img) return;
  const idPersistido = imagemTemIdPersistido(img) ? normalizarIdImagem(img.idImagem) : null;
  hidden.value = idPersistido != null ? String(idPersistido) : String(img.chave || "");
  hidden.dataset.idImagem = idPersistido != null ? String(idPersistido) : "";
  hidden.dataset.imagemChave = String(img.chave || "");
  hidden.dataset.imagemPersistida = idPersistido != null ? "1" : "0";
}

function obterImagemSelecionada(hiddenId) {
  const hidden = document.getElementById(hiddenId);
  const chave = hidden?.dataset?.imagemChave || (normalizarIdImagem(hidden?.value) == null ? hidden?.value : "");
  const id = normalizarIdImagem(hidden?.dataset?.idImagem || hidden?.value);
  const img = encontrarImagemPorIdOuChave(id, chave);
  const idPersistido = imagemTemIdPersistido(img) ? normalizarIdImagem(img.idImagem) : null;
  return {
    idImagem: idPersistido,
    imagemChave: img?.chave || (chave ? String(chave) : null),
    imagemUrl: img?.url || null,
  };
}

function obterImagemUrlRoteiro(roteiro) {
  if (roteiro?.imagemUrl) return roteiro.imagemUrl;

  const img = encontrarImagemPorIdOuChave(roteiro?.idImagem, roteiro?.imagemChave);
  if (img?.url) return img.url;

  return IMG_FALLBACK;
}

function renderSeletorImagens(containerId, hiddenId, idSelecionado) {
  const container = document.getElementById(containerId);
  if (!container || imagensCache.length === 0) return;

  const idNormalizado = normalizarIdImagem(idSelecionado);
  const chaveSelecionada = idNormalizado == null ? String(idSelecionado || "").trim() : "";
  const imagemSelecionada = imagensCache.find(img => chaveSelecionada && String(img.chave || "") === chaveSelecionada)
    || imagensCache.find(img => normalizarIdImagem(img.idImagem) === idNormalizado)
    || imagensCache[0];
  const idFinalSelecionado = normalizarIdImagem(imagemSelecionada?.idImagem);
  const chaveFinalSelecionada = String(imagemSelecionada?.chave || "");

  const hiddenInicial = document.getElementById(hiddenId);
  preencherHiddenImagem(hiddenInicial, imagemSelecionada);

  container.innerHTML = imagensCache.map(img => `
    <div class="img-option ${String(img.chave || "") === chaveFinalSelecionada || (idFinalSelecionado != null && normalizarIdImagem(img.idImagem) === idFinalSelecionado) ? "selected" : ""}"
         data-id="${imagemTemIdPersistido(img) ? img.idImagem : ""}"
         data-chave="${img.chave}"
         data-persistida="${imagemTemIdPersistido(img) ? "1" : "0"}"
         style="position:relative;border-radius:14px;overflow:hidden;cursor:pointer;
                border:3px solid ${String(img.chave || "") === chaveFinalSelecionada || (idFinalSelecionado != null && normalizarIdImagem(img.idImagem) === idFinalSelecionado) ? "#f97316" : "transparent"};
                transition:border-color .2s,transform .15s;aspect-ratio:16/9;">
      <img src="${img.url.replace("w=800", "w=300")}" alt="${img.nome}"
           style="width:100%;height:100%;object-fit:cover;display:block;">
      <div class="chk-icon"
           style="position:absolute;top:8px;right:8px;background:#f97316;color:#fff;
                   border-radius:50%;width:22px;height:22px;
                  display:${String(img.chave || "") === chaveFinalSelecionada || (idFinalSelecionado != null && normalizarIdImagem(img.idImagem) === idFinalSelecionado) ? "flex" : "none"};
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
      if (hidden) {
        const img = encontrarImagemPorIdOuChave(opt.getAttribute("data-id"), opt.getAttribute("data-chave"));
        preencherHiddenImagem(hidden, img || {
          idImagem: normalizarIdImagem(opt.getAttribute("data-id")),
          chave: opt.getAttribute("data-chave"),
          persistida: opt.getAttribute("data-persistida") === "1",
        });
      }
    });
  });
}
