const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Ruta para enviar correo de bienvenida
router.post('/welcome', async (req, res) => {
  try {
    const { email, nombre, apellido, username, password } = req.body;
    
    if (!email || !nombre) {
      return res.status(400).json({ message: 'Email y nombre son requeridos' });
    }
    
    const result = await emailController.sendWelcomeEmail(email, nombre, apellido, username, password);
    
    if (result) {
      return res.status(200).json({ message: 'Correo de bienvenida enviado correctamente' });
    } else {
      return res.status(500).json({ message: 'Error al enviar el correo de bienvenida' });
    }
  } catch (error) {
    console.error('Error en la ruta de envío de correo de bienvenida:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;