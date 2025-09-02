const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({
  ventaId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Venta',
    description: 'Debe ser el ObjectId de una venta existente'
  },
  programacionClaseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'ProgramacionClase',
    description: 'Debe ser el ObjectId de la programación de clase correspondiente'
  },
  estado: {
    type: String,
    enum: ['asistio', 'no_asistio'],
    required: true,
    description: 'Debe ser uno de los valores permitidos'
  },
  motivo: {
    type: String,
    maxlength: 500,
    default: null,
    description: 'Motivo de inasistencia (opcional)',
    validate: {
      validator: function(v) {
        return v === null || typeof v === 'string';
      },
      message: 'El motivo debe ser null o un texto'
    }
  }
}, {
  timestamps: true
});

// ✅ TEMPORALMENTE COMENTADO: Índice único para evitar duplicados de asistencia para la misma venta y clase
// asistenciaSchema.index({ ventaId: 1, programacionClaseId: 1 }, { unique: true });

module.exports = mongoose.model('Asistencia', asistenciaSchema);