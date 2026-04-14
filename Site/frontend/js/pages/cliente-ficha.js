/* ── Cliente Ficha ─────────────────────────────────────────── */
verificarAutenticacao();

const params    = new URLSearchParams(location.search);
const clienteId = params.get('id');
if (!clienteId) window.location.href = '/pages/clientes.html';

let _cliente       = null;
let _timelinePagina = 1;
let _timelineTotal  = 0;
let _contaEditandoId = null;
let _imovelVincularId = null;
let _cofreEditandoId  = null;
let _vincularBuscaTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  await carregarCliente();
  bindTabs();
  bindTimeline();
  bindContas();
  bindConjuge();
  bindImoveis();
  bindCofre();

  // Admin-only tab
  const u = usuario();
  if (u && u.role === 'admin') {
    document.querySelectorAll('.cf-tab-admin').forEach(t => t.style.display = '');
  }
});

// ── Carregar cliente ──────────────────────────────────────────
async function carregarCliente() {
  try {
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderHero();
    renderDados();
    renderContas();
    renderConjuge();
    renderImoveis();

    // Abrir tab direto se ?tab= na URL
    const tabParam = params.get('tab');
    if (tabParam) ativarTab(tabParam);
    else carregarTimeline(true);
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar cliente.');
    window.location.href = '/pages/clientes.html';
  }
}

// ── Hero ──────────────────────────────────────────────────────
function renderHero() {
  const c = _cliente;
  const iniciais = (c.nome_completo || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('cf-hero-avatar').textContent = iniciais;
  document.getElementById('cf-nome').textContent = c.nome_completo;
  document.getElementById('cf-breadcrumb-nome').textContent = c.nome_completo;
  document.title = c.nome_completo + ' — AgriFlow';

  const meta = [];
  if (c.tipo_pessoa) meta.push(`<span>${c.tipo_pessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>`);
  if (c.municipio)   meta.push(`<span>📍 ${c.municipio}${c.uf ? '/' + c.uf : ''}</span>`);
  if (c.celular)     meta.push(`<span>📱 ${c.celular}</span>`);
  if (c.email)       meta.push(`<span>✉ ${c.email}</span>`);
  document.getElementById('cf-hero-meta').innerHTML = meta.join('');
}

// ── Dados pessoais ────────────────────────────────────────────
function renderDados() {
  const c = _cliente;
  const isPJ = c.tipo_pessoa === 'PJ';
  const f = (v) => v || '<span class="empty">—</span>';

  const html = `
    <div class="cf-section-title">Identificação</div>
    ${isPJ ? campo('Razão Social', c.nome_completo) : campo('Nome Completo', c.nome_completo)}
    ${isPJ ? campo('Nome Fantasia', c.nome_fantasia) : ''}
    ${!isPJ ? campo('CPF', c.cpf) : campo('CNPJ', c.cnpj)}
    ${!isPJ ? campo('RG', c.rg) : ''}
    ${!isPJ ? campo('Data de Nascimento', c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : null) : ''}
    ${!isPJ ? campo('Nacionalidade', c.nacionalidade) : ''}
    ${!isPJ ? campo('Estado Civil', formatEstadoCivil(c.estado_civil)) : ''}
    ${campo('Profissão / Atividade', c.profissao)}
    ${campo('DAP / CAF', c.dap_caf)}
    ${campo('Inscrição Estadual', c.inscricao_estadual)}
    ${campo('NIRF', c.nirf)}

    <div class="cf-section-title">Endereço</div>
    ${campo('CEP', c.cep)}
    ${campo('Logradouro', c.logradouro ? c.logradouro + (c.numero ? ', ' + c.numero : '') + (c.complemento ? ' — ' + c.complemento : '') : null)}
    ${campo('Bairro', c.bairro)}
    ${campo('Município / UF', c.municipio ? c.municipio + (c.uf ? '/' + c.uf : '') : null)}
    ${campo('Endereço Rural', c.endereco_rural)}
    ${campo('Caixa Postal', c.caixa_postal)}

    <div class="cf-section-title">Contato</div>
    ${campo('Celular', c.celular)}
    ${campo('Celular 2', c.celular2)}
    ${campo('Telefone Fixo', c.telefone_fixo)}
    ${campo('E-mail', c.email)}
    ${campo('E-mail 2', c.email2)}
    ${campo('Contato de Referência', c.contato_referencia_nome ? c.contato_referencia_nome + (c.contato_referencia_telefone ? ' — ' + c.contato_referencia_telefone : '') : null)}
  `;
  document.getElementById('dados-grid').innerHTML = html;
}

function campo(label, val) {
  const vazio = !val;
  return `<div class="cf-field">
    <div class="cf-field-label">${label}</div>
    <div class="cf-field-value${vazio ? ' empty' : ''}">${val || '—'}</div>
  </div>`;
}

function formatEstadoCivil(v) {
  const m = { solteiro:'Solteiro(a)', casado:'Casado(a)', divorciado:'Divorciado(a)', viuvo:'Viúvo(a)', uniao_estavel:'União estável' };
  return m[v] || v;
}

// ── Tabs ──────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.cf-tab').forEach(tab => {
    tab.addEventListener('click', () => ativarTab(tab.dataset.tab));
  });
  document.getElementById('btn-editar-cliente').addEventListener('click', () => {
    sessionStorage.setItem('editarCliente', JSON.stringify(_cliente));
    window.location.href = `/pages/clientes.html?editar=${clienteId}`;
  });
}

function ativarTab(nome) {
  document.querySelectorAll('.cf-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nome));
  document.querySelectorAll('.cf-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + nome));
  if (nome === 'timeline') carregarTimeline(true);
  if (nome === 'cofre')    carregarCofre();
}

// ── Contas bancárias ──────────────────────────────────────────
function renderContas() {
  const contas = _cliente.contas || [];
  const el = document.getElementById('contas-lista');
  if (contas.length === 0) {
    el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.9rem">Nenhuma conta cadastrada.</p>';
    return;
  }
  const TIPO = { corrente:'Corrente', poupanca:'Poupança', salario:'Salário', investimento:'Investimento' };
  el.innerHTML = contas.map(ct => `
    <div class="cf-conta-card">
      <div>
        <div class="cf-conta-banco">${ct.banco}</div>
        <div class="cf-conta-info-grid">
          ${campoInline('Agência', ct.agencia)}
          ${campoInline('Conta', ct.numero_conta + ' (' + (TIPO[ct.tipo_conta]||ct.tipo_conta) + ')')}
          ${ct.titular ? campoInline('Titular', ct.titular) : ''}
          ${ct.chave_pix ? campoInline('PIX', ct.chave_pix) : ''}
          ${ct.observacao ? campoInline('Obs.', ct.observacao) : ''}
        </div>
      </div>
      <div class="cf-conta-actions">
        <button class="cli-btn-acao conta-btn-editar" data-id="${ct.id}" title="Editar">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
          </svg>
        </button>
        <button class="cli-btn-acao excluir conta-btn-excluir" data-id="${ct.id}" title="Excluir">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" stroke-width="2"/><path d="M19 6l-1 14H6L5 6" stroke-width="2"/>
            <path d="M10 11v6M14 11v6" stroke-width="2"/><path d="M9 6V4h6v2" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>`).join('');

  el.querySelectorAll('.conta-btn-editar').forEach(btn => {
    btn.addEventListener('click', () => abrirModalConta(btn.dataset.id));
  });
  el.querySelectorAll('.conta-btn-excluir').forEach(btn => {
    btn.addEventListener('click', () => excluirConta(btn.dataset.id));
  });
}

function campoInline(label, val) {
  return `<div>
    <div class="cf-field-label" style="font-size:.7rem">${label}</div>
    <div class="cf-field-value" style="font-size:.84rem">${val || '—'}</div>
  </div>`;
}

function bindContas() {
  document.getElementById('btn-nova-conta').addEventListener('click', () => abrirModalConta());
  document.getElementById('btn-fechar-modal-conta').addEventListener('click', () => fecharModal('modal-conta'));
  document.getElementById('btn-cancelar-conta').addEventListener('click', () => fecharModal('modal-conta'));
  document.getElementById('modal-conta').addEventListener('click', e => { if (e.target.id === 'modal-conta') fecharModal('modal-conta'); });
  document.getElementById('btn-salvar-conta').addEventListener('click', salvarConta);
}

function abrirModalConta(id = null) {
  _contaEditandoId = id;
  document.getElementById('modal-conta-titulo').textContent = id ? 'Editar Conta' : 'Nova Conta';
  ['banco','agencia','numero','titular','pix','pix-tipo','obs'].forEach(f => {
    const el = document.getElementById('conta-' + f);
    if (el) el.value = '';
  });
  document.getElementById('conta-tipo').value = 'corrente';
  if (id) {
    const ct = _cliente.contas.find(c => c.id === id);
    if (ct) {
      document.getElementById('conta-banco').value    = ct.banco || '';
      document.getElementById('conta-agencia').value  = ct.agencia || '';
      document.getElementById('conta-numero').value   = ct.numero_conta || '';
      document.getElementById('conta-tipo').value     = ct.tipo_conta || 'corrente';
      document.getElementById('conta-titular').value  = ct.titular || '';
      document.getElementById('conta-pix').value      = ct.chave_pix || '';
      document.getElementById('conta-pix-tipo').value = ct.tipo_chave_pix || '';
      document.getElementById('conta-obs').value      = ct.observacao || '';
    }
  }
  document.getElementById('modal-conta').style.display = 'flex';
}

async function salvarConta() {
  const btn = document.getElementById('btn-salvar-conta');
  const body = {
    banco:        document.getElementById('conta-banco').value.trim(),
    agencia:      document.getElementById('conta-agencia').value.trim(),
    numero_conta: document.getElementById('conta-numero').value.trim(),
    tipo_conta:   document.getElementById('conta-tipo').value,
    titular:      document.getElementById('conta-titular').value  || undefined,
    chave_pix:    document.getElementById('conta-pix').value      || undefined,
    tipo_chave_pix: document.getElementById('conta-pix-tipo').value || undefined,
    observacao:   document.getElementById('conta-obs').value      || undefined,
  };
  if (!body.banco || !body.agencia || !body.numero_conta) {
    alert('Banco, agência e número são obrigatórios.');
    return;
  }
  btn.disabled = true;
  try {
    if (_contaEditandoId) {
      await API.put(`/api/clientes/${clienteId}/contas/${_contaEditandoId}`, body);
    } else {
      await API.post(`/api/clientes/${clienteId}/contas`, body);
    }
    fecharModal('modal-conta');
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderContas();
  } catch (err) {
    alert(err.message || 'Erro ao salvar conta.');
  } finally {
    btn.disabled = false;
  }
}

async function excluirConta(id) {
  if (!confirm('Remover esta conta bancária?')) return;
  try {
    await API.delete(`/api/clientes/${clienteId}/contas/${id}`);
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderContas();
  } catch (err) {
    alert('Erro ao excluir conta.');
  }
}

// ── Cônjuge ───────────────────────────────────────────────────
function renderConjuge() {
  const el = document.getElementById('conjuge-conteudo');
  const cj = _cliente.conjuge;
  const REGIME = {
    comunhao_parcial:'Comunhão Parcial', comunhao_universal:'Comunhão Universal',
    separacao_total:'Separação Total', participacao_aquestos:'Part. de Aquestos',
  };
  if (!cj) {
    el.innerHTML = `
      <div class="cf-conjuge-empty">
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin:0 auto;display:block;color:var(--cinza-medio)">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke-width="2"/>
        </svg>
        <p>Nenhum cônjuge cadastrado.</p>
        <button class="btn btn-secondary btn-sm" id="btn-add-conjuge">Adicionar cônjuge</button>
      </div>`;
    document.getElementById('btn-add-conjuge').addEventListener('click', () => abrirModalConjuge());
    return;
  }
  el.innerHTML = `
    <div class="cf-panel-header">
      <h3>Dados do Cônjuge</h3>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" id="btn-editar-conjuge">Editar</button>
        <button class="btn btn-secondary btn-sm" id="btn-excluir-conjuge" style="color:#EF4444">Remover</button>
      </div>
    </div>
    <div class="cf-section-grid">
      ${campo('Nome Completo', cj.nome_completo)}
      ${campo('CPF', cj.cpf)}
      ${campo('RG', cj.rg)}
      ${campo('Data de Nascimento', cj.data_nascimento ? new Date(cj.data_nascimento).toLocaleDateString('pt-BR') : null)}
      ${campo('Profissão', cj.profissao)}
      ${campo('Telefone', cj.telefone)}
      ${campo('E-mail', cj.email)}
      ${campo('Regime de Bens', REGIME[cj.regime_bens] || cj.regime_bens)}
      ${campo('DAP / CAF', cj.dap_caf)}
    </div>`;
  document.getElementById('btn-editar-conjuge').addEventListener('click', () => abrirModalConjuge(cj));
  document.getElementById('btn-excluir-conjuge').addEventListener('click', excluirConjuge);
}

function bindConjuge() {
  document.getElementById('btn-fechar-modal-conjuge').addEventListener('click', () => fecharModal('modal-conjuge'));
  document.getElementById('btn-cancelar-conjuge').addEventListener('click', () => fecharModal('modal-conjuge'));
  document.getElementById('modal-conjuge').addEventListener('click', e => { if (e.target.id === 'modal-conjuge') fecharModal('modal-conjuge'); });
  document.getElementById('btn-salvar-conjuge').addEventListener('click', salvarConjuge);
}

function abrirModalConjuge(cj = null) {
  ['nome','cpf','rg','nascimento','profissao','telefone','email','regime','dap'].forEach(f => {
    const el = document.getElementById('conjuge-' + f);
    if (el) el.value = '';
  });
  if (cj) {
    document.getElementById('conjuge-nome').value      = cj.nome_completo || '';
    document.getElementById('conjuge-cpf').value       = cj.cpf || '';
    document.getElementById('conjuge-rg').value        = cj.rg || '';
    document.getElementById('conjuge-nascimento').value= cj.data_nascimento?.slice(0,10) || '';
    document.getElementById('conjuge-profissao').value = cj.profissao || '';
    document.getElementById('conjuge-telefone').value  = cj.telefone || '';
    document.getElementById('conjuge-email').value     = cj.email || '';
    document.getElementById('conjuge-regime').value    = cj.regime_bens || '';
    document.getElementById('conjuge-dap').value       = cj.dap_caf || '';
  }
  document.getElementById('modal-conjuge').style.display = 'flex';
}

async function salvarConjuge() {
  const btn = document.getElementById('btn-salvar-conjuge');
  const nome = document.getElementById('conjuge-nome').value.trim();
  if (!nome) { alert('Nome é obrigatório.'); return; }
  const body = {
    nome_completo:  nome,
    cpf:            document.getElementById('conjuge-cpf').value       || undefined,
    rg:             document.getElementById('conjuge-rg').value        || undefined,
    data_nascimento:document.getElementById('conjuge-nascimento').value || undefined,
    profissao:      document.getElementById('conjuge-profissao').value || undefined,
    telefone:       document.getElementById('conjuge-telefone').value  || undefined,
    email:          document.getElementById('conjuge-email').value     || undefined,
    regime_bens:    document.getElementById('conjuge-regime').value    || undefined,
    dap_caf:        document.getElementById('conjuge-dap').value       || undefined,
  };
  btn.disabled = true;
  try {
    await API.put(`/api/clientes/${clienteId}/conjuge`, body);
    fecharModal('modal-conjuge');
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderConjuge();
  } catch (err) {
    alert(err.message || 'Erro ao salvar cônjuge.');
  } finally {
    btn.disabled = false;
  }
}

async function excluirConjuge() {
  if (!confirm('Remover dados do cônjuge?')) return;
  try {
    await API.delete(`/api/clientes/${clienteId}/conjuge`);
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderConjuge();
  } catch (err) {
    alert('Erro ao remover cônjuge.');
  }
}

// ── Imóveis ───────────────────────────────────────────────────
function renderImoveis() {
  const el = document.getElementById('imoveis-lista');
  const imoveis = _cliente.imoveis || [];
  if (imoveis.length === 0) {
    el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.9rem">Nenhum imóvel vinculado.</p>';
    return;
  }
  const VINCULO = { proprietario:'Proprietário', posseiro:'Posseiro', arrendatario:'Arrendatário', comodatario:'Comodatário', outro:'Outro' };
  el.innerHTML = imoveis.map(im => `
    <div class="cf-imovel-card" data-id="${im.id}">
      <div class="cf-imovel-icon">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke-width="2"/>
        </svg>
      </div>
      <div class="cf-imovel-info">
        <div class="cf-imovel-nome">${im.denominacao}</div>
        <div class="cf-imovel-sub">${im.municipio}/${im.uf} · ${parseFloat(im.area_total_ha).toLocaleString('pt-BR')} ha</div>
      </div>
      <span class="cf-imovel-badge">${VINCULO[im.tipo_vinculo] || im.tipo_vinculo || 'Proprietário'} ${im.percentual_participacao < 100 ? '(' + im.percentual_participacao + '%)' : ''}</span>
      <button class="cli-btn-acao excluir imovel-btn-desvincular" data-vinculo="${im.vinculo_id}" title="Desvincular" style="flex-shrink:0">
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>
        </svg>
      </button>
    </div>`).join('');

  el.querySelectorAll('.cf-imovel-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.imovel-btn-desvincular')) return;
      window.location.href = `/pages/imovel-ficha.html?id=${card.dataset.id}`;
    });
  });
  el.querySelectorAll('.imovel-btn-desvincular').forEach(btn => {
    btn.addEventListener('click', () => desvincularImovel(btn.dataset.vinculo));
  });
}

function bindImoveis() {
  document.getElementById('btn-vincular-imovel').addEventListener('click', () => {
    _imovelVincularId = null;
    document.getElementById('vincular-busca').value = '';
    document.getElementById('vincular-resultados').innerHTML = '';
    document.getElementById('btn-confirmar-vincular').disabled = true;
    document.getElementById('modal-vincular-imovel').style.display = 'flex';
  });
  document.getElementById('btn-fechar-modal-vincular').addEventListener('click', () => fecharModal('modal-vincular-imovel'));
  document.getElementById('btn-cancelar-vincular').addEventListener('click', () => fecharModal('modal-vincular-imovel'));
  document.getElementById('modal-vincular-imovel').addEventListener('click', e => {
    if (e.target.id === 'modal-vincular-imovel') fecharModal('modal-vincular-imovel');
  });

  document.getElementById('vincular-busca').addEventListener('input', e => {
    clearTimeout(_vincularBuscaTimer);
    _vincularBuscaTimer = setTimeout(() => buscarImoveisParaVincular(e.target.value), 350);
  });
  document.getElementById('btn-confirmar-vincular').addEventListener('click', confirmarVincularImovel);
}

async function buscarImoveisParaVincular(busca) {
  if (!busca.trim()) { document.getElementById('vincular-resultados').innerHTML = ''; return; }
  try {
    const data = await API.get('/api/imoveis?busca=' + encodeURIComponent(busca) + '&por_pagina=8');
    const el = document.getElementById('vincular-resultados');
    if (data.imoveis.length === 0) {
      el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.85rem;padding:8px">Nenhum imóvel encontrado.</p>';
      return;
    }
    el.innerHTML = data.imoveis.map(im => `
      <div class="cf-vincular-item" data-id="${im.id}">
        <div>${im.denominacao}</div>
        <div class="cf-vincular-sub">${im.municipio}/${im.uf} · ${parseFloat(im.area_total_ha).toLocaleString('pt-BR')} ha</div>
      </div>`).join('');
    el.querySelectorAll('.cf-vincular-item').forEach(item => {
      item.addEventListener('click', () => {
        el.querySelectorAll('.cf-vincular-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        _imovelVincularId = item.dataset.id;
        document.getElementById('btn-confirmar-vincular').disabled = false;
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function confirmarVincularImovel() {
  if (!_imovelVincularId) return;
  const btn = document.getElementById('btn-confirmar-vincular');
  const body = {
    cliente_id: clienteId,
    tipo_vinculo: document.getElementById('vincular-tipo').value,
    percentual_participacao: parseFloat(document.getElementById('vincular-percentual').value) || 100,
  };
  btn.disabled = true;
  try {
    await API.post(`/api/imoveis/${_imovelVincularId}/proprietarios`, body);
    fecharModal('modal-vincular-imovel');
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderImoveis();
  } catch (err) {
    alert(err.message || 'Erro ao vincular imóvel.');
    btn.disabled = false;
  }
}

async function desvincularImovel(vinculoId) {
  if (!confirm('Desvincular este imóvel do cliente?')) return;
  try {
    // Find which imovel this vinculo belongs to
    const im = _cliente.imoveis.find(i => i.vinculo_id === vinculoId);
    if (!im) return;
    await API.delete(`/api/imoveis/${im.id}/proprietarios/${vinculoId}`);
    _cliente = await API.get('/api/clientes/' + clienteId);
    renderImoveis();
  } catch (err) {
    alert('Erro ao desvincular imóvel.');
  }
}

// ── Timeline ──────────────────────────────────────────────────
function bindTimeline() {
  document.getElementById('timeline-tipo').addEventListener('change', e => {
    document.getElementById('timeline-lembrete-data').style.display =
      e.target.value === 'lembrete' ? 'flex' : 'none';
  });
  document.getElementById('btn-add-timeline').addEventListener('click', adicionarTimeline);
  document.getElementById('btn-mais-timeline').addEventListener('click', () => {
    _timelinePagina++;
    carregarTimeline(false);
  });
}

async function carregarTimeline(reset) {
  if (reset) {
    _timelinePagina = 1;
    document.getElementById('timeline-lista').innerHTML = '<div style="color:var(--cinza-medio);font-size:.85rem;padding:8px">Carregando...</div>';
  }
  try {
    const data = await API.get(`/api/clientes/${clienteId}/timeline?pagina=${_timelinePagina}&por_pagina=20`);
    _timelineTotal = data.total;

    const lista = document.getElementById('timeline-lista');
    if (reset) lista.innerHTML = '';

    if (data.entradas.length === 0 && reset) {
      lista.innerHTML = '<p style="color:var(--cinza-medio);font-size:.85rem;padding:8px">Nenhuma entrada na timeline.</p>';
    } else {
      lista.insertAdjacentHTML('beforeend', data.entradas.map(renderEntrada).join(''));
    }

    const carregados = (_timelinePagina - 1) * 20 + data.entradas.length;
    const mais = document.getElementById('timeline-mais');
    mais.style.display = carregados < _timelineTotal ? 'block' : 'none';
  } catch (err) {
    console.error(err);
  }
}

function renderEntrada(e) {
  const dotClass = e.is_sistema ? 'sistema' : (e.tipo === 'lembrete' ? 'lembrete' : '');
  const data = new Date(e.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const lembrete = e.tipo === 'lembrete' && e.data_lembrete
    ? `<div class="cf-entry-lembrete-badge">⏰ Lembrete: ${new Date(e.data_lembrete).toLocaleString('pt-BR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>`
    : '';
  return `
  <div class="cf-entry">
    <div class="cf-entry-dot ${dotClass}"></div>
    <div class="cf-entry-body">
      ${lembrete}
      <div class="cf-entry-texto">${e.texto}</div>
      <div class="cf-entry-meta">${e.criado_por_nome || 'Sistema'} · ${data}</div>
    </div>
  </div>`;
}

async function adicionarTimeline() {
  const btn  = document.getElementById('btn-add-timeline');
  const tipo = document.getElementById('timeline-tipo').value;
  const texto = document.getElementById('timeline-texto').value.trim();
  const data_lembrete = document.getElementById('timeline-data-lembrete').value;

  if (!texto) { alert('Escreva uma nota antes de adicionar.'); return; }
  if (tipo === 'lembrete' && !data_lembrete) { alert('Informe a data/hora do lembrete.'); return; }

  btn.disabled = true;
  try {
    await API.post(`/api/clientes/${clienteId}/timeline`, {
      tipo, texto,
      data_lembrete: data_lembrete || undefined,
    });
    document.getElementById('timeline-texto').value = '';
    document.getElementById('timeline-data-lembrete').value = '';
    document.getElementById('timeline-tipo').value = 'manual';
    document.getElementById('timeline-lembrete-data').style.display = 'none';
    _timelinePagina = 1;
    carregarTimeline(true);
  } catch (err) {
    alert(err.message || 'Erro ao adicionar nota.');
  } finally {
    btn.disabled = false;
  }
}

// ── Cofre ─────────────────────────────────────────────────────
function bindCofre() {
  document.getElementById('btn-nova-credencial').addEventListener('click', () => abrirModalCofre());
  document.getElementById('btn-fechar-modal-cofre').addEventListener('click', () => fecharModal('modal-cofre'));
  document.getElementById('btn-cancelar-cofre').addEventListener('click', () => fecharModal('modal-cofre'));
  document.getElementById('modal-cofre').addEventListener('click', e => { if (e.target.id === 'modal-cofre') fecharModal('modal-cofre'); });
  document.getElementById('btn-salvar-cofre').addEventListener('click', salvarCofre);
}

async function carregarCofre() {
  const el = document.getElementById('cofre-lista');
  el.innerHTML = '<div style="color:var(--cinza-medio);font-size:.85rem">Carregando...</div>';
  try {
    const rows = await API.get(`/api/clientes/${clienteId}/cofre`);
    if (rows.length === 0) {
      el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.9rem">Nenhuma credencial armazenada.</p>';
      return;
    }
    el.innerHTML = rows.map(cr => `
      <div class="cf-cofre-card">
        <div>
          <div class="cf-cofre-sistema">${cr.sistema}</div>
          <div class="cf-cofre-login">${cr.login}</div>
          ${cr.url ? `<a href="${cr.url}" class="cf-cofre-url" target="_blank" rel="noopener">${cr.url}</a>` : ''}
          ${cr.observacao ? `<div style="font-size:.8rem;color:var(--cinza-medio);margin-top:4px">${cr.observacao}</div>` : ''}
          <div id="cofre-senha-${cr.id}" style="display:none" class="cf-cofre-senha-reveal">
            <span id="cofre-senha-val-${cr.id}"></span>
            <button onclick="document.getElementById('cofre-senha-${cr.id}').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:.85rem;color:var(--cinza-medio)">✕</button>
          </div>
        </div>
        <div class="cf-cofre-actions">
          <button class="cli-btn-acao cofre-btn-revelar" data-id="${cr.id}" title="Revelar senha">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
          </button>
          <button class="cli-btn-acao cofre-btn-copiar" data-id="${cr.id}" title="Copiar senha">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2"/>
            </svg>
          </button>
          <button class="cli-btn-acao cofre-btn-editar" data-id="${cr.id}" title="Editar">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
            </svg>
          </button>
          <button class="cli-btn-acao excluir cofre-btn-excluir" data-id="${cr.id}" title="Excluir">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" stroke-width="2"/>
              <path d="M19 6l-1 14H6L5 6" stroke-width="2"/>
              <path d="M10 11v6M14 11v6" stroke-width="2"/>
              <path d="M9 6V4h6v2" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>`).join('');

    el.querySelectorAll('.cofre-btn-revelar').forEach(btn => {
      btn.addEventListener('click', () => revelarSenha(btn.dataset.id));
    });
    el.querySelectorAll('.cofre-btn-copiar').forEach(btn => {
      btn.addEventListener('click', () => copiarSenha(btn.dataset.id, btn));
    });
    el.querySelectorAll('.cofre-btn-editar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalCofre(btn.dataset.id));
    });
    el.querySelectorAll('.cofre-btn-excluir').forEach(btn => {
      btn.addEventListener('click', () => excluirCredencial(btn.dataset.id));
    });
  } catch (err) {
    el.innerHTML = '<p style="color:#EF4444;font-size:.85rem">Erro ao carregar cofre.</p>';
  }
}

async function revelarSenha(id) {
  try {
    const { senha } = await API.get(`/api/clientes/${clienteId}/cofre/${id}/revelar`);
    document.getElementById('cofre-senha-val-' + id).textContent = senha;
    document.getElementById('cofre-senha-' + id).style.display = 'flex';
  } catch (err) {
    alert('Erro ao revelar senha.');
  }
}

async function copiarSenha(id, btn) {
  try {
    const { senha } = await API.post(`/api/clientes/${clienteId}/cofre/${id}/copiar`);
    await navigator.clipboard.writeText(senha);
    const orig = btn.title;
    btn.title = 'Copiado!';
    btn.style.color = 'var(--verde)';
    setTimeout(() => { btn.title = orig; btn.style.color = ''; }, 2000);
  } catch (err) {
    alert('Erro ao copiar senha.');
  }
}

function abrirModalCofre(id = null) {
  _cofreEditandoId = id;
  document.getElementById('modal-cofre-titulo').textContent = id ? 'Editar Credencial' : 'Nova Credencial';
  ['sistema','login','senha','url','obs'].forEach(f => {
    const el = document.getElementById('cofre-' + f);
    if (el) el.value = '';
  });
  document.getElementById('modal-cofre').style.display = 'flex';
}

async function salvarCofre() {
  const btn = document.getElementById('btn-salvar-cofre');
  const sistema = document.getElementById('cofre-sistema').value.trim();
  const login   = document.getElementById('cofre-login').value.trim();
  const senha   = document.getElementById('cofre-senha').value;
  if (!sistema || !login) { alert('Sistema e login são obrigatórios.'); return; }
  if (!_cofreEditandoId && !senha) { alert('Senha é obrigatória.'); return; }

  const body = {
    sistema, login,
    url:       document.getElementById('cofre-url').value || undefined,
    observacao:document.getElementById('cofre-obs').value || undefined,
  };
  if (senha) body.senha = senha;

  btn.disabled = true;
  try {
    if (_cofreEditandoId) {
      await API.put(`/api/clientes/${clienteId}/cofre/${_cofreEditandoId}`, body);
    } else {
      await API.post(`/api/clientes/${clienteId}/cofre`, body);
    }
    fecharModal('modal-cofre');
    carregarCofre();
  } catch (err) {
    alert(err.message || 'Erro ao salvar credencial.');
  } finally {
    btn.disabled = false;
  }
}

async function excluirCredencial(id) {
  if (!confirm('Excluir esta credencial permanentemente?')) return;
  try {
    await API.delete(`/api/clientes/${clienteId}/cofre/${id}`);
    carregarCofre();
  } catch (err) {
    alert('Erro ao excluir credencial.');
  }
}

// ── Utils ─────────────────────────────────────────────────────
function fecharModal(id) {
  document.getElementById(id).style.display = 'none';
}
