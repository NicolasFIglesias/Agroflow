const router = require('express').Router();
const ctrl   = require('../controllers/imoveisController');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.buscarPorId);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);

router.post('/:id/proprietarios',                   ctrl.vincularProprietario);
router.put('/:id/proprietarios/:vinculoId',         ctrl.editarVinculo);
router.delete('/:id/proprietarios/:vinculoId',      ctrl.desvincularProprietario);

module.exports = router;
