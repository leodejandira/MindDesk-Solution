const express = require('express');
const router = express.Router();
const aiService = require('../services/ai_service');
// 1. Importe o middleware de autenticação
const { authMiddleware } = require('../middlewares/auth.middleware');

// 2. Proteja a rota com o middleware
router.post('/perguntar', authMiddleware, async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ erro: "A pergunta é obrigatória." });
    }

    try {
        // 3. Pega os dados REAIS do token JWT (req.user)
        const resultado = await aiService.askAI({ 
            query: query, 
            tenant_id: Number(req.user.tenant_id), // Converte para inteiro (exigência do Python)
            usuario_id: String(req.user.id).trim(), // Envia o ID real do Supabase
            role: req.user.role || "viewer",        // Envia a role real (ex: admin, viewer)
            current_agent: "main"                   // Mantém o agente principal
        });
        
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;