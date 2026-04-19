// ============================================================
// AgriFlow — Autenticação (sessão local)
// ============================================================

const Auth = (() => {
  const TOKEN_KEY   = 'agriflow_token';
  const USUARIO_KEY = 'agriflow_usuario';

  function salvar(token, usuario) {
    localStorage.setItem(TOKEN_KEY,   token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  }

  function limpar() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  }

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function usuario() {
    const raw = localStorage.getItem(USUARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function logado() {
    return !!token();
  }

  function isAdmin() {
    const u = usuario();
    return u && u.role === 'admin';
  }

  // Redireciona para login se não estiver autenticado
  function exigirLogin() {
    if (!logado()) {
      window.location.href = '/pages/login.html';
    }
  }

  // Redireciona para visao-geral (admin) ou calendário (colaborador) se já estiver logado
  function redirecinarSeLogado() {
    if (logado()) {
      const u = usuario();
      window.location.href = u && u.role === 'admin' ? '/pages/visao-geral.html' : '/pages/calendario.html';
    }
  }

  function logout() {
    limpar();
    window.location.href = '/pages/login.html';
  }

  // Iniciais do nome (para avatares)
  function iniciais(nome) {
    if (!nome) return '?';
    return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  return { salvar, limpar, token, usuario, logado, isAdmin, exigirLogin, redirecinarSeLogado, logout, iniciais };
})();

window.Auth = Auth;

// Convenience globals used by newer pages
function verificarAutenticacao() { Auth.exigirLogin(); }
function usuario() { return Auth.usuario(); }
function logado()  { return Auth.logado(); }

// Acorda Lambda + Neon em background assim que qualquer página carrega
;(function warmupServidor() {
  try {
    fetch(CONFIG.API_URL + '/api/warmup', { method: 'GET' }).catch(() => {});
  } catch (_) {}
})();
