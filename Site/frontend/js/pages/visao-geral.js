// AgriFlow — Visão Geral (Admin Dashboard)
(async () => {
  // Proteção de rota: apenas admins
  Auth.exigirLogin();
  const usuario = Auth.usuario();
  if (!usuario || usuario.role !== 'admin') {
    window.location.href = '/pages/calendario.html';
    return;
  }

  // Inicializar sidebar
  initSidebar();

  // Preencher boas-vindas
  const primeiroNome = usuario.nome ? usuario.nome.split(' ')[0] : 'Admin';
  document.getElementById('vg-empresa-nome').textContent = usuario.empresa_nome || 'Minha Empresa';
  document.getElementById('vg-welcome').textContent = 'Olá, ' + primeiroNome + '. Aqui está o resumo da sua empresa.';

  // ── Toast ──────────────────────────────────────────────────
  function toast(msg, tipo = 'success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Gerar convite ──────────────────────────────────────────
  document.getElementById('btn-gerar-convite').addEventListener('click', async () => {
    const btn = document.getElementById('btn-gerar-convite');
    btn.disabled = true;
    btn.textContent = 'Gerando...';
    try {
      const data = await API.post('/api/auth/convite', {});
      document.getElementById('vg-invite-link').value = data.link;
      document.getElementById('vg-invite-box').style.display = 'block';
    } catch (err) {
      toast(err.message || 'Erro ao gerar convite', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round"/>
          <circle cx="9" cy="7" r="4" stroke-width="2"/>
          <line x1="19" y1="8" x2="19" y2="14" stroke-width="2" stroke-linecap="round"/>
          <line x1="22" y1="11" x2="16" y2="11" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Convidar colaborador`;
    }
  });

  document.getElementById('vg-invite-close').addEventListener('click', () => {
    document.getElementById('vg-invite-box').style.display = 'none';
  });

  document.getElementById('btn-copiar-link').addEventListener('click', () => {
    const input = document.getElementById('vg-invite-link');
    navigator.clipboard.writeText(input.value).then(() => {
      toast('Link copiado!');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      toast('Link copiado!');
    });
  });

  // ── Carregar dados ─────────────────────────────────────────
  async function carregar() {
    const [projetos, equipe] = await Promise.all([
      API.get('/api/projetos?status=ativo').catch(() => []),
      API.get('/api/usuarios').catch(() => []),
    ]);

    renderStats(projetos, equipe);
    renderProjetos(projetos);
    renderEquipe(equipe);
  }

  function renderStats(projetos, equipe) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let tarefasAbertas = 0;
    let tarefasAtrasadas = 0;

    projetos.forEach(p => {
      const total     = parseInt(p.tarefas_total) || 0;
      const concluidas = parseInt(p.tarefas_concluidas) || 0;
      tarefasAbertas += (total - concluidas);
    });

    // Atrasadas: projetos com data_fim passada e não concluídos
    projetos.forEach(p => {
      if (p.data_fim) {
        const fim = new Date(p.data_fim);
        fim.setHours(0, 0, 0, 0);
        const incompletas = (parseInt(p.tarefas_total) || 0) - (parseInt(p.tarefas_concluidas) || 0);
        if (fim < hoje && incompletas > 0) tarefasAtrasadas++;
      }
    });

    document.getElementById('stat-projetos').textContent      = projetos.length;
    document.getElementById('stat-tarefas').textContent       = tarefasAbertas;
    document.getElementById('stat-colaboradores').textContent = equipe.length;
    document.getElementById('stat-atrasadas').textContent     = tarefasAtrasadas;
  }

  function renderProjetos(projetos) {
    const lista = document.getElementById('vg-projetos-lista');

    if (projetos.length === 0) {
      lista.innerHTML = '<div class="vg-empty">Nenhum projeto ativo no momento.</div>';
      return;
    }

    lista.innerHTML = projetos.map(p => {
      const pct = p.progresso_pct || 0;
      const total = p.tarefas_total || 0;
      const conc  = p.tarefas_concluidas || 0;
      return `
        <div class="vg-projeto-row" onclick="window.location.href='/pages/calendario.html'">
          <div class="vg-projeto-nome">
            <span class="vg-projeto-dot" style="background:${p.cor || '#639922'}"></span>
            ${escHtml(p.nome)}
          </div>
          <div class="vg-projeto-meta">
            <span>${conc}/${total} tarefas</span>
            <span>${pct}%</span>
          </div>
          <div class="vg-projeto-bar">
            <div class="vg-projeto-fill" style="width:${pct}%;background:${p.cor || '#639922'}"></div>
          </div>
        </div>`;
    }).join('');
  }

  function renderEquipe(equipe) {
    const lista = document.getElementById('vg-equipe-lista');
    const count = document.getElementById('vg-equipe-count');
    count.textContent = equipe.length + (equipe.length === 1 ? ' membro' : ' membros');

    if (equipe.length === 0) {
      lista.innerHTML = '<div class="vg-empty">Nenhum colaborador cadastrado.</div>';
      return;
    }

    lista.innerHTML = equipe.map(u => `
      <div class="vg-membro-row">
        <div class="vg-membro-avatar">${Auth.iniciais(u.nome)}</div>
        <div class="vg-membro-info">
          <div class="vg-membro-nome">${escHtml(u.nome)}</div>
          <div class="vg-membro-cargo">${escHtml(u.cargo || '—')}</div>
        </div>
        <span class="vg-membro-role ${u.role}">${u.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
      </div>`
    ).join('');
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  carregar();
})();
