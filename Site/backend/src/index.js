require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes      = require('./routes/auth');
const projetosRoutes  = require('./routes/projetos');
const tarefasRoutes   = require('./routes/tarefas');
const calendarioRoutes = require('./routes/calendario');
const usuariosRoutes  = require('./routes/usuarios');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:5500'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true
}));

app.use(express.json());

// ── ROTAS ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/projetos',  projetosRoutes);
app.use('/api/tarefas',   tarefasRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/usuarios',  usuariosRoutes);

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
