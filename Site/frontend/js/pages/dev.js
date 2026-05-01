// AgriFlow — Dev Panel
(async () => {
  const API_BASE = CONFIG.API_URL;
  let _empresaAtiva = null;
  let _dadosAtivos  = null;
  let _dadosOverview= null;

  // ── Auth check ──────────────────────────────────────────────
  if (!Auth.logado() || Auth.usuario()?.role !== 'superdev') {
    window.location.href = '/pages/login.html';
    return;
  }

  // ── API helpers ─────────────────────────────────────────────
  function devHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.token()}` };
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

  const panel = document.getElementById('dev-panel');

  document.getElementById('btn-dev-logout').addEventListener('click', () => Auth.logout());

  // ── Overview ─────────────────────────────────────────────────
  async function carregarOverview() {
    try {
      const data = await devGet('/api/dev/overview');
      _dadosOverview = data;
      renderTotais(data.totais);
      renderListaEmpresas(data.empresas);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        Auth.logout();
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

    main.querySelectorAll('.dev-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        main.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        main.querySelectorAll('.dev-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        main.querySelector('#tab-' + tab.dataset.tab)?.classList.add('active');
      });
    });

    // Senha reset buttons (btn-dev-reset but NOT btn-dev-editar-usuario)
    main.querySelectorAll('.btn-dev-reset:not(.btn-dev-editar-usuario)').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const inp = row.querySelector('.dev-reset-input');
        const salvar = row.querySelector('.dev-btn-salvar');
        const cancel = row.querySelector('.dev-btn-cancel');
        inp.style.display = '';
        salvar.style.display = '';
        cancel.style.display = '';
        btn.style.display = 'none';
        inp.focus();
      });
    });

    main.querySelectorAll('.dev-btn-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        row.querySelector('.dev-reset-input').style.display = 'none';
        row.querySelector('.dev-reset-input').value = '';
        row.querySelector('.dev-btn-salvar').style.display = 'none';
        btn.style.display = 'none';
        row.querySelector('.btn-dev-reset:not(.btn-dev-editar-usuario)').style.display = '';
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
          btn.style.background = '#16a34a';
          setTimeout(() => {
            row.querySelector('.dev-reset-input').style.display = 'none';
            row.querySelector('.dev-reset-input').value = '';
            row.querySelector('.dev-btn-cancel').style.display = 'none';
            row.querySelector('.btn-dev-reset:not(.btn-dev-editar-usuario)').style.display = '';
            btn.textContent = 'Salvar senha';
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

    // Editar usuário
    main.querySelectorAll('.btn-dev-editar-usuario').forEach(btn => {
      btn.addEventListener('click', () => _abrirModalEditarUsuario(btn));
    });

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
                    <thead><tr><th>Sistema</th><th>Login</th><th>Senha</th><th>URL</th></tr></thead>
                    <tbody>${cofre.map(s => `
                      <tr>
                        <td>${_esc(s.sistema || '—')}</td>
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
      <thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${usuarios.map(u => `
        <tr data-uid="${u.id}">
          <td>${_esc(u.nome)}</td>
          <td style="color:var(--blue)">${_esc(u.email)}</td>
          <td>${_esc(u.cargo || '—')}</td>
          <td><span class="dev-tag dev-tag-${u.role === 'admin' ? 'admin' : 'colab'}">${u.role}</span></td>
          <td><span class="dev-tag ${u.ativo ? 'dev-tag-colab' : 'dev-tag-inativo'}">${u.ativo ? 'ativo' : 'inativo'}</span></td>
          <td>
            <div class="dev-reset-row">
              <button class="dev-btn-sm dev-btn-reset btn-dev-reset">Senha</button>
              <button class="dev-btn-sm dev-btn-reset btn-dev-editar-usuario" data-uid="${u.id}"
                data-nome="${_esc(u.nome)}" data-email="${_esc(u.email)}"
                data-cargo="${_esc(u.cargo||'')}" data-role="${u.role}" data-ativo="${u.ativo}">Editar</button>
              <input class="dev-reset-input" type="text" placeholder="nova senha" style="display:none">
              <button class="dev-btn-sm dev-btn-salvar" data-uid="${u.id}" style="display:none">Salvar senha</button>
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
          <td style="color:var(--muted)">${i.area_total_ha ? parseFloat(i.area_total_ha).toLocaleString('pt-BR') + ' ha' : '—'}</td>
          <td><span class="dev-tag dev-tag-${i.situacao_car === 'ativo' ? 'colab' : 'inativo'}">${_esc(i.situacao_car || '—')}</span></td>
          <td style="color:var(--muted)">${i.vencimento_ccir ? new Date(i.vencimento_ccir).toLocaleDateString('pt-BR') : '—'}</td>
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

  // ── Modal editar usuário ──────────────────────────────────────
  let _editandoUid = null;

  function _abrirModalEditarUsuario(btn) {
    _editandoUid = btn.dataset.uid;
    document.getElementById('dev-edit-nome').value  = btn.dataset.nome || '';
    document.getElementById('dev-edit-email').value = btn.dataset.email || '';
    document.getElementById('dev-edit-cargo').value = btn.dataset.cargo || '';
    document.getElementById('dev-edit-role').value  = btn.dataset.role || 'colaborador';
    document.getElementById('dev-edit-ativo').checked = btn.dataset.ativo === 'true';
    const modal = document.getElementById('dev-modal-usuario');
    modal.style.display = 'flex';
  }

  document.getElementById('dev-modal-fechar')?.addEventListener('click', _fecharModalUsuario);
  document.getElementById('dev-modal-cancelar')?.addEventListener('click', _fecharModalUsuario);
  document.getElementById('dev-modal-usuario')?.addEventListener('click', e => {
    if (e.target === document.getElementById('dev-modal-usuario')) _fecharModalUsuario();
  });

  function _fecharModalUsuario() {
    document.getElementById('dev-modal-usuario').style.display = 'none';
    _editandoUid = null;
  }

  document.getElementById('dev-modal-salvar')?.addEventListener('click', async () => {
    if (!_editandoUid) return;
    const btn = document.getElementById('dev-modal-salvar');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      await devPut(`/api/dev/usuarios/${_editandoUid}`, {
        nome:  document.getElementById('dev-edit-nome').value.trim(),
        email: document.getElementById('dev-edit-email').value.trim(),
        cargo: document.getElementById('dev-edit-cargo').value.trim(),
        role:  document.getElementById('dev-edit-role').value,
        ativo: document.getElementById('dev-edit-ativo').checked,
      });
      _fecharModalUsuario();
      await selecionarEmpresa(_empresaAtiva,
        document.querySelector('.dev-empresa-item.active')?.dataset.nome || '',
        _dadosOverview?.empresas?.find(e => e.id === _empresaAtiva));
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  });

  // ── Boot ─────────────────────────────────────────────────────
  panel.style.display = 'flex';
  await carregarOverview();
})();
