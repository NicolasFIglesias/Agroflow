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
    // Configurações para ambiente serverless (Netlify + Neon)
    max:                    3,     // poucas conexões por instância Lambda
    connectionTimeoutMillis: 8000, // falhar em 8s (antes do timeout de 10s da Netlify)
    idleTimeoutMillis:      10000, // liberar conexões ociosas rapidamente
    allowExitOnIdle:        true,  // permite o processo Lambda terminar
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
