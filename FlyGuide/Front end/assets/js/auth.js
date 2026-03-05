// assets/js/auth.js
(function () {
  const qs = (seletor, el = document) => el.querySelector(seletor);

  const URL_API_BASE = "http://localhost:8080";

  function apenasDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function cepEhValido(cep) {
    const digitos = apenasDigitos(cep);
    return /^\d{8}$/.test(digitos);
  }

  function formatarCEP(valor) {
    const digitos = apenasDigitos(valor).slice(0, 8);
    if (digitos.length <= 5) return digitos;
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  }

  function cpfEhValido(cpf) {
    const c = apenasDigitos(cpf);
    if (!/^\d{11}$/.test(c)) return false;
    if (/^(\d)\1{10}$/.test(c)) return false;

    const calcularDigito = (base) => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) {
        soma += parseInt(base[i], 10) * (base.length + 1 - i);
      }
      const mod = soma % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const d1 = calcularDigito(c.slice(0, 9));
    const d2 = calcularDigito(c.slice(0, 9) + String(d1));
    return c.endsWith(`${d1}${d2}`);
  }

  function formatarCPF(valor) {
    const digitos = apenasDigitos(valor).slice(0, 11);
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  function marcarInvalido(input, mensagem) {
    input.classList.add("is-invalid");
    const feedback = input.closest(".auth-field")?.querySelector(".invalid-feedback");
    if (feedback) feedback.textContent = mensagem;
  }

  function marcarValido(input) {
    input.classList.remove("is-invalid");
    const feedback = input.closest(".auth-field")?.querySelector(".invalid-feedback");
    if (feedback) feedback.textContent = "";
  }

  function mostrarAlerta(tipo, texto) {
    const caixa = qs("[data-alerta-auth]");
    if (!caixa) return;
    caixa.className = `alert auth-alert alert-${tipo}`;
    caixa.textContent = texto;
    caixa.style.display = "block";
  }

  async function processarLogin(evento) {
    evento.preventDefault();

    const email = qs("#emailLogin")?.value?.trim();
    const senha = qs("#senhaLogin")?.value ?? "";

    if (!email) return mostrarAlerta("danger", "Informe seu e-mail.");
    if (!senha) return mostrarAlerta("danger", "Informe sua senha.");

    try {
      const resposta = await fetch(`${URL_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        mostrarAlerta("danger", dados.message || "Login ou senha inválida.");
        return;
      }

      mostrarAlerta("success", dados.message || "Usuário logado com sucesso!");
      // window.location.href = "index.html";
    } catch (erro) {
      mostrarAlerta("danger", "Não foi possível conectar ao servidor.");
    }
  }

  async function processarCadastro(evento) {
    evento.preventDefault();

    const inputEmail = qs("#emailCadastro");
    const inputCPF = qs("#cpfCadastro");
    const inputCEP = qs("#cepCadastro");
    const inputSenha = qs("#senhaCadastro");
    const inputConfirmar = qs("#confirmarSenhaCadastro");

    let valido = true;

    if (!inputEmail.value.trim()) {
      marcarInvalido(inputEmail, "Informe um e-mail válido.");
      valido = false;
    } else marcarValido(inputEmail);

    if (!cpfEhValido(inputCPF.value)) {
      marcarInvalido(inputCPF, "CPF inválido.");
      valido = false;
    } else marcarValido(inputCPF);

    if (!cepEhValido(inputCEP.value)) {
      marcarInvalido(inputCEP, "CEP inválido. Use 00000-000.");
      valido = false;
    } else marcarValido(inputCEP);

    if ((inputSenha.value || "").length < 8) {
      marcarInvalido(inputSenha, "A senha deve ter no mínimo 8 caracteres.");
      valido = false;
    } else marcarValido(inputSenha);

    if (inputConfirmar.value !== inputSenha.value) {
      marcarInvalido(inputConfirmar, "As senhas não conferem.");
      valido = false;
    } else marcarValido(inputConfirmar);

    if (!valido) return;

    // backend atual não tem CPF: valida no front, mas não envia ainda
    const payload = {
      primeiroNome: "Novo",
      ultimoNome: "Usuário",
      email: inputEmail.value.trim(),
      senha: inputSenha.value,
      cep: inputCEP.value,
      endereco: "",
      cidade: "",
      pais: "Brasil",
      dataCadastro: new Date().toISOString().slice(0, 10),
      tipoConta: "FREE",
      // cpf: inputCPF.value, // habilite quando existir no backend
    };

    try {
      const resposta = await fetch(`${URL_API_BASE}/users/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        mostrarAlerta("danger", dados.message || "Não foi possível criar a conta.");
        return;
      }

      mostrarAlerta("success", "Conta criada com sucesso! Agora você pode entrar.");
      setTimeout(() => (window.location.href = "login.html"), 800);
    } catch (erro) {
      mostrarAlerta("danger", "Não foi possível conectar ao servidor.");
    }
  }

  const pagina = document.body.getAttribute("data-pagina");

  if (pagina === "login") {
    qs("#formularioLogin")?.addEventListener("submit", processarLogin);
  }

  if (pagina === "cadastro") {
    const inputCPF = qs("#cpfCadastro");
    const inputCEP = qs("#cepCadastro");

    inputCPF?.addEventListener("input", () => {
      inputCPF.value = formatarCPF(inputCPF.value);
      if (inputCPF.value && !cpfEhValido(inputCPF.value)) marcarInvalido(inputCPF, "CPF inválido.");
      else marcarValido(inputCPF);
    });

    inputCEP?.addEventListener("input", () => {
      inputCEP.value = formatarCEP(inputCEP.value);
      if (inputCEP.value && !cepEhValido(inputCEP.value)) marcarInvalido(inputCEP, "CEP inválido. Use 00000-000.");
      else marcarValido(inputCEP);
    });

    qs("#formularioCadastro")?.addEventListener("submit", processarCadastro);
  }
})();