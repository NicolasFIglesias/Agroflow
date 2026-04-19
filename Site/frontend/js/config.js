const CONFIG = {
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://RAILWAY_URL_AQUI'  // ← será atualizado após criar o serviço no Railway
};

window.CONFIG = CONFIG;
