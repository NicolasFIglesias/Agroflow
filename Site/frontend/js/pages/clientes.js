/* ── Clientes — lista ──────────────────────────────────────── */
verificarAutenticacao();

let _pagina      = 1;
const _porPagina = 20;
let _busca       = '';
let _filtroTipo  = '';
let _buscaTimer  = null;
let _editandoId  = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  carregarLista();
  bindEventos();
});

function bindEventos() {
  // Busca com debounce
  document.getElementById('cli-busca-input').addEventListener('input', e => {
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => {
      _busca = e.target.value;
      _pagina = 1;
      carregarLista();
    }, 350);
  });

  // Filtro tipo
  document.getElementById('cli-filtro-tipo').addEventListener('change', e => {
    _filtroTipo = e.target.value;
    _pagina = 1;
    carregarLista();
  });

  // Paginação
  document.getElementById('btn-pag-anterior').addEventListener('click', () => {
    if (_pagina > 1) { _pagina--; carregarLista(); }
  });
  document.getElementById('btn-pag-proxima').addEventListener('click', () => {
    _pagina++;
    carregarLista();
  });

  // Novo cliente
  document.getElementById('btn-novo-cliente').addEventListener('click', () => abrirModal());

  // Fechar modal
  document.getElementById('btn-fechar-modal-cliente').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-cliente').addEventListener('click', fecharModal);
  document.getElementById('modal-cliente').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-cliente')) fecharModal();
  });

  // Tipo PF / PJ toggle
  document.getElementById('btn-tipo-pf').addEventListener('click', () => setTipoPessoa('PF'));
  document.getElementById('btn-tipo-pj').addEventListener('click', () => setTipoPessoa('PJ'));

  // Salvar
  document.getElementById('btn-salvar-cliente').addEventListener('click', salvarCliente);
}

// ── Lista ─────────────────────────────────────────────────────
async function carregarLista() {
  const lista = document.getElementById('cli-lista');
  lista.innerHTML = '<div class="cli-loading">Carregando...</div>';

  try {
    const params = new URLSearchParams({
      pagina: _pagina,
      por_pagina: _porPagina,
    });
    if (_busca)      params.set('busca', _busca);
    if (_filtroTipo) params.set('tipo_pessoa', _filtroTipo);

    const data = await API.get('/api/clientes?' + params.toString());

    // Stats
    document.getElementById('stat-total').textContent = data.total + ' cliente' + (data.total !== 1 ? 's' : '');
    const nPF = data.clientes.filter(c => c.tipo_pessoa === 'PF').length;
    const nPJ = data.clientes.filter(c => c.tipo_pessoa === 'PJ').length;
    document.getElementById('stat-pf').textContent = nPF + ' PF';
    document.getElementById('stat-pj').textContent = nPJ + ' PJ';

    // Paginação
    const pag = document.getElementById('cli-paginacao');
    if (data.total_paginas > 1) {
      pag.style.display = 'flex';
      document.getElementById('pag-info').textContent =
        `Página ${data.pagina} de ${data.total_paginas}`;
      document.getElementById('btn-pag-anterior').disabled = data.pagina <= 1;
      document.getElementById('btn-pag-proxima').disabled  = data.pagina >= data.total_paginas;
    } else {
      pag.style.display = 'none';
    }

    // Render
    if (data.clientes.length === 0) {
      lista.innerHTML = '<div class="cli-vazio">Nenhum cliente encontrado.</div>';
      return;
    }

    lista.innerHTML = data.clientes.map(renderRow).join('');

    // Ações
    lista.querySelectorAll('.cli-btn-ficha').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        window.location.href = `/pages/cliente-ficha.html?id=${btn.dataset.id}`;
      });
    });
    lista.querySelectorAll('.cli-btn-editar').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        abrirModalEditar(btn.dataset.id);
      });
    });
    lista.querySelectorAll('.cli-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = `/pages/cliente-ficha.html?id=${row.dataset.id}`;
      });
    });
  } catch (err) {
    lista.innerHTML = '<div class="cli-vazio">Erro ao carregar clientes.</div>';
    console.error(err);
  }
}

function renderRow(c) {
  const isPJ = c.tipo_pessoa === 'PJ';
  const iniciais = (c.nome_completo || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  const doc = isPJ
    ? (c.cnpj_mascarado || c.cnpj || '—')
    : (c.cpf_mascarado  || c.cpf  || '—');
  const loc = [c.municipio, c.uf].filter(Boolean).join('/') || '—';
  const imoveis = parseInt(c.total_imoveis) || 0;

  return `
  <div class="cli-row" data-id="${c.id}">
    <div class="cli-row-nome">
      <div class="cli-avatar${isPJ ? ' pj' : ''}">${iniciais}</div>
      <div>
        <div>${c.nome_completo}</div>
        <span class="cli-badge-tipo${isPJ ? ' pj' : ''}">${c.tipo_pessoa}</span>
      </div>
    </div>
    <div class="cli-row-doc">${doc}</div>
    <div class="cli-row-loc">${loc}</div>
    <div class="cli-row-tel">${c.celular || '—'}</div>
    <div class="cli-row-imoveis">
      ${imoveis > 0 ? `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke-width="2"/></svg> ${imoveis}` : '—'}
    </div>
    <div class="cli-row-acoes">
      <button class="cli-btn-acao cli-btn-ficha" data-id="${c.id}" title="Ver ficha">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke-width="2"/>
        </svg>
      </button>
      <button class="cli-btn-acao cli-btn-editar" data-id="${c.id}" title="Editar">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2" stroke-linecap="round"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>`;
}

// ── Modal ─────────────────────────────────────────────────────
function abrirModal(dados = null) {
  _editandoId = dados ? dados.id : null;
  document.getElementById('modal-cliente-titulo').textContent =
    dados ? 'Editar Cliente' : 'Novo Cliente';

  // Reset
  const campos = ['nome','nome-fantasia','cpf','cnpj','rg','inscricao-estadual',
    'data-nascimento','estado-civil','profissao','dap-caf',
    'cep','logradouro','numero','complemento','bairro','municipio','uf','endereco-rural',
    'celular','celular2','telefone-fixo','email','email2'];
  campos.forEach(c => {
    const el = document.getElementById('cliente-' + c);
    if (el) el.value = '';
  });

  const tipo = dados ? dados.tipo_pessoa : 'PF';
  setTipoPessoa(tipo);

  if (dados) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val != null) el.value = val;
    };
    set('cliente-nome',              dados.nome_completo);
    set('cliente-nome-fantasia',     dados.nome_fantasia);
    set('cliente-cpf',               dados.cpf);
    set('cliente-cnpj',              dados.cnpj);
    set('cliente-rg',                dados.rg);
    set('cliente-inscricao-estadual',dados.inscricao_estadual);
    set('cliente-data-nascimento',   dados.data_nascimento?.slice(0,10));
    set('cliente-estado-civil',      dados.estado_civil);
    set('cliente-profissao',         dados.profissao);
    set('cliente-dap-caf',           dados.dap_caf);
    set('cliente-cep',               dados.cep);
    set('cliente-logradouro',        dados.logradouro);
    set('cliente-numero',            dados.numero);
    set('cliente-complemento',       dados.complemento);
    set('cliente-bairro',            dados.bairro);
    set('cliente-municipio',         dados.municipio);
    set('cliente-uf',                dados.uf);
    set('cliente-endereco-rural',    dados.endereco_rural);
    set('cliente-celular',           dados.celular);
    set('cliente-celular2',          dados.celular2);
    set('cliente-telefone-fixo',     dados.telefone_fixo);
    set('cliente-email',             dados.email);
    set('cliente-email2',            dados.email2);
  }

  document.getElementById('modal-cliente').style.display = 'flex';
}

async function abrirModalEditar(id) {
  try {
    const dados = await API.get('/api/clientes/' + id);
    abrirModal(dados);
  } catch (err) {
    alert('Erro ao carregar dados do cliente.');
  }
}

function fecharModal() {
  document.getElementById('modal-cliente').style.display = 'none';
  _editandoId = null;
}

function setTipoPessoa(tipo) {
  document.getElementById('cliente-tipo-pessoa').value = tipo;
  document.getElementById('btn-tipo-pf').classList.toggle('active', tipo === 'PF');
  document.getElementById('btn-tipo-pj').classList.toggle('active', tipo === 'PJ');
  document.getElementById('grupo-cpf').style.display          = tipo === 'PF' ? '' : 'none';
  document.getElementById('grupo-cnpj').style.display         = tipo === 'PJ' ? '' : 'none';
  document.getElementById('grupo-rg').style.display           = tipo === 'PF' ? '' : 'none';
  document.getElementById('grupo-nascimento').style.display   = tipo === 'PF' ? '' : 'none';
  document.getElementById('grupo-nome-fantasia').style.display= tipo === 'PJ' ? '' : 'none';
}

async function salvarCliente() {
  const btn = document.getElementById('btn-salvar-cliente');
  const tipo_pessoa   = document.getElementById('cliente-tipo-pessoa').value;
  const nome_completo = document.getElementById('cliente-nome').value.trim();
  const celular       = document.getElementById('cliente-celular').value.trim();

  if (!nome_completo) { alert('Nome completo é obrigatório.'); return; }
  if (!celular)       { alert('Celular é obrigatório.'); return; }

  const body = {
    tipo_pessoa,
    nome_completo,
    celular,
    nome_fantasia:       document.getElementById('cliente-nome-fantasia').value || undefined,
    cpf:                 document.getElementById('cliente-cpf').value           || undefined,
    cnpj:                document.getElementById('cliente-cnpj').value          || undefined,
    rg:                  document.getElementById('cliente-rg').value            || undefined,
    inscricao_estadual:  document.getElementById('cliente-inscricao-estadual').value || undefined,
    data_nascimento:     document.getElementById('cliente-data-nascimento').value    || undefined,
    estado_civil:        document.getElementById('cliente-estado-civil').value       || undefined,
    profissao:           document.getElementById('cliente-profissao').value          || undefined,
    dap_caf:             document.getElementById('cliente-dap-caf').value            || undefined,
    cep:                 document.getElementById('cliente-cep').value                || undefined,
    logradouro:          document.getElementById('cliente-logradouro').value         || undefined,
    numero:              document.getElementById('cliente-numero').value             || undefined,
    complemento:         document.getElementById('cliente-complemento').value        || undefined,
    bairro:              document.getElementById('cliente-bairro').value             || undefined,
    municipio:           document.getElementById('cliente-municipio').value          || undefined,
    uf:                  document.getElementById('cliente-uf').value                 || undefined,
    endereco_rural:      document.getElementById('cliente-endereco-rural').value     || undefined,
    celular2:            document.getElementById('cliente-celular2').value           || undefined,
    telefone_fixo:       document.getElementById('cliente-telefone-fixo').value      || undefined,
    email:               document.getElementById('cliente-email').value              || undefined,
    email2:              document.getElementById('cliente-email2').value             || undefined,
  };

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    if (_editandoId) {
      await API.put('/api/clientes/' + _editandoId, body);
    } else {
      await API.post('/api/clientes', body);
    }
    fecharModal();
    _pagina = 1;
    carregarLista();
  } catch (err) {
    const msg = err.message || 'Erro ao salvar cliente.';
    alert(msg.includes('CPF') || msg.includes('CNPJ') ? 'CPF/CNPJ já cadastrado.' : msg);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar cliente';
  }
}
