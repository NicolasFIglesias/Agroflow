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
  'servicos':      `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke-width="2" stroke-linecap="round"/><path d="M16 10a4 4 0 01-8 0" stroke-width="2" stroke-linecap="round"/></svg>`,
  'preferencias':  `<svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke-width="2"/></svg>`,
};

const NAV_ADMIN = [
  { page: 'visao-geral',   label: 'Visão Geral',           href: '/pages/visao-geral.html' },
  { page: 'calendario',    label: 'Calendário',              href: '/pages/calendario.html' },
  { page: 'vendas',        label: 'Vendas',                 href: '/pages/vendas.html' },
  { page: 'contratos',     label: 'Contratos',              href: '/pages/contratos.html' },
  { page: 'clientes',      label: 'Clientes',               href: '/pages/clientes.html' },
  { page: 'imoveis',       label: 'Imóveis',                href: '/pages/imoveis.html' },
  { page: 'servicos',      label: 'Serviços',               href: '/pages/servicos.html' },
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
  try {
    // Preferências da empresa (logo, cor) — cacheadas por empresa
    const empresaKey = `agriflow_prefs_emp_${usuario.empresa_id}`;
    let empresaPrefs = null;
    const cachedEmp = sessionStorage.getItem(empresaKey);
    if (cachedEmp) { const { data, ts } = JSON.parse(cachedEmp); if (Date.now() - ts < 5*60*1000) empresaPrefs = data; }
    if (!empresaPrefs) {
      const r = await fetch(`${CONFIG.API_URL}/api/preferencias`, { headers: { 'Authorization': `Bearer ${Auth.token()}` } });
      if (r.ok) { empresaPrefs = await r.json(); sessionStorage.setItem(empresaKey, JSON.stringify({ data: empresaPrefs, ts: Date.now() })); }
    }

    // Preferências pessoais (sidebar order) — cacheadas por usuário
    const userKey = `agriflow_prefs_usr_${usuario.id}`;
    let userPrefs = null;
    const cachedUsr = sessionStorage.getItem(userKey);
    if (cachedUsr) { const { data, ts } = JSON.parse(cachedUsr); if (Date.now() - ts < 5*60*1000) userPrefs = data; }
    if (!userPrefs) {
      const r = await fetch(`${CONFIG.API_URL}/api/preferencias/usuario`, { headers: { 'Authorization': `Bearer ${Auth.token()}` } });
      if (r.ok) { userPrefs = await r.json(); sessionStorage.setItem(userKey, JSON.stringify({ data: userPrefs, ts: Date.now() })); }
    }

    // Aplicar empresa (logo, cor)
    if (empresaPrefs) _aplicarPreferenciasEmpresa(empresaPrefs);
    // Aplicar usuário (sidebar order)
    if (userPrefs) _aplicarOrdemSidebar(userPrefs);
  } catch { /* silent */ }
}

function _aplicarPreferenciasEmpresa(prefs) {
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
    document.documentElement.style.setProperty('--verde',      prefs.cor_primaria);
    document.documentElement.style.setProperty('--verde-esc',  _darken(prefs.cor_primaria, 30));
    document.documentElement.style.setProperty('--verde-nb',   _lighten(prefs.cor_primaria, 60));
    document.documentElement.style.setProperty('--verde-cl',   _lighten(prefs.cor_primaria, 120));
  }
  // Aplicar nome empresa no logo (já feito em initSidebar, mas caso preferências sobrescrevam)
}

function _aplicarOrdemSidebar(prefs) {
  const nav    = document.querySelector('.sidebar-nav');
  if (!nav) return;
  const order  = prefs.sidebar_order  || [];
  const hidden = prefs.sidebar_hidden || [];
  // Ocultar itens
  hidden.forEach(page => {
    const el = nav.querySelector(`.sidebar-item[data-page="${page}"]`);
    if (el) el.style.display = 'none';
  });
  // Reordenar
  if (order.length > 0) {
    const divider = nav.querySelector('.sidebar-divider');
    order.forEach(page => {
      const el = nav.querySelector(`.sidebar-item[data-page="${page}"]`);
      if (el) {
        if (divider) nav.insertBefore(el, divider);
        else nav.appendChild(el);
      }
    });
  }
}

// Legacy — kept for compatibility
function _aplicarPreferencias(prefs) { _aplicarPreferenciasEmpresa(prefs); }

function _darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const clamp = v => Math.max(0, v - amt);
  return '#' + [n >> 16, (n >> 8) & 0xFF, n & 0xFF].map(v => clamp(v).toString(16).padStart(2,'0')).join('');
}

function _lighten(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const clamp = v => Math.min(255, v + amt);
  return '#' + [n >> 16, (n >> 8) & 0xFF, n & 0xFF].map(v => clamp(v).toString(16).padStart(2,'0')).join('');
}

function invalidarCachePreferencias() {
  const usuario = Auth.usuario();
  if (!usuario) return;
  sessionStorage.removeItem(`agriflow_prefs_emp_${usuario.empresa_id}`);
  sessionStorage.removeItem(`agriflow_prefs_usr_${usuario.id}`);
}

window.initSidebar = initSidebar;
window.invalidarCachePreferencias = invalidarCachePreferencias;
window.SIDEBAR_ITEMS_META = { NAV_ADMIN, NAV_COLAB };
