require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes       = require('./routes/auth');
const projetosRoutes   = require('./routes/projetos');
const tarefasRoutes    = require('./routes/tarefas');
const calendarioRoutes = require('./routes/calendario');
const usuariosRoutes   = require('./routes/usuarios');
const clientesRoutes   = require('./routes/clientes');
const imoveisRoutes    = require('./routes/imoveis');
const devRoutes        = require('./routes/dev');
const dashboardRoutes  = require('./routes/dashboard');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());

// ── ROTAS ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/projetos',  projetosRoutes);
app.use('/api/tarefas',   tarefasRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/clientes',  clientesRoutes);
app.use('/api/imoveis',    imoveisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dev',       devRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AgriFlow API rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
