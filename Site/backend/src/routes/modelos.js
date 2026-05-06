const router = require('express').Router();
const ctrl   = require('../controllers/modelosController');
const auth   = require('../middleware/auth');

router.use(auth);

router.get('/',              ctrl.listar);
router.post('/',             ctrl.upload);
router.get('/:id/download',  ctrl.download);
router.put('/:id',           ctrl.atualizar);
router.put('/:id/desativar', ctrl.desativar);

module.exports = router;
