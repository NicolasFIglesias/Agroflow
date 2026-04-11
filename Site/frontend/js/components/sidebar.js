// ============================================================
// AgriFlow — Sidebar
// ============================================================

function initSidebar() {
  const usuario = Auth.usuario();
  if (!usuario) return;

  // Preencher dados do usuário
  const nomeEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nomeEl)   nomeEl.textContent   = usuario.nome;
  if (roleEl)   roleEl.textContent   = usuario.cargo || (usuario.role === 'admin' ? 'Administrador' : 'Colaborador');
  if (avatarEl) avatarEl.textContent = Auth.iniciais(usuario.nome);

  // Mostrar links exclusivos de admin
  if (usuario.role === 'admin') {
    document.querySelectorAll('.sidebar-item-admin').forEach(el => {
      el.style.display = '';
    });
  }

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Deseja sair da sua conta?')) Auth.logout();
  });

  // Marcar item ativo
  const paginaAtual = window.location.pathname;
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    if (paginaAtual.includes(el.dataset.page)) {
      el.classList.add('active');
    }
  });

  // Mobile toggle
  const toggle   = document.getElementById('sidebar-toggle');
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

window.initSidebar = initSidebar;
