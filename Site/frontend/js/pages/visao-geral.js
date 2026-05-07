/* ── Visão Geral ──────────────────────────────────────────── */
verificarAutenticacao();
initSidebar();

const _u = Auth.usuario();
const _isAdmin = _u?.role === 'admin' || _u?.role === 'superdev';

// Saudação
const hora = new Date().getHours();
const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
document.getElementById('vg-saudacao').textContent = `${saud}, ${_u?.nome?.split(' ')[0] || ''}`;
document.getElementById('vg-data').textContent =
  new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

const _fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const _esc    = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const FMT_D   = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—';

// ── ADMIN: 3 abas ──────────────────────────────────────────
if (_isAdmin) {
  document.getElementById('vg-tabs-admin').style.display = '';

  const TABS = { faturamento: '#vg-panel-faturamento', clientes: '#vg-panel-clientes', tarefas: '#vg-panel-tarefas' };
  const LOADED = {};

  function _ativarTab(nome) {
    document.querySelectorAll('[data-vg-tab]').forEach(t => t.classList.toggle('active', t.dataset.vgTab === nome));
    Object.values(TABS).forEach(p => document.querySelector(p)?.style && (document.querySelector(p).style.display = 'none'));
    document.querySelector(TABS[nome]).style.display = '';
    if (!LOADED[nome]) { LOADED[nome] = true; _carregarTab(nome); }
  }

  document.querySelectorAll('[data-vg-tab]').forEach(t =>
    t.addEventListener('click', () => _ativarTab(t.dataset.vgTab))
  );

  // Abrir faturamento por padrão
  _ativarTab('faturamento');

  async function _carregarTab(nome) {
    if (nome === 'faturamento') await _carregarFaturamento();
    if (nome === 'clientes')    await _carregarClientes();
    if (nome === 'tarefas')     await _carregarTarefasAdmin();
  }

  // ── Faturamento ──────────────────────────────────────────
  async function _carregarFaturamento() {
    const hoje   = new Date().toISOString().slice(0,10);
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    try {
      const [resumo, mensal] = await Promise.all([
        API.get(`/api/lancamentos/resumo?data_inicio=${inicio}&data_fim=${hoje}`),
        API.get('/api/lancamentos/mensal?meses=6'),
      ]);
      document.getElementById('fat-kpi-vendas').textContent = _fmtBRL(resumo.total_vendas);
      document.getElementById('fat-kpi-vendas-qtd').textContent = `${resumo.qtd_vendas} venda${resumo.qtd_vendas!==1?'s':''}`;
      document.getElementById('fat-kpi-desp').textContent = _fmtBRL(resumo.total_despesas);
      document.getElementById('fat-kpi-desp-qtd').textContent = `${resumo.qtd_despesas} despesa${resumo.qtd_despesas!==1?'s':''}`;
      const lEl = document.getElementById('fat-kpi-lucro');
      lEl.textContent = _fmtBRL(Math.abs(resumo.lucro));
      lEl.className = `fat-kpi-valor ${resumo.lucro>=0?'positivo':'negativo'}`;

      // Ranking
      const rankEl = document.getElementById('vg-ranking');
      if (!resumo.ranking?.length) { rankEl.innerHTML = '<div class="vnd-empty">Sem vendas este mês.</div>'; }
      else {
        const M = ['🥇','🥈','🥉'];
        rankEl.innerHTML = resumo.ranking.slice(0,5).map((r,i) => {
          const ini = (r.colaborador_nome||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
          return `<div class="fat-rank-item">
            <div class="fat-rank-pos">${M[i]||i+1+'º'}</div>
            <div class="fat-rank-avatar">${ini}</div>
            <div class="fat-rank-info"><div class="fat-rank-nome">${_esc(r.colaborador_nome)}</div><div class="fat-rank-qtd">${r.qtd} venda${r.qtd!='1'?'s':''}</div></div>
            <div class="fat-rank-valor">${_fmtBRL(r.total)}</div>
          </div>`;
        }).join('');
      }

      // Charts
      if (mensal.mensal?.length && typeof Chart !== 'undefined') {
        const labels = mensal.mensal.map(m => { const [a,ms] = m.mes.split('-'); return new Date(+a,+ms-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); });
        new Chart(document.getElementById('chart-mensal'), {
          type:'bar', data:{ labels, datasets:[
            { label:'Vendas',   data:mensal.mensal.map(m=>parseFloat(m.vendas||0)),   backgroundColor:'rgba(56,106,32,.7)' },
            { label:'Despesas', data:mensal.mensal.map(m=>parseFloat(m.despesas||0)), backgroundColor:'rgba(186,26,26,.5)' },
          ]}, options:{ responsive:true, plugins:{legend:{position:'bottom'}}, scales:{y:{ticks:{callback:v=>'R$'+v.toLocaleString('pt-BR')}}} }
        });
        if (mensal.produtos?.length) {
          const cores = ['#386A20','#55624C','#2a6fa8','#9a6010','#c03030','#5040A0','#38663c','#a86010'];
          new Chart(document.getElementById('chart-produtos'), {
            type:'doughnut', data:{ labels:mensal.produtos.map(p=>p.produto||'Outros'), datasets:[{ data:mensal.produtos.map(p=>parseFloat(p.total)), backgroundColor:cores }]},
            options:{ responsive:true, plugins:{legend:{position:'right',labels:{font:{size:11}}}} }
          });
        }
      }
    } catch (err) { console.error('Faturamento:', err); }
  }

  // ── Clientes ─────────────────────────────────────────────
  async function _carregarClientes() {
    try {
      const d = await API.get('/api/dashboard');
      document.getElementById('kpi-clientes').textContent = d.kpis.total_clientes || '0';
      document.getElementById('kpi-imoveis').textContent  = d.kpis.total_imoveis  || '0';
      document.getElementById('kpi-tarefas').textContent  = d.kpis.tarefas_ativas || '0';
      renderAlertas(d.alertas);
      renderAtividade(d.atividade_recente);
      renderClientesRecentes(d.clientes_recentes);
      renderTarefasMini('vg-tarefas-cli', d.proximas_tarefas);
    } catch (err) { console.error('Clientes tab:', err); }
  }

  // ── Tarefas ───────────────────────────────────────────────
  async function _carregarTarefasAdmin() {
    try {
      const [ativas, pendentes, concluidas, atrasadas, proximas] = await Promise.all([
        API.get('/api/tarefas?status=ativa&por_pagina=1'),
        API.get('/api/tarefas?status=aguardando&por_pagina=1'),
        API.get('/api/tarefas?status=concluida&por_pagina=1'),
        API.get('/api/tarefas?status=atrasada&por_pagina=1'),
        API.get('/api/tarefas?por_pagina=6'),
      ]);
      document.getElementById('kt-ativas').textContent    = ativas.total    || '0';
      document.getElementById('kt-pendentes').textContent = pendentes.total  || '0';
      document.getElementById('kt-concluidas').textContent= concluidas.total || '0';
      document.getElementById('kt-atrasadas').textContent = atrasadas.total  || '0';
      renderTarefasMini('vg-tarefas', proximas.tarefas || []);
    } catch (err) { console.error('Tarefas tab:', err); }
  }

// ── COLABORADOR: visão de tarefas ─────────────────────────
} else {
  document.getElementById('vg-panel-colab').style.display = '';
  (async () => {
    try {
      const [ativas, pendentes, concluidas, proximas] = await Promise.all([
        API.get('/api/tarefas?status=ativa&por_pagina=1'),
        API.get('/api/tarefas?status=aguardando&por_pagina=1'),
        API.get('/api/tarefas?status=concluida&por_pagina=1'),
        API.get('/api/tarefas?por_pagina=5'),
      ]);
      document.getElementById('ck-ativas').textContent    = ativas.total    || '0';
      document.getElementById('ck-pendentes').textContent = pendentes.total  || '0';
      document.getElementById('ck-concluidas').textContent= concluidas.total || '0';
      renderTarefasMini('ck-tarefas', proximas.tarefas || []);
    } catch (err) { console.error('Colab vg:', err); }
  })();
}

// ── Helpers de renderização ────────────────────────────────
function renderTarefasMini(elId, tarefas) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!tarefas?.length) { el.innerHTML = '<div class="vg-empty text-muted">Nenhuma tarefa.</div>'; return; }
  const PRIO = { urgente:'🔴', alta:'🟠', normal:'🟡', baixa:'🟢' };
  el.innerHTML = tarefas.map(t => `
    <div class="vg-row" onclick="window.location.href='/pages/calendario.html'">
      <div class="vg-row-icon tarefa">${PRIO[t.prioridade]||'📋'}</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(t.titulo)}</div>
        <div class="vg-row-sub">${t.data_inicio ? FMT_D(t.data_inicio) : ''}${t.atribuido_a?.nome ? ' · '+_esc(t.atribuido_a.nome) : ''}</div>
      </div>
    </div>`).join('');
}

function renderAlertas(alertas) {
  const el = document.getElementById('vg-alertas');
  if (!el) return;
  if (!alertas?.length) { el.innerHTML = '<div class="vg-empty text-muted">✅ Nenhum alerta pendente.</div>'; return; }
  el.innerHTML = alertas.map(i => `
    <div class="vg-row" onclick="window.location.href='/pages/imovel-ficha.html?id=${i.id}'">
      <div class="vg-row-icon alerta">🌾</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(i.denominacao)}</div>
        <div class="vg-row-sub">${_esc([i.municipio,i.uf].filter(Boolean).join('/'))}</div>
      </div>
    </div>`).join('');
}

function renderAtividade(atividade) {
  const el = document.getElementById('vg-atividade');
  if (!el) return;
  if (!atividade?.length) { el.innerHTML = '<div class="vg-empty text-muted">Nenhuma atividade.</div>'; return; }
  el.innerHTML = atividade.map(a => {
    const hora = new Date(a.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return `<div class="vg-atividade-item">
      <div class="vg-atividade-usuario">${_esc(a.usuario_nome||'Sistema')} · ${hora}</div>
      <div class="vg-atividade-texto">${_esc(a.cliente_nome?a.cliente_nome+': ':'')}${_esc((a.texto||'').slice(0,120))}${(a.texto?.length>120)?'...':''}</div>
    </div>`;
  }).join('');
}

function renderClientesRecentes(clientes) {
  const el = document.getElementById('vg-clientes');
  if (!el) return;
  if (!clientes?.length) { el.innerHTML = '<div class="vg-empty text-muted">Nenhum cliente.</div>'; return; }
  el.innerHTML = clientes.map(c => {
    const ini = (c.nome_completo||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    return `<div class="vg-row" onclick="window.location.href='/pages/cliente-ficha.html?id=${c.id}'">
      <div class="vg-row-icon">${ini}</div>
      <div class="vg-row-main">
        <div class="vg-row-titulo">${_esc(c.nome_completo)}</div>
        <div class="vg-row-sub">${[c.municipio,c.uf].filter(Boolean).join('/')||'—'}</div>
      </div>
    </div>`;
  }).join('');
}

function renderTarefas(tarefas) { renderTarefasMini('vg-tarefas', tarefas); }
