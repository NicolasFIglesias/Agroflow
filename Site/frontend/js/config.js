const CONFIG = {
  API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : window.location.hostname.includes('staging') || window.location.hostname.includes('-staging')
    ? 'https://agroflow-staging.up.railway.app'   // Railway staging (criar depois)
    : 'https://agroflow-production-e937.up.railway.app'
};

window.CONFIG = CONFIG;
