const ProgramacionClase = require('../models/ProgramacionClase');
const ProgramacionProfesor = require("../models/ProgramacionProfesor")
const mongoose = require("mongoose")

// GET - Obtener todas las programaciones de profesores
exports.getProgramacionesProfesores = async (req, res) => {
  try {
    const programaciones = await ProgramacionProfesor.find()
      .populate("profesor", "nombres apellidos email especialidades color")
      .lean()

    // Filtrar programacionesClases si está vacío
    const programacionesFiltradas = programaciones.map((prog) => {
      if (prog.programacionesClases && prog.programacionesClases.length === 0) {
        const { programacionesClases, ...resto } = prog
        return resto
      }
      return prog
    })

    res.json(programacionesFiltradas)
  } catch (error) {
    console.error("Error al obtener programaciones:", error)
    res.status(500).json({ message: error.message })
  }
}

// GET - Obtener programación de profesor por ID
exports.getProgramacionProfesorById = async (req, res) => {
  try {
    let programacion = null

    // Intenta buscar como ObjectId si es válido
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      programacion = await ProgramacionProfesor.findById(req.params.id)
        .populate("profesor", "nombres apellidos email especialidades color")
        .populate("programacionesClases")
    }

    // Si no encontró y el id es string, busca por string
    if (!programacion) {
      programacion = await ProgramacionProfesor.findOne({ _id: req.params.id })
        .populate("profesor", "nombres apellidos email especialidades color")
        .populate("programacionesClases")
    }

    if (programacion) {
      res.json(programacion)
    } else {
      res.status(404).json({ message: "Programación de profesor no encontrada" })
    }
  } catch (error) {
    console.error("Error al obtener programación por ID:", error)
    res.status(500).json({ message: error.message })
  }
}

// GET - Obtener programaciones por profesor
exports.getProgramacionesByProfesor = async (req, res) => {
  try {
    const programaciones = await ProgramacionProfesor.find({ profesor: req.params.profesorId })
      .populate("profesor", "nombres apellidos email especialidades color")
      .populate("programacionesClases")
    res.json(programaciones)
  } catch (error) {
    console.error("Error al obtener programaciones por profesor:", error)
    res.status(500).json({ message: error.message })
  }
}

// GET - Obtener programaciones por estado
exports.getProgramacionesByEstado = async (req, res) => {
  try {
    const programaciones = await ProgramacionProfesor.find({ estado: req.params.estado })
      .populate("profesor", "nombres apellidos email especialidades color")
      .populate("programacionesClases")
    res.json(programaciones)
  } catch (error) {
    console.error("Error al obtener programaciones por estado:", error)
    res.status(500).json({ message: error.message })
  }
}

// POST - Crear nueva programación de profesor
exports.createProgramacionProfesor = async (req, res) => {
  try {
    const { horariosPorDia, profesor, motivo } = req.body

    // Validar que profesor exista y sea un string no vacío
    if (!profesor || typeof profesor !== "string" || profesor.trim() === "") {
      return res.status(400).json({ message: "El campo 'profesor' es obligatorio y debe ser un ID válido." })
    }

    // Validar que los horarios por día estén configurados
    if (!horariosPorDia || !Array.isArray(horariosPorDia) || horariosPorDia.length === 0) {
      return res.status(400).json({ message: "Debe configurar al menos un horario por día." })
    }

    // Validar cada horario por día
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    const validDays = ["L", "M", "X", "J", "V", "S", "D"]
    
    for (const horario of horariosPorDia) {
      if (!horario.dia || !validDays.includes(horario.dia)) {
        return res.status(400).json({ message: `Día inválido: ${horario.dia}. Debe ser: L, M, X, J, V, S, D` })
      }
      
      if (!horario.horaInicio || !timeRegex.test(horario.horaInicio)) {
        return res.status(400).json({ message: `Formato de hora de inicio inválido para ${horario.dia}. Use HH:MM` })
      }
      
      if (!horario.horaFin || !timeRegex.test(horario.horaFin)) {
        return res.status(400).json({ message: `Formato de hora de fin inválido para ${horario.dia}. Use HH:MM` })
      }
      
      // Validar que horaFin > horaInicio
      const [inicioHora, inicioMin] = horario.horaInicio.split(":").map(Number)
      const [finHora, finMin] = horario.horaFin.split(":").map(Number)
      const inicioTotal = inicioHora * 60 + inicioMin
      const finTotal = finHora * 60 + finMin
      
      if (finTotal <= inicioTotal) {
        return res.status(400).json({ message: `La hora de fin debe ser posterior a la hora de inicio para el día ${horario.dia}` })
      }
    }

    // Verificar que no exista una programación activa para el mismo profesor
    const existingProgramacion = await ProgramacionProfesor.findOne({
      profesor: profesor,
      estado: "activo",
    })

    if (existingProgramacion) {
      return res.status(400).json({
        message:
          "Ya existe una programación activa para este profesor. Debe cancelar o eliminar la programación existente primero.",
      })
    }

    const programacion = new ProgramacionProfesor({
      profesor,
      horariosPorDia,
      estado: "activo",
      motivo: motivo || null,
    })

    const nuevaProgramacion = await programacion.save()

    // Populate la respuesta para devolver datos completos
    const programacionCompleta = await ProgramacionProfesor.findById(nuevaProgramacion._id).populate(
      "profesor",
      "nombres apellidos email especialidades color",
    )

    res.status(201).json(programacionCompleta)
  } catch (error) {
    console.error("Error al crear programación:", error)
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }
    res.status(400).json({ message: error.message })
  }
}

// PATCH - Actualizar estado de programación
exports.updateEstadoProgramacion = async (req, res) => {
  try {
    const { estado, motivo } = req.body

    if (!["activo", "cancelado"].includes(estado)) {
      return res.status(400).json({ message: "Estado inválido. Debe ser: activo o cancelado" })
    }

    const programacion = await ProgramacionProfesor.findById(req.params.id)

    if (!programacion) {
      return res.status(404).json({ message: "Programación no encontrada" })
    }

    programacion.estado = estado
    if (motivo !== undefined) {
      programacion.motivo = motivo
    }

    const programacionActualizada = await programacion.save()

    // Populate la respuesta
    const programacionCompleta = await ProgramacionProfesor.findById(programacionActualizada._id).populate(
      "profesor",
      "nombres apellidos email especialidades color",
    )

    res.json(programacionCompleta)
  } catch (error) {
    console.error("Error al actualizar estado:", error)
    res.status(400).json({ message: error.message })
  }
}

// PUT - Actualizar programación de profesor
exports.updateProgramacionProfesor = async (req, res) => {
  try {
    let programacion = null

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      programacion = await ProgramacionProfesor.findById(req.params.id)
    }

    if (!programacion) {
      programacion = await ProgramacionProfesor.findOne({ _id: req.params.id })
    }

    if (!programacion) {
      return res.status(404).json({ message: "Programación de profesor no encontrada" })
    }

    // Validar datos si se están actualizando
    const { horariosPorDia, profesor } = req.body

    if (horariosPorDia) {
      if (!Array.isArray(horariosPorDia) || horariosPorDia.length === 0) {
        return res.status(400).json({ message: "Debe configurar al menos un horario por día." })
      }

      // Validar cada horario por día
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      const validDays = ["L", "M", "X", "J", "V", "S", "D"]
      
      for (const horario of horariosPorDia) {
        if (!horario.dia || !validDays.includes(horario.dia)) {
          return res.status(400).json({ message: `Día inválido: ${horario.dia}. Debe ser: L, M, X, J, V, S, D` })
        }
        
        if (!horario.horaInicio || !timeRegex.test(horario.horaInicio)) {
          return res.status(400).json({ message: `Formato de hora de inicio inválido para ${horario.dia}. Use HH:MM` })
        }
        
        if (!horario.horaFin || !timeRegex.test(horario.horaFin)) {
          return res.status(400).json({ message: `Formato de hora de fin inválido para ${horario.dia}. Use HH:MM` })
        }
        
        // Validar que horaFin > horaInicio
        const [inicioHora, inicioMin] = horario.horaInicio.split(":").map(Number)
        const [finHora, finMin] = horario.horaFin.split(":").map(Number)
        const inicioTotal = inicioHora * 60 + inicioMin
        const finTotal = finHora * 60 + finMin
        
        if (finTotal <= inicioTotal) {
          return res.status(400).json({ message: `La hora de fin debe ser posterior a la hora de inicio para el día ${horario.dia}` })
        }
      }
    }

    // Si se está cambiando el profesor, verificar que no tenga otra programación activa
    if (profesor && profesor !== String(programacion.profesor) && req.body.estado !== "cancelado") {
      const existingProgramacion = await ProgramacionProfesor.findOne({
        profesor: profesor,
        estado: "activo",
        _id: { $ne: req.params.id },
      })

      if (existingProgramacion) {
        return res.status(400).json({
          message: "El profesor seleccionado ya tiene una programación activa.",
        })
      }
    }

    // Actualizar campos
    Object.assign(programacion, req.body)

    const programacionActualizada = await programacion.save()

    // Populate la respuesta
    const programacionCompleta = await ProgramacionProfesor.findById(programacionActualizada._id).populate(
      "profesor",
      "nombres apellidos email especialidades color",
    )

    res.json(programacionCompleta)
  } catch (error) {
    console.error("Error al actualizar programación:", error)
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: errors.join(", ") })
    }
    res.status(400).json({ message: error.message })
  }
}

// DELETE - Eliminar programación de profesor
exports.deleteProgramacionProfesor = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar si hay alguna clase con beneficiarios asignados a esta programación de profesor
    const claseConEstudiantes = await ProgramacionClase.findOne({
      programacionProfesor: id,
      beneficiarios: { $exists: true, $not: { $size: 0 } }
    });

    if (claseConEstudiantes) {
      return res.status(400).json({
        message: "No se puede eliminar la programación del profesor porque tiene clases con estudiantes asignados."
      });
    }

    // Si no hay clases con estudiantes, eliminar la programación
    const deleted = await ProgramacionProfesor.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Programación de profesor no encontrada" });
    }

    res.json({ message: "Programación de profesor eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar programación de profesor:", error);
    res.status(500).json({ message: "Error al eliminar la programación de profesor" });
  }
};
