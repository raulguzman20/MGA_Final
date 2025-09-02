const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

// Rutas para usuarios
router.get('/', usuariosController.getUsuarios);

// RUTA TEMPORAL DE DIAGNÓSTICO: inspeccionar el validador de la colección y los índices
router.get('/_validator', async (req, res) => {
  try {
    const Usuario = require('../models/usuario');
    const list = await Usuario.db.db
      .listCollections({ name: Usuario.collection.name })
      .toArray();

    const options = (list && list[0] && list[0].options) || {};
    const { validator = null, validationLevel = null, validationAction = null } = options;

    let indexes = [];
    try {
      indexes = await Usuario.collection.indexes();
    } catch (e) {
      // noop
    }

    res.json({
      success: true,
      collection: Usuario.collection && Usuario.collection.name,
      validation: { validator, validationLevel, validationAction },
      indexes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

router.get('/:id', usuariosController.getUsuarioById);
router.post('/', usuariosController.createUsuario);
router.put('/:id', usuariosController.updateUsuario);
router.delete('/:id', usuariosController.deleteUsuario);

module.exports = router;