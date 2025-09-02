const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  metodoPago: {
    type: String,
    required: true,
    trim: true
  },
  ventas: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venta',
    required: true
  },
  fechaPago: {
    type: Date,
    default: Date.now,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'completado', 'fallido', 'cancelado', 'pagado', 'anulado'],
    default: 'completado',
    required: true
  },
  valor_total: {
    type: Number,
    required: false
  },
  descripcion: {
    type: String,
    trim: true,
    required: false
  },
  numeroTransaccion: {
    type: String,
    trim: true,
    required: false
  }
}, {
  timestamps: true,
  collection: 'pagos'
});

// Virtual para información de la venta (opcional, puedes mantenerlo si lo necesitas)
pagoSchema.virtual('infoVenta').get(function() {
  if (this.ventas) {
    return {
      _id: this.ventas._id,
      tipo: this.ventas.tipo || 'Sin tipo',
      fechaInicio: this.ventas.fechaInicio,
      fechaFin: this.ventas.fechaFin,
      estado: this.ventas.estado || 'Sin estado',
      valor_total: this.ventas.valor_total || 0,
      beneficiario: this.ventas.beneficiarioId && this.ventas.beneficiarioId.clienteId !== this.ventas.beneficiarioId._id
        ? {
            nombre: this.ventas.beneficiarioId.nombre,
            apellido: this.ventas.beneficiarioId.apellido,
            tipoDocumento: this.ventas.beneficiarioId.tipo_de_documento,
            numeroDocumento: this.ventas.beneficiarioId.numero_de_documento,
            telefono: this.ventas.beneficiarioId.telefono,
            direccion: this.ventas.beneficiarioId.direccion
          }
        : null
    };
  }
  return null;
});

// Configuración para incluir virtuals en JSON
pagoSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

pagoSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

// Método estático para buscar con detalles (opcional)
pagoSchema.statics.buscarConDetalles = function() {
  return this.find()
    .populate({
      path: 'ventas',
      populate: {
        path: 'beneficiarioId',
        model: 'Beneficiario'
      }
    })
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Pago', pagoSchema, 'pagos');