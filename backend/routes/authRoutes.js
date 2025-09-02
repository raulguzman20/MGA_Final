
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoint para login
router.post('/login', authController.login);

// Endpoint para recuperar contraseña
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
