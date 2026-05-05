const router       = require('express').Router();
const ctrl         = require('../controllers/clientesController');
const auth         = require('../middleware/auth');
const timelineCtrl = require('../controllers/timelineController');
const cofreCtrl    = require('../controllers/cofreController');

router.use(auth);

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.buscarPorId);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);

router.put('/:id/conjuge',    ctrl.upsertConjuge);
router.delete('/:id/conjuge', ctrl.excluirConjuge);

// Contas bancárias
router.get('/:id/contas',             ctrl.listarContas);
router.post('/:id/contas',            ctrl.criarConta);
router.put('/:id/contas/:contaId',    ctrl.editarConta);
router.delete('/:id/contas/:contaId', ctrl.excluirConta);

// Timeline
router.get('/:id/timeline',  timelineCtrl.listar);
router.post('/:id/timeline', timelineCtrl.criar);

// Cofre de senhas
router.get('/:id/cofre',                  cofreCtrl.listar);
router.post('/:id/cofre',                 cofreCtrl.criar);
router.get('/:id/cofre/:cofreId/revelar', cofreCtrl.revelar);
router.post('/:id/cofre/:cofreId/copiar', cofreCtrl.copiar);
router.put('/:id/cofre/:cofreId',         cofreCtrl.editar);
router.delete('/:id/cofre/:cofreId',      cofreCtrl.excluir);

module.exports = router;
