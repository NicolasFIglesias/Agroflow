/* ── Ficha do Imóvel ──────────────────────────────────────── */
verificarAutenticacao();
initSidebar();

const _id = new URLSearchParams(location.search).get('id');
if (!_id) location.href = '/pages/imoveis.html';

let _imovel = null;
let _mapa   = null;
let _marker = null;

(async () => {
  try {
    _imovel = await API.get(`/api/imoveis/${_id}`);
    renderHeader();
    renderDados();
    renderRegistro();
    renderCCIR();
    bindEventos();
    ativarAba('dados');
  } catch {
    alert('Erro ao carregar imóvel.');
    location.href = '/pages/imoveis.html';
  }
})();

function renderHeader() {
  const i = _imovel;
  document.getElementById('ficha-nome').textContent = i.denominacao;
  document.title = i.denominacao + ' — AgriFlow';
  const area = parseFloat(i.area_total_ha).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const CCIR = { em_dia: '✅ CCIR', vencido: '⚠️ CCIR Vencido', em_renovacao: '🔄 CCIR Renovação' };
  const CAR  = { ativo: '✅ CAR', pendente_analise: '⏳ CAR Pendente', cancelado: '❌ CAR', suspenso: '⚠️ CAR Suspenso' };
  const partes = [
    `${area} ha`,
    `${i.municipio}/${i.uf}`,
    i.matricula ? `Mat. ${i.matricula}` : null,
    i.situacao_ccir ? CCIR[i.situacao_ccir] : null,
    i.situacao_car  ? CAR[i.situacao_car]   : null,
  ].filter(Boolean);
  document.getElementById('ficha-meta').innerHTML = partes.map(p => `<span>${p}</span>`).join('');
}

function renderDados() {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const i = _imovel;
  set('i-denominacao', i.denominacao);
  set('i-municipio',   i.municipio);
  set('i-uf',          i.uf);
  set('i-area',        i.area_total_ha);
  set('i-tipo',        i.tipo_imovel);
  set('i-atividade',   i.atividade_principal);
  set('i-bioma',       i.bioma);
  set('i-localizacao', i.localizacao);
}

function renderRegistro() {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const i = _imovel;
  set('i-matricula',     i.matricula);
  set('i-cartorio',      i.cartorio_registro);
  set('i-livro',         i.livro_folha);
  set('i-data-registro', i.data_registro?.slice(0, 10));
  set('i-nirf',          i.nirf);
  set('i-sit-matricula', i.situacao_matricula);
  set('i-obs-matricula', i.obs_matricula);
}

function renderCCIR() {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const i = _imovel;
  set('i-num-ccir',  i.numero_ccir);
  set('i-sit-ccir',  i.situacao_ccir);
  set('i-venc-ccir', i.vencimento_ccir?.slice(0, 10));
  set('i-num-itr',   i.numero_itr);
  set('i-sit-itr',   i.situacao_itr);
  set('i-ano-itr',   i.ano_exercicio_itr);
  set('i-pag-itr',   i.data_pagamento_itr?.slice(0, 10));
  set('i-insc-car',  i.inscricao_car);
  set('i-sit-car',   i.situacao_car);
  set('i-data-car',  i.data_inscricao_car?.slice(0, 10));
}

/* ── Abas ─────────────────────────────────────────────────── */
function ativarAba(nome) {
  document.querySelectorAll('.ficha-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nome));
  document.querySelectorAll('.ficha-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${nome}`)?.classList.add('active');
  if (nome === 'proprietarios') carregarProprietarios();
  if (nome === 'localizacao')   initMapa();
}

/* ── Proprietários ────────────────────────────────────────── */
async function carregarProprietarios() {
  const el = document.getElementById('lista-proprietarios');
  const props = _imovel.proprietarios || [];
  if (!props.length) { el.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Nenhum proprietário vinculado.</div>'; return; }
  const TIPO = { proprietario:'Proprietário', posseiro:'Posseiro', arrendatario:'Arrendatário', comodatario:'Comodatário', outro:'Outro' };
  el.innerHTML = props.map(p => `
    <div class="prop-row">
      <div class="ficha-avatar" style="width:36px;height:36px;font-size:.8rem">
        ${(p.nome_completo||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
      </div>
      <div style="flex:1">
        <div class="prop-nome" onclick="window.location.href='/pages/cliente-ficha.html?id=${p.id}'" style="cursor:pointer;color:var(--md-primary)">${_esc(p.nome_completo)}</div>
        <div class="prop-badge">${TIPO[p.tipo_vinculo] || p.tipo_vinculo} · ${p.percentual_participacao}%</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="desvincularProp('${p.vinculo_id}')">Desvincular</button>
    </div>`).join('');
}

async function desvincularProp(vinculoId) {
  if (!confirm('Desvincular este proprietário?')) return;
  try {
    await API.delete(`/api/imoveis/${_id}/proprietarios/${vinculoId}`);
    _imovel = await API.get(`/api/imoveis/${_id}`);
    carregarProprietarios();
  } catch { alert('Erro.'); }
}

/* ── Mapa Leaflet ─────────────────────────────────────────── */
function initMapa() {
  if (_mapa) { _mapa.invalidateSize(); return; }
  const lat = _imovel.latitude  || -15.8;
  const lng = _imovel.longitude || -52.0;
  _mapa = L.map('mapa-imovel').setView([lat, lng], _imovel.latitude ? 12 : 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 18
  }).addTo(_mapa);
  if (_imovel.latitude && _imovel.longitude) {
    _marker = L.marker([lat, lng]).addTo(_mapa).bindPopup(_imovel.denominacao).openPopup();
  }
  document.getElementById('i-lat').value = _imovel.latitude  || '';
  document.getElementById('i-lng').value = _imovel.longitude || '';
  document.getElementById('i-gmaps').value = _imovel.link_google_maps || '';
}

function atualizarMapa() {
  const lat = parseFloat(document.getElementById('i-lat').value);
  const lng = parseFloat(document.getElementById('i-lng').value);
  if (!isNaN(lat) && !isNaN(lng)) {
    if (!_mapa) { initMapa(); return; }
    _mapa.setView([lat, lng], 12);
    if (_marker) _marker.remove();
    _marker = L.marker([lat, lng]).addTo(_mapa).bindPopup(_imovel.denominacao).openPopup();
  }
}

/* ── Salvar ───────────────────────────────────────────────── */
async function salvarDadosPrincipal() {
  const g = id => document.getElementById(id)?.value;
  const body = {
    denominacao: g('i-denominacao').trim(),
    municipio:   g('i-municipio').trim(),
    uf:          g('i-uf'),
    area_total_ha: parseFloat(g('i-area')) || undefined,
    tipo_imovel:  g('i-tipo') || undefined,
    atividade_principal: g('i-atividade') || undefined,
    bioma: g('i-bioma') || undefined,
    localizacao: g('i-localizacao') || undefined,
  };
  if (!body.denominacao || !body.municipio || !body.uf) { alert('Denominação, município e UF são obrigatórios.'); return; }
  const btn = document.getElementById('btn-salvar-dados');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try { await API.put(`/api/imoveis/${_id}`, body); _imovel = { ..._imovel, ...body }; renderHeader(); alert('Salvo!'); }
  catch (err) { alert(err.message || 'Erro.'); }
  finally { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
}

async function salvarRegistro() {
  const g = id => document.getElementById(id)?.value;
  const body = {
    matricula: g('i-matricula')||undefined, cartorio_registro: g('i-cartorio')||undefined,
    livro_folha: g('i-livro')||undefined, data_registro: g('i-data-registro')||undefined,
    nirf: g('i-nirf')||undefined, situacao_matricula: g('i-sit-matricula')||undefined,
    obs_matricula: g('i-obs-matricula')||undefined,
  };
  try { await API.put(`/api/imoveis/${_id}`, body); alert('Registro salvo!'); }
  catch (err) { alert(err.message || 'Erro.'); }
}

async function salvarCCIR() {
  const g = id => document.getElementById(id)?.value;
  const body = {
    numero_ccir: g('i-num-ccir')||undefined, situacao_ccir: g('i-sit-ccir')||undefined,
    vencimento_ccir: g('i-venc-ccir')||undefined, numero_itr: g('i-num-itr')||undefined,
    situacao_itr: g('i-sit-itr')||undefined, ano_exercicio_itr: g('i-ano-itr')||undefined,
    data_pagamento_itr: g('i-pag-itr')||undefined, inscricao_car: g('i-insc-car')||undefined,
    situacao_car: g('i-sit-car')||undefined, data_inscricao_car: g('i-data-car')||undefined,
  };
  try { await API.put(`/api/imoveis/${_id}`, body); renderHeader(); alert('CCIR/ITR/CAR salvo!'); }
  catch (err) { alert(err.message || 'Erro.'); }
}

async function salvarLocalizacao() {
  const lat = document.getElementById('i-lat').value;
  const lng = document.getElementById('i-lng').value;
  const body = {
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    link_google_maps: document.getElementById('i-gmaps').value || undefined,
  };
  try { await API.put(`/api/imoveis/${_id}`, body); alert('Coordenadas salvas!'); }
  catch (err) { alert(err.message || 'Erro.'); }
}

/* ── Vincular proprietário ────────────────────────────────── */
let _buscaTimer = null;

function bindEventos() {
  document.querySelectorAll('.ficha-tab').forEach(t =>
    t.addEventListener('click', () => ativarAba(t.dataset.tab)));

  document.getElementById('btn-salvar-dados')?.addEventListener('click', salvarDadosPrincipal);
  document.getElementById('btn-salvar-registro')?.addEventListener('click', salvarRegistro);
  document.getElementById('btn-salvar-ccir')?.addEventListener('click', salvarCCIR);
  document.getElementById('btn-salvar-loc')?.addEventListener('click', salvarLocalizacao);
  document.getElementById('btn-atualizar-mapa')?.addEventListener('click', atualizarMapa);

  document.getElementById('btn-abrir-gmaps')?.addEventListener('click', () => {
    const url = document.getElementById('i-gmaps').value ||
      (_imovel.latitude && _imovel.longitude
        ? `https://maps.google.com/?q=${_imovel.latitude},${_imovel.longitude}`
        : null);
    if (url) window.open(url, '_blank');
    else alert('Preencha o link do Google Maps ou as coordenadas.');
  });

  // Modal vincular proprietário
  document.getElementById('btn-vincular-prop')?.addEventListener('click', () =>
    document.getElementById('modal-prop').classList.add('open'));
  document.getElementById('btn-fechar-prop')?.addEventListener('click', () =>
    document.getElementById('modal-prop').classList.remove('open'));
  document.getElementById('btn-cancelar-prop')?.addEventListener('click', () =>
    document.getElementById('modal-prop').classList.remove('open'));

  document.getElementById('prop-busca')?.addEventListener('input', e => {
    clearTimeout(_buscaTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { document.getElementById('prop-resultados').innerHTML = ''; return; }
    _buscaTimer = setTimeout(async () => {
      try {
        const data = await API.get(`/api/clientes?busca=${encodeURIComponent(q)}&por_pagina=5`);
        const el = document.getElementById('prop-resultados');
        el.innerHTML = data.clientes.map(c => `
          <div style="padding:8px 12px;border:1px solid var(--md-outline-variant);border-radius:8px;cursor:pointer;margin-bottom:4px;font-size:.875rem"
               onclick="selecionarProp('${c.id}','${_esc(c.nome_completo)}')">
            ${_esc(c.nome_completo)} ${c.cpf ? `· ${c.cpf}` : ''}
          </div>`).join('') || '<div class="text-muted" style="font-size:.8rem">Nenhum resultado.</div>';
      } catch {}
    }, 300);
  });

  document.getElementById('btn-salvar-prop')?.addEventListener('click', async () => {
    const clienteId = document.getElementById('prop-cliente-id').value;
    if (!clienteId) { alert('Selecione um cliente.'); return; }
    const body = {
      cliente_id: clienteId,
      percentual_participacao: parseFloat(document.getElementById('prop-perc').value) || 100,
      tipo_vinculo: document.getElementById('prop-tipo').value || 'proprietario',
    };
    try {
      await API.post(`/api/imoveis/${_id}/proprietarios`, body);
      document.getElementById('modal-prop').classList.remove('open');
      _imovel = await API.get(`/api/imoveis/${_id}`);
      carregarProprietarios();
      document.getElementById('prop-cliente-id').value = '';
      document.getElementById('prop-busca').value = '';
      document.getElementById('prop-resultados').innerHTML = '';
      document.getElementById('prop-selecionado').style.display = 'none';
    } catch (err) { alert(err.message || 'Erro ao vincular.'); }
  });
}

function selecionarProp(id, nome) {
  document.getElementById('prop-cliente-id').value = id;
  document.getElementById('prop-resultados').innerHTML = '';
  document.getElementById('prop-busca').value = nome;
  const el = document.getElementById('prop-selecionado');
  el.textContent = '✓ ' + nome;
  el.style.display = '';
}

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
