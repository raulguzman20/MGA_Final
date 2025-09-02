const ProgramacionClase = require("../models/ProgramacionClase")
const ProgramacionProfesor = require("../models/ProgramacionProfesor")
const mongoose = require("mongoose")
const Aula = require("../models/Aula");

// POST - Crear nueva programación de clase
const createProgramacion = async (req, res) => {
  try {
    const {
      programacionProfesor,
      dia,
      horaInicio,
      horaFin,
      especialidad,
      beneficiarios = [],
      observaciones,
      motivo = null,
      estado = "programada",
      aula,
    } = req.body

    console.log("📝 Datos recibidos:", {
      programacionProfesor,
      dia,
      horaInicio,
      horaFin,
      especialidad,
      beneficiarios,
      estado,
      aula,
    })

    // Validaciones básicas
    if (!programacionProfesor || !dia || !horaInicio || !horaFin || !especialidad || !aula || !beneficiarios.length) {
      return res.status(400).json({
        message: "Faltan campos requeridos",
        camposFaltantes: {
          programacionProfesor: !programacionProfesor,
          dia: !dia,
          horaInicio: !horaInicio,
          horaFin: !horaFin,
          especialidad: !especialidad,
          aula: !aula,
          beneficiarios: !beneficiarios.length,
        },
      })
    }

    // Crear con la nueva estructura
    const datosParaGuardar = {
      programacionProfesor: new mongoose.Types.ObjectId(programacionProfesor),
      dia,
      horaInicio,
      horaFin,
      especialidad: especialidad.trim(),
      estado,
      beneficiarios: beneficiarios
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
      observaciones: observaciones?.trim() || null,
      motivo,
      aula: new mongoose.Types.ObjectId(aula),
    }

    console.log("💾 Datos para guardar:", datosParaGuardar)

    const nuevaProgramacion = new ProgramacionClase(datosParaGuardar)
    const programacionGuardada = await nuevaProgramacion.save()

    console.log("✅ Programación creada:", programacionGuardada._id)

    // Populate para respuesta
    const programacionCompleta = await ProgramacionClase.findById(programacionGuardada._id)
      .populate({
        path: "programacionProfesor",
        populate: {
          path: "profesor",
          select: "nombres apellidos especialidades color",
        },
      })
      .populate({
        path: "beneficiarios",
        populate: [
          { path: "beneficiarioId", select: "nombre apellido" },
          { path: "cursoId", select: "nombre" }
        ]
      })
      .populate({
        path: "aula",
      })

    res.status(201).json(programacionCompleta)
  } catch (error) {
    console.error("❌ Error al crear programación:", error)

    if (error.name === "ValidationError") {
      const errores = Object.values(error.errors).map((err) => ({
        campo: err.path,
        mensaje: err.message,
        valorRecibido: err.value,
      }))

      return res.status(400).json({
        message: "Errores de validación",
        errores,
        datosRecibidos: req.body,
      })
    }

    res.status(500).json({
      message: "Error interno del servidor",
      error: error.message,
    })
  }
}

// GET - Obtener programaciones
const getProgramaciones = async (req, res) => {
  try {
    const programaciones = await ProgramacionClase.find()
      .populate({
        path: "programacionProfesor",
        populate: {
          path: "profesor",
          select: "nombres apellidos especialidades color correo",
        },
      })
      .populate({
        path: "beneficiarios",
        populate: [
          { path: "beneficiarioId", select: "nombre apellido numero_de_documento correo email" },
          { path: "cursoId", select: "nombre" }
        ]
      })
      .populate({
        path: "aula",
      })
      .sort({ createdAt: -1 })

    console.log(`📚 Obtenidas ${programaciones.length} programaciones`)
    res.json(programaciones)
  } catch (error) {
    console.error("Error al obtener programaciones:", error)
    res.status(500).json({ message: error.message })
  }
}

// PUT - Actualizar programación
const updateProgramacion = async (req, res) => {
  try {
    console.log("📝 Actualizando programación:", req.params.id)
    console.log("📋 Datos recibidos:", req.body)

    // ✅ SOLUCIÓN SIMPLE: Usar directamente la base de datos
    const db = mongoose.connection.db
    const collection = db.collection('programacion_de_clases')
    
    // Verificar que la programación existe
    const programacionExistente = await collection.findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id) 
    })
    
    if (!programacionExistente) {
      return res.status(404).json({ message: "Programación no encontrada" })
    }

    // Guardar el estado anterior
    const estadoAnterior = programacionExistente.estado;
    
    // Preparar datos para actualizar - SOLO los campos que se envían
    const datosActualizar = {}
    
    // Solo actualizar los campos que están en el body
    if (req.body.estado !== undefined) datosActualizar.estado = req.body.estado
    if (req.body.horaInicio !== undefined) datosActualizar.horaInicio = req.body.horaInicio
    if (req.body.horaFin !== undefined) datosActualizar.horaFin = req.body.horaFin
    if (req.body.especialidad !== undefined) datosActualizar.especialidad = req.body.especialidad
    if (req.body.observaciones !== undefined) datosActualizar.observaciones = req.body.observaciones
    if (req.body.motivo !== undefined) datosActualizar.motivo = req.body.motivo
    
    // Si vienen beneficiarios en el body, convertirlos a ObjectIds
    if (req.body.beneficiarios && Array.isArray(req.body.beneficiarios)) {
      datosActualizar.beneficiarios = req.body.beneficiarios
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id))
    }

    console.log("🔧 Datos a actualizar:", datosActualizar)

    // Usar updateOne directamente en la colección
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: datosActualizar }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Programación no encontrada" })
    }

    console.log("✅ Actualización exitosa:", result)

    // Obtener la programación actualizada
    const programacionActualizada = await collection.findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id) 
    })
    
    if (!programacionActualizada) {
      return res.status(404).json({ message: "Programación no encontrada después de actualizar" })
    }

    console.log("✅ Programación actualizada:", {
      id: programacionActualizada._id,
      estadoAnterior,
      estadoNuevo: programacionActualizada.estado,
      aula: programacionActualizada.aula
    })

    // Si el estado cambió a 'ejecutada', liberar el aula
    if (estadoAnterior !== 'ejecutada' && programacionActualizada.estado === 'ejecutada' && programacionActualizada.aula) {
      console.log("🔓 Liberando aula:", programacionActualizada.aula)
      const aulaCollection = db.collection('aulas')
      await aulaCollection.updateOne(
        { _id: programacionActualizada.aula },
        { $set: { estado: 'Disponible' } }
      )
      console.log("✅ Aula liberada correctamente")
    }

    // Devuelve la programación con populate completo usando el modelo
    const programacionCompleta = await ProgramacionClase.findById(programacionActualizada._id)
      .populate({
        path: "programacionProfesor",
        populate: { path: "profesor", select: "nombres apellidos especialidades color correo" },
      })
      .populate({
        path: "beneficiarios",
        populate: [
          { path: "beneficiarioId", select: "nombre apellido numero_de_documento correo email" },
          { path: "cursoId", select: "nombre" }
        ]
      })
      .populate({ path: "aula" })

    console.log("✅ Respuesta enviada con éxito")
    res.json(programacionCompleta)
  } catch (error) {
    console.error("❌ Error al actualizar programación:", error)
    
    res.status(400).json({ 
      message: "Error al actualizar programación", 
      error: error.message,
      stack: error.stack
    })
  }
}

// NUEVO: Endpoint específico para cambiar solo el estado
const updateEstado = async (req, res) => {
  try {
    console.log("📝 Actualizando solo estado:", req.params.id)
    console.log("📋 Nuevo estado:", req.body.estado)

    if (!req.body.estado) {
      return res.status(400).json({ message: "El estado es requerido" })
    }

    // ✅ SOLUCIÓN ULTRA SIMPLE: Usar directamente la base de datos
    const db = mongoose.connection.db
    const collection = db.collection('programacion_de_clases')
    
    // Preparar datos para actualizar
    const datosActualizar = { estado: req.body.estado }
    
    // Si viene motivo, agregarlo
    if (req.body.motivo !== undefined) {
      datosActualizar.motivo = req.body.motivo
    }
    
    console.log("🔧 Datos a actualizar:", datosActualizar)

    // Usar updateOne directamente en la colección
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: datosActualizar }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Programación no encontrada" })
    }

    console.log("✅ Estado actualizado exitosamente:", result)

    // Obtener la programación actualizada para verificar el aula
    const programacionActualizada = await collection.findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id) 
    })
    
    if (!programacionActualizada) {
      return res.status(404).json({ message: "Programación no encontrada después de actualizar" })
    }

    console.log("✅ Programación actualizada:", {
      id: programacionActualizada._id,
      estado: programacionActualizada.estado,
      aula: programacionActualizada.aula
    })

    // Si el estado cambió a 'ejecutada', liberar el aula
    if (programacionActualizada.estado === 'ejecutada' && programacionActualizada.aula) {
      console.log("🔓 Liberando aula:", programacionActualizada.aula)
      const aulaCollection = db.collection('aulas')
      await aulaCollection.updateOne(
        { _id: programacionActualizada.aula },
        { $set: { estado: 'Disponible' } }
      )
      console.log("✅ Aula liberada correctamente")
    }

    res.json({ 
      message: "Estado actualizado correctamente",
      estado: programacionActualizada.estado
    })
  } catch (error) {
    console.error("❌ Error al actualizar estado:", error)
    res.status(500).json({ 
      message: "Error al actualizar estado", 
      error: error.message,
      stack: error.stack
    })
  }
}

// DELETE - Eliminar programación
const deleteProgramacion = async (req, res) => {
  try {
    const programacion = await ProgramacionClase.findById(req.params.id)
    if (!programacion) {
      return res.status(404).json({ message: "Programación no encontrada" })
    }

    await programacion.deleteOne()
    res.json({ message: "Programación eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar programación:", error)
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  createProgramacion,
  getProgramaciones,
  updateProgramacion,
  updateEstado,
  deleteProgramacion,
}
