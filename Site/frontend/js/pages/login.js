// AgriFlow - Login

// ── Intro + warmup ───────────────────────────────────────────
const _INTRO_MIN = 2000;
const _INTRO_MAX = 7000;

const _warmupPromise = (function () {
  try {
    return fetch(CONFIG.API_URL + '/api/warmup').then(() => {}).catch(() => {});
  } catch (_) { return Promise.resolve(); }
})();

const _introStarted = Date.now();
const _introEl = document.getElementById('login-intro');
const _wrapEl  = document.getElementById('login-wrap');

_introEl.style.setProperty('--intro-dur', (_INTRO_MAX / 1000) + 's');

async function _finalizarIntro() {
  const elapsed   = Date.now() - _introStarted;
  const remaining = Math.max(0, _INTRO_MIN - elapsed);
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
  _introEl.classList.add('saindo');
  _wrapEl.style.transition    = 'opacity .45s ease';
  _wrapEl.style.opacity       = '1';
  _wrapEl.style.pointerEvents = '';
  setTimeout(() => _introEl.remove(), 520);
}

Promise.race([_warmupPromise, new Promise(r => setTimeout(r, _INTRO_MAX))])
  .then(_finalizarIntro);

(async () => {
  let _trocandoConta  = false;
  let _emailRecuperar = '';
  let conviteToken    = null;

  const usuario = Auth.usuario();
  const headlines = {
    entrar:    ['Bem-vindo <span>de volta.</span>', 'Entre com suas credenciais para continuar.'],
    criar:     ['Crie sua <span>conta.</span>',     'Comece a organizar seu escritório rural.'],
    recuperar: ['Recuperar <span>acesso.</span>',   'Vamos redefinir sua senha rapidinho.'],
  };

  // ── Helpers ───────────────────────────────────────────────
  function _redirecionar(u) {
    window.location.href =
      u.role === 'superdev' ? '/pages/dev.html' :
      u.role === 'admin'    ? '/pages/visao-geral.html' :
                              '/pages/calendario.html';
  }

  // ── Navegação de painéis ──────────────────────────────────
  function irParaAba(nomeAba) {
    const painelAtual = document.querySelector('.login-panel.active');
    const novoPanel   = document.getElementById('panel-' + nomeAba);
    if (!novoPanel || painelAtual === novoPanel) return;
    painelAtual.classList.add('saindo');
    painelAtual.addEventListener('animationend', () => {
      painelAtual.classList.remove('active', 'saindo');
    }, { once: true });
    setTimeout(() => novoPanel.classList.add('active'), 80);
    document.querySelectorAll('.login-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === nomeAba)
    );
    if (headlines[nomeAba]) {
      document.getElementById('login-headline').innerHTML  = headlines[nomeAba][0];
      document.getElementById('login-subline').textContent = headlines[nomeAba][1];
    }
  }

  document.querySelectorAll('.login-tab').forEach(tab =>
    tab.addEventListener('click', () => irParaAba(tab.dataset.tab))
  );

  // ── Botões de mostrar/ocultar senha ──────────────────────────
  function _olhoAberto() {
    return `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="3" stroke-width="2"/>
    </svg>`;
  }
  function _olhoFechado() {
    return `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke-width="2" stroke-linecap="round"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke-width="2" stroke-linecap="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  document.querySelectorAll('.toggle-senha').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const mostrar = input.type === 'password';
      input.type    = mostrar ? 'text' : 'password';
      btn.innerHTML = mostrar ? _olhoFechado() : _olhoAberto();
    });
  });

  // ── Escolha de tipo ──────────────────────────────────────
  // Registrado antes do early-return para funcionar mesmo quando logado e
  // o usuário navega até o painel "criar" pelo botão "trocar conta".
  function mostrarStep(step) {
    document.getElementById('step-tipo').style.display  = step === 'tipo'  ? 'block' : 'none';
    document.getElementById('step-admin').style.display = step === 'admin' ? 'block' : 'none';
    document.getElementById('step-colab').style.display = step === 'colab' ? 'block' : 'none';
    if (step === 'tipo') document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selecionado'));
  }

  document.querySelectorAll('.tipo-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selecionado'));
      card.classList.add('selecionado');
      setTimeout(() => mostrarStep(card.id === 'card-admin' ? 'admin' : 'colab'), 200);
    });
  });

  document.getElementById('btn-voltar-adm').addEventListener('click', () => mostrarStep('tipo'));
  document.getElementById('btn-voltar-colab').addEventListener('click', () => mostrarStep('tipo'));

  // ── Já logado ─────────────────────────────────────────────
  if (Auth.logado() && usuario) {
    const primeiroNome = usuario.nome.split(' ')[0];
    document.getElementById('login-tabs').style.display   = 'none';
    document.getElementById('login-headline').innerHTML   = 'Olá, <span>' + primeiroNome + '.</span>';
    document.getElementById('login-subline').textContent  = 'Você já está conectado.';
    document.getElementById('logado-avatar').textContent  = Auth.iniciais(usuario.nome);
    document.getElementById('logado-nome').textContent    = usuario.nome;
    document.getElementById('logado-empresa').textContent = usuario.empresa_nome || 'Empresa';
    document.getElementById('logado-cargo').textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');
    document.querySelector('.login-panel.active')?.classList.remove('active');
    document.getElementById('panel-logado').classList.add('active');

    document.getElementById('btn-continuar').addEventListener('click', () => _redirecionar(usuario));

    document.getElementById('btn-trocar-conta').addEventListener('click', () => {
      _trocandoConta = true;
      document.getElementById('login-tabs').style.display  = '';
      document.getElementById('login-headline').innerHTML  = headlines.entrar[0];
      document.getElementById('login-subline').textContent = headlines.entrar[1];
      const bar = document.getElementById('continuar-como-bar');
      bar.style.display = '';
      document.getElementById('continuar-como-nome').textContent = primeiroNome;
      irParaAba('entrar');
    });

    document.getElementById('btn-continuar-como')?.addEventListener('click', () => {
      _trocandoConta = false;
      document.getElementById('continuar-como-bar').style.display = 'none';
      document.getElementById('login-tabs').style.display          = 'none';
      document.getElementById('login-headline').innerHTML          = 'Olá, <span>' + primeiroNome + '.</span>';
      document.getElementById('login-subline').textContent         = 'Você já está conectado.';
      irParaAba('logado');
    });

    return;
  }

  // ── Convite na URL ────────────────────────────────────────
  const params     = new URLSearchParams(window.location.search);
  const conviteUrl = params.get('convite');
  if (conviteUrl) {
    irParaAba('criar');
    mostrarStep('colab');
    document.getElementById('col-convite').value = conviteUrl;
    verificarConvite(conviteUrl);
  }

  // ── Login ─────────────────────────────────────────────────
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const spin    = document.getElementById('login-spin');
    const btnText = document.getElementById('login-btn-text');
    const btn     = document.getElementById('btn-login');
    errorEl.classList.remove('show');
    spin.style.display  = 'inline-block';
    btn.disabled        = true;
    btnText.textContent = 'Entrando...';
    try {
      const data = await API.post('/api/auth/login', {
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value,
      });
      if (_trocandoConta) Auth.limpar();
      Auth.salvar(data.token, data.usuario);
      _redirecionar(data.usuario);
    } catch(err) {
      document.getElementById('senha').value = '';
      const msg = (err.message || '').toLowerCase();
      document.getElementById('login-error-msg').textContent =
        msg.includes('credencial') || msg.includes('inválid') || msg.includes('incorret')
          ? 'E-mail ou senha incorretos. Tente novamente.'
          : err.message || 'Erro ao conectar. Tente novamente.';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Entrar na conta';
      btn.disabled        = false;
    }
  });

  // ── Esqueci minha senha ───────────────────────────────────
  document.getElementById('btn-esqueci').addEventListener('click', () => {
    const emailAtual = document.getElementById('email').value.trim();
    if (emailAtual) document.getElementById('rec-email').value = emailAtual;
    document.getElementById('login-tabs').style.display = 'none';
    irParaAba('recuperar');
  });

  document.getElementById('btn-voltar-rec').addEventListener('click', () => {
    document.getElementById('login-tabs').style.display = '';
    irParaAba('entrar');
  });

  document.getElementById('btn-enviar-codigo').addEventListener('click', async () => {
    const email     = document.getElementById('rec-email').value.trim();
    const errorEl   = document.getElementById('rec-error');
    const successEl = document.getElementById('rec-success');
    const spin      = document.getElementById('rec-spin');
    const btnText   = document.getElementById('rec-btn-text');
    const btn       = document.getElementById('btn-enviar-codigo');

    errorEl.classList.remove('show');
    successEl.style.display = 'none';
    if (!email) {
      document.getElementById('rec-error-msg').textContent = 'Informe seu e-mail.';
      errorEl.classList.add('show');
      return;
    }

    spin.style.display  = 'inline-block';
    btnText.textContent = 'Enviando...';
    btn.disabled        = true;

    try {
      await API.post('/api/auth/recuperar-senha', { email });
      _emailRecuperar = email;
      document.getElementById('rec-success-msg').textContent = 'Código enviado! Verifique seu e-mail.';
      successEl.style.display = 'flex';
      setTimeout(() => {
        document.getElementById('rec-passo1').style.display = 'none';
        document.getElementById('rec-passo2').style.display = 'block';
        document.getElementById('rec-codigo').focus();
      }, 800);
    } catch(err) {
      document.getElementById('rec-error-msg').textContent = err.message || 'Não foi possível enviar o código.';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Enviar código';
      btn.disabled        = false;
    }
  });

  document.getElementById('btn-nova-senha').addEventListener('click', async () => {
    const codigo  = document.getElementById('rec-codigo').value.trim();
    const nova    = document.getElementById('rec-nova-senha').value;
    const conf    = document.getElementById('rec-conf-senha').value;
    const errorEl = document.getElementById('rec2-error');
    const spin    = document.getElementById('rec2-spin');
    const btnText = document.getElementById('rec2-btn-text');
    const btn     = document.getElementById('btn-nova-senha');

    errorEl.classList.remove('show');
    if (!codigo || codigo.length !== 6) {
      document.getElementById('rec2-error-msg').textContent = 'Informe o código de 6 dígitos.';
      errorEl.classList.add('show');
      return;
    }
    if (!nova || nova.length < 6) {
      document.getElementById('rec2-error-msg').textContent = 'A senha deve ter ao menos 6 caracteres.';
      errorEl.classList.add('show');
      return;
    }
    if (nova !== conf) {
      document.getElementById('rec2-error-msg').textContent = 'As senhas não coincidem.';
      errorEl.classList.add('show');
      return;
    }

    spin.style.display  = 'inline-block';
    btnText.textContent = 'Salvando...';
    btn.disabled        = true;

    try {
      await API.post('/api/auth/nova-senha', { email: _emailRecuperar, codigo, nova_senha: nova });
      const data = await API.post('/api/auth/login', { email: _emailRecuperar, senha: nova });
      Auth.salvar(data.token, data.usuario);
      _redirecionar(data.usuario);
    } catch(err) {
      document.getElementById('rec2-error-msg').textContent = err.message || 'Código inválido ou expirado.';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Redefinir senha';
      btn.disabled        = false;
    }
  });

  document.getElementById('btn-reenviar')?.addEventListener('click', () => {
    document.getElementById('rec-passo2').style.display = 'none';
    document.getElementById('rec-passo1').style.display = 'block';
    document.getElementById('rec-codigo').value         = '';
    document.getElementById('rec-nova-senha').value     = '';
    document.getElementById('rec-conf-senha').value     = '';
    document.getElementById('rec2-error').classList.remove('show');
  });

  // ── Força da senha ────────────────────────────────────────
  function calcularForca(senha) {
    const checks = {
      upper: /[A-Z]/.test(senha),
      lower: /[a-z]/.test(senha),
      num:   /[0-9]/.test(senha),
      esp:   /[^A-Za-z0-9]/.test(senha),
      len:   senha.length >= 8,
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { score, checks };
  }

  const FORCA_LABELS = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const FORCA_CORES  = ['', '#E24B4A', '#BA7517', '#BA7517', '#378ADD', '#639922'];

  function atualizarSenha(senha, fillId, labelId, prefix) {
    const { score, checks } = calcularForca(senha);
    const fill  = document.getElementById(fillId);
    const label = document.getElementById(labelId);
    if (fill && label) {
      if (!senha) {
        fill.style.width      = '0%';
        fill.style.background = '';
        label.textContent     = '—';
        label.style.color     = '';
      } else {
        fill.style.width      = (score / 5 * 100) + '%';
        fill.style.background = FORCA_CORES[score] || '#639922';
        label.textContent     = FORCA_LABELS[score] || '';
        label.style.color     = FORCA_CORES[score] || '';
      }
    }
    if (prefix) {
      const map = { upper: 'upper', lower: 'lower', num: 'num', esp: 'esp' };
      for (const [key] of Object.entries(map)) {
        const el = document.getElementById(prefix + '-req-' + key);
        if (el) el.classList.toggle('ok', checks[key]);
      }
    }
  }

  document.getElementById('adm-senha')?.addEventListener('input', function() {
    atualizarSenha(this.value, 'adm-meter-fill', 'adm-meter-label', 'adm');
  });
  document.getElementById('col-senha')?.addEventListener('input', function() {
    atualizarSenha(this.value, 'col-meter-fill', 'col-meter-label', 'col');
  });
  document.getElementById('rec-nova-senha')?.addEventListener('input', function() {
    atualizarSenha(this.value, 'rec-meter-fill', 'rec-meter-label', null);
  });

  // ── Cadastro Admin ────────────────────────────────────────
  document.getElementById('form-admin').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl   = document.getElementById('adm-error');
    const spin      = document.getElementById('adm-spin');
    const btnText   = document.getElementById('adm-btn-text');
    const btn       = document.getElementById('btn-adm');
    const senha     = document.getElementById('adm-senha').value;
    const senhaConf = document.getElementById('adm-senha-conf').value;

    errorEl.classList.remove('show');
    if (senha !== senhaConf) {
      document.getElementById('adm-error-msg').textContent = 'As senhas não coincidem.';
      errorEl.classList.add('show');
      return;
    }

    btn.disabled        = true;
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Criando...';

    try {
      const data = await API.post('/api/auth/register', {
        tipo:         'admin',
        empresa_nome: document.getElementById('adm-empresa').value.trim(),
        nome:         document.getElementById('adm-nome').value.trim(),
        cargo:        document.getElementById('adm-cargo').value.trim(),
        email:        document.getElementById('adm-email').value.trim(),
        telefone:     document.getElementById('adm-telefone').value.trim(),
        senha,
      });
      Auth.salvar(data.token, data.usuario);
      window.location.href = '/pages/visao-geral.html';
    } catch(err) {
      document.getElementById('adm-error-msg').textContent = err.message || 'Erro ao criar conta';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Criar escritório';
      btn.disabled        = false;
    }
  });

  // ── Verificar convite ─────────────────────────────────────
  document.getElementById('btn-verificar-convite').addEventListener('click', async () => {
    const val   = document.getElementById('col-convite').value.trim();
    const token = val.includes('?convite=') ? val.split('?convite=')[1].split('&')[0] : val;
    await verificarConvite(token);
  });

  async function verificarConvite(token) {
    const errorEl = document.getElementById('col-error');
    const spin    = document.getElementById('col-spin');
    const btnText = document.getElementById('col-verify-text');
    const btn     = document.getElementById('btn-verificar-convite');
    errorEl.classList.remove('show');
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Verificando...';
    btn.disabled        = true;
    try {
      const data = await API.get('/api/auth/convite/' + token);
      conviteToken = token;
      document.getElementById('convite-empresa-nome').textContent = data.empresa_nome;
      document.getElementById('col-passo1').style.display = 'none';
      document.getElementById('col-passo2').style.display = 'block';
    } catch(err) {
      document.getElementById('col-error-msg').textContent = err.message || 'Link inválido ou expirado';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Verificar convite';
      btn.disabled        = false;
    }
  }

  // ── Cadastro Colaborador ──────────────────────────────────
  document.getElementById('form-colab').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl   = document.getElementById('col-error');
    const spin      = document.getElementById('colab-spin');
    const btnText   = document.getElementById('colab-btn-text');
    const btn       = document.getElementById('btn-colab');
    const senha     = document.getElementById('col-senha').value;
    const senhaConf = document.getElementById('col-senha-conf').value;

    errorEl.classList.remove('show');
    if (senha !== senhaConf) {
      document.getElementById('col-error-msg').textContent = 'As senhas não coincidem.';
      errorEl.classList.add('show');
      return;
    }

    btn.disabled        = true;
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Criando conta...';

    try {
      const data = await API.post('/api/auth/register', {
        tipo:          'colaborador',
        convite_token: conviteToken,
        email:         document.getElementById('col-email').value.trim(),
        senha,
        cargo:         document.getElementById('col-cargo').value,
      });
      Auth.salvar(data.token, data.usuario);
      window.location.href = '/pages/calendario.html';
    } catch(err) {
      document.getElementById('col-error-msg').textContent = err.message || 'Erro ao criar conta';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Criar minha conta';
      btn.disabled        = false;
    }
  });
})();
