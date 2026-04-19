const { Pool } = require('pg');

function buildConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERRO: DATABASE_URL não definida!');
    process.exit(1);
  }
  const u = new URL(dbUrl);
  return {
    host:     u.hostname,
    port:     parseInt(u.port) || 5432,
    database: u.pathname.replace(/^\//, ''),
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl:      { rejectUnauthorized: false },
    // Configurações para servidor persistente (Railway)
    max:                    10,    // pool maior para servidor contínuo
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis:      30000,
    allowExitOnIdle:        false, // processo não termina entre requests
  };
}

const pool = new Pool(buildConfig());

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do banco:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
