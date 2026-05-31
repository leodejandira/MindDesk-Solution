const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');
const { listarAvisos, listarAvisosFuncionario } = require('../controllers/avisos.controller');

// Somente admin
router.get('/', authMiddleware, adminMiddleware, listarAvisos);

// Qualquer usuário logado
router.get('/meus', authMiddleware, listarAvisosFuncionario);

module.exports = router;