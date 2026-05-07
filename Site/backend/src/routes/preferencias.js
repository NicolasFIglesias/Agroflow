const router = require('express').Router();
const ctrl   = require('../controllers/preferenciasController');
const auth   = require('../middleware/auth');

router.use(auth);
router.get('/',         ctrl.buscar);
router.put('/',         ctrl.salvar);
router.get('/usuario',  ctrl.buscarUsuario);
router.put('/usuario',  ctrl.salvarUsuario);

module.exports = router;
