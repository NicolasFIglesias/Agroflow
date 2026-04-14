const router = require('express').Router();
const ctrl   = require('../controllers/imoveisController');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.buscarPorId);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);

// Proprietários
router.post('/:id/proprietarios',                ctrl.vincularProprietario);
router.delete('/:id/proprietarios/:vinculoId',   ctrl.desvincularProprietario);

module.exports = router;
