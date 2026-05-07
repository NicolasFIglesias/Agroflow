// ============================================================
// AgriFlow — Sidebar (dinâmico por papel do usuário)
// ============================================================

const _SVG = {
  'visao-geral':   `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke-width="2" stroke-linecap="round"/></svg>`,
  'calendario':    `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>`,
  'vendas':        `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" stroke-width="2" stroke-linecap="round"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'contratos':     `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="13" x2="8" y2="13" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke-width="2" stroke-linecap="round"/></svg>`,
  'clientes':      `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-width="2" stroke-linecap="round"/></svg>`,
  'imoveis':       `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21V12h6v9" stroke-width="2" stroke-linecap="round"/></svg>`,
  'colaboradores': `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke-width="2"/><line x1="19" y1="8" x2="19" y2="14" stroke-width="2" stroke-linecap="round"/><line x1="22" y1="11" x2="16" y2="11" stroke-width="2" stroke-linecap="round"/></svg>`,
  'preferencias':  `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke-width="2"/></svg>`,
};

const NAV_ADMIN = [
  { page: 'visao-geral',   label: 'Visão Geral',           href: '/pages/visao-geral.html' },
  { page: 'calendario',    label: 'Calendário',              href: '/pages/calendario.html' },
  { page: 'vendas',        label: 'Vendas',                 href: '/pages/vendas.html' },
  { page: 'contratos',     label: 'Contratos',              href: '/pages/contratos.html' },
  { page: 'clientes',      label: 'Clientes',               href: '/pages/clientes.html' },
  { page: 'imoveis',       label: 'Imóveis',                href: '/pages/imoveis.html' },
  { divider: true },
  { page: 'colaboradores', label: 'Cadastrar colaborador',  href: '/pages/colaboradores.html' },
  { page: 'preferencias',  label: 'Preferências',           href: '/pages/preferencias.html' },
];

const NAV_COLAB = [
  { page: 'visao-geral', label: 'Início',    href: '/pages/visao-geral.html' },
  { page: 'calendario',  label: 'Calendário', href: '/pages/calendario.html' },
  { page: 'vendas',      label: 'Vendas',     href: '/pages/vendas.html' },
  { page: 'contratos',   label: 'Contratos',  href: '/pages/contratos.html' },
  { page: 'clientes',    label: 'Clientes',   href: '/pages/clientes.html' },
  { page: 'imoveis',     label: 'Imóveis',    href: '/pages/imoveis.html' },
  { divider: true },
  { page: 'preferencias', label: 'Preferências', href: '/pages/preferencias.html' },
];

function initSidebar() {
  const usuario = Auth.usuario();
  if (!usuario) return;

  // Nome da empresa no logo
  const logoTextEl = document.querySelector('.sidebar-logo-text');
  const logoSubEl  = document.querySelector('.sidebar-logo-sub');
  if (logoTextEl && usuario.empresa_nome) logoTextEl.textContent = usuario.empresa_nome;
  if (logoSubEl)                          logoSubEl.textContent  = 'AgriFlow · Crédito Rural';

  // Renderizar nav baseado no papel
  const nav = document.querySelector('.sidebar-nav');
  if (nav) {
    const items = usuario.role === 'admin' || usuario.role === 'superdev' ? NAV_ADMIN : NAV_COLAB;
    const paginaAtual = window.location.pathname;
    nav.innerHTML = items.map(item => {
      if (item.divider) return '<div class="sidebar-divider"></div>';
      const active = paginaAtual.includes(item.page) ? ' active' : '';
      const icon   = _SVG[item.page] || '';
      return `<a href="${item.href}" class="sidebar-item${active}" data-page="${item.page}">${icon}${item.label}</a>`;
    }).join('');
  }

  // Preencher dados do usuário
  const nomeEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nomeEl)   nomeEl.textContent   = usuario.nome;
  if (roleEl)   roleEl.textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');
  if (avatarEl) avatarEl.textContent = Auth.iniciais(usuario.nome);

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Deseja sair da sua conta?')) Auth.logout();
  });

  // Mobile toggle
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  toggle?.addEventListener('click',  () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });

  // Aplicar preferências da empresa
  _carregarPreferencias(usuario);
}

async function _carregarPreferencias(usuario) {
  const cacheKey = `agriflow_prefs_${usuario.empresa_id}`;
  let prefs = null;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 5 * 60 * 1000) prefs = data;
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
  } catch { /* silent */ }
}

function _aplicarPreferencias(prefs) {
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
  if (prefs.cor_primaria) {
    document.documentElement.style.setProperty('--md-primary', prefs.cor_primaria);
    document.documentElement.style.setProperty('--verde', prefs.cor_primaria);
    document.documentElement.style.setProperty('--verde-esc', _darken(prefs.cor_primaria, 20));
  }
  // Order/hidden applied at nav level if preferences stored (nav already rendered by role)
}

function _darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const clamp = v => Math.max(0, v - amt);
  return '#' + [n >> 16, (n >> 8) & 0xFF, n & 0xFF].map(v => clamp(v).toString(16).padStart(2,'0')).join('');
}

function invalidarCachePreferencias() {
  const usuario = Auth.usuario();
  if (usuario) sessionStorage.removeItem(`agriflow_prefs_${usuario.empresa_id}`);
}

window.initSidebar = initSidebar;
window.invalidarCachePreferencias = invalidarCachePreferencias;
window.SIDEBAR_ITEMS_META = { NAV_ADMIN, NAV_COLAB };
