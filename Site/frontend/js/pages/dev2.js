// AgriFlow — Dev Panel v2
(async () => {
  const API_BASE = CONFIG.API_URL;

  // Auth check
  if (!Auth.logado() || Auth.usuario()?.role !== 'superdev') {
    window.location.href = '/pages/login.html';
    return;
  }

  document.getElementById('btn-sair').addEventListener('click', () => Auth.logout());

  function devHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.token()}` };
  }

  async function devGet(path) {
    const r = await fetch(API_BASE + path, { headers: devHeaders() });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); }
    return r.json();
  }

  async function devPut(path, body) {
    const r = await fetch(API_BASE + path, { method:'PUT', headers: devHeaders(), body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); }
    return r.json();
  }

  // ── Overview ──────────────────────────────────────────────
  let _overview = null;
  let _empresaAtiva = null;

  async function carregarOverview() {
    try {
      _overview = await devGet('/api/dev/overview');
      const t = _overview.totais;
      document.getElementById('stat-empresas').innerHTML = `<strong>${t.total_empresas}</strong> empresas`;
      document.getElementById('stat-usuarios').innerHTML = `<strong>${t.total_usuarios}</strong> usuários`;
      document.getElementById('stat-clientes').innerHTML = `<strong>${t.total_clientes}</strong> clientes`;
      renderListaEmpresas(_overview.empresas);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) Auth.logout();
    }
  }

  function renderListaEmpresas(empresas) {
    const el = document.getElementById('emp-lista');
    if (!empresas.length) { el.innerHTML = '<div class="loading-txt">Sem empresas</div>'; return; }
    el.innerHTML = empresas.map(e => `
      <div class="emp-item" data-id="${e.id}" data-nome="${_esc(e.nome)}">
        <div class="emp-nome">${_esc(e.nome)}</div>
        <div class="emp-meta">${e.total_usuarios}u · ${e.total_clientes}c · ${e.total_imoveis}i</div>
      </div>`).join('');
    el.querySelectorAll('.emp-item').forEach(el =>
      el.addEventListener('click', () => selecionarEmpresa(el.dataset.id, el.dataset.nome, empresas.find(e => e.id === el.dataset.id)))
    );
  }

  // ── Empresa selecionada ────────────────────────────────────
  async function selecionarEmpresa(id, nome, empresa) {
    _empresaAtiva = id;
    document.querySelectorAll('.emp-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
    const main = document.getElementById('dev-main');
    main.innerHTML = '<div class="loading-txt">Carregando dados...</div>';
    try {
      const [usuarios, dados] = await Promise.all([
        devGet(`/api/dev/empresas/${id}/usuarios`),
        devGet(`/api/dev/empresas/${id}/dados`),
      ]);
      renderEmpresa(main, nome, empresa, usuarios, dados);
    } catch (err) {
      main.innerHTML = `<div class="loading-txt" style="color:#FF6666">Erro: ${err.message}</div>`;
    }
  }

  function renderEmpresa(main, nome, empresa, usuarios, dados) {
    const e = empresa || {};
    main.innerHTML = `
      <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #222">
        <div style="font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:-.01em">${_esc(nome)}</div>
        <div style="font-size:.62rem;color:#555;font-family:'JetBrains Mono',monospace;margin-top:4px">${_empresaAtiva}</div>
      </div>

      <div class="info-grid">
        <div class="info-card"><div class="info-card-label">Usuários</div><div class="info-card-val green">${usuarios.length}</div></div>
        <div class="info-card"><div class="info-card-label">Clientes</div><div class="info-card-val yellow">${dados.clientes?.length||0}</div></div>
        <div class="info-card"><div class="info-card-label">Imóveis</div><div class="info-card-val">${dados.imoveis?.length||0}</div></div>
        <div class="info-card"><div class="info-card-label">Contratos</div><div class="info-card-val">${dados.tarefas?.length||0}</div></div>
      </div>

      <div class="dev-tabs">
        <button class="dev-tab active" data-tab="usuarios">Usuários & Senhas</button>
        <button class="dev-tab" data-tab="clientes">Clientes</button>
        <button class="dev-tab" data-tab="imoveis">Imóveis</button>
      </div>

      <div id="tab-usuarios" class="dev-tab-panel active">${renderTabUsuarios(usuarios)}</div>
      <div id="tab-clientes" class="dev-tab-panel">${renderTabClientes(dados.clientes||[])}</div>
      <div id="tab-imoveis"  class="dev-tab-panel">${renderTabImoveis(dados.imoveis||[])}</div>
    `;

    main.querySelectorAll('.dev-tab').forEach(tab =>
      tab.addEventListener('click', () => {
        main.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        main.querySelectorAll('.dev-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        main.querySelector('#tab-' + tab.dataset.tab)?.classList.add('active');
      })
    );

    bindPasswordActions(main);
  }

  function _senhaAleatoria() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({length: 12}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  function renderTabUsuarios(usuarios) {
    if (!usuarios.length) return '<div class="empty-state">Sem usuários</div>';
    return `
      <div style="background:#1A0000;border:1.5px solid #440000;padding:10px 14px;margin-bottom:14px;font-size:.7rem;color:#FF8888;line-height:1.5">
        🔒 <strong>Senhas são criptografadas (bcrypt)</strong> — impossível visualizar a senha atual.<br>
        Use <strong>"Gerar temp"</strong> para criar uma senha temporária visível, ou <strong>"Definir"</strong> para definir manualmente.
      </div>
      <table class="dev-table">
      <thead><tr>
        <th>Nome</th><th>Email</th><th>Papel</th><th>Status</th>
        <th>Senha</th><th>Email</th>
      </tr></thead>
      <tbody>${usuarios.map(u => `
        <tr data-uid="${u.id}">
          <td style="font-weight:700">${_esc(u.nome)}</td>
          <td class="dev-email" style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#7EB8FF">${_esc(u.email)}</td>
          <td><span class="dev-tag dev-tag-${u.role==='admin'?'admin':'colab'}">${u.role}</span></td>
          <td><span class="dev-tag dev-tag-${u.ativo?'ativo':'inativo'}">${u.ativo?'Ativo':'Inativo'}</span></td>
          <td style="min-width:260px">
            <div class="dev-reset-row">
              <button class="dev-btn-sm btn-gerar-senha" data-uid="${u.id}">⚡ Gerar temp</button>
              <button class="dev-btn-sm btn-abrir-senha" data-uid="${u.id}">✎ Definir</button>
            </div>
            <div class="dev-senha-form" style="display:none;margin-top:6px">
              <div class="dev-reset-row">
                <input class="dev-reset-input show" type="text" placeholder="nova senha" style="width:150px;font-family:'JetBrains Mono',monospace">
                <button class="dev-btn-sm dev-btn-success btn-salvar-senha" data-uid="${u.id}">✓</button>
                <button class="dev-btn-sm dev-btn-danger btn-cancel-senha" data-uid="${u.id}">✕</button>
              </div>
            </div>
            <div class="dev-senha-result" style="display:none;margin-top:6px;padding:6px 10px;background:#001A00;border:1.5px solid #004400;font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#80FF80;letter-spacing:.05em"></div>
          </td>
          <td style="min-width:220px">
            <div class="dev-reset-row">
              <button class="dev-btn-sm btn-abrir-email" data-uid="${u.id}">✎ Alterar</button>
            </div>
            <div class="dev-email-form" style="display:none;margin-top:6px">
              <div class="dev-reset-row">
                <input class="dev-reset-input show" type="email" placeholder="novo email" style="width:160px">
                <button class="dev-btn-sm dev-btn-success btn-salvar-email" data-uid="${u.id}">✓</button>
                <button class="dev-btn-sm dev-btn-danger btn-cancel-email" data-uid="${u.id}">✕</button>
              </div>
            </div>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  }

  function renderTabClientes(clientes) {
    if (!clientes.length) return '<div class="empty-state">Sem clientes</div>';
    return `<table class="dev-table">
      <thead><tr><th>Nome</th><th>Tipo</th><th>CPF/CNPJ</th><th>Celular</th><th>Município/UF</th></tr></thead>
      <tbody>${clientes.map(c => `<tr>
        <td style="font-weight:700">${_esc(c.nome_completo)}</td>
        <td><span class="dev-tag ${c.tipo_pessoa==='PF'?'dev-tag-colab':'dev-tag-admin'}">${c.tipo_pessoa}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#AAA">${_esc(c.cpf||c.cnpj||'—')}</td>
        <td>${_esc(c.celular||'—')}</td>
        <td style="color:#888">${_esc([c.municipio,c.uf].filter(Boolean).join('/')||'—')}</td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function renderTabImoveis(imoveis) {
    if (!imoveis.length) return '<div class="empty-state">Sem imóveis</div>';
    return `<table class="dev-table">
      <thead><tr><th>Denominação</th><th>Município/UF</th><th>Área (ha)</th><th>CAR</th><th>CCIR Venc.</th></tr></thead>
      <tbody>${imoveis.map(i => `<tr>
        <td style="font-weight:700">${_esc(i.denominacao||'—')}</td>
        <td>${_esc([i.municipio,i.uf].filter(Boolean).join('/')||'—')}</td>
        <td style="font-family:'JetBrains Mono',monospace">${i.area_total_ha?parseFloat(i.area_total_ha).toLocaleString('pt-BR',{minimumFractionDigits:2}):'—'}</td>
        <td><span class="dev-tag dev-tag-${i.situacao_car==='ativo'?'ativo':'inativo'}">${_esc(i.situacao_car||'—')}</span></td>
        <td style="color:#888;font-size:.72rem">${i.vencimento_ccir?new Date(i.vencimento_ccir).toLocaleDateString('pt-BR'):'—'}</td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  // ── Bind de ações ──────────────────────────────────────────
  function bindPasswordActions(main) {
    // Gerar senha temporária aleatória (mostra em tela)
    main.querySelectorAll('.btn-gerar-senha').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const row = btn.closest('tr');
        const nova = _senhaAleatoria();
        btn.textContent = '...'; btn.disabled = true;
        try {
          await devPut(`/api/dev/usuarios/${uid}/senha`, { nova_senha: nova });
          const result = row.querySelector('.dev-senha-result');
          result.textContent = `Nova senha: ${nova}`;
          result.style.display = '';
          btn.textContent = '⚡ Gerar temp';  btn.disabled = false;
          // Esconder após 30s por segurança
          setTimeout(() => { result.style.display = 'none'; }, 30000);
        } catch (err) {
          alert('Erro: ' + err.message);
          btn.textContent = '⚡ Gerar temp'; btn.disabled = false;
        }
      });
    });

    // Abrir campo para definir senha manualmente
    main.querySelectorAll('.btn-abrir-senha').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const form = row.querySelector('.dev-senha-form');
        form.style.display = form.style.display === 'none' ? '' : 'none';
        row.querySelector('.dev-senha-result').style.display = 'none';
      });
    });

    main.querySelectorAll('.btn-salvar-senha').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const row = btn.closest('tr');
        const inp = row.querySelector('.dev-senha-form input');
        const nova = inp.value.trim();
        if (!nova || nova.length < 4) { alert('Mínimo 4 caracteres.'); return; }
        btn.textContent = '...'; btn.disabled = true;
        try {
          await devPut(`/api/dev/usuarios/${uid}/senha`, { nova_senha: nova });
          const result = row.querySelector('.dev-senha-result');
          result.textContent = `Senha definida: ${nova}`;
          result.style.display = '';
          row.querySelector('.dev-senha-form').style.display = 'none';
          inp.value = '';
          btn.textContent = '✓'; btn.disabled = false;
          setTimeout(() => { result.style.display = 'none'; btn.textContent = '✓'; }, 15000);
        } catch (err) {
          alert('Erro: ' + err.message);
          btn.textContent = '✓'; btn.disabled = false;
        }
      });
    });

    main.querySelectorAll('.btn-cancel-senha').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        row.querySelector('.dev-senha-form').style.display = 'none';
        row.querySelector('.dev-senha-form input').value = '';
      });
    });

    // Email
    main.querySelectorAll('.btn-abrir-email').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const form = row.querySelector('.dev-email-form');
        form.style.display = form.style.display === 'none' ? '' : 'none';
      });
    });

    main.querySelectorAll('.btn-salvar-email').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const row = btn.closest('tr');
        const inp = row.querySelector('.dev-email-form input');
        const email = inp.value.trim();
        if (!email || !email.includes('@')) { alert('Email inválido.'); return; }
        btn.textContent = '...'; btn.disabled = true;
        try {
          await devPut(`/api/dev/usuarios/${uid}`, { email });
          const emailCell = row.querySelector('.dev-email');
          if (emailCell) emailCell.textContent = email;
          row.querySelector('.dev-email-form').style.display = 'none';
          inp.value = '';
          btn.textContent = '✓'; btn.disabled = false;
        } catch (err) {
          alert('Erro: ' + err.message);
          btn.textContent = '✓'; btn.disabled = false;
        }
      });
    });

    main.querySelectorAll('.btn-cancel-email').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        row.querySelector('.dev-email-form').style.display = 'none';
        row.querySelector('.dev-email-form input').value = '';
      });
    });
  }

  function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Boot
  await carregarOverview();
})();
