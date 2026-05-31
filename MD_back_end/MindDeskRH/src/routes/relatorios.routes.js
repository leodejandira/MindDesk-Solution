const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');
const {
    relatorioFaltas,
    relatorioAtrasos,
    relatorioBancoHoras,
    relatorioFerias,
    relatorioAfastamentos,
    listarRelatoriosPA
} = require('../controllers/relatorios.controller');

router.get('/faltas', authMiddleware, adminMiddleware, relatorioFaltas);
router.get('/atrasos', authMiddleware, adminMiddleware, relatorioAtrasos);
router.get('/banco-horas', authMiddleware, adminMiddleware, relatorioBancoHoras);
router.get('/ferias', authMiddleware, adminMiddleware, relatorioFerias);
router.get('/afastamentos', authMiddleware, adminMiddleware, relatorioAfastamentos);
router.get('/relatorios-pa', authMiddleware, adminMiddleware, listarRelatoriosPA);

module.exports = router;