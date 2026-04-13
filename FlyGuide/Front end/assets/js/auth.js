// assets/js/auth.js
(function () {
  const qs = (seletor, el = document) => el.querySelector(seletor);

  const URL_API_BASE = "http://localhost:8080";
  const SESSION_KEY  = "flyguide.userId";

  // ======================== UTILITÁRIOS ========================

  function apenasDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function cepEhValido(cep) {
    return /^\d{8}$/.test(apenasDigitos(cep));
  }

  function formatarCEP(valor) {
    const d = apenasDigitos(valor).slice(0, 8);
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  function cpfEhValido(cpf) {
    const c = apenasDigitos(cpf);
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    const dig = (base) => {
      let s = 0;
      for (let i = 0; i < base.length; i++) s += parseInt(base[i]) * (base.length + 1 - i);
      const m = s % 11; return m < 2 ? 0 : 11 - m;
    };
    const d1 = dig(c.slice(0, 9));
    const d2 = dig(c.slice(0, 9) + d1);
    return c.endsWith(`${d1}${d2}`);
  }

  function formatarCPF(valor) {
    const d = apenasDigitos(valor).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function cnpjEhValido(cnpj) {
    const c = apenasDigitos(cnpj);
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
    const calc = (base, pesos) => {
      let s = 0;
      for (let i = 0; i < pesos.length; i++) s += parseInt(base[i]) * pesos[i];
      const r = s % 11; return r < 2 ? 0 : 11 - r;
    };
    const d1 = calc(c, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const d2 = calc(c, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return parseInt(c[12]) === d1 && parseInt(c[13]) === d2;
  }

  function formatarCNPJ(valor) {
    const d = apenasDigitos(valor).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }

  function marcarInvalido(input, msg) {
    input.classList.add("is-invalid");
    const f = input.closest(".auth-field")?.querySelector(".invalid-feedback");
    if (f) f.textContent = msg;
  }

  function marcarValido(input) {
    input.classList.remove("is-invalid");
    const f = input.closest(".auth-field")?.querySelector(".invalid-feedback");
    if (f) f.textContent = "";
  }

  function mostrarAlerta(tipo, texto) {
    const caixa = qs("[data-alerta-auth]");
    if (!caixa) return;
    caixa.className = `alert auth-alert alert-${tipo}`;
    caixa.textContent = texto;
    caixa.style.display = "block";
  }

  function setBotaoCarregando(btn, carregando) {
    if (!btn) return;
    if (carregando) {
      btn.disabled = true;
      btn.dataset.textoOriginal = btn.textContent;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Aguarde...`;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.textoOriginal || btn.textContent;
    }
  }

  // ======================== VIA CEP ========================

  async function buscarCEP(cep) {
    const spinner = qs("#cepSpinner");
    const inputEndereco = qs("#enderecoCadastro");
    const inputCidade   = qs("#cidadeCadastro");
    const inputCEP      = qs("#cepCadastro");

    if (!cepEhValido(cep)) return;

    if (spinner) spinner.style.display = "";

    try {
      const r = await fetch(`https://viacep.com.br/ws/${apenasDigitos(cep)}/json/`);
      const dados = await r.json();

      if (dados.erro) {
        marcarInvalido(inputCEP, "CEP não encontrado.");
        if (inputEndereco) inputEndereco.value = "";
        if (inputCidade)   inputCidade.value   = "";
        return;
      }

      marcarValido(inputCEP);

      if (inputEndereco) {
        const logradouro = dados.logradouro || "";
        const bairro     = dados.bairro     || "";
        inputEndereco.value = [logradouro, bairro].filter(Boolean).join(", ");
      }
      if (inputCidade) {
        inputCidade.value = dados.localidade || "";
      }

    } catch {
      marcarInvalido(inputCEP, "Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      if (spinner) spinner.style.display = "none";
    }
  }

  // ======================== LOGIN ========================

  // Guarda o e-mail entre a etapa 1 (login) e etapa 2 (verificar OTP)
  let emailPendente = null;

  async function processarLogin(evento) {
    evento.preventDefault();

    const email = qs("#emailLogin")?.value?.trim();
    const senha = qs("#senhaLogin")?.value ?? "";
    const btn   = evento.submitter || qs("#formularioLogin button[type=submit]");

    if (!email) return mostrarAlerta("danger", "Informe seu e-mail.");
    if (!senha) return mostrarAlerta("danger", "Informe sua senha.");

    setBotaoCarregando(btn, true);

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

      // Etapa 1 ok — guarda o e-mail e mostra o campo de código OTP
      emailPendente = email;
      mostrarAlerta("success", "Código de verificação enviado para o seu e-mail!");
      mostrarCampoOtp();

    } catch {
      mostrarAlerta("danger", "Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    } finally {
      setBotaoCarregando(btn, false);
    }
  }

  function mostrarCampoOtp() {
    const formLogin = qs("#formularioLogin");
    if (formLogin) formLogin.style.display = "none";

    let formOtp = qs("#formularioOtp");
    if (!formOtp) {
      formOtp = document.createElement("form");
      formOtp.id = "formularioOtp";
      formOtp.innerHTML = `
        <p class="text-muted mb-3" style="font-size:0.9rem;">
          Digite o código de 6 dígitos enviado para <strong>${emailPendente}</strong>.
        </p>
        <div class="auth-field mb-3">
          <label for="codigoOtp" class="form-label">Código de verificação</label>
          <input id="codigoOtp" type="text" class="form-control" placeholder="000000" maxlength="6" required />
          <div class="invalid-feedback"></div>
        </div>
        <button type="submit" class="btn btn-primary w-100 mb-2">Verificar</button>
        <button type="button" id="btnVoltarLogin" class="btn btn-link w-100 p-0" style="font-size:0.85rem;">
          Voltar para o login
        </button>
      `;
      if (formLogin) {
        formLogin.parentNode.insertBefore(formOtp, formLogin.nextSibling);
      } else {
        document.body.appendChild(formOtp);
      }
      formOtp.addEventListener("submit", processarOtp);
      qs("#btnVoltarLogin", formOtp)?.addEventListener("click", voltarParaLogin);
    }
    formOtp.style.display = "";
  }

  function voltarParaLogin() {
    const formLogin = qs("#formularioLogin");
    const formOtp   = qs("#formularioOtp");
    if (formOtp)   formOtp.style.display   = "none";
    if (formLogin) formLogin.style.display = "";
    emailPendente = null;
    mostrarAlerta("info", "Informe seu e-mail e senha para tentar novamente.");
  }

  async function processarOtp(evento) {
    evento.preventDefault();

    const inputCodigo = qs("#codigoOtp");
    const codigo = inputCodigo?.value?.trim();
    const btn    = evento.submitter || qs("#formularioOtp button[type=submit]");

    if (!codigo) {
      marcarInvalido(inputCodigo, "Informe o código recebido por e-mail.");
      return;
    }
    marcarValido(inputCodigo);
    setBotaoCarregando(btn, true);

    try {
      const resposta = await fetch(`${URL_API_BASE}/auth/login/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailPendente, codigo }),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        marcarInvalido(inputCodigo, dados.message || "Código inválido ou expirado.");
        return;
      }

      // Etapa 2 ok — agora temos o id real do usuário
      sessionStorage.setItem(SESSION_KEY, dados.id);
      mostrarAlerta("success", "Usuário logado com sucesso!");
      setTimeout(() => (window.location.href = "index.html"), 800);

    } catch {
      mostrarAlerta("danger", "Não foi possível verificar o código. Tente novamente.");
    } finally {
      setBotaoCarregando(btn, false);
    }
  }

  // ======================== CADASTRO ========================

  let tipoPessoa = "PF";

  function configurarToggleTipo() {
    const btnPF   = qs("#btnPF");
    const btnPJ   = qs("#btnPJ");
    const camposPF = qs("#camposPF");
    const camposPJ = qs("#camposPJ");
    if (!btnPF || !btnPJ) return;

    btnPF.addEventListener("click", () => {
      tipoPessoa = "PF";
      btnPF.classList.add("ativo");
      btnPJ.classList.remove("ativo");
      camposPF.style.display = "";
      camposPJ.style.display = "none";
    });

    btnPJ.addEventListener("click", () => {
      tipoPessoa = "PJ";
      btnPJ.classList.add("ativo");
      btnPF.classList.remove("ativo");
      camposPF.style.display = "none";
      camposPJ.style.display = "";
    });
  }

  async function processarCadastro(evento) {
    evento.preventDefault();

    const inputEmail      = qs("#emailCadastro");
    const inputCEP        = qs("#cepCadastro");
    const inputEndereco   = qs("#enderecoCadastro");
    const inputCidade     = qs("#cidadeCadastro");
    const inputPais       = qs("#paisCadastro");
    const inputSenha      = qs("#senhaCadastro");
    const inputConfirmar  = qs("#confirmarSenhaCadastro");
    const btn = evento.submitter || qs("#formularioCadastro button[type=submit]");

    let valido = true;

    if (!inputEmail.value.trim()) { marcarInvalido(inputEmail, "Informe um e-mail válido."); valido = false; } else marcarValido(inputEmail);
    if (!cepEhValido(inputCEP.value)) { marcarInvalido(inputCEP, "CEP inválido. Use 00000-000."); valido = false; } else marcarValido(inputCEP);
    if ((inputSenha.value || "").length < 8) { marcarInvalido(inputSenha, "A senha deve ter no mínimo 8 caracteres."); valido = false; } else marcarValido(inputSenha);
    if (inputConfirmar.value !== inputSenha.value) { marcarInvalido(inputConfirmar, "As senhas não conferem."); valido = false; } else marcarValido(inputConfirmar);

    let payload = {}, endpoint = "";

    if (tipoPessoa === "PF") {
      const inputPrimeiroNome = qs("#primeiroNomeCadastro");
      const inputUltimoNome   = qs("#ultimoNomeCadastro");
      const inputCPF          = qs("#cpfCadastro");

      if (!inputPrimeiroNome.value.trim()) { marcarInvalido(inputPrimeiroNome, "Informe seu primeiro nome."); valido = false; } else marcarValido(inputPrimeiroNome);
      if (!inputUltimoNome.value.trim()) { marcarInvalido(inputUltimoNome, "Informe seu sobrenome."); valido = false; } else marcarValido(inputUltimoNome);
      if (!cpfEhValido(inputCPF.value)) { marcarInvalido(inputCPF, "CPF inválido."); valido = false; } else marcarValido(inputCPF);

      if (!valido) return;

      payload = {
        primeiroNome: inputPrimeiroNome.value.trim(),
        ultimoNome:   inputUltimoNome.value.trim(),
        email:        inputEmail.value.trim(),
        senha:        inputSenha.value,
        cpf:          apenasDigitos(inputCPF.value),
        cep:          apenasDigitos(inputCEP.value),
        endereco:     inputEndereco?.value.trim() || "",
        cidade:       inputCidade?.value.trim() || "",
        pais:         inputPais?.value.trim() || "Brasil",
        tipoConta:    "FREE",
      };
      endpoint = `${URL_API_BASE}/users/insert/pf`;

    } else {
      const inputRazaoSocial  = qs("#razaoSocialCadastro");
      const inputNomeFantasia = qs("#nomeFantasiaCadastro");
      const inputCNPJ         = qs("#cnpjCadastro");
      const inputIE           = qs("#ieCadastro");

      if (!inputRazaoSocial.value.trim()) { marcarInvalido(inputRazaoSocial, "Informe a razão social."); valido = false; } else marcarValido(inputRazaoSocial);
      if (!cnpjEhValido(inputCNPJ.value)) { marcarInvalido(inputCNPJ, "CNPJ inválido."); valido = false; } else marcarValido(inputCNPJ);

      if (!valido) return;

      payload = {
        email:        inputEmail.value.trim(),
        senha:        inputSenha.value,
        cep:          apenasDigitos(inputCEP.value),
        endereco:     inputEndereco?.value.trim() || "",
        cidade:       inputCidade?.value.trim() || "",
        pais:         inputPais?.value.trim() || "Brasil",
        tipoConta:    "FREE",
        cnpj:         apenasDigitos(inputCNPJ.value),
        razaoSocial:  inputRazaoSocial.value.trim(),
        nomeFantasia: inputNomeFantasia?.value.trim() || null,
        ie:           apenasDigitos(inputIE?.value || "") || null,
      };
      endpoint = `${URL_API_BASE}/users/insert/pj`;
    }

    setBotaoCarregando(btn, true);

    try {
      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        mostrarAlerta("danger", dados.message || "Não foi possível criar a conta.");
        return;
      }

      mostrarAlerta("success", "Conta criada com sucesso! Redirecionando para o login...");
      setTimeout(() => (window.location.href = "login.html"), 1200);
    } catch {
      mostrarAlerta("danger", "Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    } finally {
      setBotaoCarregando(btn, false);
    }
  }

  // ======================== INIT ========================

  const pagina = document.body.getAttribute("data-pagina");

  if (pagina === "login") {
    qs("#formularioLogin")?.addEventListener("submit", processarLogin);
  }

  if (pagina === "cadastro") {
    configurarToggleTipo();

    const inputCPF  = qs("#cpfCadastro");
    const inputCNPJ = qs("#cnpjCadastro");
    const inputCEP  = qs("#cepCadastro");

    inputCPF?.addEventListener("input", () => {
      inputCPF.value = formatarCPF(inputCPF.value);
      if (inputCPF.value && !cpfEhValido(inputCPF.value)) marcarInvalido(inputCPF, "CPF inválido.");
      else marcarValido(inputCPF);
    });

    inputCNPJ?.addEventListener("input", () => {
      inputCNPJ.value = formatarCNPJ(inputCNPJ.value);
      if (inputCNPJ.value && !cnpjEhValido(inputCNPJ.value)) marcarInvalido(inputCNPJ, "CNPJ inválido.");
      else marcarValido(inputCNPJ);
    });

    inputCEP?.addEventListener("input", () => {
      inputCEP.value = formatarCEP(inputCEP.value);
      if (cepEhValido(inputCEP.value)) {
        buscarCEP(inputCEP.value);
      } else {
        const inputEndereco = qs("#enderecoCadastro");
        const inputCidade   = qs("#cidadeCadastro");
        if (inputEndereco) inputEndereco.value = "";
        if (inputCidade)   inputCidade.value   = "";
      }
    });

    qs("#formularioCadastro")?.addEventListener("submit", processarCadastro);
  }
})();
// ── Recuperação de Senha ───────────────────────────────────────────────────
(function iniciarRecuperacaoSenha() {
  if (document.body.getAttribute("data-pagina") !== "login") return;

  const URL_API_BASE = "http://localhost:8080";

  const telaLogin       = document.getElementById("formularioLogin");
  const telaEmail       = document.getElementById("telaEsqueceuEmail");
  const telaReset       = document.getElementById("telaResetSenha");

  let emailRecuperacao = "";

  function mostrarTela(tela) {
    telaLogin.style.display = "none";
    telaEmail.style.display = "none";
    telaReset.style.display = "none";
    tela.style.display = "";
  }

  function mostrarAlertaLocal(idAlerta, tipo, msg) {
    const el = document.getElementById(idAlerta);
    if (!el) return;
    el.className = `alert auth-alert mt-3 alert-${tipo}`;
    el.textContent = msg;
    el.style.display = "";
  }

  function setBtnCarregando(btn, carregando, textoOriginal) {
    btn.disabled = carregando;
    btn.innerHTML = carregando
      ? `<span class="spinner-border spinner-border-sm me-2"></span>Aguarde...`
      : textoOriginal;
  }

  // Link "Esqueceu a senha?"
  document.getElementById("linkEsqueceuSenha")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarTela(telaEmail);
  });

  // Link "Voltar ao login"
  document.getElementById("linkVoltarLogin")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarTela(telaLogin);
  });

  // Link "Voltar" na tela de reset
  document.getElementById("linkVoltarEmail")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarTela(telaEmail);
  });

  // Etapa 1 — Solicitar OTP
  document.getElementById("btnSolicitarOtp")?.addEventListener("click", async () => {
    const input = document.getElementById("emailRecuperar");
    const email = input.value.trim();
    const btn   = document.getElementById("btnSolicitarOtp");

    if (!email) {
      input.classList.add("is-invalid");
      input.nextElementSibling?.classList.add("d-block");
      return;
    }
    input.classList.remove("is-invalid");

    setBtnCarregando(btn, true, "Enviar código");
    try {
      const res  = await fetch(`${URL_API_BASE}/auth/senha/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const dados = await res.json();

      if (res.ok) {
        emailRecuperacao = email;
        document.getElementById("subtituloReset").textContent =
          `Enviamos o código para ${email}. Ele expira em 10 minutos.`;
        mostrarTela(telaReset);
      } else if (res.status === 404) {
        mostrarAlertaLocal("alertaRecuperar", "danger", "Nenhuma conta encontrada com este e-mail.");
      } else {
        mostrarAlertaLocal("alertaRecuperar", "danger", dados.message || "Erro ao enviar o código.");
      }
    } catch {
      mostrarAlertaLocal("alertaRecuperar", "danger", "Erro ao conectar ao servidor.");
    } finally {
      setBtnCarregando(btn, false, "Enviar código");
    }
  });

  // Etapa 2 — Resetar senha
  document.getElementById("btnResetarSenha")?.addEventListener("click", async () => {
    const inputCodigo    = document.getElementById("codigoReset");
    const inputNova      = document.getElementById("novaSenha");
    const inputConfirmar = document.getElementById("confirmarNovaSenha");
    const btn            = document.getElementById("btnResetarSenha");

    let valido = true;

    if (!inputCodigo.value.trim()) {
      inputCodigo.classList.add("is-invalid"); valido = false;
    } else { inputCodigo.classList.remove("is-invalid"); }

    if (inputNova.value.length < 8) {
      inputNova.classList.add("is-invalid"); valido = false;
    } else { inputNova.classList.remove("is-invalid"); }

    if (inputConfirmar.value !== inputNova.value) {
      inputConfirmar.classList.add("is-invalid"); valido = false;
    } else { inputConfirmar.classList.remove("is-invalid"); }

    if (!valido) return;

    setBtnCarregando(btn, true, "Redefinir senha");
    try {
      const res = await fetch(`${URL_API_BASE}/auth/senha/resetar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:     emailRecuperacao,
          codigo:    inputCodigo.value.trim(),
          novaSenha: inputNova.value
        })
      });
      const dados = await res.json();

      if (res.ok) {
        mostrarAlertaLocal("alertaReset", "success", "Senha redefinida com sucesso! Redirecionando...");
        setTimeout(() => {
          mostrarTela(telaLogin);
          document.getElementById("alertaReset").style.display = "none";
          inputCodigo.value = "";
          inputNova.value   = "";
          inputConfirmar.value = "";
        }, 2000);
      } else if (res.status === 401) {
        mostrarAlertaLocal("alertaReset", "danger", "Código inválido ou expirado.");
      } else {
        mostrarAlertaLocal("alertaReset", "danger", dados.message || "Erro ao redefinir a senha.");
      }
    } catch {
      mostrarAlertaLocal("alertaReset", "danger", "Erro ao conectar ao servidor.");
    } finally {
      setBtnCarregando(btn, false, "Redefinir senha");
    }
  });
})();