const CONFIG = {
  // Em produção (Netlify), a API roda como função no mesmo domínio — sem URL externa
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
};

window.CONFIG = CONFIG;
