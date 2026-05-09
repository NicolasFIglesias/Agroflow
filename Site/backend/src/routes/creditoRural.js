const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/creditoRuralController');

router.use(auth);
router.get('/dashboard',        ctrl.dashboard);
router.get('/',                 ctrl.listar);
router.post('/',                ctrl.criar);
router.get('/:id',              ctrl.buscarPorId);
router.put('/:id',              ctrl.atualizar);
router.post('/:id/etapa',       ctrl.avancarEtapa);
router.delete('/:id',           ctrl.excluir);

module.exports = router;
