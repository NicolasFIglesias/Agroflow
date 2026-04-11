const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const authmw  = require('../middleware/auth');

router.post('/login',    ctrl.login);
router.post('/register', ctrl.register);
router.get('/me',        authmw, ctrl.me);

module.exports = router;
