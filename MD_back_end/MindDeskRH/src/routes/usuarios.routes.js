const express = require('express');
const router = express.Router();

const { authMiddleware, adminMiddleware } = require('../middlewares/auth.middleware');

const {
  getUsuarios,
  registerUsuario,
  getUsuarioByEmail,
  updateUsuario,
  deleteUsuario
} = require('../controllers/usuarios_controller');

router.get('/', authMiddleware, adminMiddleware, getUsuarios);
router.get('/busca', authMiddleware, adminMiddleware, getUsuarioByEmail);
router.post('/register', authMiddleware, adminMiddleware, registerUsuario);
router.put('/', authMiddleware, adminMiddleware, updateUsuario);
router.delete('/', authMiddleware, adminMiddleware, deleteUsuario);
module.exports = router;