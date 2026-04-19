const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./routes/auth');
const projetosRoutes   = require('./routes/projetos');
const tarefasRoutes    = require('./routes/tarefas');
const calendarioRoutes = require('./routes/calendario');
const usuariosRoutes   = require('./routes/usuarios');
const clientesRoutes   = require('./routes/clientes');
const imoveisRoutes    = require('./routes/imoveis');
const dashboardRoutes  = require('./routes/dashboard');
const devRoutes        = require('./routes/dev');

const db = require('./db');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/projetos',   projetosRoutes);
app.use('/api/tarefas',    tarefasRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/usuarios',   usuariosRoutes);
app.use('/api/clientes',   clientesRoutes);
app.use('/api/imoveis',    imoveisRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/dev',        devRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Acorda Lambda + Neon sem autenticação (usado pelo frontend no carregamento da página)
app.get('/api/warmup', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AgriFlow API rodando na porta ${PORT}`));
