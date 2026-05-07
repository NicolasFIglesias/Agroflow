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

  // ── Faturamento (só admin) ─────────────────────────────
  if (u?.role === 'admin') {
    document.getElementById('vg-fat-section').style.display = '';
    _carregarFaturamento();
  }
})();

async function _carregarFaturamento() {
  const hoje = new Date().toISOString().slice(0,10);
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  try {
    const [resumo, mensal] = await Promise.all([
      API.get(`/api/lancamentos/resumo?data_inicio=${inicio}&data_fim=${hoje}`),
      API.get('/api/lancamentos/mensal?meses=6'),
    ]);

    const _fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    document.getElementById('fat-kpi-vendas').textContent = _fmtBRL(resumo.total_vendas);
    document.getElementById('fat-kpi-vendas-qtd').textContent = `${resumo.qtd_vendas} venda${resumo.qtd_vendas!==1?'s':''}`;
    document.getElementById('fat-kpi-desp').textContent = _fmtBRL(resumo.total_despesas);
    document.getElementById('fat-kpi-desp-qtd').textContent = `${resumo.qtd_despesas} despesa${resumo.qtd_despesas!==1?'s':''}`;
    const lucroEl = document.getElementById('fat-kpi-lucro');
    lucroEl.textContent = _fmtBRL(Math.abs(resumo.lucro));
    lucroEl.className = `fat-kpi-valor ${resumo.lucro >= 0 ? 'positivo' : 'negativo'}`;

    // Ranking mini
    const rankEl = document.getElementById('vg-ranking');
    if (!resumo.ranking?.length) {
      rankEl.innerHTML = '<div class="vnd-empty">Sem vendas registradas este mês.</div>';
    } else {
      const MEDALHAS = ['🥇','🥈','🥉'];
      rankEl.innerHTML = resumo.ranking.slice(0,5).map((r, i) => {
        const ini = (r.colaborador_nome||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
        return `<div class="fat-rank-item">
          <div class="fat-rank-pos">${MEDALHAS[i]||i+1+'º'}</div>
          <div class="fat-rank-avatar">${ini}</div>
          <div class="fat-rank-info"><div class="fat-rank-nome">${_esc(r.colaborador_nome)}</div><div class="fat-rank-qtd">${r.qtd} venda${r.qtd!='1'?'s':''}</div></div>
          <div class="fat-rank-valor">${_fmtBRL(r.total)}</div>
        </div>`;
      }).join('');
    }

    // Chart: mensal
    if (mensal.mensal?.length) {
      const meses = mensal.mensal.map(m => {
        const [ano, mes] = m.mes.split('-');
        return new Date(parseInt(ano), parseInt(mes)-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
      });
      new Chart(document.getElementById('chart-mensal'), {
        type: 'bar',
        data: {
          labels: meses,
          datasets: [
            { label:'Vendas',   data: mensal.mensal.map(m => parseFloat(m.vendas||0)),   backgroundColor:'rgba(56,106,32,.7)' },
            { label:'Despesas', data: mensal.mensal.map(m => parseFloat(m.despesas||0)), backgroundColor:'rgba(186,26,26,.5)' },
          ]
        },
        options: { responsive:true, plugins:{ legend:{ position:'bottom' } }, scales:{ y:{ ticks:{ callback: v => 'R$'+v.toLocaleString('pt-BR') } } } }
      });
    }

    // Chart: produtos
    if (mensal.produtos?.length) {
      const cores = ['#386A20','#55624C','#2a6fa8','#9a6010','#c03030','#5040A0','#38663c','#a86010'];
      new Chart(document.getElementById('chart-produtos'), {
        type: 'doughnut',
        data: {
          labels: mensal.produtos.map(p => p.produto || 'Sem produto'),
          datasets: [{ data: mensal.produtos.map(p => parseFloat(p.total)), backgroundColor: cores }]
        },
        options: { responsive:true, plugins:{ legend:{ position:'right', labels:{ font:{ size:11 } } } } }
      });
    }
  } catch (err) { console.error('Faturamento:', err); }
}

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
