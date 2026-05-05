/* ── Ficha do Cliente ─────────────────────────────────────── */
verificarAutenticacao();
initSidebar();

const _id = new URLSearchParams(location.search).get('id');
if (!_id) location.href = '/pages/clientes.html';

let _cliente = null;
let _editandoConta = null;
let _editandoCofre = null;
let _tlFiltro = '';
const _isAdmin = () => ['admin', 'superdev'].includes(Auth.usuario()?.role);

(async () => {
  await carregarCliente();
  bindEventos();
  ativarAba('dados');
})();

async function carregarCliente() {
  try {
    _cliente = await API.get(`/api/clientes/${_id}`);
    renderHeader();
    renderDados();
    renderConjuge();
  } catch {
    alert('Erro ao carregar cliente.');
    location.href = '/pages/clientes.html';
  }
}

function renderHeader() {
  const c = _cliente;
  const iniciais = (c.nome_completo || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('ficha-avatar').textContent = iniciais;
  document.getElementById('ficha-nome').textContent = c.nome_completo;
  document.title = c.nome_completo + ' — AgriFlow';

  const partes = [];
  if (c.cpf)       partes.push(`CPF: ${c.cpf}`);
  if (c.cnpj)      partes.push(`CNPJ: ${c.cnpj}`);
  if (c.municipio && c.uf) partes.push(`${c.municipio}/${c.uf}`);
  if (c.celular)   partes.push(`📱 ${c.celular}`);
  if (parseInt(c.total_imoveis) > 0) partes.push(`${c.total_imoveis} imóvel${c.total_imoveis !== '1' ? 's' : ''}`);
  document.getElementById('ficha-meta').innerHTML = partes.map(p => `<span>${p}</span>`).join('');

  const mostrarConjuge = ['casado', 'uniao_estavel'].includes(c.estado_civil);
  document.getElementById('tab-btn-conjuge').style.display = mostrarConjuge ? '' : 'none';
}

function renderDados() {
  const c = _cliente;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const isPJ = c.tipo_pessoa === 'PJ';

  document.getElementById('f-tipo-pessoa').value = c.tipo_pessoa;
  document.getElementById('btn-tipo-pf').classList.toggle('active', !isPJ);
  document.getElementById('btn-tipo-pj').classList.toggle('active', isPJ);
  document.getElementById('g-cpf').style.display          = isPJ ? 'none' : '';
  document.getElementById('g-cnpj').style.display         = isPJ ? '' : 'none';
  document.getElementById('g-nome-fantasia').style.display = isPJ ? '' : 'none';
  document.getElementById('g-rg').style.display           = isPJ ? 'none' : '';
  document.getElementById('g-nascimento').style.display   = isPJ ? 'none' : '';

  set('f-nome',           c.nome_completo);
  set('f-cpf',            c.cpf);
  set('f-cnpj',           c.cnpj);
  set('f-nome-fantasia',  c.nome_fantasia);
  set('f-rg',             c.rg);
  set('f-nascimento',     c.data_nascimento?.slice(0, 10));
  set('f-estado-civil',   c.estado_civil);
  set('f-profissao',      c.profissao);
  set('f-dap',            c.dap_caf);
  set('f-ie',             c.inscricao_estadual);
  set('f-nirf',           c.nirf);
  set('f-cep',            c.cep);
  set('f-logradouro',     c.logradouro);
  set('f-numero',         c.numero);
  set('f-complemento',    c.complemento);
  set('f-bairro',         c.bairro);
  set('f-municipio',      c.municipio);
  set('f-uf',             c.uf);
  set('f-endereco-rural', c.endereco_rural);
  set('f-celular',        c.celular);
  set('f-celular2',       c.celular2);
  set('f-telefone',       c.telefone_fixo);
  set('f-email',          c.email);
  set('f-email2',         c.email2);
  set('f-ref-nome',       c.contato_referencia_nome);
  set('f-ref-tel',        c.contato_referencia_telefone);

  if (c.data_nascimento) {
    const anos = Math.floor((new Date() - new Date(c.data_nascimento + 'T12:00:00')) / (365.25 * 24 * 3600 * 1000));
    document.getElementById('f-idade').textContent = `(${anos} anos)`;
  }
}

function renderConjuge() {
  const cj = _cliente.conjuge;
  if (!cj) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('c-nome',       cj.nome_completo);
  set('c-cpf',        cj.cpf);
  set('c-rg',         cj.rg);
  set('c-nascimento', cj.data_nascimento?.slice(0, 10));
  set('c-profissao',  cj.profissao);
  set('c-telefone',   cj.telefone);
  set('c-email',      cj.email);
  set('c-regime',     cj.regime_bens);
  set('c-dap',        cj.dap_caf);
}

/* ── Abas ─────────────────────────────────────────────────── */
function ativarAba(nome) {
  document.querySelectorAll('.ficha-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nome));
  document.querySelectorAll('.ficha-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${nome}`)?.classList.add('active');
  if (nome === 'bancario') carregarContas();
  if (nome === 'imoveis')  carregarImoveisCliente();
  if (nome === 'timeline') carregarTimeline();
  if (nome === 'cofre')    carregarCofre();
}

/* ── Contas bancárias ─────────────────────────────────────── */
async function carregarContas() {
  const el = document.getElementById('lista-contas');
  el.innerHTML = '<div class="text-muted" style="padding:16px">Carregando...</div>';
  try {
    const contas = await API.get(`/api/clientes/${_id}/contas`);
    if (!contas.length) { el.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Nenhuma conta cadastrada.</div>'; return; }
    const TIPO = { corrente:'Conta Corrente', poupanca:'Poupança', salario:'Salário', investimento:'Investimento' };
    const PIX  = { cpf_cnpj:'CPF/CNPJ', telefone:'Tel', email:'E-mail', aleatoria:'Aleatória' };
    el.innerHTML = contas.map(c => `
      <div class="conta-card">
        <div class="conta-info">
          <div class="conta-banco">🏦 ${_esc(c.banco)}</div>
          <div class="conta-detalhes">
            Ag ${_esc(c.agencia)} · ${TIPO[c.tipo_conta] || c.tipo_conta} ${_esc(c.numero_conta)}<br>
            Titular: ${_esc(c.titular || _cliente.nome_completo)}
            ${c.chave_pix ? `<br>PIX (${PIX[c.tipo_chave_pix] || c.tipo_chave_pix}): ${_esc(c.chave_pix)}` : ''}
            ${c.observacao ? `<br><em>${_esc(c.observacao)}</em>` : ''}
          </div>
        </div>
        <div class="conta-acoes">
          <button class="btn btn-secondary btn-sm" onclick='abrirModalConta(${JSON.stringify(c)})'>✏️</button>
          <button class="btn btn-danger btn-sm"    onclick="excluirConta('${c.id}')">🗑️</button>
        </div>
      </div>`).join('');
  } catch { el.innerHTML = '<div class="text-muted" style="padding:16px">Erro ao carregar contas.</div>'; }
}

function abrirModalConta(c = null) {
  _editandoConta = c?.id || null;
  document.getElementById('modal-conta-titulo').textContent = c ? 'Editar conta' : 'Nova conta bancária';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('mc-banco',    c?.banco);
  set('mc-agencia',  c?.agencia);
  set('mc-numero',   c?.numero_conta);
  set('mc-tipo',     c?.tipo_conta);
  set('mc-titular',  c?.titular || _cliente.nome_completo);
  set('mc-doc',      c?.cpf_cnpj_titular || (_cliente.cpf || _cliente.cnpj || ''));
  set('mc-pix',      c?.chave_pix);
  set('mc-tipo-pix', c?.tipo_chave_pix);
  set('mc-obs',      c?.observacao);
  document.getElementById('modal-conta').classList.add('open');
}

async function excluirConta(contaId) {
  if (!confirm('Excluir esta conta?')) return;
  try { await API.delete(`/api/clientes/${_id}/contas/${contaId}`); carregarContas(); }
  catch { alert('Erro ao excluir conta.'); }
}

/* ── Imóveis vinculados ───────────────────────────────────── */
async function carregarImoveisCliente() {
  const el = document.getElementById('lista-imoveis-cliente');
  el.innerHTML = '<div class="text-muted" style="padding:16px">Carregando...</div>';
  try {
    const imoveis = _cliente.imoveis || [];
    if (!imoveis.length) { el.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Nenhum imóvel vinculado.</div>'; return; }
    const CCIR = { em_dia:'✅ CCIR Em dia', vencido:'⚠️ CCIR Vencido', em_renovacao:'🔄 CCIR Em renovação' };
    const CAR  = { ativo:'✅ CAR Ativo', pendente_analise:'⏳ CAR Pendente', cancelado:'❌ CAR Cancelado', suspenso:'⚠️ CAR Suspenso' };
    el.innerHTML = imoveis.map(i => `
      <div class="imovel-card" onclick="window.location.href='/pages/imovel-ficha.html?id=${i.id}'">
        <div class="imovel-card-nome">🌾 ${_esc(i.denominacao)}</div>
        <div class="imovel-card-meta">
          <span>${parseFloat(i.area_total_ha).toLocaleString('pt-BR',{minimumFractionDigits:2})} ha</span>
          <span>${_esc(i.municipio)}/${_esc(i.uf)}</span>
          ${i.situacao_ccir ? `<span>${CCIR[i.situacao_ccir] || i.situacao_ccir}</span>` : ''}
          ${i.situacao_car  ? `<span>${CAR[i.situacao_car]   || i.situacao_car}</span>` : ''}
          <span>Participação: ${i.percentual_participacao}%</span>
        </div>
      </div>`).join('');
  } catch { el.innerHTML = '<div class="text-muted">Erro.</div>'; }
}

/* ── Timeline ─────────────────────────────────────────────── */
async function carregarTimeline() {
  const el = document.getElementById('tl-lista');
  el.innerHTML = '';
  try {
    const params = new URLSearchParams({ pagina: 1, por_pagina: 50 });
    if (_tlFiltro) params.set('tipo', _tlFiltro);
    const data = await API.get(`/api/clientes/${_id}/timeline?${params}`);
    const entradas = Array.isArray(data) ? data : (data.entradas || []);
    if (!entradas.length) { el.innerHTML = '<div class="text-muted" style="padding:16px;text-align:center">Nenhuma entrada.</div>'; return; }
    const grupos = {};
    entradas.forEach(e => {
      const d = new Date(e.created_at);
      const hoje = new Date(); const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const label = d.toDateString() === hoje.toDateString() ? 'Hoje'
        : d.toDateString() === ontem.toDateString() ? 'Ontem'
        : d.toLocaleDateString('pt-BR');
      if (!grupos[label]) grupos[label] = [];
      grupos[label].push(e);
    });
    el.innerHTML = Object.entries(grupos).map(([data, items]) => `
      <div class="tl-grupo-data">${data}</div>
      ${items.map(e => `
        <div class="tl-item ${e.tipo}">
          <div class="tl-item-meta">
            <span class="tl-item-usuario">${e.tipo === 'automatica' ? '⚙️ Sistema' : `👤 ${_esc(e.usuario_nome || '')}`}</span>
            · ${new Date(e.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </div>
          <div class="tl-item-texto">${_esc(e.texto)}</div>
        </div>`).join('')}
    `).join('');
  } catch { el.innerHTML = '<div class="text-muted" style="padding:16px">Erro ao carregar timeline.</div>'; }
}

async function enviarTimeline(tipo = 'manual', texto = null, dataLembrete = null) {
  const t = texto || document.getElementById('tl-texto').value.trim();
  if (!t) return;
  try {
    await API.post(`/api/clientes/${_id}/timeline`, { tipo, texto: t, data_lembrete: dataLembrete });
    document.getElementById('tl-texto').value = '';
    carregarTimeline();
  } catch (err) { alert('Erro: ' + err.message); }
}

/* ── Cofre ────────────────────────────────────────────────── */
async function carregarCofre() {
  const el = document.getElementById('lista-cofre');
  el.innerHTML = '<div class="text-muted" style="padding:16px">Carregando...</div>';
  try {
    const cofre = await API.get(`/api/clientes/${_id}/cofre`);
    if (!cofre.length) { el.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center">Nenhuma credencial cadastrada.</div>'; return; }
    el.innerHTML = cofre.map(c => `
      <div class="cofre-item">
        <div class="cofre-sistema">🔐 ${_esc(c.sistema)}
          ${c.url ? `<a href="${_esc(c.url)}" target="_blank" class="btn btn-ghost btn-sm">🔗 Abrir</a>` : ''}
        </div>
        <div class="cofre-login">Login: ${_esc(c.login)}</div>
        <div class="cofre-acoes">
          ${_isAdmin() ? `
            <span class="cofre-senha-reveal" id="cofre-reveal-${c.id}">••••••••</span>
            <button class="btn btn-secondary btn-sm" onclick="revelarSenha('${c.id}')">👁 Revelar</button>
            <button class="btn btn-secondary btn-sm" onclick="copiarSenha('${c.id}')">📋 Copiar</button>
            <button class="btn btn-secondary btn-sm" onclick='abrirModalCofre(${JSON.stringify(c)})'>✏️</button>
            <button class="btn btn-danger btn-sm"    onclick="excluirCofre('${c.id}')">🗑️</button>
          ` : '<span class="text-muted" style="font-size:.8rem">Apenas administradores podem ver senhas.</span>'}
        </div>
        <div class="cofre-meta">Atualizado em ${new Date(c.atualizado_em || c.created_at).toLocaleDateString('pt-BR')}</div>
      </div>`).join('');
  } catch { el.innerHTML = '<div class="text-muted" style="padding:16px">Erro ao carregar cofre.</div>'; }
}

const _cofreTimer = {};

async function revelarSenha(cofreId) {
  if (!_isAdmin()) return;
  try {
    const { senha } = await API.get(`/api/clientes/${_id}/cofre/${cofreId}/revelar`);
    const el = document.getElementById(`cofre-reveal-${cofreId}`);
    if (el) {
      el.textContent = senha;
      clearTimeout(_cofreTimer[cofreId]);
      _cofreTimer[cofreId] = setTimeout(() => { if (el) el.textContent = '••••••••'; }, 30000);
    }
  } catch (err) { alert('Erro: ' + err.message); }
}

async function copiarSenha(cofreId) {
  if (!_isAdmin()) return;
  try {
    const { senha } = await API.post(`/api/clientes/${_id}/cofre/${cofreId}/copiar`, {});
    await navigator.clipboard.writeText(senha);
    alert('Senha copiada! Será apagada do clipboard em 30 segundos.');
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30000);
  } catch (err) { alert('Erro: ' + err.message); }
}

function abrirModalCofre(c = null) {
  _editandoCofre = c?.id || null;
  document.getElementById('modal-cofre-titulo').textContent = c ? 'Editar credencial' : 'Nova credencial';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('cf-sistema', c?.sistema);
  set('cf-login',   c?.login);
  set('cf-senha',   '');
  set('cf-url',     c?.url);
  set('cf-obs',     c?.observacao);
  document.getElementById('modal-cofre').classList.add('open');
}

async function excluirCofre(cofreId) {
  if (!_isAdmin()) return;
  if (!confirm('Excluir esta credencial?')) return;
  try { await API.delete(`/api/clientes/${_id}/cofre/${cofreId}`); carregarCofre(); }
  catch { alert('Erro ao excluir.'); }
}

/* ── Salvar dados ─────────────────────────────────────────── */
async function salvarDados() {
  const g = id => document.getElementById(id)?.value;
  const body = {
    tipo_pessoa: g('f-tipo-pessoa'),
    nome_completo: g('f-nome').trim(),
    cpf: g('f-cpf') || undefined,
    cnpj: g('f-cnpj') || undefined,
    nome_fantasia: g('f-nome-fantasia') || undefined,
    rg: g('f-rg') || undefined,
    data_nascimento: g('f-nascimento') || undefined,
    estado_civil: g('f-estado-civil') || undefined,
    profissao: g('f-profissao') || undefined,
    dap_caf: g('f-dap') || undefined,
    inscricao_estadual: g('f-ie') || undefined,
    nirf: g('f-nirf') || undefined,
    cep: g('f-cep') || undefined,
    logradouro: g('f-logradouro') || undefined,
    numero: g('f-numero') || undefined,
    complemento: g('f-complemento') || undefined,
    bairro: g('f-bairro') || undefined,
    municipio: g('f-municipio') || undefined,
    uf: g('f-uf') || undefined,
    endereco_rural: g('f-endereco-rural') || undefined,
    celular: g('f-celular').trim(),
    celular2: g('f-celular2') || undefined,
    telefone_fixo: g('f-telefone') || undefined,
    email: g('f-email') || undefined,
    email2: g('f-email2') || undefined,
    contato_referencia_nome: g('f-ref-nome') || undefined,
    contato_referencia_telefone: g('f-ref-tel') || undefined,
  };
  if (!body.nome_completo || !body.celular) { alert('Nome e celular são obrigatórios.'); return; }
  const btn = document.getElementById('btn-salvar-dados');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    await API.put(`/api/clientes/${_id}`, body);
    _cliente = { ..._cliente, ...body };
    renderHeader();
    alert('Dados salvos com sucesso!');
  } catch (err) { alert(err.message || 'Erro ao salvar.'); }
  finally { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
}

/* ── Eventos ──────────────────────────────────────────────── */
function bindEventos() {
  document.querySelectorAll('.ficha-tab').forEach(t =>
    t.addEventListener('click', () => ativarAba(t.dataset.tab)));

  document.getElementById('btn-tipo-pf')?.addEventListener('click', () => setTipo('PF'));
  document.getElementById('btn-tipo-pj')?.addEventListener('click', () => setTipo('PJ'));

  // CEP via ViaCEP
  document.getElementById('f-cep')?.addEventListener('blur', async e => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        document.getElementById('f-logradouro').value = d.logradouro || '';
        document.getElementById('f-bairro').value     = d.bairro || '';
        document.getElementById('f-municipio').value  = d.localidade || '';
        document.getElementById('f-uf').value         = d.uf || '';
      }
    } catch {}
  });

  // Idade automática
  document.getElementById('f-nascimento')?.addEventListener('change', e => {
    if (!e.target.value) return;
    const anos = Math.floor((new Date() - new Date(e.target.value + 'T12:00:00')) / (365.25 * 24 * 3600 * 1000));
    document.getElementById('f-idade').textContent = `(${anos} anos)`;
  });

  document.getElementById('btn-salvar-dados')?.addEventListener('click', salvarDados);

  // Cônjuge
  document.getElementById('btn-salvar-conjuge')?.addEventListener('click', async () => {
    const nome = document.getElementById('c-nome').value.trim();
    if (!nome) { alert('Nome é obrigatório.'); return; }
    const g = id => document.getElementById(id)?.value;
    const body = { nome_completo: nome, cpf: g('c-cpf')||undefined, rg: g('c-rg')||undefined,
      data_nascimento: g('c-nascimento')||undefined, profissao: g('c-profissao')||undefined,
      telefone: g('c-telefone')||undefined, email: g('c-email')||undefined,
      regime_bens: g('c-regime')||undefined, dap_caf: g('c-dap')||undefined };
    try { await API.put(`/api/clientes/${_id}/conjuge`, body); alert('Cônjuge salvo!'); }
    catch (err) { alert(err.message || 'Erro.'); }
  });

  // Contas
  document.getElementById('btn-nova-conta')?.addEventListener('click', () => abrirModalConta());
  document.getElementById('btn-fechar-conta')?.addEventListener('click', () => fecharModal('modal-conta'));
  document.getElementById('btn-cancelar-conta')?.addEventListener('click', () => fecharModal('modal-conta'));
  document.getElementById('modal-conta')?.addEventListener('click', e => { if (e.target.id === 'modal-conta') fecharModal('modal-conta'); });
  document.getElementById('btn-salvar-conta')?.addEventListener('click', async () => {
    const g = id => document.getElementById(id)?.value;
    const banco = g('mc-banco').trim(); const agencia = g('mc-agencia').trim();
    const numero = g('mc-numero').trim(); const tipo = g('mc-tipo');
    if (!banco || !agencia || !numero || !tipo) { alert('Banco, agência, número e tipo são obrigatórios.'); return; }
    const body = { banco, agencia, numero_conta: numero, tipo_conta: tipo,
      titular: g('mc-titular')||undefined, cpf_cnpj_titular: g('mc-doc')||undefined,
      chave_pix: g('mc-pix')||undefined, tipo_chave_pix: g('mc-tipo-pix')||undefined,
      observacao: g('mc-obs')||undefined };
    try {
      if (_editandoConta) await API.put(`/api/clientes/${_id}/contas/${_editandoConta}`, body);
      else await API.post(`/api/clientes/${_id}/contas`, body);
      fecharModal('modal-conta');
      carregarContas();
    } catch (err) { alert(err.message || 'Erro.'); }
  });

  // Cofre
  document.getElementById('btn-nova-credencial')?.addEventListener('click', () => abrirModalCofre());
  document.getElementById('btn-fechar-cofre')?.addEventListener('click', () => fecharModal('modal-cofre'));
  document.getElementById('btn-cancelar-cofre')?.addEventListener('click', () => fecharModal('modal-cofre'));
  document.getElementById('modal-cofre')?.addEventListener('click', e => { if (e.target.id === 'modal-cofre') fecharModal('modal-cofre'); });
  document.getElementById('btn-salvar-cofre')?.addEventListener('click', async () => {
    const g = id => document.getElementById(id)?.value;
    const sistema = g('cf-sistema').trim(); const login = g('cf-login').trim(); const senha = g('cf-senha');
    if (!sistema || !login) { alert('Sistema e login são obrigatórios.'); return; }
    if (!_editandoCofre && !senha) { alert('Senha é obrigatória.'); return; }
    const body = { sistema, login, url: g('cf-url')||undefined, observacao: g('cf-obs')||undefined };
    if (senha) body.senha = senha;
    try {
      if (_editandoCofre) await API.put(`/api/clientes/${_id}/cofre/${_editandoCofre}`, body);
      else await API.post(`/api/clientes/${_id}/cofre`, body);
      fecharModal('modal-cofre');
      carregarCofre();
    } catch (err) { alert(err.message || 'Erro.'); }
  });

  // Timeline
  document.getElementById('btn-tl-enviar')?.addEventListener('click', () => enviarTimeline());
  document.getElementById('tl-texto')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTimeline(); }
  });
  document.querySelectorAll('.tl-filtro-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tl-filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _tlFiltro = btn.dataset.tipo;
      carregarTimeline();
    })
  );
  document.getElementById('btn-tl-lembrete')?.addEventListener('click', () =>
    document.getElementById('modal-lembrete').classList.add('open'));
  document.getElementById('btn-fechar-lembrete')?.addEventListener('click', () => fecharModal('modal-lembrete'));
  document.getElementById('btn-cancelar-lembrete')?.addEventListener('click', () => fecharModal('modal-lembrete'));
  document.getElementById('btn-salvar-lembrete')?.addEventListener('click', async () => {
    const texto = document.getElementById('lem-texto').value.trim();
    const data  = document.getElementById('lem-data').value;
    if (!texto || !data) { alert('Texto e data são obrigatórios.'); return; }
    await enviarTimeline('lembrete', texto, data);
    fecharModal('modal-lembrete');
    document.getElementById('lem-texto').value = '';
    document.getElementById('lem-data').value = '';
  });
}

function setTipo(tipo) {
  document.getElementById('f-tipo-pessoa').value = tipo;
  document.getElementById('btn-tipo-pf').classList.toggle('active', tipo === 'PF');
  document.getElementById('btn-tipo-pj').classList.toggle('active', tipo === 'PJ');
  document.getElementById('g-cpf').style.display          = tipo === 'PF' ? '' : 'none';
  document.getElementById('g-cnpj').style.display         = tipo === 'PJ' ? '' : 'none';
  document.getElementById('g-nome-fantasia').style.display = tipo === 'PJ' ? '' : 'none';
  document.getElementById('g-rg').style.display           = tipo === 'PF' ? '' : 'none';
  document.getElementById('g-nascimento').style.display   = tipo === 'PF' ? '' : 'none';
}

function fecharModal(id) { document.getElementById(id)?.classList.remove('open'); }

function _esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
