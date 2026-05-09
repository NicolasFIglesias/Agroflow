verificarAutenticacao();
initSidebar();

const ETAPAS = ['Captação','Documentos','Visita Técnica','Elaboração','Protocolo','Análise Banco','Contrato','Liberação','TRT'];
const MODALIDADE_LABEL = {
  custeio_agricola:'Custeio Agrícola', custeio_pecuario:'Custeio Pecuário',
  investimento:'Investimento', microcredito:'Microcrédito Rural', credito_fundiario:'Crédito Fundiário'
};
const BANCO_LABEL = {
  banco_brasil:'Banco do Brasil', sicredi:'Sicredi', sicoob:'Sicoob',
  caixa:'Caixa Econômica', bnb:'BNB'
};

let _etapaFiltro = null;
let _pagina = 1;

carregarDashboard();
carregarProjetos();
bindFiltros();

async function carregarDashboard() {
  try {
    const d = await API.get('/api/credito-rural/dashboard');
    document.getElementById('stat-total').textContent = d.totais.total;
    document.getElementById('stat-ativos').textContent = d.totais.ativos;
    document.getElementById('stat-concluidos').textContent = d.totais.concluidos;
    document.getElementById('stat-comissoes').textContent =
      Number(d.comissoes_a_receber||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

    const chips = document.getElementById('cr-etapas-chips');
    const porEtapa = {};
    (d.por_etapa||[]).forEach(e => { porEtapa[e.etapa_atual] = e.total; });
    chips.innerHTML = ETAPAS.map((nome,i) => {
      const n = porEtapa[i+1] || 0;
      return `<div class="cr-etapa-chip" data-etapa="${i+1}">${i+1}. ${nome} <strong>(${n})</strong></div>`;
    }).join('');
    chips.querySelectorAll('.cr-etapa-chip').forEach(c => c.addEventListener('click', () => {
      const e = c.dataset.etapa;
      if (_etapaFiltro === e) { _etapaFiltro = null; c.classList.remove('active'); }
      else {
        chips.querySelectorAll('.cr-etapa-chip').forEach(x => x.classList.remove('active'));
        _etapaFiltro = e; c.classList.add('active');
      }
      _pagina = 1; carregarProjetos();
    }));
  } catch {}
}

async function carregarProjetos() {
  document.getElementById('cr-loading').style.display = '';
  document.getElementById('cr-empty').style.display = 'none';
  document.getElementById('cr-tbody').innerHTML = '';
  try {
    const params = new URLSearchParams({
      pagina: _pagina,
      busca: document.getElementById('busca').value,
      modalidade: document.getElementById('fil-modalidade').value,
      banco: document.getElementById('fil-banco').value,
      status: document.getElementById('fil-status').value,
    });
    if (_etapaFiltro) params.set('etapa', _etapaFiltro);
    const data = await API.get(`/api/credito-rural?${params}`);
    document.getElementById('cr-loading').style.display = 'none';
    if (!data.projetos.length) { document.getElementById('cr-empty').style.display = ''; return; }
    document.getElementById('cr-tbody').innerHTML = data.projetos.map(p => `
      <tr>
        <td><strong style="font-family:monospace">${_esc(p.numero)}</strong></td>
        <td>${_esc(p.cliente_nome||'—')}</td>
        <td><span class="cr-badge badge-modal-${p.modalidade}">${MODALIDADE_LABEL[p.modalidade]||p.modalidade}</span></td>
        <td>${BANCO_LABEL[p.banco]||p.banco}</td>
        <td><span class="cr-badge cr-badge-${p.etapa_atual}">${p.etapa_atual}. ${ETAPAS[p.etapa_atual-1]||''}</span></td>
        <td style="font-weight:700">${Number(p.valor_liberado||p.valor_solicitado||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
        <td style="color:var(--text-muted)">${_esc(p.tecnico_nome||'—')}</td>
        <td style="color:var(--text-muted);font-size:.75rem">${new Date(p.updated_at).toLocaleDateString('pt-BR')}</td>
        <td><a href="credito-rural-projeto.html?id=${p.id}" class="btn btn-secondary btn-sm">Ver</a></td>
      </tr>`).join('');
    renderPaginacao(data.total_paginas);
  } catch (err) {
    document.getElementById('cr-loading').style.display = 'none';
    document.getElementById('cr-empty').style.display = '';
    document.getElementById('cr-empty').textContent = 'Erro: ' + err.message;
  }
}

function renderPaginacao(total) {
  const el = document.getElementById('cr-paginacao');
  if (total <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = Array.from({length:total},(_,i) => `
    <button class="btn btn-sm ${i+1===_pagina?'btn-primary':'btn-secondary'}" onclick="_irPagina(${i+1})">${i+1}</button>
  `).join('');
}
window._irPagina = (p) => { _pagina = p; carregarProjetos(); };

function bindFiltros() {
  let timer;
  document.getElementById('busca').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { _pagina=1; carregarProjetos(); }, 350); });
  ['fil-modalidade','fil-banco','fil-status'].forEach(id =>
    document.getElementById(id).addEventListener('change', () => { _pagina=1; carregarProjetos(); })
  );
}

function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
