// AgriFlow — Colaboradores (Admin)
(async () => {
  Auth.exigirLogin();
  const usuario = Auth.usuario();
  if (!usuario || usuario.role !== 'admin') {
    window.location.href = '/pages/visao-geral.html';
    return;
  }
  initSidebar();

  // ── Toast ──────────────────────────────────────────────────
  window.Toast = {
    show(msg, tipo = 'default') {
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + tipo;
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }
  };

  // ── Estado ─────────────────────────────────────────────────
  let _membros = [];

  // ── Carregar ────────────────────────────────────────────────
  async function carregar() {
    try {
      _membros = await API.get('/api/usuarios?todos=true');
      renderLista();
    } catch (err) {
      document.getElementById('col-lista').innerHTML =
        `<div class="loading-state" style="color:var(--vermelho)">Erro: ${err.message}</div>`;
    }
  }

  function renderLista() {
    const el = document.getElementById('col-lista');

    if (_membros.length === 0) {
      el.innerHTML = '<div class="loading-state">Nenhum colaborador encontrado.</div>';
      return;
    }

    el.innerHTML = `
      <div class="col-lista-header">
        <span>Colaborador</span>
        <span>Cargo</span>
        <span>Nível</span>
        <span>Status</span>
        <span></span>
      </div>
      ${_membros.map(m => `
        <div class="col-membro-row ${m.ativo ? '' : 'inativo'}" data-id="${m.id}">
          <div class="col-membro-ident">
            <div class="col-avatar">${Auth.iniciais(m.nome)}</div>
            <div>
              <div class="col-membro-nome">${esc(m.nome)} ${m.id === usuario.id ? '<span style="font-size:.7rem;color:var(--verde)">(você)</span>' : ''}</div>
              <div class="col-membro-email">${esc(m.email)}</div>
            </div>
          </div>
          <span style="font-size:.875rem;color:var(--text-muted)">${esc(m.cargo || '—')}</span>
          <span class="col-role-badge ${m.role}">${m.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
          <span class="col-status-badge ${m.ativo ? 'ativo' : 'inativo'}">${m.ativo ? 'Ativo' : 'Inativo'}</span>
          <div class="col-acoes">
            <button class="col-btn-edit" data-id="${m.id}">Editar</button>
            ${m.id !== usuario.id ? `
              <button class="col-btn-toggle ${m.ativo ? 'desativar' : 'ativar'}" data-id="${m.id}" data-ativo="${m.ativo}">
                ${m.ativo ? 'Desativar' : 'Ativar'}
              </button>
            ` : ''}
          </div>
        </div>
      `).join('')}`;

    // Eventos editar
    el.querySelectorAll('.col-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = _membros.find(x => x.id === btn.dataset.id);
        if (!m) return;
        document.getElementById('editar-id').value    = m.id;
        document.getElementById('editar-nome').value  = m.nome;
        document.getElementById('editar-cargo').value = m.cargo || '';
        document.getElementById('editar-role').value  = m.role;
        document.getElementById('modal-editar-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    // Eventos toggle ativo
    el.querySelectorAll('.col-btn-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const result = await API.patch(`/api/usuarios/${btn.dataset.id}/ativo`, {});
          Toast.show(result.ativo ? 'Colaborador ativado' : 'Colaborador desativado', 'success');
          await carregar();
        } catch (err) {
          Toast.show(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // ── Modal editar ────────────────────────────────────────────
  function fecharModal() {
    document.getElementById('modal-editar-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('btn-fechar-editar').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-editar').addEventListener('click', fecharModal);
  document.getElementById('modal-editar-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-editar-overlay') fecharModal();
  });

  document.getElementById('btn-confirmar-editar').addEventListener('click', async () => {
    const id    = document.getElementById('editar-id').value;
    const nome  = document.getElementById('editar-nome').value.trim();
    const cargo = document.getElementById('editar-cargo').value.trim();
    const role  = document.getElementById('editar-role').value;
    if (!nome) { Toast.show('Nome é obrigatório', 'error'); return; }

    const btn = document.getElementById('btn-confirmar-editar');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      await API.put(`/api/usuarios/${id}`, { nome, cargo, role });
      Toast.show('Colaborador atualizado!', 'success');
      fecharModal();
      await carregar();
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar';
    }
  });

  // ── Gerar convite ────────────────────────────────────────────
  document.getElementById('btn-gerar-convite').addEventListener('click', async () => {
    const btn = document.getElementById('btn-gerar-convite');
    btn.disabled = true;
    try {
      const data = await API.post('/api/auth/convite', {});
      document.getElementById('col-invite-link').value = data.link;
      document.getElementById('col-invite-box').style.display = 'block';
    } catch (err) {
      Toast.show(err.message || 'Erro ao gerar convite', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('col-invite-close').addEventListener('click', () => {
    document.getElementById('col-invite-box').style.display = 'none';
  });

  document.getElementById('btn-copiar-convite').addEventListener('click', () => {
    const input = document.getElementById('col-invite-link');
    navigator.clipboard.writeText(input.value).then(() => Toast.show('Link copiado!')).catch(() => {
      input.select();
      document.execCommand('copy');
      Toast.show('Link copiado!');
    });
  });

  // ── Helpers ─────────────────────────────────────────────────
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── API.patch helper ─────────────────────────────────────────
  if (!API.patch) {
    API.patch = (url, body) => API._req('PATCH', url, body);
  }

  carregar();
})();
