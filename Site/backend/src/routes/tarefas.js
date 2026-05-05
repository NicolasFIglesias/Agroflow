const router = require('express').Router();
const ctrl   = require('../controllers/tarefasController');
const auth   = require('../middleware/auth');

router.use(auth);

router.post('/',                    ctrl.criar);
router.get('/',                     ctrl.listar);
router.put('/grupo/:grupoId',        ctrl.atualizarGrupo);
router.delete('/grupo/:grupoId',    ctrl.excluirGrupo);
router.get('/:id',                  ctrl.buscarPorId);
router.put('/:id',                  ctrl.editar);
router.put('/:id/status',           ctrl.alterarStatus);
router.post('/:id/concluir',        ctrl.concluir);
router.delete('/:id',               ctrl.excluir);

module.exports = router;
