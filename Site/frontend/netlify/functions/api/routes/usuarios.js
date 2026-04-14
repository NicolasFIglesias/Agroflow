const router = require('express').Router();
const ctrl   = require('../controllers/usuariosController');
const auth   = require('../middleware/auth');

router.use(auth);
router.get('/',              ctrl.listar);
router.post('/',             ctrl.criar);
router.put('/:id',           ctrl.editar);
router.patch('/:id/ativo',   ctrl.toggleAtivo);

module.exports = router;
