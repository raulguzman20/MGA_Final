const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');

// GET - Obtener todas las asistencias
router.get('/', asistenciaController.getAsistencias);

// GET - Obtener asistencias por ID de programación de clase
router.get('/programacion/:programacionClaseId', asistenciaController.getAsistenciasByProgramacionClase);

// GET - Obtener asistencias por ID de venta (beneficiario)
router.get('/venta/:ventaId', asistenciaController.getAsistenciasByVenta);

// POST - Crear registros de asistencia para una clase programada
router.post('/programacion/:programacionClaseId', asistenciaController.createAsistenciasForClase);

// PUT - Actualizar estado de asistencia
router.put('/:id', asistenciaController.updateAsistencia);

// PUT - Actualizar asistencias en lote para una clase
router.put('/programacion/:programacionClaseId/bulk', asistenciaController.updateAsistenciasBulk);

module.exports = router;