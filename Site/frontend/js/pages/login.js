// AgriFlow - Login
(async () => {
  const usuario = Auth.usuario();
  const headlines = {
    entrar: ['Bem-vindo <span>de volta.</span>', 'Entre com suas credenciais para continuar.'],
    criar:  ['Crie sua <span>conta.</span>',     'Comece a organizar seu escritorio rural.'],
  };

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

  // Ja logado
  if (Auth.logado() && usuario) {
    document.getElementById('login-tabs').style.display   = 'none';
    const primeiroNome = usuario.nome.split(' ')[0];
    document.getElementById('login-headline').innerHTML   = 'Ola, <span>' + primeiroNome + '.</span>';
    document.getElementById('login-subline').textContent  = 'Voce ja esta conectado.';
    document.getElementById('logado-avatar').textContent  = Auth.iniciais(usuario.nome);
    document.getElementById('logado-nome').textContent    = usuario.nome;
    document.getElementById('logado-empresa').textContent = usuario.empresa_nome || 'Empresa';
    document.getElementById('logado-cargo').textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');
    document.querySelector('.login-panel.active')?.classList.remove('active');
    document.getElementById('panel-logado').classList.add('active');
    document.getElementById('btn-continuar').addEventListener('click', () => {
      window.location.href = usuario.role === 'admin' ? '/pages/visao-geral.html' : '/pages/calendario.html';
    });
    document.getElementById('btn-trocar-conta').addEventListener('click', () => {
      Auth.limpar();
      document.getElementById('login-tabs').style.display  = '';
      document.getElementById('login-headline').innerHTML  = headlines.entrar[0];
      document.getElementById('login-subline').textContent = headlines.entrar[1];
      irParaAba('entrar');
    });
    return;
  }

  // Convite na URL
  const params = new URLSearchParams(window.location.search);
  const conviteUrl = params.get('convite');
  if (conviteUrl) {
    irParaAba('criar');
    mostrarStepColab();
    document.getElementById('col-convite').value = conviteUrl;
    verificarConvite(conviteUrl);
  }

  // Escolha de tipo
  document.getElementById('card-admin').addEventListener('click', () => {
    document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selecionado'));
    document.getElementById('card-admin').classList.add('selecionado');
    setTimeout(mostrarStepAdmin, 200);
  });
  document.getElementById('card-colab').addEventListener('click', () => {
    document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selecionado'));
    document.getElementById('card-colab').classList.add('selecionado');
    setTimeout(mostrarStepColab, 200);
  });
  function mostrarStepAdmin() {
    document.getElementById('step-tipo').style.display  = 'none';
    document.getElementById('step-admin').style.display = 'block';
    document.getElementById('step-colab').style.display = 'none';
  }
  function mostrarStepColab() {
    document.getElementById('step-tipo').style.display  = 'none';
    document.getElementById('step-admin').style.display = 'none';
    document.getElementById('step-colab').style.display = 'block';
  }
  function mostrarStepTipo() {
    document.getElementById('step-tipo').style.display  = 'block';
    document.getElementById('step-admin').style.display = 'none';
    document.getElementById('step-colab').style.display = 'none';
    document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selecionado'));
  }
  document.getElementById('btn-voltar-adm').addEventListener('click', mostrarStepTipo);
  document.getElementById('btn-voltar-colab').addEventListener('click', mostrarStepTipo);

  // Login
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const spin    = document.getElementById('login-spin');
    const btnText = document.getElementById('login-btn-text');
    const btn     = document.getElementById('btn-login');
    errorEl.classList.remove('show');
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Entrando...';
    btn.disabled = true;
    try {
      const data = await API.post('/api/auth/login', {
        email: document.getElementById('email').value.trim(),
        senha: document.getElementById('senha').value,
      });
      Auth.salvar(data.token, data.usuario);
      window.location.href = data.usuario.role === 'admin' ? '/pages/visao-geral.html' : '/pages/calendario.html';
    } catch(err) {
      document.getElementById('login-error-msg').textContent = err.message || 'Credenciais invalidas';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Entrar na conta';
      btn.disabled = false;
    }
  });

  // Cadastro Admin
  document.getElementById('form-admin').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = document.getElementById('adm-error');
    const spin    = document.getElementById('adm-spin');
    const btnText = document.getElementById('adm-btn-text');
    const btn     = document.getElementById('btn-adm');
    errorEl.classList.remove('show');
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Criando...';
    btn.disabled = true;
    try {
      const data = await API.post('/api/auth/register', {
        tipo:         'admin',
        empresa_nome: document.getElementById('adm-empresa').value.trim(),
        nome:         document.getElementById('adm-nome').value.trim(),
        cargo:        document.getElementById('adm-cargo').value.trim(),
        email:        document.getElementById('adm-email').value.trim(),
        telefone:     document.getElementById('adm-telefone').value.trim(),
        senha:        document.getElementById('adm-senha').value,
      });
      Auth.salvar(data.token, data.usuario);
      window.location.href = '/pages/visao-geral.html';
    } catch(err) {
      document.getElementById('adm-error-msg').textContent = err.message || 'Erro ao criar conta';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Criar escritorio';
      btn.disabled = false;
    }
  });

  // Verificar convite
  let conviteToken = null;
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
    btn.disabled = true;
    try {
      const data = await API.get('/api/auth/convite/' + token);
      conviteToken = token;
      document.getElementById('convite-empresa-nome').textContent = data.empresa_nome;
      document.getElementById('col-passo1').style.display = 'none';
      document.getElementById('col-passo2').style.display = 'block';
    } catch(err) {
      document.getElementById('col-error-msg').textContent = err.message || 'Link invalido ou expirado';
      errorEl.classList.add('show');
    } finally {
      spin.style.display  = 'none';
      btnText.textContent = 'Verificar convite';
      btn.disabled = false;
    }
  }

  // Cadastro Colaborador
  document.getElementById('form-colab').addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = document.getElementById('col-error');
    const spin    = document.getElementById('colab-spin');
    const btnText = document.getElementById('colab-btn-text');
    const btn     = document.getElementById('btn-colab');
    errorEl.classList.remove('show');
    spin.style.display  = 'inline-block';
    btnText.textContent = 'Criando conta...';
    btn.disabled = true;
    try {
      const data = await API.post('/api/auth/register', {
        tipo:          'colaborador',
        convite_token: conviteToken,
        email:         document.getElementById('col-email').value.trim(),
        senha:         document.getElementById('col-senha').value,
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
      btn.disabled = false;
    }
  });
})();
