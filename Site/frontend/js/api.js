// ============================================================
// AgriFlow — Wrapper de chamadas à API
// ============================================================

const API = (() => {
  function _token() {
    return localStorage.getItem('agriflow_token');
  }

  async function _req(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = _token();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${CONFIG.API_URL}${path}`, opts);

    if (res.status === 401) {
      // Token expirado ou inválido — redireciona para login
      localStorage.removeItem('agriflow_token');
      localStorage.removeItem('agriflow_usuario');
      window.location.href = '/pages/login.html';
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Erro ${res.status}`);
    }

    return data;
  }

  return {
    get:    (path)        => _req('GET',    path),
    post:   (path, body)  => _req('POST',   path, body),
    put:    (path, body)  => _req('PUT',    path, body),
    delete: (path)        => _req('DELETE', path),
  };
})();

window.API = API;
