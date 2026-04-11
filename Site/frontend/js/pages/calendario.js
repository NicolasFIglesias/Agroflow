// ============================================================
// AgriFlow — Página do Calendário
// ============================================================

(async () => {
  Auth.exigirLogin();
  initSidebar();
  PainelLateral.init();
  ModalProjeto.init();
  ModalTarefa.init();
  ModalConcluir.init();

  // ── Estado ─────────────────────────────────────────────────
  let _visao     = 'semana'; // 'semana' | 'mes'
  let _dataRef   = new Date();
  let _dados     = { tarefas: [], projetos_ativos: [] };
  let _filtroUid = '';
  let _filtroPrj = '';
  let _usuarios  = [];

  // ── Inicialização ───────────────────────────────────────────
  const usuario = Auth.usuario();

  if (Auth.isAdmin()) {
    await _carregarFiltroUsuarios();
  } else {
    document.getElementById('filtro-usuario-wrap')?.classList.add('hidden');
  }

  await _carregarDados();
  _renderCalendario();

  // ── Funções principais ──────────────────────────────────────
  async function _carregarDados() {
    const mes = _dataRef.getMonth() + 1;
    const ano = _dataRef.getFullYear();

    let url = `/api/calendario?mes=${mes}&ano=${ano}`;
    if (_filtroUid) url += `&usuario_id=${_filtroUid}`;

    try {
      _dados = await API.get(url);
    } catch (err) {
      Toast.show('Erro ao carregar calendário: ' + err.message, 'error');
    }
  }

  async function _carregarFiltroUsuarios() {
    try {
      _usuarios = await API.get('/api/usuarios');
      const sel = document.getElementById('filtro-usuario');
      if (!sel) return;
      sel.innerHTML = '<option value="">Todos</option>' +
        _usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
    } catch { /* ignora */ }
  }

  function _tarefasFiltradas() {
    let lista = _dados.tarefas || [];
    if (_filtroPrj === 'pessoais') {
      lista = lista.filter(t => t.tipo === 'pessoal');
    } else if (_filtroPrj) {
      lista = lista.filter(t => t.projeto?.id === _filtroPrj);
    }
    return lista;
  }

  // ── Renderização ────────────────────────────────────────────
  function _renderCalendario() {
    _atualizarTituloMes();
    if (_visao === 'semana') {
      _renderSemana();
    } else {
      _renderMes();
    }
    _renderProjetosAtivos();
  }

  function _atualizarTituloMes() {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.getElementById('cal-mes-titulo').textContent =
      `${meses[_dataRef.getMonth()]} ${_dataRef.getFullYear()}`;
  }

  function _semanaAtual() {
    const hoje = new Date(_dataRef);
    const dow  = hoje.getDay(); // 0=dom
    const seg  = new Date(hoje);
    seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(seg);
      d.setDate(seg.getDate() + i);
      return d;
    });
  }

  function _renderSemana() {
    document.getElementById('cal-semana').classList.remove('escondida');
    document.getElementById('cal-mes').classList.remove('visivel');

    const dias = _semanaAtual();
    const tarefas = _tarefasFiltradas();
    const hoje = new Date().toISOString().slice(0, 10);

    const diasNomes = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

    // Header
    const headerEl = document.getElementById('cal-semana-header');
    headerEl.innerHTML = dias.map((d, i) => `
      <div class="cal-semana-dia-header">
        ${diasNomes[i]}<br>
        <strong>${d.getDate()}</strong>
      </div>
    `).join('');

    // Body
    const bodyEl = document.getElementById('cal-semana-body');
    bodyEl.innerHTML = dias.map(d => {
      const iso = d.toISOString().slice(0, 10);
      const isHoje = iso === hoje;
      const tarsDia = tarefas.filter(t => t.data_inicio && t.data_inicio.slice(0,10) === iso);
      const MAX = 3;
      const visiveis = tarsDia.slice(0, MAX);
      const resto = tarsDia.length - MAX;

      return `
        <div class="cal-dia-col ${isHoje ? 'hoje' : ''}" data-data="${iso}">
          <div class="cal-dia-num">${d.getDate()}</div>
          ${visiveis.map(t => _pilula(t)).join('')}
          ${resto > 0 ? `<span class="mais-tarefas" data-data="${iso}">+${resto} mais</span>` : ''}
        </div>
      `;
    }).join('');

    // Eventos de clique
    bodyEl.querySelectorAll('.cal-dia-col').forEach(col => {
      col.addEventListener('click', e => {
        if (e.target.closest('.tarefa-pilula')) return;
        if (e.target.classList.contains('mais-tarefas')) return;
        ModalTarefa.abrir(null, { dataInicio: col.dataset.data,
          onSucesso: _recarregar });
      });
    });

    bodyEl.querySelectorAll('.tarefa-pilula').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        _abrirTarefa(el.dataset.id);
      });
    });

    bodyEl.querySelectorAll('.mais-tarefas').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        // Abre modal de tarefa pré-selecionando a data
        const iso = el.dataset.data;
        const tarsDia = tarefas.filter(t => t.data_inicio?.slice(0,10) === iso);
        _mostrarListaDia(iso, tarsDia);
      });
    });
  }

  function _renderMes() {
    document.getElementById('cal-semana').classList.add('escondida');
    document.getElementById('cal-mes').classList.add('visivel');

    const tarefas = _tarefasFiltradas();
    const hoje = new Date().toISOString().slice(0, 10);
    const ano  = _dataRef.getFullYear();
    const mes  = _dataRef.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia   = new Date(ano, mes + 1, 0);

    // Começar na segunda-feira da semana do 1º dia
    const inicioGrid = new Date(primeiroDia);
    const dow = inicioGrid.getDay();
    inicioGrid.setDate(inicioGrid.getDate() - (dow === 0 ? 6 : dow - 1));

    // 6 semanas = 42 dias
    const dias = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrid);
      d.setDate(inicioGrid.getDate() + i);
      return d;
    });

    const gridEl = document.getElementById('cal-mes-grid');
    gridEl.innerHTML = dias.map(d => {
      const iso     = d.toISOString().slice(0, 10);
      const isHoje  = iso === hoje;
      const outromes = d.getMonth() !== mes;
      const tarsDia = tarefas.filter(t => t.data_inicio?.slice(0,10) === iso);
      const vis     = tarsDia.slice(0, 2);
      const resto   = tarsDia.length - vis.length;

      return `
        <div class="cal-mes-cel ${outromes ? 'outro-mes' : ''} ${isHoje ? 'hoje-mes' : ''}" data-data="${iso}">
          <div class="cal-mes-num">${d.getDate()}</div>
          <div class="cal-mes-pilulas">
            ${vis.map(t => `
              <div class="cal-mes-pilula"
                style="background:${t.projeto?.cor || '#5F5E5A'}"
                data-id="${t.id}">
                ${_esc(t.titulo)}
              </div>
            `).join('')}
            ${resto > 0 ? `<div class="mais-tarefas" style="font-size:.65rem">+${resto}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('.cal-mes-pilula').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        _abrirTarefa(el.dataset.id);
      });
    });

    gridEl.querySelectorAll('.cal-mes-cel').forEach(cel => {
      cel.addEventListener('click', e => {
        if (e.target.closest('.cal-mes-pilula')) return;
        // Volta para semana do dia clicado
        _dataRef = new Date(cel.dataset.data + 'T12:00:00');
        _visao = 'semana';
        document.getElementById('btn-toggle-visao').classList.remove('active');
        document.getElementById('btn-toggle-visao').textContent = 'Expandir mês ▼';
        _renderCalendario();
      });
    });
  }

  function _pilula(t) {
    const cor = t.projeto?.cor || '#5F5E5A';
    const bg  = cor + '22';
    const hora = t.hora ? t.hora.slice(0,5) + ' · ' : '';
    return `
      <div class="tarefa-pilula"
        style="background:${bg}; border-left-color:${cor}; color:${cor}"
        data-id="${t.id}"
        data-status="${t.status}">
        <div class="tarefa-pilula-titulo">${_esc(t.titulo)}</div>
        <div class="tarefa-pilula-sub">${hora}${t.atribuido_a.nome}</div>
      </div>
    `;
  }

  function _renderProjetosAtivos() {
    const lista   = _dados.projetos_ativos || [];
    const el      = document.getElementById('projetos-ativos-lista');
    const countEl = document.getElementById('projetos-ativos-count');

    if (countEl) countEl.textContent = lista.length;

    if (!el) return;
    if (lista.length === 0) {
      el.innerHTML = '<div class="projetos-vazios">Nenhum projeto ativo.</div>';
      return;
    }

    el.innerHTML = lista.map(p => `
      <div class="projeto-row" data-id="${p.id}">
        <div class="projeto-row-header">
          <div class="projeto-row-nome">
            <span class="projeto-cor-dot" style="background:${p.cor}"></span>
            ${_esc(p.nome)}
          </div>
          <div class="projeto-row-info">
            <span>${p.tarefas_concluidas}/${p.tarefas_total} tarefas</span>
            ${p.data_fim ? `<span>Prazo: ${_fmtData(p.data_fim)}</span>` : ''}
          </div>
        </div>
        <div class="projeto-progress-bar">
          <div class="projeto-progress-fill"
            style="width:${p.progresso_pct}%; background:${p.cor}">
          </div>
        </div>
        <div style="font-size:.75rem; color:var(--text-muted)">${p.progresso_pct}%</div>
      </div>
    `).join('');

    el.querySelectorAll('.projeto-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = `/pages/projeto-detalhes.html?id=${row.dataset.id}`;
      });
    });
  }

  async function _abrirTarefa(id) {
    try {
      const tarefa = await API.get(`/api/tarefas/${id}`);
      PainelLateral.abrir(tarefa, {
        onConcluir: t => ModalConcluir.abrir(t, { onSucesso: _recarregar })
      });
    } catch (err) {
      Toast.show('Erro ao carregar tarefa', 'error');
    }
  }

  function _mostrarListaDia(iso, tarefas) {
    // Simples: abre o painel da primeira tarefa
    // Poderia ser expandido para um bottom sheet
    if (tarefas.length > 0) _abrirTarefa(tarefas[0].id);
  }

  async function _recarregar() {
    await _carregarDados();
    _renderCalendario();
  }

  // ── Eventos ─────────────────────────────────────────────────
  document.getElementById('btn-prev')?.addEventListener('click', () => {
    if (_visao === 'semana') {
      _dataRef.setDate(_dataRef.getDate() - 7);
    } else {
      _dataRef.setMonth(_dataRef.getMonth() - 1);
    }
    _recarregar();
  });

  document.getElementById('btn-next')?.addEventListener('click', () => {
    if (_visao === 'semana') {
      _dataRef.setDate(_dataRef.getDate() + 7);
    } else {
      _dataRef.setMonth(_dataRef.getMonth() + 1);
    }
    _recarregar();
  });

  document.getElementById('btn-toggle-visao')?.addEventListener('click', function() {
    _visao = _visao === 'semana' ? 'mes' : 'semana';
    this.classList.toggle('active', _visao === 'mes');
    this.textContent = _visao === 'mes' ? 'Ver semana ▲' : 'Expandir mês ▼';
    _renderCalendario();
  });

  document.getElementById('filtro-usuario')?.addEventListener('change', function() {
    _filtroUid = this.value;
    _recarregar();
  });

  document.getElementById('filtro-projeto')?.addEventListener('change', function() {
    _filtroPrj = this.value;
    _renderCalendario();
  });

  document.getElementById('btn-nova-tarefa')?.addEventListener('click', () => {
    ModalTarefa.abrir(null, { onSucesso: _recarregar });
  });

  document.getElementById('btn-novo-projeto')?.addEventListener('click', () => {
    ModalProjeto.abrir(null, { onSucesso: _recarregar });
  });

  document.addEventListener('tarefa-atualizada', _recarregar);

  // ── Helpers ─────────────────────────────────────────────────
  function _fmtData(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  function _esc(str = '') {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Toast global ────────────────────────────────────────────
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

  // Preencher filtro de projetos
  async function _carregarFiltroProjetos() {
    try {
      const projetos = await API.get('/api/projetos?status=ativo');
      const sel = document.getElementById('filtro-projeto');
      if (!sel) return;
      sel.innerHTML = '<option value="">Todos os projetos</option>' +
        '<option value="pessoais">Pessoais</option>' +
        projetos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    } catch { /* ignora */ }
  }

  await _carregarFiltroProjetos();
})();
