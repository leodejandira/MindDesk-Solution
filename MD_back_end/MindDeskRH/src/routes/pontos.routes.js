const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');
const {
    registrarPonto,
    listarPontos,
    getTicketPonto,
    registrarPontoSelfie,
    listarLocais,
    criarLocal,
    desativarLocal,
    listarRevisao,
    validarPonto
} = require('../controllers/pontos.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Rota para pegar o token temporário (o ticket do QR Code)
router.get('/ticket', authMiddleware, getTicketPonto);

// Rota para registrar o ponto usando o ticket
router.post('/registrar', authMiddleware, registrarPonto);

// Ponto com selfie + geolocalização
router.post('/selfie', authMiddleware, upload.single('foto'), registrarPontoSelfie);

// Locais de trabalho (geofence)
router.get('/locais', authMiddleware, listarLocais);
router.post('/locais', authMiddleware, adminMiddleware, criarLocal);
router.delete('/locais/:id', authMiddleware, adminMiddleware, desativarLocal);

// Revisão dos pontos com selfie pelo gerente
router.get('/revisao', authMiddleware, adminMiddleware, listarRevisao);
router.patch('/:id/validacao', authMiddleware, adminMiddleware, validarPonto);

// Rota para listar os pontos
router.get('/', authMiddleware, listarPontos);

module.exports = router;
