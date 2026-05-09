verificarAutenticacao();
initSidebar();

let _passoAtual = 1;
let _clienteSelecionado = null;

// Load technicians
API.get('/api/usuarios').then(us => {
  const sel = document.getElementById('tecnico_id');
  const eu = Auth.usuario();
  sel.innerHTML = us.map(u => `<option value="${u.id}" ${u.id===eu?.id?'selected':''}>${u.nome}</option>`).join('');
}).catch(() => {});

// Client search
let _clienteTimer;
document.getElementById('cliente-busca').addEventListener('input', e => {
  clearTimeout(_clienteTimer);
  const q = e.target.value.trim();
  if (q.length < 2) { document.getElementById('cliente-lista').style.display='none'; return; }
  _clienteTimer = setTimeout(async () => {
    try {
      const clientes = await API.get(`/api/clientes?busca=${encodeURIComponent(q)}&por_pagina=8`);
      const lista = document.getElementById('cliente-lista');
      const itens = clientes.clientes || clientes;
      if (!itens.length) { lista.style.display='none'; return; }
      lista.style.display = '';
      lista.innerHTML = itens.map(c => `
        <div style="padding:8px 12px;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--md-surface-container)"
             onmousedown="selecionarCliente('${c.id}','${_esc(c.nome_completo)}')">
          <strong>${_esc(c.nome_completo)}</strong>
          <span style="color:var(--text-muted);font-size:.72rem;margin-left:8px">${_esc(c.cpf||c.cnpj||'')}</span>
        </div>`).join('');
    } catch {}
  }, 300);
});

window.selecionarCliente = async (id, nome) => {
  _clienteSelecionado = id;
  document.getElementById('cliente_id').value = id;
  document.getElementById('cliente-busca').value = nome;
  document.getElementById('cliente-lista').style.display = 'none';
  document.getElementById('cliente-selecionado').style.display = '';
  document.getElementById('cliente-selecionado').textContent = '✓ ' + nome;
  // Load properties
  try {
    const imoveis = await API.get(`/api/imoveis?cliente_id=${id}`);
    const sel = document.getElementById('imovel_id');
    const lista = imoveis.imoveis || imoveis;
    sel.innerHTML = '<option value="">Selecione o imóvel...</option>' +
      lista.map(i => `<option value="${i.id}">${_esc(i.denominacao||'Imóvel')} — ${i.area_total_ha||'?'} ha</option>`).join('');
    document.getElementById('imovel-group').style.display = '';
  } catch {}
};

// Commission preview
['valor_solicitado','percentual_comissao'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const v = parseFloat(document.getElementById('valor_solicitado').value)||0;
    const p = parseFloat(document.getElementById('percentual_comissao').value)||0;
    const c = v * p / 100;
    document.getElementById('comissao-preview').textContent = c > 0
      ? c.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
      : '—';
  });
});

window.irPasso = (n) => {
  if (n > _passoAtual) {
    if (_passoAtual === 1) {
      if (!document.getElementById('modalidade').value) { showError('Selecione a modalidade.'); return; }
      if (!document.getElementById('banco').value) { showError('Selecione o banco.'); return; }
    }
    if (_passoAtual === 2) {
      if (!document.getElementById('cliente_id').value) { showError('Selecione o cliente.'); return; }
      if (!document.getElementById('area_financiada').value) { showError('Informe a área financiada.'); return; }
      if (!document.getElementById('cultura').value) { showError('Informe a cultura/atividade.'); return; }
    }
  }
  hideError();
  document.getElementById(`panel-${_passoAtual}`).classList.remove('active');
  document.getElementById(`step-ind-${_passoAtual}`).classList.remove('active');
  document.getElementById(`step-ind-${_passoAtual}`).classList.add('done');
  _passoAtual = n;
  document.getElementById(`panel-${n}`).classList.add('active');
  document.getElementById(`step-ind-${n}`).classList.remove('done');
  document.getElementById(`step-ind-${n}`).classList.add('active');
};

window.criarProjeto = async () => {
  const valor = parseFloat(document.getElementById('valor_solicitado').value);
  if (!valor || valor <= 0) { showError('Informe o valor solicitado.'); return; }
  const btn = document.getElementById('btn-criar');
  btn.disabled = true; btn.textContent = 'Criando...';
  try {
    const body = {
      modalidade:            document.getElementById('modalidade').value,
      banco:                 document.getElementById('banco').value,
      programa:              document.getElementById('programa').value,
      agencia:               document.getElementById('agencia').value,
      gerente_banco:         document.getElementById('gerente_banco').value,
      tecnico_id:            document.getElementById('tecnico_id').value,
      prazo_estimado:        document.getElementById('prazo_estimado').value || null,
      cliente_id:            document.getElementById('cliente_id').value,
      imovel_id:             document.getElementById('imovel_id').value || null,
      area_financiada:       document.getElementById('area_financiada').value,
      cultura:               document.getElementById('cultura').value,
      safra:                 document.getElementById('safra').value,
      produtividade_esperada:document.getElementById('produtividade_esperada').value || null,
      valor_solicitado:      valor,
      percentual_comissao:   parseFloat(document.getElementById('percentual_comissao').value)||3,
    };
    const p = await API.post('/api/credito-rural', body);
    window.location.href = `credito-rural-projeto.html?id=${p.id}`;
  } catch (err) {
    showError(err.message);
    btn.disabled = false; btn.textContent = 'Criar projeto →';
  }
};

function showError(msg) { const e=document.getElementById('cr-error'); e.textContent=msg; e.style.display=''; }
function hideError() { document.getElementById('cr-error').style.display='none'; }
function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
