/* ── Faturamento (admin dashboard) ───────────────────────── */
verificarAutenticacao();
const _u = Auth.usuario();
if (!_u || _u.role !== 'admin') window.location.href = '/pages/vendas.html';
initSidebar();

let _inicio = _periodoInicio('mes');
let _fim    = new Date().toISOString().slice(0,10);

function _periodoInicio(p) {
  const d = new Date();
  if (p === 'hoje')   return d.toISOString().slice(0,10);
  if (p === 'semana') { d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); }
  if (p === 'mes')    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  if (p === 'ano')    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0,10);
  return d.toISOString().slice(0,10);
}

(async () => {
  await _carregar();
  _bindEventos();
})();

async function _carregar() {
  try {
    const p = new URLSearchParams({ data_inicio: _inicio, data_fim: _fim });
    const d = await API.get('/api/lancamentos/resumo?' + p);
    _renderKPIs(d);
    _renderRanking(d.ranking || []);
    _renderUltimos(d.ultimos || []);
  } catch (err) {
    document.getElementById('fat-ranking').innerHTML =
      `<div class="vnd-empty" style="color:var(--md-error)">Erro: ${err.message}</div>`;
  }
}

const _fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function _renderKPIs(d) {
  document.getElementById('kpi-vendas').textContent     = _fmtBRL(d.total_vendas);
  document.getElementById('kpi-vendas-qtd').textContent = `${d.qtd_vendas} venda${d.qtd_vendas !== 1 ? 's' : ''}`;
  document.getElementById('kpi-despesas').textContent   = _fmtBRL(d.total_despesas);
  document.getElementById('kpi-despesas-qtd').textContent = `${d.qtd_despesas} despesa${d.qtd_despesas !== 1 ? 's' : ''}`;
  const lucro = d.lucro;
  const lucroEl = document.getElementById('kpi-lucro');
  lucroEl.textContent = _fmtBRL(Math.abs(lucro));
  lucroEl.className = `fat-kpi-valor ${lucro >= 0 ? 'positivo' : 'negativo'}`;
  document.getElementById('kpi-lucro-sub').textContent = lucro >= 0
    ? `Lucro líquido no período`
    : `Prejuízo no período`;
}

function _renderRanking(ranking) {
  const el = document.getElementById('fat-ranking');
  if (!ranking.length) {
    el.innerHTML = '<div class="vnd-empty">Nenhuma venda registrada no período.</div>';
    return;
  }
  const max = parseFloat(ranking[0]?.total || 1);
  const MEDALHAS = ['🥇','🥈','🥉'];
  const CLASSES  = ['ouro','prata','bronze'];
  el.innerHTML = ranking.map((r, i) => {
    const pct = (parseFloat(r.total) / max * 100).toFixed(0);
    const iniciais = (r.colaborador_nome || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    return `
    <div class="fat-rank-item">
      <div class="fat-rank-pos ${CLASSES[i] || ''}">${MEDALHAS[i] || (i+1)+'º'}</div>
      <div class="fat-rank-avatar">${iniciais}</div>
      <div class="fat-rank-info">
        <div class="fat-rank-nome">${_esc(r.colaborador_nome)}</div>
        <div class="fat-rank-qtd">${r.qtd} venda${r.qtd !== '1' ? 's' : ''}</div>
      </div>
      <div class="fat-rank-bar-wrap">
        <div class="fat-rank-bar"><div class="fat-rank-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="fat-rank-valor">${_fmtBRL(r.total)}</div>
    </div>`;
  }).join('');
}

function _renderUltimos(ultimos) {
  const el = document.getElementById('fat-ultimos');
  if (!ultimos.length) { el.innerHTML = '<div class="vnd-empty">Sem lançamentos.</div>'; return; }
  const FMT_D = d => new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  el.innerHTML = ultimos.map(l => {
    const isV = l.tipo === 'venda';
    return `
    <div class="fat-row">
      <span style="font-size:1rem">${isV ? '📈' : '📉'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.875rem;font-weight:600;color:var(--md-on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(l.cliente_nome || l.produto || '—')}</div>
        <div style="font-size:.75rem;color:var(--md-on-surface-variant)">${_esc(l.colaborador_nome || '')}${l.forma_pagamento ? ' · '+l.forma_pagamento : ''}</div>
      </div>
      <div style="font-size:.75rem;color:var(--md-on-surface-variant);flex-shrink:0;margin:0 8px">${FMT_D(l.data_lancamento)}</div>
      <div style="font-weight:700;white-space:nowrap;color:${isV ? 'var(--md-primary)' : 'var(--md-error)'}">${_fmtBRL(l.valor)}</div>
    </div>`;
  }).join('');
}

function _bindEventos() {
  document.querySelectorAll('.vnd-periodo-btn[data-periodo]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vnd-periodo-btn[data-periodo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _inicio = _periodoInicio(btn.dataset.periodo);
      _fim    = new Date().toISOString().slice(0,10);
      _carregar();
    })
  );
}
