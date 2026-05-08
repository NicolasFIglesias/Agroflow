/* ── Novo Contrato — wizard multi-passo ──────────────────── */
verificarAutenticacao();
initSidebar();

const TIPOS = {
  arrendamento:    { label:'Arrendamento Rural',  icon:'📄', prefixo:'ARR', parte1:'Arrendador',  parte2:'Arrendatário' },
  compra_venda:    { label:'Compra e Venda',       icon:'🏠', prefixo:'CV',  parte1:'Vendedor',    parte2:'Comprador' },
  comodato:        { label:'Comodato',             icon:'🤝', prefixo:'COM', parte1:'Comodante',   parte2:'Comodatário' },
  permuta:         { label:'Permuta',              icon:'🔄', prefixo:'PER', parte1:'Parte A',     parte2:'Parte B' },
  aluguel:         { label:'Aluguel / Locação',    icon:'🏢', prefixo:'ALG', parte1:'Locador',     parte2:'Locatário' },
  recibo:          { label:'Recibo',               icon:'🧾', prefixo:'REC', parte1:'Recebedor',   parte2:'Pagador' },
  nota_promissoria:{ label:'Nota Promissória',     icon:'📝', prefixo:'NP',  parte1:'Emitente',    parte2:'Beneficiário' },
};

let _step = 0;
let _tipo = null;
let _modeloId = null;
let _modelos  = [];
let _form     = {};
let _numero   = '';
let _rascTimer= null;
let _contratoGerado = null;
let _editandoId = null; // ID do contrato sendo editado

const _params = new URLSearchParams(location.search);

(async () => {
  // Modo editar: ?editar=CONTRACT_ID
  const editarId = _params.get('editar');
  if (editarId) {
    try {
      const ct  = await API.get(`/api/contratos/${editarId}`);
      _editandoId = ct.id;
      _tipo       = ct.tipo_contrato;
      _numero     = ct.numero;
      _form       = ct.dados_formulario || {};
      _modeloId   = ct.modelo_id;
      document.getElementById('ct-wizard-titulo').textContent = `Editando — ${ct.numero}`;
      goStep(2);
      return;
    } catch (err) {
      alert('Erro ao carregar contrato: ' + err.message);
      window.location.href = '/pages/contratos.html';
      return;
    }
  }

  // Modo duplicar: ?duplicar=CONTRACT_ID
  const dupId = _params.get('duplicar');
  if (dupId) {
    try {
      const dup = await API.get(`/api/contratos/${dupId}`);
      _tipo  = dup.tipo_contrato;
      _form  = dup.dados_formulario || {};
      _modeloId = dup.modelo_id;
      await _carregarNumero();
      goStep(2);
      return;
    } catch {}
  }
  goStep(0);
})();

// ── Navegação ──────────────────────────────────────────────
function goStep(n) {
  _step = n;
  renderStepIndicator();
  renderContent();
  const btnV = document.getElementById('btn-ct-voltar');
  const btnA = document.getElementById('btn-ct-avancar');
  btnV.style.display = (n > 0 && n < 4) ? '' : 'none';
  if (n === 0) { btnA.textContent = 'Avançar →'; btnA.onclick = avancarTipo;    btnA.style.display = ''; }
  else if (n === 1) { btnA.textContent = 'Usar este modelo →'; btnA.onclick = avancarModelo; btnA.style.display = ''; }
  else if (n === 2) { btnA.textContent = 'Revisar →';          btnA.onclick = avancarForm;   btnA.style.display = ''; }
  else if (n === 3) { btnA.textContent = _editandoId ? 'Salvar alterações →' : 'Gerar contrato →'; btnA.onclick = gerarContrato; btnA.style.display = ''; }
  else              { btnA.style.display = 'none'; }
  btnV.onclick = () => goStep(Math.max(0, _step - 1));
}

function renderStepIndicator() {
  const LABELS = ['Tipo', 'Modelo', 'Preencher', 'Revisar', 'Concluído'];
  document.getElementById('ct-steps').innerHTML = LABELS.map((l, i) => `
    <div class="ct-step ${i < _step ? 'done' : i === _step ? 'active' : ''}">
      <div class="ct-step-num">${i < _step ? '✓' : i + 1}</div>
      <span class="ct-step-label">${l}</span>
    </div>
    ${i < LABELS.length - 1 ? '<div class="ct-step-line"></div>' : ''}
  `).join('');
}

function renderContent() {
  if      (_step === 0) renderTipo();
  else if (_step === 1) renderModelo();
  else if (_step === 2) renderForm();
  else if (_step === 3) renderRevisao();
  else if (_step === 4) renderSucesso();
}

// ── Step 0 ─────────────────────────────────────────────────
function renderTipo() {
  document.getElementById('ct-wizard-titulo').textContent = 'Novo contrato';
  document.getElementById('ct-wizard-content').innerHTML = `
    <h3 style="margin-bottom:20px;color:var(--md-on-surface-variant)">Selecione o tipo de documento</h3>
    <div class="ct-tipo-grid">
      ${Object.entries(TIPOS).map(([k, v]) => `
        <div class="ct-tipo-card${_tipo===k?' active':''}" data-tipo="${k}">
          <div class="ct-tipo-icon">${v.icon}</div>
          <div class="ct-tipo-label">${v.label}</div>
        </div>`).join('')}
    </div>`;
  document.querySelectorAll('.ct-tipo-card').forEach(c =>
    c.addEventListener('click', () => {
      document.querySelectorAll('.ct-tipo-card').forEach(x => x.classList.remove('active'));
      c.classList.add('active'); _tipo = c.dataset.tipo;
    })
  );
}

async function avancarTipo() {
  if (!_tipo) { alert('Selecione um tipo.'); return; }
  try {
    const rasc = await API.get(`/api/contratos/rascunho?tipo=${_tipo}`);
    if (rasc?.dados && Object.keys(rasc.dados).length > 0) {
      if (confirm(`Há um rascunho salvo de ${TIPOS[_tipo].label}. Continuar de onde parou?`)) _form = rasc.dados;
    }
  } catch {}
  try { _modelos = await API.get(`/api/modelos?tipo=${_tipo}`); } catch { _modelos = []; }
  if (_modelos.length <= 1) { _modeloId = _modelos[0]?.id || null; await _carregarNumero(); goStep(2); }
  else goStep(1);
}

// ── Step 1 ─────────────────────────────────────────────────
function renderModelo() {
  document.getElementById('ct-wizard-titulo').textContent = `${TIPOS[_tipo]?.label} — Modelo`;
  document.getElementById('ct-wizard-content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;max-width:600px">
      ${_modelos.map(m => `
        <div class="ct-form-section" style="cursor:pointer;${_modeloId===m.id?'border:2px solid var(--md-primary)':''}" data-modelo="${m.id}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-weight:700">${m.is_padrao?'★ ':''}${_esc(m.nome)}</div>
              <div style="font-size:.78rem;color:var(--md-on-surface-variant);margin-top:4px">
                ${Array.isArray(m.tags_detectadas)?m.tags_detectadas.length:0} tags · ${m.is_sistema?'Padrão do sistema':new Date(m.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            ${_modeloId===m.id?'<span style="color:var(--md-primary);font-weight:700">✓</span>':''}
          </div>
        </div>`).join('')}
    </div>`;
  document.querySelectorAll('[data-modelo]').forEach(el =>
    el.addEventListener('click', () => { _modeloId = el.dataset.modelo; renderContent(); })
  );
}

async function avancarModelo() {
  if (!_modeloId && _modelos.length > 0) _modeloId = _modelos[0].id;
  await _carregarNumero();
  goStep(2);
}

async function _carregarNumero() {
  if (_numero) return;
  try { _numero = (await API.get(`/api/contratos/proximo-numero?tipo=${_tipo}`)).numero; }
  catch { _numero = `${TIPOS[_tipo]?.prefixo}-${new Date().getFullYear()}-001`; }
}

// ── Step 2 ─────────────────────────────────────────────────
function renderForm() {
  const cfg = TIPOS[_tipo];
  document.getElementById('ct-wizard-titulo').textContent = `Novo ${cfg.label}`;
  document.getElementById('ct-wizard-content').innerHTML = _buildFormHTML(cfg);
  _bindFormEventos();
  _preencherForm();
  clearInterval(_rascTimer);
  _rascTimer = setInterval(_autoSave, 30000);
}

function _buildFormHTML(cfg) {
  return `
  <div class="ct-form-section">
    <div class="ct-form-section-title">Identificação</div>
    <div class="form-group"><label class="form-label">Número do contrato</label>
      <input type="text" id="f-numero" class="form-input" value="${_esc(_numero)}"></div>
  </div>
  ${_secaoParte(cfg.parte1, 'c1')}
  ${_secaoParte2(cfg.parte2)}
  ${_tipo !== 'recibo' && _tipo !== 'nota_promissoria' ? _secaoImovel() : ''}
  ${_secaoCondicoes()}
  ${_secaoAssinatura()}`;
}

function _secaoParte(label, key) {
  return `
  <div class="ct-form-section">
    <div class="ct-form-section-title">${label}</div>
    <div class="form-group">
      <label class="form-label">Buscar cliente cadastrado</label>
      <div class="ct-search-wrap">
        <input type="text" id="busca-${key}" class="form-input" placeholder="Nome ou CPF/CNPJ..." autocomplete="off">
        <div class="ct-search-results" id="res-${key}"></div>
      </div>
      <div id="chip-${key}" style="display:none"></div>
      <input type="hidden" id="f-${key}-id">
    </div>
    <div class="ct-form-grid">
      <div class="form-group ct-span2"><label class="form-label">Nome completo *</label><input type="text" id="f-${key}-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">CPF / CNPJ</label><input type="text" id="f-${key}-doc" class="form-input"></div>
      <div class="form-group ct-span2"><label class="form-label">Qualificação</label><textarea id="f-${key}-qual" class="form-input" rows="3"></textarea></div>
    </div>
  </div>`;
}

function _secaoParte2(label) {
  return `
  <div class="ct-form-section">
    <div class="ct-form-section-title">${label}</div>
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-c2-buscar">Cliente cadastrado</button>
      <button type="button" class="btn btn-outline btn-sm" id="btn-c2-manual">Preencher manualmente</button>
    </div>
    <div id="c2-busca-area" style="display:none" class="form-group">
      <div class="ct-search-wrap">
        <input type="text" id="busca-c2" class="form-input" placeholder="Nome ou CPF/CNPJ..." autocomplete="off">
        <div class="ct-search-results" id="res-c2"></div>
      </div>
      <div id="chip-c2" style="display:none"></div>
      <input type="hidden" id="f-c2-id">
    </div>
    <div class="ct-form-grid" id="campos-c2">
      <div class="form-group ct-span2"><label class="form-label">Nome completo *</label><input type="text" id="f-c2-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">CPF / CNPJ</label><input type="text" id="f-c2-doc" class="form-input"></div>
    </div>
  </div>`;
}

function _secaoImovel() {
  return `
  <div class="ct-form-section">
    <div class="ct-form-section-title">Imóvel</div>
    <div class="form-group">
      <div class="ct-search-wrap">
        <input type="text" id="busca-im" class="form-input" placeholder="Denominação ou município..." autocomplete="off">
        <div class="ct-search-results" id="res-im"></div>
      </div>
      <div id="chip-im" style="display:none"></div>
      <input type="hidden" id="f-im-id">
    </div>
    <div class="ct-form-grid">
      <div class="form-group ct-span2"><label class="form-label">Denominação</label><input type="text" id="f-im-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">Área total (ha)</label><input type="text" id="f-im-area" class="form-input"></div>
      <div class="form-group"><label class="form-label">Município / UF</label><input type="text" id="f-im-mun" class="form-input"></div>
    </div>
  </div>`;
}

function _secaoCondicoes() {
  const t = _tipo;
  if (t === 'arrendamento') return `
  <div class="ct-form-section"><div class="ct-form-section-title">Condições do arrendamento</div>
  <div class="ct-form-grid">
    <div class="form-group"><label class="form-label">Área arrendada (ha)</label><input type="number" id="f-area-arrendada" class="form-input" step="0.0001"></div>
    <div class="form-group"><label class="form-label">Finalidade</label><select id="f-finalidade" class="form-select"><option value="">—</option><option>Agrícola</option><option>Pecuária</option><option>Mista</option></select></div>
    <div class="form-group"><label class="form-label">Valor (R$)</label><input type="number" id="f-valor" class="form-input" step="0.01"></div>
    <div class="form-group"><label class="form-label">Valor por extenso</label><input type="text" id="f-valor-extenso" class="form-input"></div>
    <div class="form-group"><label class="form-label">Forma de pagamento</label><select id="f-forma-pag" class="form-select"><option value="">—</option><option>Dinheiro</option><option>PIX</option><option>Em produto</option><option>% da produção</option></select></div>
    <div class="form-group"><label class="form-label">Data de pagamento</label><input type="text" id="f-data-pag" class="form-input" placeholder="todo dia 10 de novembro"></div>
    <div class="form-group"><label class="form-label">Data de início</label><input type="date" id="f-inicio" class="form-input"></div>
    <div class="form-group"><label class="form-label">Data de término</label><input type="date" id="f-termino" class="form-input"></div>
    <div class="form-group ct-span2"><label class="form-label">Prazo por extenso</label><input type="text" id="f-prazo-extenso" class="form-input" placeholder="Auto-calculado"></div>
  </div></div>`;

  if (t === 'recibo') return `
  <div class="ct-form-section"><div class="ct-form-section-title">Dados do recibo</div>
  <div class="ct-form-grid">
    <div class="form-group"><label class="form-label">Valor (R$) *</label><input type="number" id="f-valor" class="form-input" step="0.01"></div>
    <div class="form-group"><label class="form-label">Valor por extenso</label><input type="text" id="f-valor-extenso" class="form-input"></div>
    <div class="form-group ct-span2"><label class="form-label">Referente a *</label><input type="text" id="f-referente-a" class="form-input" placeholder="arrendamento ref. safra 2025/2026"></div>
    <div class="form-group"><label class="form-label">Forma de pagamento</label><select id="f-forma-pag" class="form-select"><option>Dinheiro</option><option>PIX</option><option>TED</option><option>Cheque</option></select></div>
    <div class="form-group"><label class="form-label">Data do recebimento</label><input type="date" id="f-data-pag" class="form-input"></div>
  </div></div>`;

  if (t === 'nota_promissoria') return `
  <div class="ct-form-section"><div class="ct-form-section-title">Dados da nota promissória</div>
  <div class="ct-form-grid">
    <div class="form-group"><label class="form-label">Valor (R$) *</label><input type="number" id="f-valor" class="form-input" step="0.01"></div>
    <div class="form-group"><label class="form-label">Valor por extenso</label><input type="text" id="f-valor-extenso" class="form-input"></div>
    <div class="form-group"><label class="form-label">Data de emissão</label><input type="date" id="f-inicio" class="form-input"></div>
    <div class="form-group"><label class="form-label">Data de vencimento</label><input type="date" id="f-termino" class="form-input"></div>
    <div class="form-group"><label class="form-label">Local de pagamento</label><input type="text" id="f-local-pag" class="form-input" placeholder="BB Ag. 1234-5, Rondonópolis"></div>
    <div class="form-group"><label class="form-label">Referente a</label><input type="text" id="f-referente-a" class="form-input"></div>
  </div></div>`;

  // Demais tipos (compra_venda, comodato, permuta, aluguel)
  return `
  <div class="ct-form-section"><div class="ct-form-section-title">Condições</div>
  <div class="ct-form-grid">
    <div class="form-group"><label class="form-label">Valor (R$)</label><input type="number" id="f-valor" class="form-input" step="0.01"></div>
    <div class="form-group"><label class="form-label">Valor por extenso</label><input type="text" id="f-valor-extenso" class="form-input"></div>
    <div class="form-group"><label class="form-label">Forma de pagamento</label><input type="text" id="f-forma-pag" class="form-input"></div>
    <div class="form-group"><label class="form-label">Data de início</label><input type="date" id="f-inicio" class="form-input"></div>
    <div class="form-group"><label class="form-label">Data de término</label><input type="date" id="f-termino" class="form-input"></div>
    <div class="form-group ct-span2"><label class="form-label">Prazo por extenso</label><input type="text" id="f-prazo-extenso" class="form-input"></div>
  </div></div>`;
}

function _secaoAssinatura() {
  return `
  <div class="ct-form-section"><div class="ct-form-section-title">Assinatura e foro</div>
  <div class="ct-form-grid">
    <div class="form-group"><label class="form-label">Data de assinatura</label><input type="date" id="f-data-assin" class="form-input"></div>
    <div class="form-group"><label class="form-label">Local</label><input type="text" id="f-local-assin" class="form-input" placeholder="Rondonópolis - MT"></div>
    <div class="form-group ct-span2"><label class="form-label">Foro da comarca</label><input type="text" id="f-foro" class="form-input" placeholder="Rondonópolis"></div>
    <div class="form-group"><label class="form-label">Testemunha 1 — Nome</label><input type="text" id="f-test1-nome" class="form-input"></div>
    <div class="form-group"><label class="form-label">Testemunha 1 — CPF</label><input type="text" id="f-test1-cpf" class="form-input"></div>
    <div class="form-group"><label class="form-label">Testemunha 2 — Nome</label><input type="text" id="f-test2-nome" class="form-input"></div>
    <div class="form-group"><label class="form-label">Testemunha 2 — CPF</label><input type="text" id="f-test2-cpf" class="form-input"></div>
    <div class="form-group ct-span2"><label class="form-label">Cláusulas adicionais</label><textarea id="f-clausulas" class="form-input" rows="3"></textarea></div>
  </div></div>`;
}

// Campos que só aceitam dígitos
function _bindNumerico(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
}

function _bindFormEventos() {
  _bindSearch('busca-c1', 'res-c1', 'chip-c1', 'f-c1-id', _preencherC1, false);
  document.getElementById('btn-c2-buscar')?.addEventListener('click', () => {
    document.getElementById('c2-busca-area').style.display = '';
    document.getElementById('campos-c2').style.display = 'none';
  });
  document.getElementById('btn-c2-manual')?.addEventListener('click', () => {
    document.getElementById('c2-busca-area').style.display = 'none';
    document.getElementById('campos-c2').style.display = '';
  });
  _bindSearch('busca-c2', 'res-c2', 'chip-c2', 'f-c2-id', _preencherC2, false);
  _bindSearch('busca-im', 'res-im', 'chip-im', 'f-im-id', _preencherIM, true);

  // Auto-cálculos
  document.getElementById('f-valor')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) { const el = document.getElementById('f-valor-extenso'); if (el) el.value = _valExtenso(v); }
  });
  const calcPrazo = () => {
    const ini = document.getElementById('f-inicio')?.value;
    const fim = document.getElementById('f-termino')?.value;
    const el  = document.getElementById('f-prazo-extenso');
    if (el && ini && fim) el.value = _prazoExtenso(ini, fim);
  };
  document.getElementById('f-inicio')?.addEventListener('change', calcPrazo);
  document.getElementById('f-termino')?.addEventListener('change', calcPrazo);

  // Campos de CPF/CNPJ — apenas números
  ['f-c1-doc','f-c2-doc','f-test1-cpf','f-test2-cpf'].forEach(_bindNumerico);
}

const _timers = {};
function _bindSearch(inpId, resId, chipId, hidId, onSel, isImovel) {
  const el = document.getElementById(inpId);
  if (!el) return;
  el.addEventListener('input', () => {
    clearTimeout(_timers[inpId]);
    const q = el.value.trim();
    const res = document.getElementById(resId);
    if (q.length < 2) { res.classList.remove('open'); return; }
    _timers[inpId] = setTimeout(async () => {
      try {
        const path = isImovel ? `/api/imoveis?busca=${encodeURIComponent(q)}&por_pagina=5` : `/api/clientes?busca=${encodeURIComponent(q)}&por_pagina=5`;
        const data = await API.get(path);
        const items = isImovel ? (data.imoveis || []) : (data.clientes || []);
        if (!items.length) { res.classList.remove('open'); return; }
        res.innerHTML = items.map(it => `
          <div class="ct-search-item" data-json='${JSON.stringify(it).replace(/'/g,"&#39;")}'>
            <div class="ct-search-item-nome">${_esc(isImovel ? it.denominacao : it.nome_completo)}</div>
            <div class="ct-search-item-sub">${isImovel ? `${parseFloat(it.area_total_ha).toLocaleString('pt-BR',{minimumFractionDigits:2})} ha · ${it.municipio}/${it.uf}` : [it.cpf||it.cnpj||'', it.municipio||''].filter(Boolean).join(' · ')}</div>
          </div>`).join('');
        res.classList.add('open');
        res.querySelectorAll('.ct-search-item').forEach(item =>
          item.addEventListener('click', () => {
            const parsed = JSON.parse(item.dataset.json);
            el.value = isImovel ? parsed.denominacao : parsed.nome_completo;
            document.getElementById(hidId).value = parsed.id;
            res.classList.remove('open');
            const chip = document.getElementById(chipId);
            if (chip) { chip.innerHTML = `<div class="ct-selected-chip">${_esc(isImovel ? parsed.denominacao : parsed.nome_completo)} <button onclick="this.closest('.ct-selected-chip').parentElement.style.display='none';document.getElementById('${hidId}').value=''">×</button></div>`; chip.style.display = ''; }
            onSel(parsed);
          })
        );
      } catch {}
    }, 300);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.ct-search-wrap')) document.getElementById(resId)?.classList.remove('open'); }, true);
}

async function _preencherC1(c) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) { el.value = v; el.classList.add('ct-auto-input'); } };
  set('f-c1-nome', c.nome_completo);
  set('f-c1-doc',  c.cpf || c.cnpj);
  try {
    const full = await API.get(`/api/clientes/${c.id}`);
    set('f-c1-qual', _buildQual(full));
    if (full.imoveis?.length === 1) {
      const im = full.imoveis[0];
      document.getElementById('busca-im').value = im.denominacao;
      document.getElementById('f-im-id').value  = im.id;
      _preencherIM(im);
    }
  } catch {}
}

async function _preencherC2(c) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) { el.value = v; el.classList.add('ct-auto-input'); } };
  set('f-c2-nome', c.nome_completo);
  set('f-c2-doc',  c.cpf || c.cnpj);
}

function _preencherIM(im) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) { el.value = v; el.classList.add('ct-auto-input'); } };
  set('f-im-nome', im.denominacao);
  set('f-im-area', im.area_total_ha ? parseFloat(im.area_total_ha).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '');
  set('f-im-mun',  im.municipio && im.uf ? `${im.municipio} - ${im.uf}` : im.municipio);
}

function _buildQual(c) {
  const p = [];
  p.push((c.nacionalidade||'brasileiro(a)').toLowerCase());
  const EC = {solteiro:'solteiro(a)',casado:'casado(a)',divorciado:'divorciado(a)',viuvo:'viúvo(a)',uniao_estavel:'em união estável'};
  if (EC[c.estado_civil]) p.push(EC[c.estado_civil]);
  if (c.profissao)  p.push(c.profissao.toLowerCase());
  if (c.rg)         p.push(`portador(a) do RG nº ${c.rg}`);
  if (c.cpf)        p.push(`inscrito(a) no CPF sob nº ${c.cpf}`);
  else if (c.cnpj)  p.push(`inscrita no CNPJ sob nº ${c.cnpj}`);
  const end = [c.logradouro, c.numero&&`nº ${c.numero}`, c.bairro, c.municipio&&c.uf&&`${c.municipio}-${c.uf}`, c.cep&&`CEP ${c.cep}`].filter(Boolean).join(', ');
  if (end) p.push(`residente e domiciliado(a) em ${end}`);
  return p.join(', ');
}

function _preencherForm() {
  const f = _form;
  const s = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
  s('f-numero', f.numero || _numero);
  s('f-c1-nome', f.parte1_nome); s('f-c1-doc', f.parte1_cpf); s('f-c1-qual', f.c1_qualificacao);
  s('f-c1-id', f.cliente1_id);
  s('f-c2-nome', f.parte2_nome); s('f-c2-doc', f.parte2_cpf);
  s('f-c2-id', f.cliente2_id);
  s('f-im-nome', f.imovel_nome); s('f-im-area', f.imovel_area); s('f-im-id', f.imovel_id);
  s('f-valor', f.valor); s('f-valor-extenso', f.valor_extenso);
  s('f-forma-pag', f.forma_pagamento); s('f-data-pag', f.data_pagamento);
  s('f-inicio', f.data_inicio); s('f-termino', f.data_termino); s('f-prazo-extenso', f.prazo_extenso);
  s('f-area-arrendada', f.area_arrendada); s('f-finalidade', f.finalidade);
  s('f-referente-a', f.referente_a); s('f-local-pag', f.local_pagamento);
  s('f-data-assin', f.data_assinatura); s('f-local-assin', f.local_assinatura); s('f-foro', f.foro);
  s('f-test1-nome', f.testemunha1_nome); s('f-test1-cpf', f.testemunha1_cpf);
  s('f-test2-nome', f.testemunha2_nome); s('f-test2-cpf', f.testemunha2_cpf);
  s('f-clausulas', f.clausulas_adicionais);
}

function _coletarForm() {
  const g = id => document.getElementById(id)?.value || '';
  return {
    numero: g('f-numero') || _numero,
    parte1_nome: g('f-c1-nome'), parte1_cpf: g('f-c1-doc'), c1_qualificacao: g('f-c1-qual'),
    cliente1_id: g('f-c1-id'),
    parte2_nome: g('f-c2-nome'), parte2_cpf: g('f-c2-doc'),
    cliente2_id: g('f-c2-id'),
    imovel_nome: g('f-im-nome'), imovel_area: g('f-im-area'), imovel_id: g('f-im-id'),
    valor: g('f-valor'), valor_extenso: g('f-valor-extenso'),
    forma_pagamento: g('f-forma-pag'), data_pagamento: g('f-data-pag'),
    data_inicio: g('f-inicio'), data_termino: g('f-termino'), prazo_extenso: g('f-prazo-extenso'),
    area_arrendada: g('f-area-arrendada'), finalidade: g('f-finalidade'),
    referente_a: g('f-referente-a'), local_pagamento: g('f-local-pag'),
    data_assinatura: g('f-data-assin'), local_assinatura: g('f-local-assin'), foro: g('f-foro'),
    testemunha1_nome: g('f-test1-nome'), testemunha1_cpf: g('f-test1-cpf'),
    testemunha2_nome: g('f-test2-nome'), testemunha2_cpf: g('f-test2-cpf'),
    clausulas_adicionais: g('f-clausulas'),
  };
}

async function _autoSave() {
  _form = _coletarForm();
  try {
    await API.post('/api/contratos/rascunho', { tipo_contrato: _tipo, dados: _form });
    const el = document.getElementById('ct-rascunho-info');
    if (el) { el.style.display = ''; document.getElementById('ct-rascunho-texto').textContent = `Rascunho salvo às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`; }
  } catch {}
}

function avancarForm() {
  _form = _coletarForm();
  _numero = _form.numero || _numero;
  if (!_form.parte1_nome) { alert('Preencha o nome da primeira parte.'); return; }
  clearInterval(_rascTimer);
  goStep(3);
}

// ── Step 3 ─────────────────────────────────────────────────
function renderRevisao() {
  const f = _form; const cfg = TIPOS[_tipo];
  document.getElementById('ct-wizard-titulo').textContent = `Revisão — ${cfg.label}`;
  const lin = (chave, val) => val ? `<div class="ct-revisao-linha"><span class="ct-revisao-chave">${chave}:</span><span class="ct-revisao-valor">${_esc(String(val))}</span></div>` : '';
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '';
  document.getElementById('ct-wizard-content').innerHTML = `
    <div style="max-width:760px">
      <div class="ct-revisao-bloco"><div class="ct-revisao-titulo">Identificação</div>
        ${lin('Número', _numero)}${lin('Tipo', cfg.label)}</div>
      <div class="ct-revisao-bloco"><div class="ct-revisao-titulo">Partes</div>
        ${lin(cfg.parte1, f.parte1_nome)}${lin(cfg.parte2, f.parte2_nome)}</div>
      ${f.imovel_nome ? `<div class="ct-revisao-bloco"><div class="ct-revisao-titulo">Imóvel</div>${lin('Denominação',f.imovel_nome)}${lin('Área',f.imovel_area && f.imovel_area+' ha')}</div>` : ''}
      ${f.valor ? `<div class="ct-revisao-bloco"><div class="ct-revisao-titulo">Condições</div>${lin('Valor','R$ '+parseFloat(f.valor).toLocaleString('pt-BR',{minimumFractionDigits:2}))}${lin('Por extenso',f.valor_extenso)}${lin('Início',fmtD(f.data_inicio))}${lin('Término',fmtD(f.data_termino))}${lin('Prazo',f.prazo_extenso)}</div>` : ''}
      <div class="ct-revisao-bloco"><div class="ct-revisao-titulo">Assinatura</div>
        ${lin('Data',fmtD(f.data_assinatura))}${lin('Local',f.local_assinatura)}${lin('Foro',f.foro)}
        ${lin('Testemunha 1',f.testemunha1_nome)}${lin('Testemunha 2',f.testemunha2_nome)}</div>
    </div>`;
}

async function gerarContrato() {
  const btn = document.getElementById('btn-ct-avancar');
  btn.disabled = true;
  btn.textContent = _editandoId ? 'Salvando...' : 'Gerando...';
  try {
    const dadosCompletos = { ..._form, numero: _numero };

    if (_editandoId) {
      // Modo edição: atualiza o contrato existente
      await API.put(`/api/contratos/${_editandoId}`, {
        dados_formulario: dadosCompletos,
        data_inicio:      _form.data_inicio     || null,
        data_termino:     _form.data_termino    || null,
        data_assinatura:  _form.data_assinatura || null,
        valor:            _form.valor           || null,
        parte1_nome:      _form.parte1_nome     || null,
        parte2_nome:      _form.parte2_nome     || null,
        imovel_nome:      _form.imovel_nome     || null,
      });
      _contratoGerado = await API.get(`/api/contratos/${_editandoId}`);
      _contratoGerado.modelo_disponivel = !!_modeloId;
    } else {
      // Modo criação
      _contratoGerado = await API.post('/api/contratos', {
        tipo_contrato:    _tipo,
        modelo_id:        _modeloId || undefined,
        cliente_id:       _form.cliente1_id || undefined,
        cliente2_id:      _form.cliente2_id || undefined,
        imovel_id:        _form.imovel_id   || undefined,
        dados_formulario: dadosCompletos,
        numero_custom:    _numero,
      });
    }
    clearInterval(_rascTimer);
    goStep(4);
  } catch (err) { alert('Erro ao gerar: ' + (err.message || 'Erro interno')); }
  finally { btn.disabled = false; btn.textContent = _editandoId ? 'Salvar alterações' : 'Gerar contrato →'; }
}

// ── Step 4 ─────────────────────────────────────────────────
function renderSucesso() {
  document.getElementById('ct-wizard-titulo').textContent = _editandoId ? 'Alterações salvas!' : 'Contrato gerado!';
  const id = _contratoGerado?.id;
  document.getElementById('ct-wizard-content').innerHTML = `
    <div class="ct-success">
      <div class="ct-success-icon">✅</div>
      <h2>Contrato gerado!</h2>
      <div class="ct-success-numero">${_esc(_numero)}</div>
      <p style="margin-top:6px">${TIPOS[_tipo]?.label}${_form.parte1_nome ? ' · ' + _esc(_form.parte1_nome) : ''}</p>
      ${_contratoGerado?.modelo_disponivel && id
        ? `<div class="ct-success-btns"><button class="btn btn-primary" onclick="_baixarDocxSucesso('${id}','${_esc(_numero)}')">📥 Baixar Word</button></div>`
        : '<p style="color:var(--md-error);margin-top:12px;font-size:.875rem">⚠️ Nenhum modelo .docx cadastrado. <a href="/pages/modelos-documentos.html" style="color:var(--md-primary)">Cadastrar modelo →</a></p>'}
      <div class="ct-success-btns" style="margin-top:20px">
        <a href="/pages/contratos.html" class="btn btn-secondary">Ver lista</a>
        <a href="/pages/contrato-novo.html" class="btn btn-outline">+ Outro contrato</a>
      </div>
    </div>`;
}

// ── Download com auth ──────────────────────────────────────
async function _baixarDocxSucesso(id, numero) {
  try {
    await API.download(`/api/contratos/${id}/download`, `${numero || 'contrato'}.docx`);
  } catch (err) { alert('Erro ao baixar: ' + err.message); }
}
window._baixarDocxSucesso = _baixarDocxSucesso;

// ── Helpers ────────────────────────────────────────────────
function _valExtenso(v) {
  const UNI=['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const DEC=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const CEN=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function n2e(n) {
    if (n<20) return UNI[n]; if (n<100) { const u=n%10; return DEC[Math.floor(n/10)]+(u?` e ${UNI[u]}`:``); }
    if (n<1000) { const c=Math.floor(n/100),r=n%100; return (n===100?'cem':CEN[c]+(r?` e ${n2e(r)}`:``)); }
    if (n<1000000) { const k=Math.floor(n/1000),r=n%1000; return (k===1?'mil':n2e(k)+' mil')+(r?` e ${n2e(r)}`:``);}
    return String(n);
  }
  const i=Math.floor(v); return n2e(i)+(i===1?' real':' reais');
}

function _prazoExtenso(ini, fim) {
  const a=new Date(ini+'T12:00:00'), b=new Date(fim+'T12:00:00');
  const m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());
  const UNI=['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze'];
  const ne=n=>UNI[n]||String(n);
  if (m>=12&&m%12===0) { const y=m/12; return `${y} (${ne(y)}) ${y===1?'ano':'anos'}`; }
  if (m>=1) return `${m} (${ne(m)}) ${m===1?'mês':'meses'}`;
  const d=Math.round((b-a)/86400000);
  return `${d} (${ne(d)}) dias`;
}

function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
