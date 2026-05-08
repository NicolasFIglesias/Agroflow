/* ── Preferências da empresa ──────────────────────────────── */
verificarAutenticacao();

const _u = Auth.usuario();
if (!_u) window.location.href = '/pages/login.html';
const _isAdminPref = _u?.role === 'admin' || _u?.role === 'superdev';
initSidebar();

// Colaboradores vêem apenas a seção de menu lateral
if (!_isAdminPref) {
  document.querySelectorAll('.pref-section').forEach((sec, i) => {
    // Índice 0 = identidade, 1 = menu lateral, 2 = dashboard
    if (i !== 1) sec.style.display = 'none';
  });
  document.querySelector('.pref-header p').textContent = 'Personalize a ordem do menu lateral';
  document.getElementById('btn-salvar').textContent = 'Salvar preferências';
}

// Itens configuráveis do menu
const MENU_ITEMS = _isAdminPref ? [
  { page: 'visao-geral',   label: 'Visão Geral',           icon: '🏠' },
  { page: 'calendario',    label: 'Calendário',             icon: '📅' },
  { page: 'vendas',        label: 'Vendas',                 icon: '💰' },
  { page: 'contratos',     label: 'Contratos',              icon: '📄' },
  { page: 'clientes',      label: 'Clientes',               icon: '👥' },
  { page: 'imoveis',       label: 'Imóveis',                icon: '🌾' },
  { page: 'servicos',      label: 'Serviços e Produtos',    icon: '🛒' },
  { page: 'faturamento',   label: 'Faturamento',            icon: '📊' },
  { page: 'colaboradores', label: 'Cadastrar colaborador',  icon: '👤' },
] : [
  { page: 'visao-geral',   label: 'Início',     icon: '🏠' },
  { page: 'calendario',    label: 'Calendário',  icon: '📅' },
  { page: 'vendas',        label: 'Vendas',      icon: '💰' },
  { page: 'contratos',     label: 'Contratos',   icon: '📄' },
  { page: 'clientes',      label: 'Clientes',    icon: '👥' },
  { page: 'imoveis',       label: 'Imóveis',     icon: '🌾' },
];

let _prefs = null;
let _order  = MENU_ITEMS.map(i => i.page);
let _hidden = [];

(async () => {
  try {
    // Carregar preferências pessoais primeiro (sidebar order)
    const userPrefs = await API.get('/api/preferencias/usuario').catch(() => ({}));
    _prefs = await API.get('/api/preferencias').catch(() => ({}));

    // Ordem/hidden: prioridade para preferências pessoais do usuário
    _order  = userPrefs.sidebar_order  || _prefs.sidebar_order  || MENU_ITEMS.map(i => i.page);
    _hidden = userPrefs.sidebar_hidden || _prefs.sidebar_hidden || [];

    // Preencher logo
    if (_prefs.logo_base64) {
      _mostrarLogoPreview(_prefs.logo_base64, _prefs.logo_mime || 'image/png');
      document.getElementById('logo-base64').value = _prefs.logo_base64;
      document.getElementById('logo-mime').value   = _prefs.logo_mime || 'image/png';
      document.getElementById('btn-remover-logo').style.display = '';
    }

    // Cor primária
    const cor = _prefs.cor_primaria || '#386A20';
    document.getElementById('cor-primaria').value = cor;
    _atualizarCorUI(cor);

    // Mensagem boas-vindas
    if (_prefs.mensagem_boas_vindas)
      document.getElementById('mensagem-boas-vindas').value = _prefs.mensagem_boas_vindas;

  } catch (err) {
    console.error('Erro ao carregar preferências:', err);
  }

  _renderMenuLista();
  _bindEventos();
})();

// ── Renderização da lista do menu ──────────────────────────
function _renderMenuLista() {
  const container = document.getElementById('pref-menu-lista');

  // Reordenar MENU_ITEMS conforme _order
  const ordered = [
    ..._order.map(page => MENU_ITEMS.find(i => i.page === page)).filter(Boolean),
    ...MENU_ITEMS.filter(i => !_order.includes(i.page)),
  ];

  container.innerHTML = '';
  ordered.forEach(item => {
    const hidden  = _hidden.includes(item.page);
    const div = document.createElement('div');
    div.className    = `pref-menu-item${hidden ? ' hidden-item' : ''}`;
    div.dataset.page = item.page;
    div.draggable    = true;
    div.innerHTML = `
      <span class="pref-menu-drag" title="Arrastar para reordenar">⠿</span>
      <span style="font-size:1.2rem">${item.icon}</span>
      <span class="pref-menu-label">${item.label}${item.adminOnly ? ' <small style="opacity:.5;font-size:.7em">(admin)</small>' : ''}</span>
      <button class="pref-menu-toggle${hidden ? '' : ' on'}" title="${hidden ? 'Mostrar' : 'Esconder'}" data-page="${item.page}"></button>
    `;
    container.appendChild(div);
  });

  _bindDragDrop();
  _bindToggles();
}

function _bindToggles() {
  document.querySelectorAll('.pref-menu-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (_hidden.includes(page)) {
        _hidden = _hidden.filter(p => p !== page);
      } else {
        _hidden.push(page);
      }
      btn.classList.toggle('on');
      btn.closest('.pref-menu-item').classList.toggle('hidden-item');
      btn.title = _hidden.includes(page) ? 'Mostrar' : 'Esconder';
    });
  });
}

// ── Drag & Drop ────────────────────────────────────────────
let _dragSrc = null;

function _bindDragDrop() {
  const items = document.querySelectorAll('.pref-menu-item');
  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      _dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.pref-menu-item').forEach(i => i.classList.remove('drag-over'));
      _sincronizarOrder();
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (_dragSrc && _dragSrc !== item) {
        document.querySelectorAll('.pref-menu-item').forEach(i => i.classList.remove('drag-over'));
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      if (_dragSrc && _dragSrc !== item) {
        const lista = item.parentElement;
        const kids  = [...lista.children];
        const srcIdx  = kids.indexOf(_dragSrc);
        const destIdx = kids.indexOf(item);
        if (srcIdx < destIdx) lista.insertBefore(_dragSrc, item.nextSibling);
        else lista.insertBefore(_dragSrc, item);
      }
    });
  });
}

function _sincronizarOrder() {
  _order = [...document.querySelectorAll('.pref-menu-item')].map(el => el.dataset.page);
}

// ── Logo ───────────────────────────────────────────────────
function _mostrarLogoPreview(base64, mime) {
  const prev = document.getElementById('logo-preview');
  prev.innerHTML = `<img src="data:${mime};base64,${base64}" alt="Logo">`;
}

// ── Cor ────────────────────────────────────────────────────
function _atualizarCorUI(cor) {
  document.getElementById('cor-label').textContent = cor;
  document.getElementById('cor-chip').style.background = cor;
  // Preview ao vivo
  document.documentElement.style.setProperty('--md-primary', cor);
  document.documentElement.style.setProperty('--verde', cor);
}

// ── Salvar ─────────────────────────────────────────────────
async function _salvar() {
  const btn = document.getElementById('btn-salvar');
  btn.disabled = true; btn.textContent = 'Salvando...';

  _sincronizarOrder();

  // Colaboradores só podem salvar a ordem do menu
  // Salvar preferências pessoais (sidebar order) para o usuário
  await API.put('/api/preferencias/usuario', {
    sidebar_order:  _order,
    sidebar_hidden: _hidden,
  }).catch(() => {});

  // Salvar preferências da empresa (admin only)
  const payload = _isAdminPref ? {
    logo_base64:          document.getElementById('logo-base64')?.value || null,
    logo_mime:            document.getElementById('logo-mime').value   || 'image/png',
    sidebar_order:        _order,
    sidebar_hidden:       _hidden,
    cor_primaria:         document.getElementById('cor-primaria')?.value || null,
    mensagem_boas_vindas: document.getElementById('mensagem-boas-vindas')?.value.trim() || null,
  } : {
    sidebar_order:  _order,
    sidebar_hidden: _hidden,
  };

  try {
    if (_isAdminPref) await API.put('/api/preferencias', payload);
    invalidarCachePreferencias(); // Limpa cache do sessionStorage
    const el = document.getElementById('pref-saved');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar preferências';
  }
}

// ── Eventos ────────────────────────────────────────────────
function _bindEventos() {
  // Salvar
  document.getElementById('btn-salvar').addEventListener('click', _salvar);

  // Logo — upload
  document.getElementById('logo-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) { alert('Imagem deve ter no máximo 500KB.'); return; }
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    document.getElementById('logo-base64').value = base64;
    document.getElementById('logo-mime').value   = file.type;
    _mostrarLogoPreview(base64, file.type);
    document.getElementById('btn-remover-logo').style.display = '';
  });

  // Logo — remover
  document.getElementById('btn-remover-logo').addEventListener('click', () => {
    document.getElementById('logo-base64').value = '';
    document.getElementById('logo-mime').value   = '';
    document.getElementById('logo-preview').innerHTML = '🌿';
    document.getElementById('btn-remover-logo').style.display = 'none';
    document.getElementById('logo-input').value = '';
  });

  // Cor — live preview
  document.getElementById('cor-primaria').addEventListener('input', e => {
    _atualizarCorUI(e.target.value);
  });

  // Cor — restaurar padrão
  document.getElementById('btn-cor-padrao').addEventListener('click', () => {
    const padrao = '#386A20';
    document.getElementById('cor-primaria').value = padrao;
    _atualizarCorUI(padrao);
  });
}
