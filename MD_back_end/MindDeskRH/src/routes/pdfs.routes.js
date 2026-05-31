const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');
const { listarPdfs, uploadPdf, deletarPdf } = require('../controllers/pdfs.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authMiddleware, adminMiddleware, listarPdfs);
router.post('/upload', authMiddleware, adminMiddleware, upload.single('arquivo'), uploadPdf);
router.delete('/:id', authMiddleware, adminMiddleware, deletarPdf);

module.exports = router;