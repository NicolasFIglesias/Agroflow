const serverless = require('serverless-http');
const express    = require('express');
const cors       = require('cors');

const authRoutes       = require('./routes/auth');
const projetosRoutes   = require('./routes/projetos');
const tarefasRoutes    = require('./routes/tarefas');
const calendarioRoutes = require('./routes/calendario');
const usuariosRoutes   = require('./routes/usuarios');
const clientesRoutes   = require('./routes/clientes');
const imoveisRoutes    = require('./routes/imoveis');
const dashboardRoutes  = require('./routes/dashboard');
const devRoutes        = require('./routes/dev');

const app = express();

app.use(cors({ origin: true, credentials: true }));
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

module.exports.handler = serverless(app);
