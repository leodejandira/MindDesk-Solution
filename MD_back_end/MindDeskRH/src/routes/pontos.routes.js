const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
// Importando as 3 funções agora
const { 
    registrarPonto, 
    listarPontos, 
    getTicketPonto 
} = require('../controllers/pontos.controller');

// Rota para pegar o token temporário (o ticket do QR Code)
router.get('/ticket', authMiddleware, getTicketPonto);

// Rota para registrar o ponto usando o ticket
router.post('/registrar', authMiddleware, registrarPonto);

// Rota para listar os pontos
router.get('/', authMiddleware, listarPontos);

module.exports = router;