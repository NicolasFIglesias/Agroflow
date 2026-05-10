verificarAutenticacao();
initSidebar();

const ETAPAS = ['Captação','Documentos','Visita Técnica','Elaboração','Protocolo','Análise Banco','Contrato','Liberação','TRT'];
const ETAPA_STATUS = {
  1:['Novo','Em contato','Qualificado','Desistiu'],
  2:['Aguardando docs','Docs parciais','Docs completos'],
  3:['Agendada','Realizada','Laudo emitido'],
  4:['Em elaboração','Revisão','Concluído'],
  5:['Aguardando protocolo','Protocolado'],
  6:['Em análise','Pendência banco','Aprovado','Negado'],
  7:['Aguardando assinatura','Contrato assinado'],
  8:['Aguardando liberação','Recurso liberado'],
  9:['TRT emitido','Projeto concluído'],
};
const MODALIDADE_LABEL = {
  custeio_agricola:'Custeio Agrícola', custeio_pecuario:'Custeio Pecuário',
  investimento:'Investimento', microcredito:'Microcrédito Rural', credito_fundiario:'Crédito Fundiário'
};
const BANCO_LABEL = {
  banco_brasil:'Banco do Brasil', sicredi:'Sicredi', sicoob:'Sicoob',
  caixa:'Caixa Econômica', bnb:'BNB'
};
const STATUS_COMISSAO_LABEL = {
  a_receber:'A receber', recebido_parcial:'Recebido parcialmente', recebido_integral:'Recebido integralmente'
};

const id = new URLSearchParams(location.search).get('id');
let _proj = null;

carregarProjeto();

async function carregarProjeto() {
  try {
    _proj = await API.get(`/api/credito-rural/${id}`);
    document.getElementById('proj-loading').style.display = 'none';
    document.getElementById('proj-content').style.display = '';
    renderProjeto();
  } catch (err) {
    document.getElementById('proj-loading').textContent = 'Erro: ' + err.message;
  }
}

function renderProjeto() {
  const p = _proj;
  document.title = `${p.numero} — AgriFlow`;

  // Header
  document.getElementById('proj-header').innerHTML = `
    <div class="proj-num">${p.numero}${p.status==='concluido'?' <span style="font-size:.7rem;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:4px;margin-left:8px">✓ Concluído</span>':''}</div>
    <div class="proj-nome">${p.cliente_nome || 'Sem cliente'}</div>
    <div class="proj-sub">${MODALIDADE_LABEL[p.modalidade]||p.modalidade} · ${BANCO_LABEL[p.banco]||p.banco}${p.imovel_nome?' · '+p.imovel_nome:''}${p.cultura?' · '+p.cultura:''}</div>`;

  // Barra de etapas
  document.getElementById('etapas-bar').innerHTML = ETAPAS.map((nome,i) => {
    const n = i+1;
    const cls = n < p.etapa_atual ? 'concluida' : n === p.etapa_atual ? 'atual' : '';
    return `<div class="etapa-step ${cls}">${n < p.etapa_atual ? '✓ ' : ''}${n}. ${nome}</div>`;
  }).join('');

  // Cards de info
  const comissaoEfetiva = p.valor_liberado
    ? parseFloat(p.valor_liberado) * (parseFloat(p.percentual_comissao)||3) / 100
    : parseFloat(p.valor_comissao||0);

  document.getElementById('info-grid').innerHTML = `
    <div class="info-card"><div class="info-card-label">Valor solicitado</div><div class="info-card-val">${_brl(p.valor_solicitado)}</div></div>
    <div class="info-card"><div class="info-card-label">Valor liberado</div><div class="info-card-val">${p.valor_liberado?_brl(p.valor_liberado):'—'}</div></div>
    <div class="info-card"><div class="info-card-label">Comissão (${p.percentual_comissao||3}%)</div><div class="info-card-val" style="color:var(--verde)">${_brl(comissaoEfetiva)}</div></div>
    <div class="info-card"><div class="info-card-label">Técnico</div><div class="info-card-val" style="font-size:.85rem">${p.tecnico_nome||'—'}</div></div>
    <div class="info-card"><div class="info-card-label">Data de abertura</div><div class="info-card-val" style="font-size:.85rem">${new Date(p.data_abertura+'T12:00:00').toLocaleDateString('pt-BR')}</div></div>
    <div class="info-card"><div class="info-card-label">Etapa atual</div><div class="info-card-val" style="font-size:.85rem">${p.etapa_atual}. ${ETAPAS[p.etapa_atual-1]}</div></div>`;

  // Painel de comissão
  const recebida = p.status_comissao === 'recebido_integral';
  document.getElementById('etapa-atual-panel').innerHTML = `
    ${_renderComissaoPanel(p, comissaoEfetiva, recebida)}
    ${_renderEtapaPanel(p)}`;
}

function _renderComissaoPanel(p, comissaoEfetiva, recebida) {
  return `
  <div class="card" style="margin-top:16px">
    <div class="card-header" style="font-size:.82rem">💰 Comissão do projeto</div>
    <div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:${recebida?'0':'14px'}">
        <div><div class="info-card-label">Status</div>
          <div style="font-weight:800;font-size:.9rem;color:${recebida?'#166534':p.status_comissao==='recebido_parcial'?'#854D0E':'#92400E'}">
            ${STATUS_COMISSAO_LABEL[p.status_comissao]||'—'}
          </div>
        </div>
        <div><div class="info-card-label">Valor comissão</div><div style="font-weight:800;font-size:.9rem">${_brl(comissaoEfetiva)}</div></div>
        ${recebida?`<div><div class="info-card-label">Recebido em</div><div style="font-weight:700;font-size:.85rem">${p.data_recebimento_comissao?new Date(p.data_recebimento_comissao+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</div></div>`:''}
      </div>
      ${!recebida ? `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--md-outline-variant)">
          <select id="forma-recebimento" class="form-select" style="width:auto;min-width:150px">
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cheque">Cheque</option>
          </select>
          <button class="btn btn-primary" onclick="registrarComissao()">✓ Registrar recebimento</button>
        </div>` : `<div style="margin-top:8px;font-size:.82rem;color:#166534;font-weight:600">✓ Comissão registrada como receita no Faturamento</div>`}
    </div>
  </div>`;
}

function _renderEtapaPanel(p) {
  // Projeto concluído
  if (p.status === 'concluido') {
    return `
    <div class="card" style="margin-top:16px;border-color:#166534">
      <div class="card-header" style="background:#166534;font-size:.82rem">✅ Projeto concluído</div>
      <div class="card-body" style="display:grid;gap:8px">
        ${p.trt_numero ? `<div><strong>TRT:</strong> ${p.trt_numero}</div>` : ''}
        ${p.trt_contrato_banco ? `<div><strong>Contrato banco:</strong> ${p.trt_contrato_banco}</div>` : ''}
        ${p.trt_data_liberacao ? `<div><strong>Data liberação:</strong> ${new Date(p.trt_data_liberacao+'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
        ${p.trt_valor_contrato ? `<div><strong>Valor liberado:</strong> ${_brl(p.trt_valor_contrato)}</div>` : ''}
      </div>
    </div>`;
  }

  // Etapa 9 — Emissão do TRT
  if (p.etapa_atual === 9) {
    return `
    <div class="card" style="margin-top:16px">
      <div class="card-header" style="font-size:.82rem">📋 Etapa 9: Emissão do TRT — Concluir projeto</div>
      <div class="card-body" style="display:grid;gap:14px">
        <p style="font-size:.82rem;color:var(--text-muted)">Preencha os dados do contrato bancário para emitir o TRT e concluir o projeto.</p>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nº do contrato bancário *</label>
            <input type="text" id="trt-contrato" class="form-input" placeholder="Ex: 2025/00123-4">
          </div>
          <div class="form-group">
            <label class="form-label">Data de assinatura *</label>
            <input type="date" id="trt-data-ass" class="form-input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data de liberação *</label>
            <input type="date" id="trt-data-lib" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Valor efetivamente liberado (R$) *</label>
            <input type="number" id="trt-valor" class="form-input" placeholder="240000.00" step="0.01"
              value="${p.valor_aprovado||p.valor_solicitado||''}"
              oninput="document.getElementById('trt-comissao-preview').textContent=_brlCalc(this.value,${p.percentual_comissao||3})">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nº do TRT (gerado automaticamente)</label>
            <input type="text" id="trt-numero" class="form-input" placeholder="TRT-${new Date().getFullYear()}-${String(_proj.numero_sequencial||'001').padStart(3,'0')}" value="TRT-${new Date().getFullYear()}-${String(_proj.numero_sequencial||'001').padStart(3,'0')}">
          </div>
          <div class="form-group">
            <label class="form-label">Comissão efetiva calculada</label>
            <div id="trt-comissao-preview" style="padding:10px 12px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-weight:800;color:var(--verde);font-size:1rem">—</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações do TRT</label>
          <textarea id="trt-obs" class="form-textarea" placeholder="Observações adicionais..."></textarea>
        </div>
        <div id="trt-error" style="display:none;padding:10px;background:var(--md-error-container);border-radius:var(--radius-sm);color:var(--md-on-error-container);font-size:.82rem"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary" onclick="salvarEtapa()">💾 Salvar observações</button>
          <button class="btn btn-primary" style="background:#166534;border-color:#0D3B20" onclick="concluirProjeto()">✅ Emitir TRT e concluir projeto</button>
        </div>
      </div>
    </div>`;
  }

  // Etapas 1-8 — Avançar
  const proxEtapa = p.etapa_atual + 1;
  return `
  <div class="card" style="margin-top:16px">
    <div class="card-header" style="font-size:.82rem">Etapa ${p.etapa_atual}: ${ETAPAS[p.etapa_atual-1]}</div>
    <div class="card-body" style="display:grid;gap:14px">
      <div class="form-group">
        <label class="form-label">Status atual</label>
        <select id="status-etapa" class="form-select">
          ${(ETAPA_STATUS[p.etapa_atual]||[]).map(s=>`<option>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea id="obs-etapa" class="form-textarea" placeholder="Observações desta etapa..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Pendências</label>
        <textarea id="pend-etapa" class="form-textarea" placeholder="Liste itens pendentes para avançar..."></textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary" onclick="salvarEtapa()">💾 Salvar observações</button>
        <button class="btn btn-primary" onclick="avancarEtapa(${proxEtapa})">Avançar para etapa ${proxEtapa}: ${ETAPAS[proxEtapa-1]} →</button>
      </div>
    </div>
  </div>`;
}

window._brlCalc = (v, pct) => {
  const val = parseFloat(v)||0;
  return val > 0 ? _brl(val * pct / 100) : '—';
};

window.avancarEtapa = async (etapa) => {
  if (!confirm(`Avançar para etapa ${etapa}: ${ETAPAS[etapa-1]}?`)) return;
  try {
    await API.post(`/api/credito-rural/${id}/etapa`, {
      etapa,
      status_etapa: document.getElementById('status-etapa')?.value,
      observacoes:  document.getElementById('obs-etapa')?.value,
      pendencias:   document.getElementById('pend-etapa')?.value,
    });
    carregarProjeto();
  } catch (err) { alert('Erro: ' + err.message); }
};

window.salvarEtapa = async () => {
  try {
    await API.post(`/api/credito-rural/${id}/etapa`, {
      etapa:        _proj.etapa_atual,
      status_etapa: document.getElementById('status-etapa')?.value,
      observacoes:  document.getElementById('obs-etapa')?.value,
      pendencias:   document.getElementById('pend-etapa')?.value,
    });
    alert('Salvo!');
  } catch (err) { alert('Erro: ' + err.message); }
};

window.concluirProjeto = async () => {
  const contrato = document.getElementById('trt-contrato').value.trim();
  const dataAss  = document.getElementById('trt-data-ass').value;
  const dataLib  = document.getElementById('trt-data-lib').value;
  const valor    = parseFloat(document.getElementById('trt-valor').value);
  const errEl    = document.getElementById('trt-error');

  if (!contrato || !dataAss || !dataLib || !valor) {
    errEl.textContent = 'Preencha: Nº contrato, data de assinatura, data de liberação e valor liberado.';
    errEl.style.display = '';
    return;
  }
  errEl.style.display = 'none';

  if (!confirm('Confirmar emissão do TRT e conclusão do projeto?')) return;

  const comissaoEfetiva = valor * (parseFloat(_proj.percentual_comissao)||3) / 100;

  try {
    // Atualizar projeto com dados TRT + concluir
    await API.put(`/api/credito-rural/${id}`, {
      status:                'concluido',
      valor_liberado:        valor,
      valor_comissao:        comissaoEfetiva,
      trt_numero:            document.getElementById('trt-numero').value || `TRT-${new Date().getFullYear()}-${String(_proj.numero_sequencial||'001').padStart(3,'0')}`,
      trt_contrato_banco:    contrato,
      trt_data_assinatura:   dataAss,
      trt_data_liberacao:    dataLib,
      trt_data_emissao:      new Date().toISOString().slice(0,10),
      trt_valor_contrato:    valor,
      trt_obs:               document.getElementById('trt-obs').value || null,
    });
    // Registrar etapa 9 concluída
    await API.post(`/api/credito-rural/${id}/etapa`, {
      etapa:       9,
      status_etapa:'Projeto concluído',
      observacoes: `TRT emitido. Contrato: ${contrato}. Valor liberado: ${_brl(valor)}.`,
    });
    carregarProjeto();
  } catch (err) {
    errEl.textContent = 'Erro: ' + err.message;
    errEl.style.display = '';
  }
};

window.registrarComissao = async () => {
  const forma = document.getElementById('forma-recebimento').value;
  const comissaoEfetiva = _proj.valor_liberado
    ? parseFloat(_proj.valor_liberado) * (parseFloat(_proj.percentual_comissao)||3) / 100
    : parseFloat(_proj.valor_comissao||0);

  if (!comissaoEfetiva) { alert('Valor da comissão não calculado. Conclua o projeto primeiro.'); return; }
  if (!confirm(`Registrar recebimento de ${_brl(comissaoEfetiva)} via ${forma}?`)) return;

  try {
    // Marcar comissão no projeto
    await API.put(`/api/credito-rural/${id}`, {
      status_comissao:           'recebido_integral',
      data_recebimento_comissao: new Date().toISOString().slice(0,10),
      forma_recebimento:         forma,
    });
    // Criar lançamento de receita
    await API.post('/api/lancamentos', {
      tipo:             'receita',
      cliente_id:       _proj.cliente_id || null,
      cliente_nome:     _proj.cliente_nome || null,
      produto:          `Comissão Crédito Rural — ${_proj.numero}`,
      valor:            comissaoEfetiva,
      forma_pagamento:  forma,
      status_pagamento: 'pago',
      status_venda:     'finalizada',
      data_lancamento:  new Date().toISOString().slice(0,10),
      observacao:       `${MODALIDADE_LABEL[_proj.modalidade]||_proj.modalidade} · ${BANCO_LABEL[_proj.banco]||_proj.banco}`,
    });
    carregarProjeto();
  } catch (err) { alert('Erro: ' + err.message); }
};

function _brl(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
