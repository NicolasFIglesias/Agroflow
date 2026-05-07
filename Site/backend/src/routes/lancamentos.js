const router = require('express').Router();
const ctrl   = require('../controllers/lancamentosController');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/resumo',       ctrl.resumo);    // antes de /:id
router.get('/mensal',       ctrl.mensal);
router.get('/',             ctrl.listar);
router.post('/',            ctrl.criar);
router.put('/:id',          ctrl.editar);
router.patch('/:id/pago',   ctrl.marcarPago);
router.delete('/:id',       ctrl.excluir);

module.exports = router;
