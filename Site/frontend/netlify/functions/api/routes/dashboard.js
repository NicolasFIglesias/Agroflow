const router = require('express').Router();
const ctrl   = require('../controllers/dashboardController');
const { autenticar } = require('../middleware/auth');

router.use(autenticar);

router.get('/kpis',       ctrl.kpis);
router.get('/alertas',    ctrl.alertas);
router.get('/atividade',  ctrl.atividade);

module.exports = router;
