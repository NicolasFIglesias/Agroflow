// ============================================================
// AgriFlow — Sidebar + Preferências da empresa
// ============================================================

const SIDEBAR_ITEMS_META = {
  'visao-geral':   { label: 'Visão Geral',   adminOnly: true },
  'clientes':      { label: 'Clientes' },
  'imoveis':       { label: 'Imóveis' },
  'contratos':     { label: 'Contratos' },
  'calendario':    { label: 'Calendário' },
  'colaboradores': { label: 'Colaboradores', adminOnly: true },
  'preferencias':  { label: 'Preferências',  adminOnly: true },
};

function initSidebar() {
  const usuario = Auth.usuario();
  if (!usuario) return;

  // Nome da empresa no logo
  const logoTextEl = document.querySelector('.sidebar-logo-text');
  const logoSubEl  = document.querySelector('.sidebar-logo-sub');
  if (logoTextEl && usuario.empresa_nome) logoTextEl.textContent = usuario.empresa_nome;
  if (logoSubEl)                          logoSubEl.textContent  = 'AgriFlow · Crédito Rural';

  // Preencher dados do usuário
  const nomeEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nomeEl)   nomeEl.textContent   = usuario.nome;
  if (roleEl)   roleEl.textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');
  if (avatarEl) avatarEl.textContent = Auth.iniciais(usuario.nome);

  // Mostrar links exclusivos de admin
  if (usuario.role === 'admin') {
    document.querySelectorAll('.sidebar-item-admin').forEach(el => { el.style.display = ''; });
  }

  // Inject link de Vendas (todos) se não existir
  const nav = document.querySelector('.sidebar-nav');
  if (nav && !nav.querySelector('[data-page="vendas"]')) {
    const refEl = nav.querySelector('[data-page="contratos"]') || nav.querySelector('.sidebar-divider');
    const aV = document.createElement('a');
    aV.href = '/pages/vendas.html'; aV.className = 'sidebar-item'; aV.dataset.page = 'vendas';
    aV.innerHTML = `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>Vendas`;
    if (refEl && refEl.nextSibling) nav.insertBefore(aV, refEl.nextSibling);
    else nav.appendChild(aV);
  }

  // Inject link de Faturamento (admin) se não existir
  if (usuario.role === 'admin' && nav && !nav.querySelector('[data-page="faturamento"]')) {
    const divider = nav.querySelector('.sidebar-divider');
    const aF = document.createElement('a');
    aF.href = '/pages/faturamento.html'; aF.className = 'sidebar-item sidebar-item-admin'; aF.dataset.page = 'faturamento';
    aF.innerHTML = `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke-width="2"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke-width="2" stroke-linecap="round"/>
      <polyline points="6 8 10 12 14 9 18 13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>Faturamento`;
    if (divider) nav.insertBefore(aF, divider);
    else nav.appendChild(aF);
  }

  // Inject link de preferências (admin) se não existir
  if (usuario.role === 'admin') {
    const nav = document.querySelector('.sidebar-nav');
    if (nav && !nav.querySelector('[data-page="preferencias"]')) {
      const divider = nav.querySelector('.sidebar-divider');
      const a = document.createElement('a');
      a.href         = '/pages/preferencias.html';
      a.className    = 'sidebar-item sidebar-item-admin';
      a.dataset.page = 'preferencias';
      a.innerHTML    = `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" stroke-width="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke-width="2"/>
      </svg>Preferências`;
      if (divider) nav.insertBefore(a, divider);
      else nav.appendChild(a);
    }
  }

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Deseja sair da sua conta?')) Auth.logout();
  });

  // Marcar item ativo
  const paginaAtual = window.location.pathname;
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    if (paginaAtual.includes(el.dataset.page)) el.classList.add('active');
  });

  // Mobile toggle
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  toggle?.addEventListener('click',  () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });

  // Carregar preferências da empresa (async, sem bloquear renderização)
  _carregarPreferencias(usuario);
}

async function _carregarPreferencias(usuario) {
  const cacheKey = `agriflow_prefs_${usuario.empresa_id}`;
  let prefs = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 5 * 60 * 1000) prefs = data; // 5 min cache
    }
    if (!prefs) {
      const r = await fetch(`${CONFIG.API_URL}/api/preferencias`, {
        headers: { 'Authorization': `Bearer ${Auth.token()}` }
      });
      if (r.ok) {
        prefs = await r.json();
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: prefs, ts: Date.now() }));
      }
    }
    if (prefs) _aplicarPreferencias(prefs);
  } catch { /* silent fail — preferências são opcionais */ }
}

function _aplicarPreferencias(prefs) {
  // 1. Logo personalizado
  if (prefs.logo_base64) {
    const logoIcon = document.querySelector('.sidebar-logo-icon');
    if (logoIcon) {
      logoIcon.innerHTML = '';
      const img = document.createElement('img');
      img.src = `data:${prefs.logo_mime || 'image/png'};base64,${prefs.logo_base64}`;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:inherit';
      logoIcon.appendChild(img);
    }
  }

  // 2. Cor primária
  if (prefs.cor_primaria) {
    document.documentElement.style.setProperty('--md-primary',   prefs.cor_primaria);
    document.documentElement.style.setProperty('--verde',         prefs.cor_primaria);
    document.documentElement.style.setProperty('--verde-esc',     _darken(prefs.cor_primaria, 20));
    document.documentElement.style.setProperty('--sidebar-active', prefs.cor_primaria + '30');
  }

  // 3. Ordem e visibilidade do menu
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;
  const hidden = prefs.sidebar_hidden || [];
  const order  = prefs.sidebar_order  || [];

  // Ocultar items escondidos pelo admin
  hidden.forEach(page => {
    const el = nav.querySelector(`.sidebar-item[data-page="${page}"]`);
    if (el) el.style.display = 'none';
  });

  // Reordenar itens
  if (order.length > 0) {
    const insertPoint = nav.querySelector('.sidebar-divider') || null;
    order.forEach(page => {
      const el = nav.querySelector(`.sidebar-item[data-page="${page}"]`);
      if (el) {
        if (insertPoint) nav.insertBefore(el, insertPoint);
        else nav.appendChild(el);
      }
    });
  }
}

function _darken(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
  const b = Math.max(0, (num & 0xFF) - amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// Invalidar cache ao salvar preferências
function invalidarCachePreferencias() {
  const usuario = Auth.usuario();
  if (usuario) sessionStorage.removeItem(`agriflow_prefs_${usuario.empresa_id}`);
}

window.initSidebar = initSidebar;
window.invalidarCachePreferencias = invalidarCachePreferencias;
window.SIDEBAR_ITEMS_META = SIDEBAR_ITEMS_META;
