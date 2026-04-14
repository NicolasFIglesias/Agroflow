const router = require('express').Router();
const ctrl   = require('../controllers/clientesController');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

// CRUD principal
router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.buscarPorId);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);

// Cônjuge
router.put('/:id/conjuge',    ctrl.upsertConjuge);
router.delete('/:id/conjuge', ctrl.excluirConjuge);

// Contas bancárias
router.post('/:id/contas',              ctrl.criarConta);
router.put('/:id/contas/:contaId',      ctrl.editarConta);
router.delete('/:id/contas/:contaId',   ctrl.excluirConta);

// Timeline
router.get('/:id/timeline',  require('../controllers/timelineController').listar);
router.post('/:id/timeline', require('../controllers/timelineController').criar);

// Cofre de senhas
const cofre = require('../controllers/cofreController');
router.get('/:id/cofre',                     cofre.listar);
router.post('/:id/cofre',                    cofre.criar);
router.get('/:id/cofre/:cofreId/revelar',    cofre.revelar);
router.post('/:id/cofre/:cofreId/copiar',    cofre.copiar);
router.put('/:id/cofre/:cofreId',            cofre.editar);
router.delete('/:id/cofre/:cofreId',         cofre.excluir);
router.get('/:id/cofre/:cofreId/logs',       cofre.logs);

module.exports = router;
