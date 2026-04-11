// ============================================================
// AgriFlow — Página de Detalhes do Projeto
// ============================================================

(async () => {
  Auth.exigirLogin();
  initSidebar();
  PainelLateral.init();
  ModalTarefa.init();
  ModalProjeto.init();
  ModalConcluir.init();

  window.Toast = {
    show(msg, tipo = 'default') {
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = `toast ${tipo}`;
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const projetoId = params.get('id');
  if (!projetoId) {
    window.location.href = '/pages/calendario.html';
    return;
  }

  let _projeto = null;

  // ── Carregar e renderizar ───────────────────────────────────
  async function _carregar() {
    try {
      _projeto = await API.get(`/api/projetos/${projetoId}`);
      _renderizar();
    } catch (err) {
      Toast.show('Erro ao carregar projeto: ' + err.message, 'error');
    }
  }

  function _renderizar() {
    const p = _projeto;

    document.title = `${p.nome} — AgriFlow`;

    // Header
    document.getElementById('projeto-nome-titulo').textContent  = p.nome;
    document.getElementById('projeto-cor-dot').style.background = p.cor;

    const statusBadge = document.getElementById('projeto-status-badge');
    statusBadge.textContent  = _labelStatus(p.status);
    statusBadge.className    = `badge ${_badgeStatus(p.status)}`;

    const periodoEl = document.getElementById('projeto-periodo');
    periodoEl.textContent = `${_fmtData(p.data_inicio)} ${p.data_fim ? '→ ' + _fmtData(p.data_fim) : ''}`;

    if (p.descricao) {
      document.getElementById('projeto-descricao').textContent = p.descricao;
    }

    // Progresso
    document.getElementById('projeto-pct').textContent = `${p.progresso_pct}%`;
    document.getElementById('projeto-tarefas-info').textContent =
      `${p.tarefas_concluidas} de ${p.tarefas_total} tarefas concluídas`;
    document.getElementById('projeto-progress-fill').style.width = `${p.progresso_pct}%`;
    document.getElementById('projeto-progress-fill').style.background = p.cor;

    // Participantes
    _renderParticipantes(p.participantes);

    // Tarefas
    _renderTimeline(p.tarefas);

    // Botões de ação
    _renderAcoes(p.status);
  }

  function _renderParticipantes(participantes) {
    const el = document.getElementById('participantes-avatares');
    el.innerHTML = participantes.map(p => `
      <div class="avatar-participante" title="${_esc(p.nome)}">
        <div class="avatar-sm" style="background:var(--verde)">${Auth.iniciais(p.nome)}</div>
        <span class="avatar-participante-nome">${p.nome.split(' ')[0]}</span>
      </div>
    `).join('');
  }

  function _renderTimeline(tarefas) {
    const comData    = tarefas.filter(t => t.data_inicio);
    const semData    = tarefas.filter(t => !t.data_inicio);
    const container  = document.getElementById('projeto-timeline');
    const semDataSec = document.getElementById('secao-sem-data');

    // Tarefas com data — linha do tempo
    container.innerHTML = comData.map((t, i) => {
      const anterior = comData[i - 1];
      const delegacao = anterior && anterior.delegado_por_nome && anterior.status === 'concluida'
        ? `<div class="timeline-delegacao">
             <div class="timeline-delegacao-linha"></div>
             <span>▼ delegou para ${_esc(t.atribuido_nome)}</span>
             <div class="timeline-delegacao-linha"></div>
           </div>`
        : '';

      return `
        ${delegacao}
        <div class="timeline-item" data-status="${t.status}" data-id="${t.id}">
          <div class="timeline-icone">${_iconeStatus(t.status)}</div>
          <div class="timeline-conteudo">
            <div class="timeline-tarefa-card" data-status="${t.status}" data-id="${t.id}">
              <div class="timeline-tarefa-titulo">${_esc(t.titulo)}</div>
              <div class="timeline-tarefa-meta">
                <span>👤 ${_esc(t.atribuido_nome)}</span>
                ${t.data_inicio ? `<span>📅 ${_fmtData(t.data_inicio)}</span>` : ''}
                ${t.hora ? `<span>⏰ ${t.hora.slice(0,5)}</span>` : ''}
                <span>${_badgePrioridade(t.prioridade)}</span>
              </div>
              ${t.obs_conclusao ? `<div class="timeline-obs">"${_esc(t.obs_conclusao)}"</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Clicar em tarefa — abrir painel lateral
    container.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', () => _abrirTarefa(el.dataset.id));
    });

    // Tarefas sem data
    if (semData.length > 0) {
      semDataSec.classList.remove('hidden');
      document.getElementById('secao-sem-data-lista').innerHTML = semData.map(t => `
        <div class="timeline-item" data-status="${t.status}" data-id="${t.id}" style="cursor:pointer">
          <div class="timeline-icone">${_iconeStatus(t.status)}</div>
          <div class="timeline-conteudo">
            <div class="timeline-tarefa-card" data-status="${t.status}" data-id="${t.id}">
              <div class="timeline-tarefa-titulo">${_esc(t.titulo)}</div>
              <div class="timeline-tarefa-meta">
                <span>👤 ${_esc(t.atribuido_nome)}</span>
                <span style="color:var(--text-muted)">Sem data</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      document.getElementById('secao-sem-data-lista').querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => _abrirTarefa(el.dataset.id));
      });
    } else {
      semDataSec.classList.add('hidden');
    }
  }

  function _renderAcoes(status) {
    const btn = document.getElementById('btn-status-projeto');
    if (!btn) return;

    if (status === 'ativo') {
      btn.textContent = '⏸ Pausar';
      btn.onclick = () => _alterarStatus('pausado');
    } else if (status === 'pausado') {
      btn.textContent = '▶ Reativar';
      btn.onclick = () => _alterarStatus('ativo');
    } else {
      btn.style.display = 'none';
    }
  }

  async function _alterarStatus(novoStatus) {
    if (!confirm(`Confirma alterar o status para "${novoStatus}"?`)) return;
    try {
      await API.put(`/api/projetos/${projetoId}/status`, { status: novoStatus });
      Toast.show('Status atualizado!', 'success');
      await _carregar();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function _finalizarProjeto() {
    if (!confirm('Finalizar este projeto? Esta ação marca o projeto como concluído.')) return;
    try {
      await API.put(`/api/projetos/${projetoId}/status`, { status: 'concluido' });
      Toast.show('Projeto finalizado!', 'success');
      await _carregar();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async function _abrirTarefa(id) {
    try {
      const tarefa = await API.get(`/api/tarefas/${id}`);
      PainelLateral.abrir(tarefa, {
        onConcluir: t => ModalConcluir.abrir(t, { onSucesso: _carregar })
      });
    } catch (err) {
      Toast.show('Erro ao abrir tarefa', 'error');
    }
  }

  // ── Eventos ─────────────────────────────────────────────────
  document.getElementById('btn-voltar')?.addEventListener('click', () => {
    window.location.href = '/pages/calendario.html';
  });

  document.getElementById('btn-editar-projeto')?.addEventListener('click', () => {
    ModalProjeto.abrir(_projeto, { onSucesso: _carregar });
  });

  document.getElementById('btn-finalizar-projeto')?.addEventListener('click', _finalizarProjeto);

  document.getElementById('btn-nova-tarefa-projeto')?.addEventListener('click', () => {
    ModalTarefa.abrir(null, {
      projetoId,
      onSucesso: _carregar
    });
  });

  document.addEventListener('tarefa-atualizada', _carregar);

  // ── Helpers ─────────────────────────────────────────────────
  function _fmtData(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  function _esc(str = '') {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _iconeStatus(status) {
    return { concluida: '✓', em_andamento: '⏳', ativa: '●', aguardando: '○', cancelada: '✕' }[status] || '○';
  }

  function _labelStatus(status) {
    return { ativo: 'Ativo', concluido: 'Concluído', pausado: 'Pausado', cancelado: 'Cancelado' }[status] || status;
  }

  function _badgeStatus(status) {
    return { ativo: 'badge-green', concluido: 'badge-blue', pausado: 'badge-yellow', cancelado: 'badge-red' }[status] || 'badge-gray';
  }

  function _badgePrioridade(p) {
    const map = { baixa: '🟢', normal: '🔵', alta: '🟡', urgente: '🔴' };
    return `<span title="Prioridade: ${p}">${map[p] || ''}</span>`;
  }

  // ── Iniciar ──────────────────────────────────────────────────
  await _carregar();
})();
