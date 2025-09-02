const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Middleware para logging de rutas
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Body:', req.body);
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  next();
});

// Proteger todas las rutas de pagos con verificación de token
router.use(verifyToken);

// Rutas de pagos
router.get('/', pagoController.getPagos);
router.get('/debug', pagoController.debugPagos); // RUTA DE DEBUG
router.get('/debug/cliente/:clienteId', pagoController.debugCliente); // RUTA DE DEBUG PARA CLIENTE
router.get('/debug/pago/:id', async (req, res) => {
  try {
    const pago = await require('../models/Pago').findById(req.params.id)
      .populate({
        path: 'ventas',
        populate: [{
          path: 'beneficiarioId',
          model: 'Beneficiario'
        }]
      });

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    const pagoObj = pago.toObject();
    const beneficiario = pagoObj.ventas?.beneficiarioId;
    
    res.json({
      success: true,
      data: {
        pago: pagoObj,
        beneficiario: beneficiario,
        clienteId: beneficiario?.clienteId,
        debug: {
          clienteIdType: typeof beneficiario?.clienteId,
          clienteIdValue: beneficiario?.clienteId,
          beneficiarioId: beneficiario?._id,
          beneficiarioIdType: typeof beneficiario?._id,
          isSamePerson: beneficiario?.clienteId === beneficiario?._id?.toString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en debug de pago',
      error: error.message
    });
  }
});
router.get('/:id', pagoController.getPagoById);
router.post('/', checkRole(['administrador', 'secretaria', 'contador']), pagoController.createPago);
router.put('/:id', checkRole(['administrador', 'secretaria', 'contador']), pagoController.updatePago);
router.delete('/:id', checkRole(['administrador', 'secretaria', 'contador']), pagoController.deletePago);

// Ruta adicional para cambiar estado (restringida a roles con permisos)
router.patch('/:id/estado', checkRole(['administrador', 'secretaria', 'contador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    console.log(`Updating payment ${id} status to: ${estado}`);
    
    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'completado', 'fallido', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Los estados permitidos son: ' + estadosValidos.join(', ')
      });
    }
    
    const pago = await require('../models/Pago').findByIdAndUpdate(
      id,
      { estado },
      { new: true, runValidators: true }
    ).populate({
      path: 'venta',
      populate: {
        path: 'beneficiarioId',
        model: 'Beneficiario'
      }
    });

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: pago,
      message: 'Estado actualizado correctamente'
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del pago',
      error: error.message
    });
  }
});

module.exports = router;