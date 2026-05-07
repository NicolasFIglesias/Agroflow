/* ── Serviços e Produtos ──────────────────────────────────── */
verificarAutenticacao();
initSidebar();

carregarServicos();
bindEventos();

async function carregarServicos() {
  const el = document.getElementById('srv-lista');
  el.innerHTML = '<div class="vnd-empty">Carregando...</div>';
  try {
    const servs = await API.get('/api/servicos');
    if (!servs.length) { el.innerHTML = '<div class="vnd-empty">Nenhum serviço cadastrado. Clique em "+ Novo serviço" para começar.</div>'; return; }
    const _fmtBRL = v => v ? `R$ ${parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—';
    el.innerHTML = servs.map(s => `
      <div style="background:var(--md-surface-container-low);border-radius:16px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:var(--shadow-sm)">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9375rem">${_esc(s.nome)}</div>
          ${s.descricao ? `<div style="font-size:.8rem;color:var(--md-on-surface-variant);margin-top:2px">${_esc(s.descricao)}</div>` : ''}
          <div style="display:flex;gap:16px;margin-top:6px;font-size:.82rem">
            <span style="color:var(--md-primary);font-weight:700">Venda: ${_fmtBRL(s.preco_venda)}</span>
            ${s.preco_custo ? `<span style="color:var(--md-on-surface-variant)">Custo: ${_fmtBRL(s.preco_custo)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="editarServico(${JSON.stringify(s)})">✏️</button>
          <button class="btn btn-danger btn-sm"    onclick="excluirServico('${s.id}')">🗑️</button>
        </div>
      </div>`).join('');
  } catch (err) { el.innerHTML = `<div class="vnd-empty" style="color:var(--md-error)">Erro: ${err.message}</div>`; }
}

window.editarServico = function(s) {
  document.getElementById('srv-id').value    = s.id;
  document.getElementById('srv-nome').value  = s.nome;
  document.getElementById('srv-custo').value = s.preco_custo || '';
  document.getElementById('srv-venda').value = s.preco_venda;
  document.getElementById('srv-desc').value  = s.descricao || '';
  document.getElementById('modal-srv-titulo').textContent = 'Editar serviço';
  document.getElementById('modal-servico').classList.add('open');
};

window.excluirServico = async function(id) {
  if (!confirm('Desativar este serviço?')) return;
  try { await API.delete(`/api/servicos/${id}`); carregarServicos(); }
  catch (err) { alert(err.message); }
};

async function salvarServico() {
  const id    = document.getElementById('srv-id').value;
  const nome  = document.getElementById('srv-nome').value.trim();
  const venda = document.getElementById('srv-venda').value;
  if (!nome || !venda) { alert('Nome e preço de venda são obrigatórios.'); return; }
  const body = { nome, preco_venda: parseFloat(venda), preco_custo: parseFloat(document.getElementById('srv-custo').value)||null, descricao: document.getElementById('srv-desc').value||undefined };
  const btn = document.getElementById('btn-salvar-srv');
  btn.disabled = true;
  try {
    if (id) await API.put(`/api/servicos/${id}`, body);
    else     await API.post('/api/servicos', body);
    document.getElementById('modal-servico').classList.remove('open');
    carregarServicos();
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; }
}

function bindEventos() {
  document.getElementById('btn-novo-servico').addEventListener('click', () => {
    ['srv-id','srv-nome','srv-custo','srv-venda','srv-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('modal-srv-titulo').textContent = 'Novo serviço';
    document.getElementById('modal-servico').classList.add('open');
  });
  document.getElementById('btn-fechar-srv').addEventListener('click',   () => document.getElementById('modal-servico').classList.remove('open'));
  document.getElementById('btn-cancelar-srv').addEventListener('click', () => document.getElementById('modal-servico').classList.remove('open'));
  document.getElementById('btn-salvar-srv').addEventListener('click', salvarServico);
}

function _esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
