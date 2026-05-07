const router = require('express').Router();
const ctrl   = require('../controllers/servicosController');
const auth   = require('../middleware/auth');
router.use(auth);
router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.editar);
router.delete('/:id', ctrl.excluir);
module.exports = router;
