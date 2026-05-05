/* ── Modelos de Documentos ───────────────────────────────── */
verificarAutenticacao();
initSidebar();

const TIPO_LABEL = { arrendamento:'Arrendamento Rural', compra_venda:'Compra e Venda', comodato:'Comodato', permuta:'Permuta', aluguel:'Aluguel / Locação', recibo:'Recibo', nota_promissoria:'Nota Promissória' };
const TIPOS_ORDER = ['arrendamento','compra_venda','comodato','permuta','aluguel','recibo','nota_promissoria'];

let _modelos = [];
let _uploadStep = 1; // 1=form, 2=tags

carregarModelos();
bindEventos();

async function carregarModelos() {
  const el = document.getElementById('md-lista');
  el.innerHTML = '<div class="ct-loading">Carregando...</div>';
  try {
    const tipo = document.getElementById('md-filtro-tipo').value;
    const url  = '/api/modelos' + (tipo ? `?tipo=${tipo}` : '');
    _modelos = await API.get(url);

    if (!_modelos.length) {
      el.innerHTML = '<div class="ct-vazio" style="padding:40px;text-align:center;color:var(--md-on-surface-variant)">Nenhum modelo cadastrado.<br><small>Faça upload de um .docx para começar.</small></div>';
      return;
    }

    // Agrupar por tipo
    const grupos = {};
    TIPOS_ORDER.forEach(t => { grupos[t] = _modelos.filter(m => m.tipo_contrato === t); });
    el.innerHTML = Object.entries(grupos)
      .filter(([, ms]) => ms.length > 0)
      .map(([tipo, ms]) => `
        <div style="margin-bottom:24px">
          <div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--md-on-surface-variant);margin-bottom:10px">${TIPO_LABEL[tipo] || tipo}</div>
          ${ms.map(renderModelo).join('')}
        </div>`).join('');

    el.querySelectorAll('[data-md-action]').forEach(btn =>
      btn.addEventListener('click', () => handleAction(btn.dataset.mdAction, btn.dataset.mdId, btn.dataset.mdTipo))
    );
  } catch (err) {
    el.innerHTML = `<div class="ct-vazio">Erro: ${err.message}</div>`;
  }
}

function renderModelo(m) {
  const tags = Array.isArray(m.tags_detectadas) ? m.tags_detectadas : [];
  return `
  <div class="ct-form-section" style="margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-weight:700;font-size:.9rem">${m.is_padrao ? '★ ' : ''}${_esc(m.nome)}
          ${m.is_sistema ? '<span style="font-size:.7rem;background:var(--md-secondary-container);color:var(--md-on-secondary-container);padding:2px 8px;border-radius:100px;margin-left:6px">sistema</span>' : ''}
        </div>
        <div style="font-size:.78rem;color:var(--md-on-surface-variant);margin-top:4px">
          ${tags.length} tags · ${new Date(m.created_at).toLocaleDateString('pt-BR')}
        </div>
        ${tags.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
          ${tags.slice(0,8).map(t => `<span style="font-size:.68rem;font-family:monospace;background:var(--md-surface-container-high);padding:2px 6px;border-radius:4px">{{${t}}}</span>`).join('')}
          ${tags.length > 8 ? `<span style="font-size:.68rem;color:var(--md-on-surface-variant)">+${tags.length-8} mais</span>` : ''}
        </div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <a href="${CONFIG.API_URL}/api/modelos/${m.id}/download" class="btn btn-secondary btn-sm" target="_blank">📥 Baixar</a>
        ${!m.is_sistema ? `
          ${!m.is_padrao ? `<button class="btn btn-secondary btn-sm" data-md-action="padrao" data-md-id="${m.id}" data-md-tipo="${m.tipo_contrato}">★ Tornar padrão</button>` : ''}
          <button class="btn btn-danger btn-sm" data-md-action="desativar" data-md-id="${m.id}">Desativar</button>` : ''}
      </div>
    </div>
  </div>`;
}

async function handleAction(action, id, tipo) {
  if (action === 'padrao') {
    try {
      await API.put(`/api/modelos/${id}`, { is_padrao: true });
      carregarModelos();
    } catch (err) { alert(err.message); }
  }
  if (action === 'desativar') {
    if (!confirm('Desativar este modelo?')) return;
    try { await API.put(`/api/modelos/${id}/desativar`, {}); carregarModelos(); }
    catch (err) { alert(err.message); }
  }
}

function bindEventos() {
  document.getElementById('md-filtro-tipo').addEventListener('change', carregarModelos);
  document.getElementById('btn-upload-modelo').addEventListener('click', abrirModalUpload);
  document.getElementById('btn-fechar-upload').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-upload').addEventListener('click', fecharModal);
  document.getElementById('modal-upload').addEventListener('click', e => { if (e.target.id === 'modal-upload') fecharModal(); });
  document.getElementById('btn-enviar-upload').addEventListener('click', enviarUpload);
}

function abrirModalUpload() {
  _uploadStep = 1;
  document.getElementById('modal-upload-titulo').textContent = 'Upload de modelo';
  document.getElementById('modal-upload-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Tipo de contrato *</label>
      <select id="up-tipo" class="form-select">
        <option value="">Selecione...</option>
        ${Object.entries(TIPO_LABEL).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Nome do modelo *</label>
      <input type="text" id="up-nome" class="form-input" placeholder="Ex: Arrendamento — Modelo Sicredi">
    </div>
    <div class="form-group">
      <label class="form-label">Arquivo .docx *</label>
      <input type="file" id="up-arquivo" class="form-input" accept=".docx">
    </div>`;
  document.getElementById('btn-enviar-upload').textContent = 'Enviar e validar →';
  document.getElementById('modal-upload').classList.add('open');
}

async function enviarUpload() {
  const tipo  = document.getElementById('up-tipo')?.value;
  const nome  = document.getElementById('up-nome')?.value?.trim();
  const arq   = document.getElementById('up-arquivo')?.files?.[0];

  if (!tipo || !nome || !arq) { alert('Preencha todos os campos.'); return; }

  const btn = document.getElementById('btn-enviar-upload');
  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    const form = new FormData();
    form.append('tipo_contrato', tipo);
    form.append('nome', nome);
    form.append('arquivo', arq);

    const r = await fetch(`${CONFIG.API_URL}/api/modelos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Auth.token()}` },
      body: form,
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Erro ao enviar.'); return; }

    const tags = data.tags_detectadas || [];
    document.getElementById('modal-upload-titulo').textContent = 'Modelo enviado!';
    document.getElementById('modal-upload-body').innerHTML = `
      <div style="background:var(--md-primary-container);border-radius:var(--radius-md);padding:12px 16px;font-weight:600;color:var(--md-on-primary-container);margin-bottom:16px">
        ✅ ${_esc(nome)} — ${tags.length} tags detectadas
      </div>
      <div style="font-size:.78rem;font-weight:700;color:var(--md-on-surface-variant);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Tags encontradas</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${tags.map(t => `<span style="font-size:.72rem;font-family:monospace;background:var(--md-surface-container-high);padding:2px 8px;border-radius:4px">{{${_esc(t)}}}</span>`).join('')}
      </div>
      ${tags.length === 0 ? '<p style="color:var(--md-on-surface-variant);font-size:.875rem;margin-top:12px">Nenhuma tag encontrada. Certifique-se de usar o formato {{NOME_DA_TAG}} no documento.</p>' : ''}`;
    btn.textContent = 'Fechar';
    btn.disabled    = false;
    btn.onclick = () => { fecharModal(); carregarModelos(); };
  } catch (err) {
    alert('Erro: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Enviar e validar →';
  }
}

function fecharModal() { document.getElementById('modal-upload').classList.remove('open'); }
function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
