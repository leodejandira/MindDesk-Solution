const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');
const { listarAtestados, uploadAtestado, deletarAtestado } = require('../controllers/atestados.controller');
const atestadosController = require('../controllers/atestados.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authMiddleware, listarAtestados);
router.post('/upload', authMiddleware, upload.single('arquivo'), uploadAtestado);
router.delete('/:id', authMiddleware, adminMiddleware, deletarAtestado);
router.get('/pendentes', atestadosController.listarPendentes);
router.patch('/:id/status', atestadosController.atualizarStatus);

module.exports = router;