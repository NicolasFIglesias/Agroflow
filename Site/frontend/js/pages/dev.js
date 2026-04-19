// ============================================================
// AgriFlow — Dev Panel
// ============================================================
(async () => {
  const TOKEN_KEY = 'agriflow_dev_token';
  const API_BASE  = CONFIG.API_URL;
  let _token        = localStorage.getItem(TOKEN_KEY) || '';
  let _empresaAtiva = null;
  let _dadosAtivos  = null;
  let _dadosOverview= null;

  // ── Autenticação ────────────────────────────────────────────
  function devHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token}` };
  }

  async function devGet(path) {
    const r = await fetch(API_BASE + path, { headers: devHeaders() });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); }
    return r.json();
  }

  async function devPut(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: devHeaders(),
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); }
    return r.json();
  }

  // ── Login ───────────────────────────────────────────────────
  const loginScreen = document.getElementById('dev-login-screen');
  const panel       = document.getElementById('dev-panel');

  async function tentarLogin() {
    const email = document.getElementById('dev-email').value.trim();
    const senha = document.getElementById('dev-senha').value;
    const errEl = document.getElementById('dev-login-error');
    const spin  = document.getElementById('dev-login-spin');
    const btnTxt= document.getElementById('dev-login-text');
    const btn   = document.getElementById('btn-dev-login');

    errEl.classList.remove('show');
    spin.style.display = 'inline-block';
    btnTxt.textContent = 'Entrando...';
    btn.disabled = true;

    try {
      const r = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Credenciais inválidas');
      if (data.usuario.role !== 'superdev') throw new Error('Acesso negado — apenas superdev');

      _token = data.token;
      localStorage.setItem(TOKEN_KEY, _token);
      mostrarPainel();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    } finally {
      spin.style.display = 'none';
      btnTxt.textContent = 'Entrar';
      btn.disabled = false;
    }
  }

  document.getElementById('btn-dev-login').addEventListener('click', tentarLogin);
  document.getElementById('dev-senha').addEventListener('keydown', e => { if (e.key === 'Enter') tentarLogin(); });

  document.getElementById('btn-dev-logout').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    _token = '';
    panel.style.display = 'none';
    loginScreen.style.display = '';
  });

  // ── Inicialização do painel ─────────────────────────────────
  async function mostrarPainel() {
    loginScreen.style.display = 'none';
    panel.style.display = 'flex';
    await carregarOverview();
  }

  async function carregarOverview() {
    try {
      const data = await devGet('/api/dev/overview');
      _dadosOverview = data;
      renderTotais(data.totais);
      renderListaEmpresas(data.empresas);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem(TOKEN_KEY);
        panel.style.display = 'none';
        loginScreen.style.display = '';
        document.getElementById('dev-login-error').textContent = 'Sessão expirada, faça login novamente.';
        document.getElementById('dev-login-error').classList.add('show');
      }
    }
  }

  function renderTotais(t) {
    document.getElementById('dev-totais').innerHTML = `
      <span class="dev-total-chip"><strong>${t.total_empresas}</strong> empresas</span>
      <span class="dev-total-chip"><strong>${t.total_usuarios}</strong> usuários</span>
      <span class="dev-total-chip"><strong>${t.total_clientes}</strong> clientes</span>
      <span class="dev-total-chip"><strong>${t.total_imoveis}</strong> imóveis</span>
      <span class="dev-total-chip"><strong>${t.total_tarefas}</strong> tarefas</span>
    `;
  }

  function renderListaEmpresas(empresas) {
    const lista = document.getElementById('dev-empresas-lista');
    if (!empresas.length) {
      lista.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:.8rem">Nenhuma empresa</div>';
      return;
    }
    lista.innerHTML = empresas.map(e => `
      <div class="dev-empresa-item" data-id="${e.id}" data-nome="${_esc(e.nome)}">
        <div class="dev-empresa-nome">${_esc(e.nome)}</div>
        <div class="dev-empresa-meta">${e.total_usuarios}u · ${e.total_clientes}c · ${e.total_imoveis}i</div>
      </div>
    `).join('');

    lista.querySelectorAll('.dev-empresa-item').forEach(el => {
      el.addEventListener('click', () => selecionarEmpresa(el.dataset.id, el.dataset.nome, empresas.find(e => e.id === el.dataset.id)));
    });
  }

  async function selecionarEmpresa(id, nome, empresa) {
    _empresaAtiva = id;
    document.querySelectorAll('.dev-empresa-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });

    const main = document.getElementById('dev-main');
    main.innerHTML = '<div class="dev-loading"><span class="dev-spin"></span> Carregando...</div>';

    try {
      const [usuarios, dados] = await Promise.all([
        devGet(`/api/dev/empresas/${id}/usuarios`),
        devGet(`/api/dev/empresas/${id}/dados`),
      ]);
      _dadosAtivos = { empresa, usuarios, ...dados };
      renderEmpresaDetalhe(main, nome, empresa, usuarios, dados);
    } catch (err) {
      main.innerHTML = `<div class="dev-loading" style="color:var(--red)">Erro: ${err.message}</div>`;
    }
  }

  function renderEmpresaDetalhe(main, nome, empresa, usuarios, dados) {
    const stats = empresa || {};
    main.innerHTML = `
      <div class="dev-empresa-header">
        <div class="dev-empresa-title">${_esc(nome)}</div>
        <div style="font-size:.75rem;color:var(--muted);font-family:var(--mono)">${_empresaAtiva}</div>
      </div>

      <div class="dev-empresa-stats">
        <div class="dev-stat"><div class="dev-stat-val">${usuarios.length}</div><div class="dev-stat-label">Usuários</div></div>
        <div class="dev-stat"><div class="dev-stat-val">${dados.clientes.length}</div><div class="dev-stat-label">Clientes</div></div>
        <div class="dev-stat"><div class="dev-stat-val">${dados.imoveis.length}</div><div class="dev-stat-label">Imóveis</div></div>
        <div class="dev-stat"><div class="dev-stat-val">${dados.tarefas.length}</div><div class="dev-stat-label">Tarefas</div></div>
        <div class="dev-stat"><div class="dev-stat-val">${dados.projetos.length}</div><div class="dev-stat-label">Projetos</div></div>
      </div>

      <div class="dev-tabs">
        <button class="dev-tab active" data-tab="usuarios">Usuários</button>
        <button class="dev-tab" data-tab="clientes">Clientes</button>
        <button class="dev-tab" data-tab="imoveis">Imóveis</button>
        <button class="dev-tab" data-tab="tarefas">Tarefas</button>
        <button class="dev-tab" data-tab="projetos">Projetos</button>
      </div>

      <div id="tab-usuarios" class="dev-tab-panel active">${renderTabUsuarios(usuarios)}</div>
      <div id="tab-clientes" class="dev-tab-panel">${renderTabClientes(dados.clientes)}</div>
      <div id="tab-imoveis"  class="dev-tab-panel">${renderTabImoveis(dados.imoveis)}</div>
      <div id="tab-tarefas"  class="dev-tab-panel">${renderTabTarefas(dados.tarefas)}</div>
      <div id="tab-projetos" class="dev-tab-panel">${renderTabProjetos(dados.projetos)}</div>
    `;

    // Tabs
    main.querySelectorAll('.dev-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        main.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        main.querySelectorAll('.dev-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        main.querySelector('#tab-' + tab.dataset.tab)?.classList.add('active');
      });
    });

    // Botões de reset de senha
    main.querySelectorAll('.btn-dev-reset').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const inp = row.querySelector('.dev-reset-input');
        const salvar = row.querySelector('.dev-btn-salvar');
        const cancel = row.querySelector('.dev-btn-cancel');
        inp.classList.add('show');
        salvar.style.display = '';
        cancel.style.display = '';
        btn.style.display = 'none';
        inp.focus();
      });
    });

    main.querySelectorAll('.dev-btn-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        row.querySelector('.dev-reset-input').classList.remove('show');
        row.querySelector('.dev-btn-salvar').style.display = 'none';
        btn.style.display = 'none';
        row.querySelector('.btn-dev-reset').style.display = '';
      });
    });

    main.querySelectorAll('.dev-btn-salvar').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const uid = btn.dataset.uid;
        const nova = row.querySelector('.dev-reset-input').value;
        if (!nova) return;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          await devPut(`/api/dev/usuarios/${uid}/senha`, { nova_senha: nova });
          btn.textContent = '✓ Salvo';
          btn.style.background = 'var(--green-bg)';
          setTimeout(() => {
            row.querySelector('.dev-reset-input').classList.remove('show');
            row.querySelector('.dev-reset-input').value = '';
            row.querySelector('.dev-btn-cancel').style.display = 'none';
            row.querySelector('.btn-dev-reset').style.display = '';
            btn.textContent = 'Salvar';
            btn.disabled = false;
            btn.style.background = '';
          }, 1500);
        } catch (err) {
          btn.textContent = '✗ Erro';
          btn.disabled = false;
          alert('Erro: ' + err.message);
        }
      });
    });

    // Cofre — clientes
    main.querySelectorAll('.dev-btn-cofre').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.cid;
        const row = btn.closest('tr');
        btn.textContent = '...';
        btn.disabled = true;
        try {
          const cofre = await devGet(`/api/dev/clientes/${cid}/cofre`);
          const panel = row.nextElementSibling;
          if (panel && panel.classList.contains('dev-cofre-expand')) {
            panel.remove();
            btn.textContent = 'Cofre';
            btn.disabled = false;
            return;
          }
          const tr = document.createElement('tr');
          tr.className = 'dev-cofre-expand';
          tr.innerHTML = `<td colspan="6" style="padding:0">
            <div style="padding:12px 16px;background:var(--surface2);border-bottom:1px solid var(--border)">
              ${cofre.length === 0
                ? '<span style="color:var(--muted);font-size:.8rem">Cofre vazio</span>'
                : `<table class="dev-table">
                    <thead><tr><th>Título</th><th>Login</th><th>Senha</th><th>URL</th></tr></thead>
                    <tbody>${cofre.map(s => `
                      <tr>
                        <td>${_esc(s.titulo || '—')}</td>
                        <td>${_esc(s.login || '—')}</td>
                        <td>
                          <span class="dev-senha-reveal oculta" data-senha="${_esc(s.senha_dec || '')}">••••••••</span>
                        </td>
                        <td>${s.url ? `<a href="${_esc(s.url)}" target="_blank" style="color:var(--blue)">${_esc(s.url)}</a>` : '—'}</td>
                      </tr>
                    `).join('')}
                    </tbody>
                   </table>`
              }
            </div>
          </td>`;
          row.after(tr);

          // Toggle senha
          tr.querySelectorAll('.dev-senha-reveal').forEach(el => {
            el.addEventListener('click', () => {
              const oculta = el.classList.toggle('oculta');
              el.textContent = oculta ? '••••••••' : el.dataset.senha;
            });
          });
        } catch (err) {
          alert('Erro ao carregar cofre: ' + err.message);
        }
        btn.textContent = 'Cofre';
        btn.disabled = false;
      });
    });
  }

  function renderTabUsuarios(usuarios) {
    if (!usuarios.length) return '<div class="dev-loading" style="color:var(--muted)">Nenhum usuário</div>';
    return `<table class="dev-table">
      <thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>Papel</th><th>Status</th><th>Nova Senha</th></tr></thead>
      <tbody>${usuarios.map(u => `
        <tr>
          <td>${_esc(u.nome)}</td>
          <td style="color:var(--blue)">${_esc(u.email)}</td>
          <td>${_esc(u.cargo || '—')}</td>
          <td><span class="dev-tag dev-tag-${u.role === 'admin' ? 'admin' : 'colab'}">${u.role}</span></td>
          <td><span class="dev-tag ${u.ativo ? 'dev-tag-colab' : 'dev-tag-inativo'}">${u.ativo ? 'ativo' : 'inativo'}</span></td>
          <td>
            <div class="dev-reset-row">
              <input class="dev-reset-input" type="text" placeholder="nova senha">
              <button class="dev-btn-sm dev-btn-reset btn-dev-reset">Resetar</button>
              <button class="dev-btn-sm dev-btn-salvar" data-uid="${u.id}" style="display:none">Salvar</button>
              <button class="dev-btn-sm dev-btn-cancel" style="display:none">✕</button>
            </div>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function renderTabClientes(clientes) {
    if (!clientes.length) return '<div class="dev-loading" style="color:var(--muted)">Nenhum cliente</div>';
    return `<table class="dev-table">
      <thead><tr><th>Nome</th><th>Tipo</th><th>CPF/CNPJ</th><th>Celular</th><th>Município/UF</th><th>Cofre</th></tr></thead>
      <tbody>${clientes.map(c => `
        <tr>
          <td>${_esc(c.nome_completo)}</td>
          <td><span class="dev-tag dev-tag-${c.tipo_pessoa === 'PF' ? 'colab' : 'admin'}">${c.tipo_pessoa}</span></td>
          <td style="color:var(--muted)">${_esc(c.cpf || c.cnpj || '—')}</td>
          <td>${_esc(c.celular || '—')}</td>
          <td>${_esc([c.municipio, c.uf].filter(Boolean).join('/') || '—')}</td>
          <td><button class="dev-btn-sm dev-btn-reset dev-btn-cofre" data-cid="${c.id}">Cofre</button></td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function renderTabImoveis(imoveis) {
    if (!imoveis.length) return '<div class="dev-loading" style="color:var(--muted)">Nenhum imóvel</div>';
    return `<table class="dev-table">
      <thead><tr><th>Denominação</th><th>Município/UF</th><th>Área</th><th>CAR</th><th>CCIR venc.</th></tr></thead>
      <tbody>${imoveis.map(i => `
        <tr>
          <td>${_esc(i.denominacao || '—')}</td>
          <td>${_esc([i.municipio, i.uf].filter(Boolean).join('/') || '—')}</td>
          <td style="color:var(--muted)">${i.area_total ? i.area_total + ' ha' : '—'}</td>
          <td><span class="dev-tag dev-tag-${i.car_status === 'ativo' ? 'colab' : 'inativo'}">${_esc(i.car_status || '—')}</span></td>
          <td style="color:var(--muted)">${i.ccir_vencimento ? new Date(i.ccir_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function renderTabTarefas(tarefas) {
    if (!tarefas.length) return '<div class="dev-loading" style="color:var(--muted)">Nenhuma tarefa</div>';
    const STATUS_COR = { ativa:'colab', em_andamento:'admin', concluida:'colab', atrasada:'inativo', aguardando:'inativo' };
    return `<table class="dev-table">
      <thead><tr><th>Título</th><th>Status</th><th>Prioridade</th><th>Tipo</th><th>Data início</th></tr></thead>
      <tbody>${tarefas.map(t => `
        <tr>
          <td>${_esc(t.titulo)}</td>
          <td><span class="dev-tag dev-tag-${STATUS_COR[t.status] || 'inativo'}">${_esc(t.status)}</span></td>
          <td style="color:var(--muted)">${_esc(t.prioridade || '—')}</td>
          <td style="color:var(--muted)">${_esc(t.tipo || '—')}</td>
          <td style="color:var(--muted)">${t.data_inicio ? new Date(t.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function renderTabProjetos(projetos) {
    if (!projetos.length) return '<div class="dev-loading" style="color:var(--muted)">Nenhum projeto</div>';
    return `<table class="dev-table">
      <thead><tr><th>Nome</th><th>Status</th><th>Cor</th><th>Criado em</th></tr></thead>
      <tbody>${projetos.map(p => `
        <tr>
          <td>${_esc(p.nome)}</td>
          <td><span class="dev-tag dev-tag-${p.status === 'ativo' ? 'colab' : 'inativo'}">${_esc(p.status)}</span></td>
          <td><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${_esc(p.cor || '#888')}"></span></td>
          <td style="color:var(--muted)">${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Boot ────────────────────────────────────────────────────
  if (_token) {
    try {
      const data = await devGet('/api/dev/overview');
      _dadosOverview = data;
      loginScreen.style.display = 'none';
      panel.style.display = 'flex';
      renderTotais(data.totais);
      renderListaEmpresas(data.empresas);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      _token = '';
    }
  }
})();
