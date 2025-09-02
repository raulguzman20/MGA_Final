const Asistencia = require('../models/Asistencia');
const ProgramacionClase = require('../models/ProgramacionClase');
const Venta = require('../models/Venta');
const mongoose = require('mongoose');

// GET - Obtener todas las asistencias con populate
exports.getAsistencias = async (req, res) => {
  try {
    console.log("🔄 Obteniendo todas las asistencias...");
    
    const asistencias = await Asistencia.find()
      .populate({
        path: 'ventaId',
        populate: [
          {
            path: 'beneficiarioId',
            select: 'nombre apellido'
          },
          {
            path: 'cursoId',
            select: 'nombre'
          }
        ]
      })
      .populate({
        path: 'programacionClaseId',
        populate: [
          {
            path: 'programacionProfesor',
            populate: {
              path: 'profesor',
              select: 'nombres apellidos'
            }
          },
          {
            path: 'aula',
            select: 'numeroAula'
          }
        ]
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Asistencias encontradas: ${asistencias.length}`);
    
    // Log de muestra para debug
    if (asistencias.length > 0) {
      console.log("📋 Muestra de datos:", {
        total: asistencias.length,
        primera: asistencias[0],
        id: asistencias[0]._id,
        ventaId: asistencias[0].ventaId?._id,
        beneficiario: asistencias[0].ventaId?.beneficiarioId ? 
          `${asistencias[0].ventaId.beneficiarioId.nombre} ${asistencias[0].ventaId.beneficiarioId.apellido}` : 'Sin beneficiario',
        curso: asistencias[0].ventaId?.cursoId ? 
          (typeof asistencias[0].ventaId.cursoId === 'object' ? asistencias[0].ventaId.cursoId.nombre : asistencias[0].ventaId.cursoId) : 'Sin curso',
        programacionClaseId: asistencias[0].programacionClaseId?._id,
        especialidad: asistencias[0].programacionClaseId?.especialidad,
        estado: asistencias[0].estado
      });
    } else {
      console.log("⚠️ No se encontraron registros de asistencia");
    }

    res.json(asistencias);
  } catch (error) {
    console.error("❌ Error al obtener asistencias:", error);
    res.status(500).json({ 
      message: error.message,
      stack: error.stack 
    });
  }
};

// GET - Obtener asistencias por ID de programación de clase
exports.getAsistenciasByProgramacionClase = async (req, res) => {
  try {
    const asistencias = await Asistencia.find({ programacionClaseId: req.params.programacionClaseId })
      .populate({
        path: 'ventaId',
        populate: {
          path: 'beneficiarioId',
          select: 'nombre apellido'
        }
      })
      .populate({
        path: 'programacionClaseId',
        populate: [
          {
            path: 'programacionProfesor',
            populate: {
              path: 'profesor',
              select: 'nombres apellidos'
            }
          },
          {
            path: 'aula',
            select: 'numeroAula'
          }
        ]
      });
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Obtener asistencias por ID de venta (beneficiario)
exports.getAsistenciasByVenta = async (req, res) => {
  try {
    const asistencias = await Asistencia.find({ ventaId: req.params.ventaId })
      .populate({
        path: 'ventaId',
        populate: {
          path: 'beneficiarioId',
          select: 'nombre apellido'
        }
      })
      .populate({
        path: 'programacionClaseId',
        populate: [
          {
            path: 'programacionProfesor',
            populate: {
              path: 'profesor',
              select: 'nombres apellidos'
            }
          },
          {
            path: 'aula',
            select: 'numeroAula'
          }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Crear registros de asistencia para una clase programada
exports.createAsistenciasForClase = async (req, res) => {
  try {
    const { programacionClaseId } = req.params;
    // Obtener la clase programada
    const programacionClase = await ProgramacionClase.findById(programacionClaseId);
    if (!programacionClase) {
      return res.status(404).json({ message: 'Clase programada no encontrada' });
    }
    // Crear registros de asistencia para cada beneficiario
    const asistencias = await Promise.all(
      programacionClase.beneficiarios.map(async (ventaId) => {
        // Verificar si ya existe un registro de asistencia
        const asistenciaExistente = await Asistencia.findOne({
          ventaId,
          programacionClaseId
        });
        if (!asistenciaExistente) {
          return Asistencia.create({
            ventaId,
            programacionClaseId,
            estado: 'no_asistio',
            motivo: null
          });
        }
        return asistenciaExistente;
      })
    );
    res.status(201).json(asistencias);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT - Actualizar estado de asistencia
exports.updateAsistencia = async (req, res) => {
  try {
    const { estado, motivo } = req.body;
    if (!['asistio', 'no_asistio'].includes(estado)) {
      return res.status(400).json({ message: 'Estado de asistencia inválido' });
    }
    const asistencia = await Asistencia.findById(req.params.id);
    if (!asistencia) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }
    asistencia.estado = estado;
    asistencia.motivo = motivo || null;
    const asistenciaActualizada = await asistencia.save();
    res.json(asistenciaActualizada);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT - Actualizar asistencias en lote para una clase
exports.updateAsistenciasBulk = async (req, res) => {
  try {
    const { programacionClaseId } = req.params;
    const { asistencias } = req.body;
    
    console.log("📥 Datos recibidos en updateAsistenciasBulk:", {
      programacionClaseId,
      asistencias
    });

    // Validar que programacionClaseId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(programacionClaseId)) {
      return res.status(400).json({ 
        message: 'programacionClaseId debe ser un ObjectId válido',
        received: programacionClaseId
      });
    }

    if (!Array.isArray(asistencias)) {
      return res.status(400).json({ 
        message: 'Se requiere un array de asistencias',
        received: typeof asistencias,
        data: req.body
      });
    }

    if (asistencias.length === 0) {
      return res.status(400).json({ 
        message: 'El array de asistencias no puede estar vacío'
      });
    }

    // Verificar que la clase programada exista
    const claseProgramada = await ProgramacionClase.findById(programacionClaseId);
    if (!claseProgramada) {
      return res.status(404).json({ 
        message: 'Clase programada no encontrada',
        programacionClaseId
      });
    }

    // ✅ SOLUCIÓN SIMPLIFICADA: Usar upsert con findOneAndUpdate
    const actualizaciones = await Promise.all(
      asistencias.map(async ({ ventaId, estado, motivo }, index) => {
        try {
          console.log(`🔍 Procesando asistencia ${index}:`, { ventaId, estado, motivo, programacionClaseId });
          
          // Validar ventaId
          if (!mongoose.Types.ObjectId.isValid(ventaId)) {
            throw new Error(`ventaId inválido: ${ventaId}`);
          }
          
          // Validar estado
          if (!['asistio', 'no_asistio'].includes(estado)) {
            throw new Error(`Estado inválido: ${estado}`);
          }
          
          // ✅ USAR UPSERT: Crear o actualizar en una sola operación
          const asistenciaActualizada = await Asistencia.findOneAndUpdate(
            { 
              ventaId: new mongoose.Types.ObjectId(ventaId), 
              programacionClaseId: new mongoose.Types.ObjectId(programacionClaseId) 
            },
            { 
              $set: { 
                estado, 
                motivo: motivo || null,
                updatedAt: new Date()
              }
            },
            {
              upsert: true, // Crear si no existe
              new: true, // Retornar el documento actualizado
              runValidators: false // Deshabilitar validaciones para evitar problemas
            }
          );
          
          console.log(`✅ Asistencia procesada: ${asistenciaActualizada._id}`);
          return asistenciaActualizada;
          
        } catch (error) {
          console.error(`❌ Error procesando asistencia ${index}:`, error);
          throw new Error(`Error al procesar asistencia ${index}: ${error.message}`);
        }
      })
    );
    
    console.log("✅ Asistencias procesadas exitosamente:", actualizaciones.length);
    res.json(actualizaciones);
  } catch (error) {
    console.error("❌ Error en updateAsistenciasBulk:", error);
    res.status(400).json({ 
      message: error.message,
      stack: error.stack
    });
  }
};