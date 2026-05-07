/* ── Vendas ───────────────────────────────────────────────── */
verificarAutenticacao();
initSidebar();

const _isAdmin = () => ['admin','superdev'].includes(Auth.usuario()?.role);

let _pagina = 1;
let _tipo   = 'venda'; // default: mostrar vendas
let _inicio = _periodoInicio('mes');
let _fim    = new Date().toISOString().slice(0,10);
let _busca  = '';
let _buscaTimer = null;
let _colaboradores = [];
let _cliTimer = null;

function _periodoInicio(p) {
  const d = new Date();
  if (p === 'hoje')   return d.toISOString().slice(0,10);
  if (p === 'semana') { d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); }
  if (p === 'mes')    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  if (p === 'ano')    return new Date(d.getFullYear(), 0, 1).toISOString().slice(0,10);
  return d.toISOString().slice(0,10);
}

(async () => {
  _colaboradores = await API.get('/api/usuarios').catch(() => []);
  _preencherColaboradores();
  _carregarLista();
  _bindEventos();
})();

async function _carregarLista() {
  const el = document.getElementById('vnd-lista');
  el.innerHTML = '<div class="vnd-empty">Carregando...</div>';
  try {
    const p = new URLSearchParams({ pagina: _pagina, por_pagina: 30 });
    if (_tipo)   p.set('tipo', _tipo);
    if (_inicio) p.set('data_inicio', _inicio);
    if (_fim)    p.set('data_fim', _fim);
    if (_busca)  p.set('busca', _busca);
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
    el.querySelectorAll('[data-pago]').forEach(btn =>
      btn.addEventListener('click', () => _marcarPago(btn.dataset.pago, btn))
    );
  } catch (err) {
    el.innerHTML = `<div class="vnd-empty" style="color:var(--md-error)">Erro: ${err.message}</div>`;
  }
}

const FMT = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
const FMT_D = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function _renderRow(l) {
  const isVenda = l.tipo === 'venda';
  const pago    = l.status_pagamento === 'pago';
  const exec    = l.status_venda === 'em_execucao';
  const desc    = isVenda
    ? _esc(l.cliente_nome || '—')
    : _esc(l.descricao_despesa || l.pago_para || '—');
  const sub = isVenda
    ? _esc(l.produto || '')
    : (_esc(l.pago_para ? 'Para: '+l.pago_para : ''));
  return `
  <div class="vnd-row">
    <div>
      <span class="vnd-tipo-badge ${isVenda ? 'vnd-tipo-venda' : 'vnd-tipo-despesa'}">${isVenda ? '📈' : '📉'} ${isVenda ? 'Venda' : 'Despesa'}</span>
      ${exec ? '<span style="font-size:.65rem;background:#FEF3C7;color:#78400A;padding:1px 6px;border-radius:100px;margin-top:3px;display:block">Em execução</span>' : ''}
    </div>
    <div>
      <div class="vnd-cliente">${desc}</div>
      <div class="vnd-sub">${sub}</div>
    </div>
    <div class="vnd-sub">${_esc(l.colaborador_nome || '—')}</div>
    <div class="vnd-sub">${_esc(l.forma_pagamento || '—')}${l.parcelas > 1 ? ` · ${l.parcelas}x` : ''}</div>
    <div class="vnd-sub">
      ${FMT_D(l.data_lancamento)}
      ${l.data_vencimento ? `<br><span style="color:${pago?'var(--md-primary)':'var(--md-error)'};font-size:.7rem">${pago?'Pago':'Vence'} ${FMT_D(l.data_vencimento)}</span>` : ''}
    </div>
    <div class="${isVenda ? 'vnd-valor-pos' : 'vnd-valor-neg'}">${FMT(l.valor)}</div>
    <div style="display:flex;gap:4px">
      ${!pago && isVenda ? `<button class="vnd-btn-del" data-pago="${l.id}" title="Marcar como pago" style="color:var(--md-primary)">✓</button>` : ''}
      <button class="vnd-btn-del" data-del="${l.id}" title="Excluir">🗑</button>
    </div>
  </div>`;
}

async function _marcarPago(id, btn) {
  btn.disabled = true;
  try { await API._req('PATCH', `/api/lancamentos/${id}/pago`); _carregarLista(); }
  catch (err) { alert('Erro: ' + err.message); btn.disabled = false; }
}

async function _excluir(id) {
  if (!confirm('Excluir este lançamento?')) return;
  try { await API.delete(`/api/lancamentos/${id}`); _carregarLista(); }
  catch (err) { alert('Erro: ' + err.message); }
}

// ── Modal ─────────────────────────────────────────────────
function _abrirModal(tipo) {
  const isVenda = tipo === 'venda';
  document.getElementById('lanc-tipo').value = tipo;
  document.getElementById('modal-lanc-titulo').textContent = isVenda ? '+ Nova venda' : '− Nova despesa';
  document.getElementById('btn-salvar-lanc').className = `btn btn-lg ${isVenda ? 'btn-primary' : 'btn-danger'}`;
  document.getElementById('btn-salvar-lanc').textContent = isVenda ? 'Lançar venda' : 'Lançar despesa';

  // Mostrar/ocultar seções por tipo
  document.getElementById('secao-venda').style.display         = isVenda ? '' : 'none';
  document.getElementById('secao-despesa').style.display       = isVenda ? 'none' : '';
  document.getElementById('secao-parcelas').style.display      = isVenda ? '' : 'none';
  document.getElementById('secao-status').style.display        = isVenda ? '' : 'none';
  document.getElementById('secao-desconto').style.display      = isVenda ? '' : 'none';
  const colabSec = document.getElementById('secao-colab-venda');
  if (colabSec) colabSec.style.display = isVenda ? '' : 'none';

  // Reset
  ['lanc-cli-busca','lanc-produto','lanc-valor','lanc-obs',
   'lanc-descricao','lanc-pago-para','lanc-parcelas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('lanc-colaborador').value = '';
  document.getElementById('lanc-forma').value = '';
  document.getElementById('lanc-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('lanc-data-venc').value = '';
  document.getElementById('lanc-status-pag').value = 'pendente';
  document.getElementById('lanc-status-venda').value = 'finalizada';
  document.getElementById('lanc-cliente-id').value = '';
  document.getElementById('lanc-cliente-nome').value = '';
  document.getElementById('lanc-cli-chip').style.display = 'none';
  document.getElementById('lanc-cli-chip').innerHTML = '';
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

// Auto-fill data vencimento baseado na forma de pagamento
function _autoVencimento() {
  const forma = document.getElementById('lanc-forma').value.toLowerCase();
  const dataLanc = document.getElementById('lanc-data').value;
  const vencEl = document.getElementById('lanc-data-venc');
  if (!dataLanc) return;
  if (forma.includes('cartão') || forma.includes('cartao')) {
    const d = new Date(dataLanc + 'T12:00:00');
    d.setDate(d.getDate() + 30);
    vencEl.value = d.toISOString().slice(0,10);
  } else if (!vencEl.value) {
    vencEl.value = dataLanc;
  }
}

// ── Busca de clientes ──────────────────────────────────────
function _bindBuscaCliente() {
  const inp = document.getElementById('lanc-cli-busca');
  const res = document.getElementById('lanc-cli-results');
  if (!inp) return;
  inp.addEventListener('input', () => {
    clearTimeout(_cliTimer);
    const q = inp.value.trim();
    if (q.length < 2) { res.classList.remove('open'); return; }
    _cliTimer = setTimeout(async () => {
      try {
        const data = await API.get(`/api/clientes?busca=${encodeURIComponent(q)}&por_pagina=8`);
        res.innerHTML = (data.clientes||[]).map(c => `
          <div class="vnd-cli-item" data-id="${c.id}" data-nome="${_esc(c.nome_completo)}">
            <div class="vnd-cli-item-nome">${_esc(c.nome_completo)}</div>
            <div class="vnd-cli-item-sub">${c.celular||''}</div>
          </div>`).join('') +
          `<div class="vnd-cli-cadastrar" id="btn-cli-rapido-open">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/></svg>
            Cadastrar "${q}"
          </div>`;
        res.classList.add('open');
        res.querySelectorAll('.vnd-cli-item').forEach(el =>
          el.addEventListener('click', () => _selecionarCliente(el.dataset.id, el.dataset.nome))
        );
        document.getElementById('btn-cli-rapido-open')?.addEventListener('click', () => {
          document.getElementById('cli-rapido-nome').value = q;
          document.getElementById('cli-rapido-tel').value = '';
          document.getElementById('modal-cli-rapido').classList.add('open');
          res.classList.remove('open');
        });
      } catch {}
    }, 300);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.vnd-cli-wrap')) res.classList.remove('open'); }, true);
}

function _selecionarCliente(id, nome) {
  document.getElementById('lanc-cliente-id').value = id;
  document.getElementById('lanc-cliente-nome').value = nome;
  document.getElementById('lanc-cli-busca').value = '';
  document.getElementById('lanc-cli-results').classList.remove('open');
  const chip = document.getElementById('lanc-cli-chip');
  chip.innerHTML = `<div class="vnd-cli-chip">${_esc(nome)}<button onclick="document.getElementById('lanc-cliente-id').value='';document.getElementById('lanc-cliente-nome').value='';this.closest('.vnd-cli-chip').parentElement.style.display='none'">×</button></div>`;
  chip.style.display = '';
}

async function _cadastrarCliRapido() {
  const nome = document.getElementById('cli-rapido-nome').value.trim();
  const tel  = document.getElementById('cli-rapido-tel').value.trim().replace(/\D/g,'');
  if (!nome || !tel) { alert('Nome e celular são obrigatórios.'); return; }
  const btn = document.getElementById('btn-salvar-cli-rapido');
  btn.disabled = true; btn.textContent = 'Cadastrando...';
  try {
    const c = await API.post('/api/clientes', { tipo_pessoa:'PF', nome_completo:nome, celular:tel });
    document.getElementById('modal-cli-rapido').classList.remove('open');
    _selecionarCliente(c.id, c.nome_completo);
  } catch (err) { alert('Erro: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Cadastrar e selecionar'; }
}

async function _salvarLancamento() {
  const tipo = document.getElementById('lanc-tipo').value;
  const valorBruto = parseFloat(document.getElementById('lanc-valor').value) || 0;
  if (!valorBruto) { alert('Informe um valor válido.'); return; }
  const desconto  = parseFloat(document.getElementById('lanc-desconto')?.value) || 0;
  const descTipo  = document.getElementById('lanc-desc-tipo')?.value;
  const descVal   = descTipo === 'pct' ? (valorBruto * desconto / 100) : desconto;
  const valor     = String(Math.max(0, valorBruto - descVal));
  const btn = document.getElementById('btn-salvar-lanc');
  btn.disabled = true;
  const isVenda = tipo === 'venda';
  try {
    await API.post('/api/lancamentos', {
      tipo,
      cliente_id:       document.getElementById('lanc-cliente-id').value   || undefined,
      cliente_nome:     document.getElementById('lanc-cliente-nome').value || document.getElementById('lanc-cli-busca')?.value || undefined,
      colaborador_id:   document.getElementById('lanc-colaborador').value  || undefined,
      produto:          isVenda ? (document.getElementById('lanc-produto').value || undefined) : undefined,
      descricao_despesa:!isVenda ? (document.getElementById('lanc-descricao').value || undefined) : undefined,
      pago_para:        !isVenda ? (document.getElementById('lanc-pago-para').value || undefined) : undefined,
      valor:            parseFloat(valor),
      forma_pagamento:  document.getElementById('lanc-forma').value        || undefined,
      observacao:       document.getElementById('lanc-obs')?.value         || undefined,
      data_lancamento:  document.getElementById('lanc-data').value         || undefined,
      data_vencimento:  document.getElementById('lanc-data-venc').value    || undefined,
      status_pagamento: document.getElementById('lanc-status-pag').value   || 'pendente',
      parcelas:         parseInt(document.getElementById('lanc-parcelas')?.value) || 1,
      status_venda:     document.getElementById('lanc-status-venda')?.value || 'finalizada',
    });
    _fecharModal();
    _carregarLista();
  } catch (err) { alert('Erro: ' + err.message); }
  finally { btn.disabled = false; }
}

function _bindBuscaServico() {
  const inp = document.getElementById('lanc-produto');
  const res = document.getElementById('lanc-srv-results');
  if (!inp || !res) return;
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const q = inp.value.trim();
    res.classList.remove('open');
    if (!q) return;
    timer = setTimeout(async () => {
      try {
        const servs = await API.get(`/api/servicos?busca=${encodeURIComponent(q)}`);
        if (!servs.length) return;
        res.innerHTML = servs.map(s => `
          <div class="vnd-cli-item" data-nome="${_esc(s.nome)}" data-preco="${s.preco_venda}">
            <div class="vnd-cli-item-nome">${_esc(s.nome)}</div>
            <div class="vnd-cli-item-sub">Venda: R$ ${parseFloat(s.preco_venda).toLocaleString('pt-BR',{minimumFractionDigits:2})}${s.preco_custo?` · Custo: R$ ${parseFloat(s.preco_custo).toLocaleString('pt-BR',{minimumFractionDigits:2})}`:''}` +
            `</div>
          </div>`).join('');
        res.classList.add('open');
        res.querySelectorAll('.vnd-cli-item').forEach(el =>
          el.addEventListener('click', () => {
            inp.value = el.dataset.nome;
            document.getElementById('lanc-valor').value = el.dataset.preco;
            document.getElementById('lanc-valor').dispatchEvent(new Event('input'));
            res.classList.remove('open');
          })
        );
      } catch {}
    }, 300);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.vnd-cli-wrap')) res.classList.remove('open'); }, true);
}

function _bindEventos() {
  document.getElementById('btn-nova-venda').addEventListener('click',   () => _abrirModal('venda'));
  document.getElementById('btn-nova-despesa').addEventListener('click', () => _abrirModal('despesa'));
  document.getElementById('btn-fechar-lanc').addEventListener('click',  _fecharModal);
  document.getElementById('btn-cancelar-lanc').addEventListener('click',_fecharModal);
  document.getElementById('modal-lancamento').addEventListener('click', e => { if (e.target.id === 'modal-lancamento') _fecharModal(); });
  document.getElementById('btn-salvar-lanc').addEventListener('click',  _salvarLancamento);

  // Auto-vencimento ao trocar forma de pagamento
  document.getElementById('lanc-forma').addEventListener('change', _autoVencimento);
  document.getElementById('lanc-data').addEventListener('change', _autoVencimento);

  // Desconto — calcular total
  const _calcDesconto = () => {
    const valor   = parseFloat(document.getElementById('lanc-valor').value) || 0;
    const desc    = parseFloat(document.getElementById('lanc-desconto').value) || 0;
    const tipo    = document.getElementById('lanc-desc-tipo').value;
    const descVal = tipo === 'pct' ? (valor * desc / 100) : desc;
    const total   = Math.max(0, valor - descVal);
    const el = document.getElementById('lanc-total-desc');
    if (el) el.value = total > 0 ? `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '';
  };
  document.getElementById('lanc-valor')?.addEventListener('input', _calcDesconto);
  document.getElementById('lanc-desconto')?.addEventListener('input', _calcDesconto);
  document.getElementById('lanc-desc-tipo')?.addEventListener('change', _calcDesconto);

  // Autocomplete de serviços
  _bindBuscaServico();

  // Cliente rápido
  document.getElementById('btn-fechar-cli-rapido').addEventListener('click', () => document.getElementById('modal-cli-rapido').classList.remove('open'));
  document.getElementById('btn-cancelar-cli-rapido').addEventListener('click', () => document.getElementById('modal-cli-rapido').classList.remove('open'));
  document.getElementById('btn-salvar-cli-rapido').addEventListener('click', _cadastrarCliRapido);
  document.getElementById('cli-rapido-tel').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g,''); });

  // Pesquisa
  document.getElementById('vnd-busca').addEventListener('input', e => {
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => { _busca = e.target.value.trim(); _pagina = 1; _carregarLista(); }, 350);
  });

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
  // Painéis Vendas / Despesas
  document.querySelectorAll('[data-vnd-painel]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vnd-painel]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _tipo = btn.dataset.vndPainel;
      // Trocar botão de ação do header
      const btnNovaVenda  = document.getElementById('btn-nova-venda');
      const btnNovaDespesa = document.getElementById('btn-nova-despesa');
      if (_tipo === 'venda')   { btnNovaVenda.style.display=''; btnNovaDespesa.style.display='none'; }
      else                     { btnNovaVenda.style.display='none'; btnNovaDespesa.style.display=''; }
      _pagina = 1; _carregarLista();
    })
  );
  // Esconder botão de despesa inicialmente
  document.getElementById('btn-nova-despesa').style.display = 'none';
  document.getElementById('btn-vnd-ant').addEventListener('click',  () => { if (_pagina > 1) { _pagina--; _carregarLista(); } });
  document.getElementById('btn-vnd-prox').addEventListener('click', () => { _pagina++; _carregarLista(); });

  _bindBuscaCliente();
}
