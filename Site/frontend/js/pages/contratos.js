/* ── Contratos — listagem ─────────────────────────────────── */
verificarAutenticacao();
initSidebar();

let _pagina = 1;
const _por  = 20;
let _busca  = '';
let _tipo   = '';
let _status = '';
let _timer  = null;

carregarLista();
bindEventos();

function bindEventos() {
  document.getElementById('ct-busca').addEventListener('input', e => {
    clearTimeout(_timer);
    _timer = setTimeout(() => { _busca = e.target.value; _pagina = 1; carregarLista(); }, 350);
  });
  document.getElementById('ct-filtro-tipo').addEventListener('change', e => { _tipo = e.target.value; _pagina = 1; carregarLista(); });
  document.getElementById('ct-filtro-status').addEventListener('change', e => { _status = e.target.value; _pagina = 1; carregarLista(); });
  document.getElementById('btn-ct-ant').addEventListener('click',  () => { if (_pagina > 1) { _pagina--; carregarLista(); } });
  document.getElementById('btn-ct-prox').addEventListener('click', () => { _pagina++; carregarLista(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.ct-menu-wrap')) {
      document.querySelectorAll('.ct-menu-dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });
}

async function carregarLista() {
  const lista = document.getElementById('ct-lista');
  lista.innerHTML = '<div class="ct-loading">Carregando...</div>';
  try {
    const p = new URLSearchParams({ pagina: _pagina, por_pagina: _por });
    if (_busca)  p.set('busca',  _busca);
    if (_tipo)   p.set('tipo',   _tipo);
    if (_status) p.set('status', _status);
    const data = await API.get('/api/contratos?' + p);

    const pag = document.getElementById('ct-paginacao');
    if (data.total_paginas > 1) {
      pag.style.display = 'flex';
      document.getElementById('ct-pag-info').textContent = `Página ${data.pagina} de ${data.total_paginas}`;
      document.getElementById('btn-ct-ant').disabled  = data.pagina <= 1;
      document.getElementById('btn-ct-prox').disabled = data.pagina >= data.total_paginas;
    } else { pag.style.display = 'none'; }

    if (!data.contratos.length) {
      lista.innerHTML = '<div class="ct-vazio">Nenhum contrato encontrado.</div>';
      return;
    }
    lista.innerHTML = data.contratos.map(renderRow).join('');
    lista.querySelectorAll('.ct-row').forEach(row =>
      row.addEventListener('click', e => {
        if (e.target.closest('.ct-menu-wrap')) return;
        window.location.href = `/pages/contratos.html?id=${row.dataset.id}`;
      })
    );
    lista.querySelectorAll('.ct-menu-btn').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.ct-menu-dropdown.open').forEach(d => d !== btn.nextElementSibling && d.classList.remove('open'));
        btn.nextElementSibling.classList.toggle('open');
      })
    );
    lista.querySelectorAll('[data-action]').forEach(el =>
      el.addEventListener('click', e => { e.stopPropagation(); handleAction(el.dataset.action, el.dataset.id, el.dataset.numero, el.dataset.tipo); })
    );
  } catch (err) {
    lista.innerHTML = '<div class="ct-vazio">Erro ao carregar contratos.</div>';
  }
}

const TIPO_LABEL = { arrendamento:'Arrendamento', compra_venda:'Compra e Venda', comodato:'Comodato', permuta:'Permuta', aluguel:'Aluguel', recibo:'Recibo', nota_promissoria:'Nota Promissória' };

function _statusBadge(ct) {
  const hoje = new Date().toISOString().slice(0,10);
  if (ct.status === 'vencido') return '<span class="ct-status ct-status-vencido">● Vencido</span>';
  if (ct.status === 'encerrado') return '<span class="ct-status ct-status-encerrado">✓ Encerrado</span>';
  if (ct.status === 'rascunho') return '<span class="ct-status ct-status-rascunho">Rascunho</span>';
  if (ct.data_termino) {
    const diff = Math.ceil((new Date(ct.data_termino + 'T12:00:00') - new Date()) / 86400000);
    if (diff <= 0) return '<span class="ct-status ct-status-vencido">● Vencido</span>';
    if (diff <= 90) return `<span class="ct-status ct-status-vencendo">⚠ ${diff}d</span>`;
  }
  return '<span class="ct-status ct-status-ativo">● Ativo</span>';
}

function renderRow(ct) {
  const data = ct.data_assinatura
    ? new Date(ct.data_assinatura + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit'})
    : ct.data_inicio ? new Date(ct.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
  return `
  <div class="ct-row" data-id="${ct.id}">
    <div>
      <div class="ct-numero">${_esc(ct.numero)}</div>
      <div class="ct-tipo">${TIPO_LABEL[ct.tipo_contrato] || ct.tipo_contrato}</div>
    </div>
    <div>
      <div class="ct-nome">${_esc(ct.parte1_nome)}</div>
      ${ct.parte2_nome ? `<div class="ct-nome-sub">${_esc(ct.parte2_nome)}</div>` : ''}
    </div>
    <div class="ct-nome-sub">${_esc(ct.imovel_nome || '—')}</div>
    <div class="ct-data">${data}</div>
    <div>${_statusBadge(ct)}</div>
    <div class="ct-menu-wrap">
      <button class="ct-menu-btn" title="Ações">⋮</button>
      <div class="ct-menu-dropdown">
        <button class="ct-menu-item" data-action="download" data-id="${ct.id}" data-numero="${_esc(ct.numero)}">📥 Baixar Word</button>
        <button class="ct-menu-item" data-action="duplicar"  data-id="${ct.id}" data-tipo="${ct.tipo_contrato}">📋 Duplicar / Renovar</button>
        <button class="ct-menu-item" data-action="status"    data-id="${ct.id}">✏️ Alterar status</button>
        <button class="ct-menu-item danger" data-action="excluir" data-id="${ct.id}" data-numero="${_esc(ct.numero)}">🗑️ Excluir</button>
      </div>
    </div>
  </div>`;
}

async function _baixarDocx(id, numero) {
  try {
    const r = await fetch(`${CONFIG.API_URL}/api/contratos/${id}/download`, {
      headers: { 'Authorization': `Bearer ${Auth.token()}` }
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert('Erro ao baixar: ' + (err.error || `Erro ${r.status}`));
      return;
    }
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${numero || 'contrato'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) { alert('Erro ao baixar: ' + err.message); }
}

async function handleAction(action, id, numero, tipo) {
  document.querySelectorAll('.ct-menu-dropdown.open').forEach(d => d.classList.remove('open'));
  if (action === 'download') {
    await _baixarDocx(id, numero);
  }
  if (action === 'duplicar') {
    if (!confirm('Duplicar este contrato para criar uma renovação?')) return;
    try {
      const dup = await API.post(`/api/contratos/${id}/duplicar`, {});
      alert(`Duplicado como ${dup.numero}. Abrindo para edição...`);
      window.location.href = `/pages/contrato-novo.html?duplicar=${dup.id}`;
    } catch (err) { alert(err.message || 'Erro ao duplicar.'); }
  }
  if (action === 'status') {
    const novo = prompt('Novo status (rascunho, ativo, vencido, encerrado):');
    if (!novo) return;
    try { await API.put(`/api/contratos/${id}/status`, { status: novo }); carregarLista(); }
    catch (err) { alert(err.message || 'Erro.'); }
  }
  if (action === 'excluir') {
    if (!confirm(`Excluir o contrato ${numero}? Esta ação não pode ser desfeita.`)) return;
    try { await API.delete(`/api/contratos/${id}`); carregarLista(); }
    catch (err) { alert(err.message || 'Erro ao excluir.'); }
  }
}

function _esc(s = '') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
