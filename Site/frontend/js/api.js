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

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // Só redireciona se havia um token salvo (sessão expirada).
      // Se não há token, é uma tentativa de login — lança o erro normalmente.
      if (localStorage.getItem('agriflow_token')) {
        localStorage.removeItem('agriflow_token');
        localStorage.removeItem('agriflow_usuario');
        window.location.href = '/pages/login.html';
        return;
      }
      throw new Error(data.error || 'Credenciais inválidas');
    }

    if (!res.ok) {
      throw new Error(data.error || `Erro ${res.status}`);
    }

    return data;
  }

  // Download autenticado — usa showSaveFilePicker() se disponível, senão <a download>
  async function download(path, nomeArquivo) {
    const token = _token();
    const r = await fetch(`${CONFIG.API_URL}${path}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${r.status}`);
    }
    const blob = await r.blob();

    if ('showSaveFilePicker' in window) {
      try {
        const ext = nomeArquivo.split('.').pop();
        const mime = blob.type || 'application/octet-stream';
        const fh = await window.showSaveFilePicker({
          suggestedName: nomeArquivo,
          types: [{ description: 'Arquivo', accept: { [mime]: ['.' + ext] } }],
        });
        const ws = await fh.createWritable();
        await ws.write(blob);
        await ws.close();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // usuário cancelou
        // fallback para <a>
      }
    }

    // Fallback: <a download> clássico
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    get:      (path)        => _req('GET',    path),
    post:     (path, body)  => _req('POST',   path, body),
    put:      (path, body)  => _req('PUT',    path, body),
    patch:    (path, body)  => _req('PATCH',  path, body),
    delete:   (path)        => _req('DELETE', path),
    download,
    _req,
  };
})();

window.API = API;
