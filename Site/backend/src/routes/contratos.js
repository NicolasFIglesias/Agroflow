const router = require('express').Router();
const ctrl   = require('../controllers/contratosController');
const rasc   = require('../controllers/rascunhosController');
const auth   = require('../middleware/auth');

router.use(auth);

// Rascunhos e utilitários (antes de /:id para não conflitar)
router.get('/proximo-numero', ctrl.proximoNumero);
router.post('/rascunho',      rasc.salvar);
router.get('/rascunho',       rasc.buscar);
router.delete('/rascunho/:id', rasc.excluir);

// CRUD principal
router.get('/',              ctrl.listar);
router.post('/',             ctrl.criar);
router.get('/:id',           ctrl.buscarPorId);
router.put('/:id',           ctrl.atualizar);
router.get('/:id/download',  ctrl.download);
router.post('/:id/duplicar', ctrl.duplicar);
router.put('/:id/status',    ctrl.alterarStatus);
router.delete('/:id',        ctrl.excluir);

module.exports = router;
