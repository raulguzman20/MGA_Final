const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Middleware para logging de la ruta de login
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] LOGIN REQUEST: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// POST /login - Endpoint principal de autenticación
router.post('/', loginController.login);

// POST /login/cambiar-rol - Endpoint para cambiar de rol
router.post('/cambiar-rol', loginController.cambiarRol);

module.exports = router;