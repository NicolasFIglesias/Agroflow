/* ── Vendas ───────────────────────────────────────────────── */
verificarAutenticacao();
initSidebar();

const _isAdmin = () => ['admin','superdev'].includes(Auth.usuario()?.role);

let _pagina = 1;
let _tipo   = '';
let _inicio = _periodoInicio('mes');
let _fim    = new Date().toISOString().slice(0,10);
let _colaboradores = [];
let _cliTimer = null;
let _cliRapidoNome = '';

// ── Init ──────────────────────────────────────────────────
(async () => {
  _colaboradores = await API.get('/api/usuarios').catch(() => []);
  _preencherColaboradores();
  _carregarLista();
  _bindEventos();
})();

// ── Período ────────────────────────────────────────────────
function _periodoInicio(p) {
  const d = new Date();
  if (p === 'hoje')   return d.toISOString().slice(0,10);
  if (p === 'semana') { d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); }
  if (p === 'mes')    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  if (p === 'ano')    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0,10);
  return d.toISOString().slice(0,10);
}

// ── Lista ─────────────────────────────────────────────────
async function _carregarLista() {
  const el = document.getElementById('vnd-lista');
  el.innerHTML = '<div class="vnd-empty">Carregando...</div>';
  try {
    const p = new URLSearchParams({ pagina: _pagina, por_pagina: 30 });
    if (_tipo)   p.set('tipo', _tipo);
    if (_inicio) p.set('data_inicio', _inicio);
    if (_fim)    p.set('data_fim', _fim);
    const data = await API.get('/api/lancamentos?' + p);

    const pag = document.getElementById('vnd-paginacao');
    if (data.total_paginas > 1) {
      pag.style.display = 'flex';
      document.getElementById('vnd-pag-info').textContent = `Página ${data.pagina} de ${data.total_paginas}`;
      document.getElementById('btn-vnd-ant').disabled  = data.pagina <= 1;
      document.getElementById('btn-vnd-prox').disabled = data.pagina >= data.total_paginas;
    } else { pag.style.display = 'none'; }

    if (!data.lancamentos.length) {
      el.innerHTML = '<div class="vnd-empty">Nenhum lançamento encontrado.</div>';
      return;
    }
    el.innerHTML = data.lancamentos.map(_renderRow).join('');
    el.querySelectorAll('[data-del]').forEach(btn =>
      btn.addEventListener('click', () => _excluir(btn.dataset.del))
    );
  } catch (err) {
    el.innerHTML = `<div class="vnd-empty" style="color:var(--md-error)">Erro: ${err.message}</div>`;
  }
}

const FMT = v => `R$ ${parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const FMT_D = d => new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function _renderRow(l) {
  const isVenda = l.tipo === 'venda';
  return `
  <div class="vnd-row">
    <div><span class="vnd-tipo-badge ${isVenda ? 'vnd-tipo-venda' : 'vnd-tipo-despesa'}">${isVenda ? '📈 Venda' : '📉 Despesa'}</span></div>
    <div>
      <div class="vnd-cliente">${_esc(l.cliente_nome || '—')}</div>
      <div class="vnd-sub">${_esc(l.produto || '')}</div>
    </div>
    <div class="vnd-sub">${_esc(l.colaborador_nome || '—')}</div>
    <div class="vnd-sub">${_esc(l.forma_pagamento || '—')}</div>
    <div class="vnd-sub">${FMT_D(l.data_lancamento)}</div>
    <div class="${isVenda ? 'vnd-valor-pos' : 'vnd-valor-neg'}">${FMT(l.valor)}</div>
    <div>
      <button class="vnd-btn-del" data-del="${l.id}" title="Excluir">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>`;
}

async function _excluir(id) {
  if (!confirm('Excluir este lançamento?')) return;
  try { await API.delete(`/api/lancamentos/${id}`); _carregarLista(); }
  catch (err) { alert('Erro: ' + err.message); }
}

// ── Modal ──────────────────────────────────────────────────
function _abrirModal(tipo) {
  const isVenda = tipo === 'venda';
  document.getElementById('lanc-tipo').value = tipo;
  document.getElementById('modal-lanc-titulo').textContent = isVenda ? '+ Nova venda' : '− Nova despesa';
  document.getElementById('btn-salvar-lanc').textContent = isVenda ? 'Lançar venda' : 'Lançar despesa';
  document.getElementById('btn-salvar-lanc').className = `btn btn-lg ${isVenda ? 'btn-primary' : 'btn-danger'}`;
  // Reset
  ['lanc-cli-busca','lanc-produto','lanc-valor','lanc-obs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('lanc-colaborador').value = '';
  document.getElementById('lanc-forma').value = '';
  document.getElementById('lanc-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('lanc-cliente-id').value = '';
  document.getElementById('lanc-cliente-nome').value = '';
  document.getElementById('lanc-cli-chip').style.display = 'none';
  document.getElementById('lanc-cli-chip').innerHTML = '';
  document.getElementById('lanc-id').value = '';
  // Pré-selecionar o próprio colaborador (para não-admin)
  if (!_isAdmin()) {
    const u = Auth.usuario();
    const opt = document.querySelector(`#lanc-colaborador option[value="${u.id}"]`);
    if (opt) document.getElementById('lanc-colaborador').value = u.id;
  }
  document.getElementById('modal-lancamento').classList.add('open');
}

function _fecharModal() { document.getElementById('modal-lancamento').classList.remove('open'); }

function _preencherColaboradores() {
  const sel = document.getElementById('lanc-colaborador');
  sel.innerHTML = '<option value="">— Selecionar</option>' +
    _colaboradores.map(u => `<option value="${u.id}">${_esc(u.nome)}${u.cargo ? ' — '+_esc(u.cargo) : ''}</option>`).join('');
}

// ── Busca de clientes ──────────────────────────────────────
function _bindBuscaCliente() {
  const inp = document.getElementById('lanc-cli-busca');
  const res = document.getElementById('lanc-cli-results');

  inp.addEventListener('input', () => {
    clearTimeout(_cliTimer);
    const q = inp.value.trim();
    if (q.length < 2) { res.classList.remove('open'); return; }
    _cliTimer = setTimeout(async () => {
      try {
        const data = await API.get(`/api/clientes?busca=${encodeURIComponent(q)}&por_pagina=8`);
        const clientes = data.clientes || [];
        res.innerHTML = clientes.map(c => `
          <div class="vnd-cli-item" data-id="${c.id}" data-nome="${_esc(c.nome_completo)}">
            <div class="vnd-cli-item-nome">${_esc(c.nome_completo)}</div>
            <div class="vnd-cli-item-sub">${c.cpf||c.cnpj||''} · ${c.municipio||''}</div>
          </div>`).join('') +
          `<div class="vnd-cli-cadastrar" id="btn-cli-cadastrar">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/></svg>
            Cadastrar "${q}" como novo cliente
          </div>`;
        res.classList.add('open');

        res.querySelectorAll('.vnd-cli-item').forEach(el =>
          el.addEventListener('click', () => _selecionarCliente(el.dataset.id, el.dataset.nome))
        );
        document.getElementById('btn-cli-cadastrar')?.addEventListener('click', () => {
          _cliRapidoNome = q;
          document.getElementById('cli-rapido-nome').value = q;
          document.getElementById('cli-rapido-tel').value = '';
          document.getElementById('modal-cli-rapido').classList.add('open');
          res.classList.remove('open');
        });
      } catch {}
    }, 300);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.vnd-cli-wrap')) res.classList.remove('open');
  }, true);
}

function _selecionarCliente(id, nome) {
  document.getElementById('lanc-cliente-id').value   = id;
  document.getElementById('lanc-cliente-nome').value = nome;
  document.getElementById('lanc-cli-busca').value    = '';
  document.getElementById('lanc-cli-results').classList.remove('open');
  const chip = document.getElementById('lanc-cli-chip');
  chip.innerHTML = `<div class="vnd-cli-chip">${_esc(nome)}<button onclick="this.closest('.vnd-cli-chip').parentElement.style.display='none';document.getElementById('lanc-cliente-id').value='';document.getElementById('lanc-cliente-nome').value='';">×</button></div>`;
  chip.style.display = '';
}

// ── Cadastro rápido ────────────────────────────────────────
async function _cadastrarCliRapido() {
  const nome = document.getElementById('cli-rapido-nome').value.trim();
  const tel  = document.getElementById('cli-rapido-tel').value.trim().replace(/\D/g,'');
  if (!nome || !tel) { alert('Nome e celular são obrigatórios.'); return; }
  const btn = document.getElementById('btn-salvar-cli-rapido');
  btn.disabled = true; btn.textContent = 'Cadastrando...';
  try {
    const c = await API.post('/api/clientes', {
      tipo_pessoa: 'PF', nome_completo: nome,
      celular: tel
    });
    document.getElementById('modal-cli-rapido').classList.remove('open');
    _selecionarCliente(c.id, c.nome_completo);
    alert(`Cliente "${c.nome_completo}" cadastrado e selecionado!`);
  } catch (err) { alert('Erro: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Cadastrar e selecionar'; }
}

// ── Salvar lançamento ──────────────────────────────────────
async function _salvarLancamento() {
  const valor = document.getElementById('lanc-valor').value;
  if (!valor || parseFloat(valor) <= 0) { alert('Informe um valor válido.'); return; }
  const btn = document.getElementById('btn-salvar-lanc');
  btn.disabled = true;
  try {
    await API.post('/api/lancamentos', {
      tipo:            document.getElementById('lanc-tipo').value,
      cliente_id:      document.getElementById('lanc-cliente-id').value   || undefined,
      cliente_nome:    document.getElementById('lanc-cliente-nome').value || document.getElementById('lanc-cli-busca').value || undefined,
      colaborador_id:  document.getElementById('lanc-colaborador').value  || undefined,
      produto:         document.getElementById('lanc-produto').value      || undefined,
      valor:           parseFloat(valor),
      forma_pagamento: document.getElementById('lanc-forma').value        || undefined,
      observacao:      document.getElementById('lanc-obs').value          || undefined,
      data_lancamento: document.getElementById('lanc-data').value         || undefined,
    });
    _fecharModal();
    _carregarLista();
  } catch (err) { alert('Erro: ' + err.message); }
  finally { btn.disabled = false; }
}

// ── Eventos ────────────────────────────────────────────────
function _bindEventos() {
  document.getElementById('btn-nova-venda').addEventListener('click',   () => _abrirModal('venda'));
  document.getElementById('btn-nova-despesa').addEventListener('click', () => _abrirModal('despesa'));
  document.getElementById('btn-fechar-lanc').addEventListener('click',  _fecharModal);
  document.getElementById('btn-cancelar-lanc').addEventListener('click',_fecharModal);
  document.getElementById('modal-lancamento').addEventListener('click', e => { if (e.target.id === 'modal-lancamento') _fecharModal(); });
  document.getElementById('btn-salvar-lanc').addEventListener('click',  _salvarLancamento);

  document.getElementById('btn-fechar-cli-rapido').addEventListener('click', () => document.getElementById('modal-cli-rapido').classList.remove('open'));
  document.getElementById('btn-cancelar-cli-rapido').addEventListener('click', () => document.getElementById('modal-cli-rapido').classList.remove('open'));
  document.getElementById('btn-salvar-cli-rapido').addEventListener('click', _cadastrarCliRapido);
  // Numeric only on phone
  document.getElementById('cli-rapido-tel').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g,''); });

  // Período
  document.querySelectorAll('.vnd-periodo-btn[data-periodo]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vnd-periodo-btn[data-periodo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _inicio = _periodoInicio(btn.dataset.periodo);
      _fim    = new Date().toISOString().slice(0,10);
      _pagina = 1;
      _carregarLista();
    })
  );

  // Filtro tipo
  document.getElementById('vnd-filtro-tipo').addEventListener('change', e => {
    _tipo = e.target.value; _pagina = 1; _carregarLista();
  });

  // Paginação
  document.getElementById('btn-vnd-ant').addEventListener('click',  () => { if (_pagina > 1) { _pagina--; _carregarLista(); } });
  document.getElementById('btn-vnd-prox').addEventListener('click', () => { _pagina++; _carregarLista(); });

  _bindBuscaCliente();
}
