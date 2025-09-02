const express = require('express');
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyToken
} = require('../controllers/passwordResetController');

// Ruta para solicitar restablecimiento de contraseña
router.post('/forgot-password', forgotPassword);

// Ruta para restablecer contraseña con token
router.post('/reset-password', resetPassword);

// Ruta para verificar validez del token
router.get('/verify-token/:token', verifyToken);

module.exports = router;