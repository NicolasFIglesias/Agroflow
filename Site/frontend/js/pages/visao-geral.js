/* ── Visão Geral / Dashboard ──────────────────────────────── */
verificarAutenticacao();
initSidebar();

(async () => {
  // Saudação e data
  const u = Auth.usuario();
  const hora = new Date().getHours();
  const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('vg-saudacao').textContent = `${saud}, ${u?.nome?.split(' ')[0] || ''}`;
  document.getElementById('vg-data').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  try {
    const d = await API.get('/api/dashboard');

    // KPIs
    document.getElementById('kpi-clientes').textContent = d.kpis.total_clientes || '0';
    document.getElementById('kpi-imoveis').textContent  = d.kpis.total_imoveis  || '0';
    document.getElementById('kpi-tarefas').textContent  = d.kpis.tarefas_ativas || '0';

    // Alertas
    renderAlertas(d.alertas);

    // Atividade recente
    renderAtividade(d.atividade_recente);

    // Clientes recentes
    renderClientesRecentes(d.clientes_recentes);

    // Próximas tarefas
    renderTarefas(d.proximas_tarefas);

  } catch (err) {
    console.error('Dashboard:', err);
  }
})();

const CCIR_LABEL = { em_dia: 'Em dia', vencido: 'Vencido', em_renovacao: 'Em renov.' };
const CAR_LABEL  = { ativo: 'Ativo', pendente_analise: 'Pendente', cancelado: 'Cancelado', suspenso: 'Suspenso' };

function renderAlertas(alertas) {
  const el = document.getElementById('vg-alertas');
  if (!alertas?.length) {
    el.innerHTML = '<div class="vg-empty text-muted">✅ Nenhum alerta pendente.</div>';
    return;
  }
  el.innerHTML = alertas.map(i => {
    const venc = i.vencimento_ccir
      ? new Date(i.vencimento_ccir + 'T12:00:00').toLocaleDateString('pt-BR')
      : null;
    const badge = i.situacao_ccir === 'vencido'
      ? '<span class="ficha-badge ficha-badge-vermelho">CCIR Vencido</span>'
      : i.situacao_car && i.situacao_car !== 'ativo'
        ? `<span class="ficha-badge ficha-badge-ambar">CAR ${CAR_LABEL[i.situacao_car] || i.situacao_car}</span>`
        : '<span class="ficha-badge ficha-badge-ambar">CCIR vencendo</span>';

    return `<div class="vg-row" onclick="window.location.href='/pages/imovel-ficha.html?id=${i.id}'">
      <div class="vg-row-icon alerta">🌾</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(i.denominacao)}</div>
        <div class="vg-row-sub">${_esc([i.municipio, i.uf].filter(Boolean).join('/'))}${venc ? ' · Venc. ' + venc : ''}</div>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

function renderAtividade(atividade) {
  const el = document.getElementById('vg-atividade');
  if (!atividade?.length) {
    el.innerHTML = '<div class="vg-empty text-muted">Nenhuma atividade recente.</div>';
    return;
  }
  el.innerHTML = atividade.map(a => {
    const hora = new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<div class="vg-atividade-item">
      <div class="vg-atividade-usuario">${_esc(a.usuario_nome || 'Sistema')} · ${hora}</div>
      <div class="vg-atividade-texto">${_esc(a.cliente_nome ? a.cliente_nome + ': ' : '')}${_esc(a.texto?.slice(0, 120) || '')}${(a.texto?.length > 120) ? '...' : ''}</div>
    </div>`;
  }).join('');
}

function renderClientesRecentes(clientes) {
  const el = document.getElementById('vg-clientes');
  if (!clientes?.length) {
    el.innerHTML = '<div class="vg-empty text-muted">Nenhum cliente cadastrado.</div>';
    return;
  }
  el.innerHTML = clientes.map(c => {
    const iniciais = (c.nome_completo || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const loc = [c.municipio, c.uf].filter(Boolean).join('/') || '—';
    return `<div class="vg-row" onclick="window.location.href='/pages/cliente-ficha.html?id=${c.id}'">
      <div class="vg-row-icon">${iniciais}</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(c.nome_completo)}</div>
        <div class="vg-row-sub">${loc}</div>
      </div>
    </div>`;
  }).join('');
}

function renderTarefas(tarefas) {
  const el = document.getElementById('vg-tarefas');
  if (!tarefas?.length) {
    el.innerHTML = '<div class="vg-empty text-muted">Nenhuma tarefa próxima.</div>';
    return;
  }
  const PRIO = { urgente: '🔴', alta: '🟠', normal: '🟡', baixa: '🟢' };
  el.innerHTML = tarefas.map(t => {
    const data = t.data_inicio
      ? new Date(t.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '';
    const hora = t.hora ? t.hora.slice(0, 5) : '';
    return `<div class="vg-row" onclick="window.location.href='/pages/calendario.html'">
      <div class="vg-row-icon tarefa">${PRIO[t.prioridade] || '📋'}</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(t.titulo)}</div>
        <div class="vg-row-sub">${data}${hora ? ' às ' + hora : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function _esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
