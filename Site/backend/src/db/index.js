const { Pool } = require('pg');

function buildConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERRO: DATABASE_URL não definida!');
    process.exit(1);
  }

  try {
    const u = new URL(dbUrl);
    console.log('DB host resolvido:', u.hostname);
    return {
      host:     u.hostname,
      port:     parseInt(u.port) || 5432,
      database: u.pathname.replace(/^\//, ''),
      user:     decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      ssl:      { rejectUnauthorized: false }
    };
  } catch (e) {
    console.error('Erro ao parsear DATABASE_URL:', e.message);
    process.exit(1);
  }
}

const pool = new Pool(buildConfig());

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do banco:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
