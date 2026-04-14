/* ── Imovel Ficha ──────────────────────────────────────────── */
verificarAutenticacao();

const params  = new URLSearchParams(location.search);
const imovelId = params.get('id');
if (!imovelId) window.location.href = '/pages/imoveis.html';

let _imovel = null;
let _mapInstance = null;
let _propClienteId = null;
let _propBuscaTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  await carregarImovel();
  bindTabs();
  bindProprietarios();
});

async function carregarImovel() {
  try {
    _imovel = await API.get('/api/imoveis/' + imovelId);
    renderHero();
    renderDados();
    renderDocumentos();
    renderProprietarios();
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar imóvel.');
    window.location.href = '/pages/imoveis.html';
  }
}

function renderHero() {
  const im = _imovel;
  const TIPO = { fazenda:'Fazenda', sitio:'Sítio', chacara:'Chácara', gleba:'Gleba', lote_rural:'Lote Rural', outro:'Outro' };
  document.getElementById('cf-nome').textContent = im.denominacao;
  document.getElementById('cf-breadcrumb-nome').textContent = im.denominacao;
  document.title = im.denominacao + ' — AgriFlow';

  const area = parseFloat(im.area_total_ha).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const meta = [];
  if (im.tipo_imovel) meta.push(`<span>${TIPO[im.tipo_imovel] || im.tipo_imovel}</span>`);
  meta.push(`<span>📍 ${im.municipio}/${im.uf}</span>`);
  meta.push(`<span>📐 ${area} ha</span>`);
  if (im.atividade_principal) meta.push(`<span>🌱 ${im.atividade_principal}</span>`);
  document.getElementById('cf-hero-meta').innerHTML = meta.join('');
}

function renderDados() {
  const im = _imovel;
  const CAR_LABEL  = { ativo:'Ativo', pendente_analise:'Pendente de análise', cancelado:'Cancelado', suspenso:'Suspenso' };
  const CCIR_LABEL = { em_dia:'Em dia', vencido:'Vencido', em_renovacao:'Em renovação' };
  const ITR_LABEL  = { em_dia:'Em dia', pendente:'Pendente', isento:'Isento' };
  const MAT_LABEL  = { regular:'Regular', com_onus:'Com ônus', com_pendencia:'Com pendência', em_regularizacao:'Em regularização' };
  const BIOMA = { amazonia:'Amazônia', cerrado:'Cerrado', pantanal:'Pantanal', mata_atlantica:'Mata Atlântica', caatinga:'Caatinga', pampa:'Pampa' };

  const html = `
    <div class="cf-section-title">Identificação</div>
    ${campo('Denominação', im.denominacao)}
    ${campo('Município / UF', im.municipio + '/' + im.uf)}
    ${campo('Área Total (ha)', parseFloat(im.area_total_ha).toLocaleString('pt-BR', {minimumFractionDigits:4}))}
    ${campo('Tipo de Imóvel', im.tipo_imovel)}
    ${campo('Localização', im.localizacao)}
    ${campo('Distrito', im.distrito)}
    ${campo('Bioma', BIOMA[im.bioma] || im.bioma)}
    ${campo('Atividade Principal', im.atividade_principal)}
    ${campo('Código SNCR', im.codigo_sncr)}
    ${campo('Módulos Fiscais', im.modulos_fiscais)}
    ${campo('Fração Mínima (ha)', im.fracao_minima)}

    <div class="cf-section-title">Registro de Imóveis</div>
    ${campo('Matrícula', im.matricula)}
    ${campo('Cartório', im.cartorio_registro)}
    ${campo('Livro / Folha', im.livro_folha)}
    ${campo('Data de Registro', im.data_registro ? new Date(im.data_registro).toLocaleDateString('pt-BR') : null)}
    ${campo('NIRF', im.nirf)}
    ${campo('Situação da Matrícula', MAT_LABEL[im.situacao_matricula] || im.situacao_matricula)}
    ${im.obs_matricula ? campo('Obs. Matrícula', im.obs_matricula) : ''}

    <div class="cf-section-title">CCIR</div>
    ${campo('Nº do CCIR', im.numero_ccir)}
    ${campo('Situação CCIR', CCIR_LABEL[im.situacao_ccir] || im.situacao_ccir)}
    ${campo('Vencimento CCIR', im.vencimento_ccir ? new Date(im.vencimento_ccir).toLocaleDateString('pt-BR') : null)}

    <div class="cf-section-title">ITR</div>
    ${campo('Nº do ITR', im.numero_itr)}
    ${campo('Ano de Exercício', im.ano_exercicio_itr)}
    ${campo('Data de Pagamento', im.data_pagamento_itr ? new Date(im.data_pagamento_itr).toLocaleDateString('pt-BR') : null)}
    ${campo('Situação ITR', ITR_LABEL[im.situacao_itr] || im.situacao_itr)}

    <div class="cf-section-title">CAR</div>
    ${campo('Inscrição CAR', im.inscricao_car)}
    ${campo('Situação CAR', CAR_LABEL[im.situacao_car] || im.situacao_car)}
    ${campo('Data de Inscrição', im.data_inscricao_car ? new Date(im.data_inscricao_car).toLocaleDateString('pt-BR') : null)}

    <div class="cf-section-title">Confrontantes</div>
    ${campo('Norte', im.confrontante_norte)}
    ${campo('Sul', im.confrontante_sul)}
    ${campo('Leste', im.confrontante_leste)}
    ${campo('Oeste', im.confrontante_oeste)}
    ${im.obs_confrontantes ? campo('Obs. Confrontantes', im.obs_confrontantes) : ''}
  `;
  document.getElementById('dados-grid').innerHTML = html;
}

function renderDocumentos() {
  // Placeholder — documentos serão implementados com upload
  document.getElementById('docs-grid').innerHTML = `
    <div class="cf-section-title">Coordenadas Geográficas</div>
    ${campo('Latitude', _imovel.latitude)}
    ${campo('Longitude', _imovel.longitude)}
    ${campo('Datum', _imovel.datum)}
    ${_imovel.link_google_maps ? `<div class="cf-field"><div class="cf-field-label">Google Maps</div><a href="${_imovel.link_google_maps}" target="_blank" rel="noopener" class="cf-field-value" style="color:var(--verde);text-decoration:none">Abrir no Maps ↗</a></div>` : campo('Google Maps', null)}
  `;
}

function renderProprietarios() {
  const el = document.getElementById('proprietarios-lista');
  const props = _imovel.proprietarios || [];
  const VINCULO = { proprietario:'Proprietário', posseiro:'Posseiro', arrendatario:'Arrendatário', comodatario:'Comodatário', outro:'Outro' };

  if (props.length === 0) {
    el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.9rem">Nenhum proprietário vinculado.</p>';
    return;
  }
  el.innerHTML = props.map(p => {
    const iniciais = (p.nome_completo || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    const doc = p.cpf || p.cnpj || '';
    return `
    <div class="imf-prop-card" data-id="${p.id}">
      <div class="imf-prop-avatar">${iniciais}</div>
      <div>
        <div class="imf-prop-nome">${p.nome_completo}</div>
        ${doc ? `<div class="imf-prop-doc">${doc}</div>` : ''}
      </div>
      <span class="imf-prop-badge">${VINCULO[p.tipo_vinculo] || p.tipo_vinculo} ${p.percentual_participacao < 100 ? '(' + p.percentual_participacao + '%)' : ''}</span>
      <button class="cli-btn-acao excluir prop-btn-desvincular" data-vinculo="${p.vinculo_id}" title="Desvincular" style="flex-shrink:0" onclick="event.stopPropagation()">
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  el.querySelectorAll('.imf-prop-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.prop-btn-desvincular')) return;
      window.location.href = `/pages/cliente-ficha.html?id=${card.dataset.id}`;
    });
  });
  el.querySelectorAll('.prop-btn-desvincular').forEach(btn => {
    btn.addEventListener('click', () => desvincularProp(btn.dataset.vinculo));
  });
}

async function desvincularProp(vinculoId) {
  if (!confirm('Desvincular este proprietário do imóvel?')) return;
  try {
    await API.delete(`/api/imoveis/${imovelId}/proprietarios/${vinculoId}`);
    _imovel = await API.get('/api/imoveis/' + imovelId);
    renderProprietarios();
  } catch (err) {
    alert('Erro ao desvincular.');
  }
}

// ── Tabs ──────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.cf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cf-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.cf-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab));
      if (tab.dataset.tab === 'mapa') initMapa();
    });
  });
  document.getElementById('btn-editar-imovel').addEventListener('click', () => {
    window.location.href = `/pages/imoveis.html?editar=${imovelId}`;
  });
}

// ── Mapa Leaflet ──────────────────────────────────────────────
function initMapa() {
  const lat = parseFloat(_imovel.latitude);
  const lng = parseFloat(_imovel.longitude);

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    document.getElementById('imf-mapa').style.display = 'none';
    document.getElementById('imf-mapa-sem-coords').style.display = 'flex';
    document.getElementById('imf-mapa-coords').style.display = 'none';
    document.getElementById('btn-editar-coords').addEventListener('click', () => {
      window.location.href = `/pages/imoveis.html?editar=${imovelId}`;
    });
    return;
  }

  document.getElementById('imf-mapa').style.display = 'block';
  document.getElementById('imf-mapa-sem-coords').style.display = 'none';
  document.getElementById('imf-mapa-coords').style.display = 'flex';
  document.getElementById('imf-coords-text').textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} (${_imovel.datum || 'SIRGAS 2000'})`;

  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  document.getElementById('imf-gmaps-link').href = _imovel.link_google_maps || gmapsUrl;

  if (_mapInstance) {
    _mapInstance.setView([lat, lng], 13);
    return;
  }

  _mapInstance = L.map('imf-mapa').setView([lat, lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_mapInstance);

  const marker = L.marker([lat, lng]).addTo(_mapInstance);
  marker.bindPopup(`<b>${_imovel.denominacao}</b><br>${_imovel.municipio}/${_imovel.uf}<br>${parseFloat(_imovel.area_total_ha).toLocaleString('pt-BR')} ha`).openPopup();
}

// ── Proprietários modal ───────────────────────────────────────
function bindProprietarios() {
  document.getElementById('btn-add-proprietario').addEventListener('click', () => {
    _propClienteId = null;
    document.getElementById('prop-busca').value = '';
    document.getElementById('prop-resultados').innerHTML = '';
    document.getElementById('btn-confirmar-prop').disabled = true;
    document.getElementById('modal-add-prop').style.display = 'flex';
  });
  document.getElementById('btn-fechar-modal-prop').addEventListener('click', () => fecharModal('modal-add-prop'));
  document.getElementById('btn-cancelar-prop').addEventListener('click', () => fecharModal('modal-add-prop'));
  document.getElementById('modal-add-prop').addEventListener('click', e => {
    if (e.target.id === 'modal-add-prop') fecharModal('modal-add-prop');
  });

  document.getElementById('prop-busca').addEventListener('input', e => {
    clearTimeout(_propBuscaTimer);
    _propBuscaTimer = setTimeout(() => buscarClientes(e.target.value), 350);
  });
  document.getElementById('btn-confirmar-prop').addEventListener('click', confirmarProp);
}

async function buscarClientes(busca) {
  if (!busca.trim()) { document.getElementById('prop-resultados').innerHTML = ''; return; }
  try {
    const data = await API.get('/api/clientes?busca=' + encodeURIComponent(busca) + '&por_pagina=8');
    const el = document.getElementById('prop-resultados');
    if (data.clientes.length === 0) {
      el.innerHTML = '<p style="color:var(--cinza-medio);font-size:.85rem;padding:8px">Nenhum cliente encontrado.</p>';
      return;
    }
    el.innerHTML = data.clientes.map(c => `
      <div class="cf-vincular-item" data-id="${c.id}">
        <div>${c.nome_completo}</div>
        <div class="cf-vincular-sub">${c.cpf || c.cnpj || ''} ${c.municipio ? '· ' + c.municipio : ''}</div>
      </div>`).join('');
    el.querySelectorAll('.cf-vincular-item').forEach(item => {
      item.addEventListener('click', () => {
        el.querySelectorAll('.cf-vincular-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        _propClienteId = item.dataset.id;
        document.getElementById('btn-confirmar-prop').disabled = false;
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function confirmarProp() {
  if (!_propClienteId) return;
  const btn = document.getElementById('btn-confirmar-prop');
  btn.disabled = true;
  try {
    await API.post(`/api/imoveis/${imovelId}/proprietarios`, {
      cliente_id: _propClienteId,
      tipo_vinculo: document.getElementById('prop-tipo').value,
      percentual_participacao: parseFloat(document.getElementById('prop-percentual').value) || 100,
    });
    fecharModal('modal-add-prop');
    _imovel = await API.get('/api/imoveis/' + imovelId);
    renderProprietarios();
  } catch (err) {
    alert(err.message || 'Erro ao vincular proprietário.');
    btn.disabled = false;
  }
}

// ── Utils ─────────────────────────────────────────────────────
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

function campo(label, val) {
  const vazio = val === null || val === undefined || val === '';
  return `<div class="cf-field">
    <div class="cf-field-label">${label}</div>
    <div class="cf-field-value${vazio ? ' empty' : ''}">${vazio ? '—' : val}</div>
  </div>`;
}
