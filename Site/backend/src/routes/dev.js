const router = require('express').Router();
const ctrl   = require('../controllers/devController');
const jwt    = require('jsonwebtoken');

// Middleware superdev — exige role === 'superdev'
function superdev(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'superdev')
      return res.status(403).json({ error: 'Acesso negado' });
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

router.use(superdev);

router.get('/overview',                          ctrl.overview);
router.get('/empresas/:empresaId/usuarios',      ctrl.usuarios);
router.get('/empresas/:empresaId/dados',         ctrl.dadosEmpresa);
router.put('/usuarios/:usuarioId/senha',         ctrl.resetarSenha);
router.put('/usuarios/:usuarioId',               ctrl.atualizarUsuario);
router.get('/clientes/:clienteId/cofre',         ctrl.cofre);

module.exports = router;
