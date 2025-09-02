const mongoose = require("mongoose")

const programacionClaseSchema = new mongoose.Schema(
  {
    programacionProfesor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramacionProfesor",
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "La programación del profesor es requerida"],
    },
    dia: {
      type: String,
      enum: {
        values: ["L", "M", "X", "J", "V", "S", "D"],
        message: "Día inválido. Debe ser: L, M, X, J, V, S, D",
      },
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "El día es requerido"],
    },
    horaInicio: {
      type: String,
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "La hora de inicio es requerida"],
    },
    horaFin: {
      type: String,
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "La hora de fin es requerida"],
    },
    especialidad: {
      type: String,
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "La especialidad es requerida"],
      trim: true,
    },
    estado: {
      type: String,
      default: "programada",
    },
    asistencia: {
      type: Object,
      default: null,
    },
    motivo: {
      type: String,
      maxlength: [500, "El motivo no puede exceder 500 caracteres"],
      trim: true,
      default: null,
    },
    beneficiarios: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venta",
    }],
    observaciones: {
      type: String,
      maxlength: [1000, "Las observaciones no pueden exceder 1000 caracteres"],
      trim: true,
    },
    aula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Aula",
      // ✅ TEMPORALMENTE REMOVIDO: required: [true, "El aula es requerida"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Índices
programacionClaseSchema.index({ programacionProfesor: 1 })
programacionClaseSchema.index({ estado: 1 })
programacionClaseSchema.index({ dia: 1, horaInicio: 1 })
programacionClaseSchema.index({ beneficiarios: 1 })

module.exports = mongoose.model("ProgramacionClase", programacionClaseSchema, "programacion_de_clases")
