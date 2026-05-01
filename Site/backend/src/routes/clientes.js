const router = require('express').Router();
const ctrl   = require('../controllers/clientesController');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.buscarPorId);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);

router.put('/:id/conjuge',    ctrl.upsertConjuge);
router.delete('/:id/conjuge', ctrl.excluirConjuge);

module.exports = router;
