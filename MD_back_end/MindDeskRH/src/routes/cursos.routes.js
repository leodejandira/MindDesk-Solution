const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

const { listarCursos, listarTodosCursos, enviarCurso, deletarCurso, concluirCurso, verificarPermissoes } = require('../controllers/cursos.controller');

// =========================================
// Rota do Funcionário
// =========================================
// Funcionário vê seus cursos
router.get('/', authMiddleware, listarCursos);

// Funcionário conclui o curso (Apenas authMiddleware, pois o funcionário precisa ter acesso)
router.post('/:id/concluir', authMiddleware, concluirCurso);

// =========================================
// Rotas do Admin/Gerente
// =========================================
router.get('/todos', authMiddleware, adminMiddleware, listarTodosCursos);
router.post('/', authMiddleware, adminMiddleware, enviarCurso);
router.delete('/:id', authMiddleware, adminMiddleware, deletarCurso);
router.get('/verificar-acesso', authMiddleware, verificarPermissoes);

module.exports = router;