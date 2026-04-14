const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const authmw  = require('../middleware/auth');

router.post('/login',              ctrl.login);
router.post('/register',           ctrl.register);
router.get('/me',                  authmw, ctrl.me);
router.post('/convite',            authmw, ctrl.gerarConvite);
router.get('/convite/:token',      ctrl.verificarConvite);
router.post('/recuperar-senha',    ctrl.recuperarSenha);
router.post('/nova-senha',         ctrl.novaSenha);

module.exports = router;
