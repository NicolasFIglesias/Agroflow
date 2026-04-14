const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const ctrl   = require('../controllers/devController');

// Middleware: apenas superdev
router.use((req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'superdev') return res.status(403).json({ error: 'Acesso negado' });
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

router.get('/overview',                              ctrl.overview);
router.get('/empresas/:empresaId/usuarios',          ctrl.usuarios);
router.put('/usuarios/:usuarioId/senha',             ctrl.resetarSenha);
router.get('/empresas/:empresaId/dados',             ctrl.dadosEmpresa);
router.get('/clientes/:clienteId/cofre',             ctrl.cofre);

module.exports = router;
