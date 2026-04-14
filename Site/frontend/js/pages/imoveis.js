/* ── Imóveis — lista ───────────────────────────────────────── */
verificarAutenticacao();

let _pagina      = 1;
const _porPagina = 20;
let _busca       = '';
let _filtroTipo  = '';
let _buscaTimer  = null;
let _editandoId  = null;

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  carregarLista();
  bindEventos();
});

function bindEventos() {
  document.getElementById('imo-busca-input').addEventListener('input', e => {
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => {
      _busca = e.target.value;
      _pagina = 1;
      carregarLista();
    }, 350);
  });

  document.getElementById('imo-filtro-tipo').addEventListener('change', e => {
    _filtroTipo = e.target.value;
    _pagina = 1;
    carregarLista();
  });

  document.getElementById('btn-imo-anterior').addEventListener('click', () => {
    if (_pagina > 1) { _pagina--; carregarLista(); }
  });
  document.getElementById('btn-imo-proxima').addEventListener('click', () => {
    _pagina++;
    carregarLista();
  });

  document.getElementById('btn-novo-imovel').addEventListener('click', () => abrirModal());
  document.getElementById('btn-fechar-modal-imovel').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-imovel').addEventListener('click', fecharModal);
  document.getElementById('modal-imovel').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-imovel')) fecharModal();
  });
  document.getElementById('btn-salvar-imovel').addEventListener('click', salvarImovel);
}

async function carregarLista() {
  const lista = document.getElementById('imo-lista');
  lista.innerHTML = '<div class="cli-loading">Carregando...</div>';

  try {
    const params = new URLSearchParams({ pagina: _pagina, por_pagina: _porPagina });
    if (_busca)      params.set('busca', _busca);
    if (_filtroTipo) params.set('tipo', _filtroTipo);

    const data = await API.get('/api/imoveis?' + params.toString());

    const pag = document.getElementById('imo-paginacao');
    if (data.total_paginas > 1) {
      pag.style.display = 'flex';
      document.getElementById('imo-pag-info').textContent = `Página ${data.pagina} de ${data.total_paginas}`;
      document.getElementById('btn-imo-anterior').disabled = data.pagina <= 1;
      document.getElementById('btn-imo-proxima').disabled  = data.pagina >= data.total_paginas;
    } else {
      pag.style.display = 'none';
    }

    if (data.imoveis.length === 0) {
      lista.innerHTML = '<div class="cli-vazio">Nenhum imóvel encontrado.</div>';
      return;
    }

    lista.innerHTML = data.imoveis.map(renderRow).join('');

    lista.querySelectorAll('.imo-btn-ficha').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        window.location.href = `/pages/imovel-ficha.html?id=${btn.dataset.id}`;
      });
    });
    lista.querySelectorAll('.imo-btn-editar').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        abrirModalEditar(btn.dataset.id);
      });
    });
    lista.querySelectorAll('.imo-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = `/pages/imovel-ficha.html?id=${row.dataset.id}`;
      });
    });
  } catch (err) {
    lista.innerHTML = '<div class="cli-vazio">Erro ao carregar imóveis.</div>';
    console.error(err);
  }
}

const TIPO_LABEL = {
  fazenda: 'Fazenda', sitio: 'Sítio', chacara: 'Chácara',
  gleba: 'Gleba', lote_rural: 'Lote Rural', outro: 'Outro',
};
const CAR_LABEL  = { ativo: 'Ativo', pendente_analise: 'Pendente', cancelado: 'Cancelado', suspenso: 'Suspenso' };
const CCIR_LABEL = { em_dia: 'Em dia', vencido: 'Vencido', em_renovacao: 'Em renov.' };

function renderRow(im) {
  const area = parseFloat(im.area_total_ha).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const carClass = im.situacao_car ? `imo-badge imo-badge-car-${im.situacao_car}` : 'imo-badge imo-badge-none';
  const ccirClass = im.situacao_ccir ? `imo-badge imo-badge-ccir-${im.situacao_ccir}` : 'imo-badge imo-badge-none';

  return `
  <div class="imo-row" data-id="${im.id}">
    <div class="imo-row-nome">
      <div class="imo-icon">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke-width="2"/>
        </svg>
      </div>
      <div>
        <div class="imo-denominacao">${im.denominacao}</div>
        ${im.tipo_imovel ? `<div class="imo-matricula">${TIPO_LABEL[im.tipo_imovel] || im.tipo_imovel}${im.matricula ? ' · Mat. ' + im.matricula : ''}</div>` : (im.matricula ? `<div class="imo-matricula">Mat. ${im.matricula}</div>` : '')}
      </div>
    </div>
    <div class="imo-row-loc">${im.municipio}/${im.uf}</div>
    <div class="imo-row-area">${area} ha</div>
    <div><span class="${carClass}">${CAR_LABEL[im.situacao_car] || '—'}</span></div>
    <div><span class="${ccirClass}">${CCIR_LABEL[im.situacao_ccir] || '—'}</span></div>
    <div class="imo-row-prop">${im.total_proprietarios || 0} proprietário${im.total_proprietarios !== 1 ? 's' : ''}</div>
    <div class="cli-row-acoes">
      <button class="cli-btn-acao imo-btn-ficha" data-id="${im.id}" title="Ver ficha">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke-width="2"/>
        </svg>
      </button>
      <button class="cli-btn-acao imo-btn-editar" data-id="${im.id}" title="Editar">
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
  _editandoId = dados?.id || null;
  document.getElementById('modal-imovel-titulo').textContent = dados ? 'Editar Imóvel' : 'Novo Imóvel';

  const campos = ['denominacao','municipio','uf','area','tipo','matricula',
    'numero-ccir','situacao-ccir','vencimento-ccir','inscricao-car','situacao-car','localizacao','bioma','atividade'];
  campos.forEach(c => {
    const el = document.getElementById('imovel-' + c);
    if (el) el.value = '';
  });

  if (dados) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val != null) el.value = val;
    };
    set('imovel-denominacao',    dados.denominacao);
    set('imovel-municipio',      dados.municipio);
    set('imovel-uf',             dados.uf);
    set('imovel-area',           dados.area_total_ha);
    set('imovel-tipo',           dados.tipo_imovel);
    set('imovel-matricula',      dados.matricula);
    set('imovel-numero-ccir',    dados.numero_ccir);
    set('imovel-situacao-ccir',  dados.situacao_ccir);
    set('imovel-vencimento-ccir',dados.vencimento_ccir?.slice(0,10));
    set('imovel-inscricao-car',  dados.inscricao_car);
    set('imovel-situacao-car',   dados.situacao_car);
    set('imovel-localizacao',    dados.localizacao);
    set('imovel-bioma',          dados.bioma);
    set('imovel-atividade',      dados.atividade_principal);
  }

  document.getElementById('modal-imovel').style.display = 'flex';
}

async function abrirModalEditar(id) {
  try {
    const dados = await API.get('/api/imoveis/' + id);
    abrirModal(dados);
  } catch (err) {
    alert('Erro ao carregar imóvel.');
  }
}

function fecharModal() {
  document.getElementById('modal-imovel').style.display = 'none';
  _editandoId = null;
}

async function salvarImovel() {
  const btn = document.getElementById('btn-salvar-imovel');
  const denominacao  = document.getElementById('imovel-denominacao').value.trim();
  const municipio    = document.getElementById('imovel-municipio').value.trim();
  const uf           = document.getElementById('imovel-uf').value;
  const area_total_ha = document.getElementById('imovel-area').value;

  if (!denominacao)  { alert('Denominação é obrigatória.'); return; }
  if (!municipio)    { alert('Município é obrigatório.'); return; }
  if (!uf)           { alert('UF é obrigatória.'); return; }
  if (!area_total_ha){ alert('Área total é obrigatória.'); return; }

  const body = {
    denominacao, municipio, uf,
    area_total_ha: parseFloat(area_total_ha),
    tipo_imovel:    document.getElementById('imovel-tipo').value          || undefined,
    matricula:      document.getElementById('imovel-matricula').value     || undefined,
    numero_ccir:    document.getElementById('imovel-numero-ccir').value   || undefined,
    situacao_ccir:  document.getElementById('imovel-situacao-ccir').value || undefined,
    vencimento_ccir:document.getElementById('imovel-vencimento-ccir').value || undefined,
    inscricao_car:  document.getElementById('imovel-inscricao-car').value || undefined,
    situacao_car:   document.getElementById('imovel-situacao-car').value  || undefined,
    localizacao:    document.getElementById('imovel-localizacao').value   || undefined,
    bioma:          document.getElementById('imovel-bioma').value         || undefined,
    atividade_principal: document.getElementById('imovel-atividade').value || undefined,
  };

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    if (_editandoId) {
      await API.put('/api/imoveis/' + _editandoId, body);
    } else {
      await API.post('/api/imoveis', body);
    }
    fecharModal();
    _pagina = 1;
    carregarLista();
  } catch (err) {
    alert(err.message || 'Erro ao salvar imóvel.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar imóvel';
  }
}
