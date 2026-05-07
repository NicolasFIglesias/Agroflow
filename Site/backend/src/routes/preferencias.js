const router = require('express').Router();
const ctrl   = require('../controllers/preferenciasController');
const auth   = require('../middleware/auth');

router.use(auth);
router.get('/',  ctrl.buscar);
router.put('/',  ctrl.salvar);

module.exports = router;
