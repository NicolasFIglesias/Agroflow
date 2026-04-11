const router = require('express').Router();
const ctrl   = require('../controllers/projetosController');
const auth   = require('../middleware/auth');

router.use(auth);

router.post('/',                              ctrl.criar);
router.get('/',                               ctrl.listar);
router.get('/:id',                            ctrl.buscarPorId);
router.put('/:id',                            ctrl.editar);
router.put('/:id/status',                     ctrl.alterarStatus);
router.post('/:id/participantes',             ctrl.adicionarParticipante);
router.delete('/:id/participantes/:uid',      ctrl.removerParticipante);

module.exports = router;
