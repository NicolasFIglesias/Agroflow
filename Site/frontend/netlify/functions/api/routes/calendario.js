const router = require('express').Router();
const ctrl   = require('../controllers/calendarioController');
const auth   = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.obter);

module.exports = router;
