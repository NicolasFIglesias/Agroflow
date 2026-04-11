// ============================================================
// AgriFlow — Configuração da API
// Em produção, Netlify injeta a variável via _redirects ou
// você pode ajustar a URL abaixo após o deploy no Render.
// ============================================================

const CONFIG = {
  // Troque pela URL do seu backend no Render após o deploy:
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://agriflow-api.onrender.com'   // ← cole aqui a URL do Render (passo 3.6)
};

window.CONFIG = CONFIG;
