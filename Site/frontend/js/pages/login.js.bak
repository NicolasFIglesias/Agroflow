// ============================================================
// AgriFlow — Login (abas animadas)
// ============================================================

(async () => {
  const usuario = Auth.usuario();

  // ── Troca de abas com animação de subir ─────────────────────
  function irParaAba(nomeAba) {
    const painelAtual = document.querySelector('.login-panel.active');
    const novoPanel   = document.getElementById('panel-' + nomeAba);
    if (!novoPanel || painelAtual === novoPanel) return;

    // Animar saída do painel atual
    painelAtual.classList.add('saindo');
    painelAtual.addEventListener('animationend', () => {
      painelAtual.classList.remove('active', 'saindo');
    }, { once: true });

    // Animar entrada do novo painel (pequeno delay para sincronizar)
    setTimeout(() => {
      novoPanel.classList.add('active');
    }, 80);

    // Atualizar abas ativas
    document.querySelectorAll('.login-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === nomeAba);
    });
  }

  // Clique nas abas
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => irParaAba(tab.dataset.tab));
  });

  // ── Já logado? Mostrar painel "já conectado" ────────────────
  if (Auth.logado() && usuario) {
    // Esconder abas (não fazem sentido se já logado)
    document.getElementById('login-tabs').style.display = 'none';

    document.getElementById('logado-avatar').textContent  = Auth.iniciais(usuario.nome);
    document.getElementById('logado-nome').textContent    = usuario.nome;
    document.getElementById('logado-empresa').textContent = usuario.empresa_nome || 'Empresa';
    document.getElementById('logado-cargo').textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');

    // Desativar painel padrão e ativar o de logado
    document.querySelector('.login-panel.active')?.classList.remove('active');
    document.getElementById('panel-logado').classList.add('active');

    document.getElementById('btn-continuar').addEventListener('click', () => {
      window.location.href = '/pages/calendario.html';
    });

    document.getElementById('btn-trocar-conta').addEventListener('click', () => {
      Auth.limpar();
      document.getElementById('login-tabs').style.display = '';
      irParaAba('entrar');
      document.getElementById('email').focus();
    });

    return;
  }

  // ── Formulário de login ─────────────────────────────────────
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();

    const errorEl = document.getElementById('login-error');
    const spin    = document.getElementById('login-spin');
    const btnText = document.getElementById('login-btn-text');
    const btn     = document.getElementById('btn-login');
    const email   = document.getElementById('email').value.trim();
    const senha   = document.getElementById('senha').value;

    errorEl.classList.remove('show');
    spin.style.display = 'inline-block';
    btnText.textContent = 'Entrando...';
    btn.disabled = true;

    try {
      const data = await API.post('/api/auth/login', { email, senha });
      Auth.salvar(data.token, data.usuario);
      window.location.href = '/pages/calendario.html';
    } catch (err) {
      document.getElementById('login-error-msg').textContent = err.message || 'Credenciais inválidas';
      errorEl.classList.add('show');
    } finally {
      spin.style.display = 'none';
      btnText.textContent = 'Entrar na conta';
      btn.disabled = false;
    }
  });

  // ── Formulário de cadastro ──────────────────────────────────
  document.getElementById('form-cadastro').addEventListener('submit', async e => {
    e.preventDefault();

    const errorEl    = document.getElementById('cad-error');
    const spin       = document.getElementById('cad-spin');
    const btnText    = document.getElementById('cad-btn-text');
    const btn        = document.getElementById('btn-cadastro');

    const empresa_nome = document.getElementById('cad-empresa').value.trim();
    const nome         = document.getElementById('cad-nome').value.trim();
    const cargo        = document.getElementById('cad-cargo').value.trim();
    const email        = document.getElementById('cad-email').value.trim();
    const senha        = document.getElementById('cad-senha').value;
    const confirmar    = document.getElementById('cad-confirmar').value;

    errorEl.classList.remove('show');

    if (senha !== confirmar) {
      document.getElementById('cad-error-msg').textContent = 'As senhas não coincidem';
      errorEl.classList.add('show');
      return;
    }

    spin.style.display = 'inline-block';
    btnText.textContent = 'Criando conta...';
    btn.disabled = true;

    try {
      const data = await API.post('/api/auth/register', { empresa_nome, nome, cargo, email, senha });
      Auth.salvar(data.token, data.usuario);
      window.location.href = '/pages/calendario.html';
    } catch (err) {
      document.getElementById('cad-error-msg').textContent = err.message || 'Erro ao criar conta';
      errorEl.classList.add('show');
    } finally {
      spin.style.display = 'none';
      btnText.textContent = 'Criar conta';
      btn.disabled = false;
    }
  });
})();
