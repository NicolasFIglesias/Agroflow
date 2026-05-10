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
let _pagina      = 1;
let _tabAtiva    = 'ativos'; // 'ativos' | 'concluidos'

carregarDashboard();
carregarProjetos();
bindFiltros();

// ── Dashboard ─────────────────────────────────────────────────
async function carregarDashboard() {
  try {
    const d = await API.get('/api/credito-rural/dashboard');
    document.getElementById('stat-total').textContent     = d.totais.total;
    document.getElementById('stat-ativos').textContent    = d.totais.ativos;
    document.getElementById('stat-concluidos').textContent= d.totais.concluidos;
    document.getElementById('stat-comissoes').textContent =
      Number(d.comissoes_a_receber||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

    const chips  = document.getElementById('cr-etapas-chips');
    const porEtapa = {};
    (d.por_etapa||[]).forEach(e => { porEtapa[e.etapa_atual] = e.total; });
    chips.innerHTML = ETAPAS.map((nome,i) => {
      const n = porEtapa[i+1] || 0;
      return `<div class="cr-etapa-chip" data-etapa="${i+1}">${i+1}. ${nome} <strong>(${n})</strong></div>`;
    }).join('');
    chips.querySelectorAll('.cr-etapa-chip').forEach(c => c.addEventListener('click', () => {
      if (_tabAtiva !== 'ativos') return;
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

// ── Troca de aba ─────────────────────────────────────────────
window.trocarAba = function(aba) {
  _tabAtiva    = aba;
  _pagina      = 1;
  _etapaFiltro = null;

  document.getElementById('tab-ativos').classList.toggle('active',    aba === 'ativos');
  document.getElementById('tab-concluidos').classList.toggle('active', aba === 'concluidos');

  // Chips de etapa só na aba Em andamento
  document.getElementById('cr-etapas-chips').style.display = aba === 'ativos' ? '' : 'none';
  document.querySelectorAll('.cr-etapa-chip').forEach(c => c.classList.remove('active'));

  // Filtro de comissão só na aba Concluídos
  document.getElementById('fil-comissao').style.display = aba === 'concluidos' ? '' : 'none';

  // Cabeçalho da tabela muda conforme aba
  if (aba === 'concluidos') {
    document.getElementById('cr-thead').innerHTML = `<tr>
      <th>Nº Projeto</th><th>Cliente</th><th>Modalidade</th><th>Banco</th>
      <th>Valor liberado</th><th>Comissão</th><th>Status comissão</th><th>Concluído em</th><th></th>
    </tr>`;
  } else {
    document.getElementById('cr-thead').innerHTML = `<tr>
      <th>Nº Projeto</th><th>Cliente</th><th>Modalidade</th><th>Banco</th>
      <th>Etapa</th><th>Valor</th><th>Técnico</th><th>Atualizado</th><th></th>
    </tr>`;
  }

  carregarProjetos();
};

// ── Lista de projetos ─────────────────────────────────────────
async function carregarProjetos() {
  document.getElementById('cr-loading').style.display = '';
  document.getElementById('cr-empty').style.display   = 'none';
  document.getElementById('cr-tbody').innerHTML       = '';
  try {
    const params = new URLSearchParams({
      pagina:     _pagina,
      busca:      document.getElementById('busca').value,
      modalidade: document.getElementById('fil-modalidade').value,
      banco:      document.getElementById('fil-banco').value,
      status:     _tabAtiva === 'concluidos' ? 'concluido' : 'ativo',
    });
    if (_etapaFiltro && _tabAtiva === 'ativos') params.set('etapa', _etapaFiltro);

    // Filtro de comissão (aba concluídos)
    const filComissao = document.getElementById('fil-comissao').value;
    if (_tabAtiva === 'concluidos' && filComissao) params.set('status_comissao', filComissao);

    const data = await API.get(`/api/credito-rural?${params}`);
    document.getElementById('cr-loading').style.display = 'none';
    if (!data.projetos.length) {
      document.getElementById('cr-empty').style.display = '';
      document.getElementById('cr-empty').textContent   = _tabAtiva === 'concluidos'
        ? 'Nenhum projeto concluído encontrado.' : 'Nenhum projeto em andamento.';
      return;
    }

    document.getElementById('cr-tbody').innerHTML = data.projetos.map(p => {
      if (_tabAtiva === 'concluidos') return _rowConcluido(p);
      return _rowAtivo(p);
    }).join('');

    renderPaginacao(data.total_paginas);
  } catch (err) {
    document.getElementById('cr-loading').style.display = 'none';
    document.getElementById('cr-empty').style.display   = '';
    document.getElementById('cr-empty').textContent     = 'Erro: ' + err.message;
  }
}

function _rowAtivo(p) {
  return `<tr>
    <td><strong style="font-family:monospace">${_esc(p.numero)}</strong></td>
    <td>${_esc(p.cliente_nome||'—')}</td>
    <td><span class="cr-badge badge-modal-${p.modalidade}">${MODALIDADE_LABEL[p.modalidade]||p.modalidade}</span></td>
    <td>${BANCO_LABEL[p.banco]||p.banco}</td>
    <td><span class="cr-badge cr-badge-${p.etapa_atual}">${p.etapa_atual}. ${ETAPAS[p.etapa_atual-1]||''}</span></td>
    <td style="font-weight:700">${_brl(p.valor_liberado||p.valor_solicitado)}</td>
    <td style="color:var(--text-muted)">${_esc(p.tecnico_nome||'—')}</td>
    <td style="color:var(--text-muted);font-size:.75rem">${new Date(p.updated_at).toLocaleDateString('pt-BR')}</td>
    <td><a href="credito-rural-projeto.html?id=${p.id}" class="btn btn-secondary btn-sm">Ver</a></td>
  </tr>`;
}

function _rowConcluido(p) {
  const comissao     = p.valor_liberado
    ? parseFloat(p.valor_liberado) * (parseFloat(p.percentual_comissao)||3) / 100
    : parseFloat(p.valor_comissao||0);
  const recebida     = p.status_comissao === 'recebido_integral';
  const statusLabel  = recebida ? '✓ Recebida' : '⏳ A receber';
  const statusCls    = recebida ? 'cr-badge-comissao-ok' : 'cr-badge-comissao-pend';

  return `<tr>
    <td><strong style="font-family:monospace">${_esc(p.numero)}</strong></td>
    <td>${_esc(p.cliente_nome||'—')}</td>
    <td><span class="cr-badge badge-modal-${p.modalidade}">${MODALIDADE_LABEL[p.modalidade]||p.modalidade}</span></td>
    <td>${BANCO_LABEL[p.banco]||p.banco}</td>
    <td style="font-weight:700">${_brl(p.valor_liberado||0)}</td>
    <td style="font-weight:800;color:var(--verde)">${_brl(comissao)}</td>
    <td><span class="cr-badge ${statusCls}">${statusLabel}</span></td>
    <td style="color:var(--text-muted);font-size:.75rem">${new Date(p.updated_at).toLocaleDateString('pt-BR')}</td>
    <td style="display:flex;gap:6px">
      <a href="credito-rural-projeto.html?id=${p.id}" class="btn btn-secondary btn-sm">Ver</a>
      ${!recebida ? `<button class="btn btn-primary btn-sm" onclick="abrirRecebimento('${p.id}','${p.numero}',${comissao},'${_esc(p.cliente_nome||'')}','${_esc(p.cliente_id||'')}','${p.modalidade}','${p.banco}')">Receber</button>` : ''}
    </td>
  </tr>`;
}

// ── Modal de recebimento de comissão ─────────────────────────
let _recebimentoAtual = null;

window.abrirRecebimento = function(pid, numero, comissao, clienteNome, clienteId, modalidade, banco) {
  _recebimentoAtual = { pid, numero, comissao, clienteNome, clienteId, modalidade, banco };

  let modal = document.getElementById('modal-recebimento');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modal-recebimento';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:420px">
        <div class="modal-header">
          <h2>Registrar recebimento de comissão</h2>
          <button class="modal-close" onclick="fecharRecebimento()">✕</button>
        </div>
        <div class="modal-body">
          <p id="rec-projeto-info" style="margin-bottom:16px;font-size:.85rem;color:var(--text-muted)"></p>
          <div style="font-size:1.2rem;font-weight:900;color:var(--verde);margin-bottom:20px" id="rec-valor"></div>
          <div class="form-group">
            <label class="form-label">Forma de recebimento</label>
            <select id="rec-forma" class="form-select">
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharRecebimento()">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirmar-recebimento" onclick="confirmarRecebimento()">✓ Confirmar recebimento</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) fecharRecebimento(); });
  }

  document.getElementById('rec-projeto-info').textContent =
    `${numero} — ${MODALIDADE_LABEL[modalidade]||modalidade} · ${BANCO_LABEL[banco]||banco}${clienteNome ? ' · ' + clienteNome : ''}`;
  document.getElementById('rec-valor').textContent = _brl(comissao);
  modal.classList.add('open');
};

window.fecharRecebimento = function() {
  document.getElementById('modal-recebimento')?.classList.remove('open');
};

window.confirmarRecebimento = async function() {
  const { pid, numero, comissao, clienteNome, clienteId, modalidade, banco } = _recebimentoAtual;
  const forma = document.getElementById('rec-forma').value;
  const btn   = document.getElementById('btn-confirmar-recebimento');
  btn.disabled = true; btn.textContent = 'Registrando...';
  try {
    await API.put(`/api/credito-rural/${pid}`, {
      status_comissao:           'recebido_integral',
      data_recebimento_comissao: new Date().toISOString().slice(0,10),
      forma_recebimento:         forma,
    });
    await API.post('/api/lancamentos', {
      tipo:             'venda',
      cliente_id:       clienteId || null,
      cliente_nome:     clienteNome || null,
      produto:          `Comissão Crédito Rural — ${numero}`,
      valor:            comissao,
      forma_pagamento:  forma,
      status_pagamento: 'pago',
      status_venda:     'finalizada',
      data_lancamento:  new Date().toISOString().slice(0,10),
      observacao:       `${MODALIDADE_LABEL[modalidade]||modalidade} · ${BANCO_LABEL[banco]||banco}`,
    });
    fecharRecebimento();
    carregarDashboard();
    carregarProjetos();
  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '✓ Confirmar recebimento';
  }
};

// ── Paginação e filtros ───────────────────────────────────────
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
  document.getElementById('busca').addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(() => { _pagina=1; carregarProjetos(); }, 350);
  });
  ['fil-modalidade','fil-banco','fil-comissao'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { _pagina=1; carregarProjetos(); })
  );
}

function _brl(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
