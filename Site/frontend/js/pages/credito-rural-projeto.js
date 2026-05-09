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

  document.getElementById('proj-header').innerHTML = `
    <div class="proj-num">${p.numero}</div>
    <div class="proj-nome">${p.cliente_nome || 'Sem cliente'}</div>
    <div class="proj-sub">${MODALIDADE_LABEL[p.modalidade]||p.modalidade} · ${BANCO_LABEL[p.banco]||p.banco}${p.imovel_nome?' · '+p.imovel_nome:''}${p.cultura?' · '+p.cultura:''}</div>`;

  // Stage bar
  document.getElementById('etapas-bar').innerHTML = ETAPAS.map((nome,i) => {
    const n = i+1;
    const cls = n < p.etapa_atual ? 'concluida' : n === p.etapa_atual ? 'atual' : '';
    return `<div class="etapa-step ${cls}">${n < p.etapa_atual ? '✓ ' : ''}${n}. ${nome}</div>`;
  }).join('');

  // Info cards
  document.getElementById('info-grid').innerHTML = `
    <div class="info-card"><div class="info-card-label">Valor solicitado</div><div class="info-card-val">${_brl(p.valor_solicitado)}</div></div>
    <div class="info-card"><div class="info-card-label">Valor liberado</div><div class="info-card-val">${p.valor_liberado?_brl(p.valor_liberado):'—'}</div></div>
    <div class="info-card"><div class="info-card-label">Comissão estimada</div><div class="info-card-val">${_brl((p.valor_solicitado||0)*(p.percentual_comissao||3)/100)}</div></div>
    <div class="info-card"><div class="info-card-label">Técnico</div><div class="info-card-val" style="font-size:.85rem">${p.tecnico_nome||'—'}</div></div>
    <div class="info-card"><div class="info-card-label">Data de abertura</div><div class="info-card-val" style="font-size:.85rem">${new Date(p.data_abertura).toLocaleDateString('pt-BR')}</div></div>
    <div class="info-card"><div class="info-card-label">Etapa atual</div><div class="info-card-val" style="font-size:.85rem">${p.etapa_atual}. ${ETAPAS[p.etapa_atual-1]}</div></div>`;

  // Stage advancement panel
  if (p.etapa_atual < 9) {
    const proxEtapa = p.etapa_atual + 1;
    const statusOpts = ETAPA_STATUS[proxEtapa] || [];
    document.getElementById('etapa-atual-panel').innerHTML = `
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span>Etapa ${p.etapa_atual}: ${ETAPAS[p.etapa_atual-1]}</span></div>
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
}

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
      etapa: _proj.etapa_atual,
      status_etapa: document.getElementById('status-etapa')?.value,
      observacoes:  document.getElementById('obs-etapa')?.value,
      pendencias:   document.getElementById('pend-etapa')?.value,
    });
    alert('Salvo!');
  } catch (err) { alert('Erro: ' + err.message); }
};

function _brl(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
