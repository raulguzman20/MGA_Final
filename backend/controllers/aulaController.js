const Aula = require('../models/Aula');
const ProgramacionClase = require('../models/ProgramacionClase');
const ProgramacionProfesor = require('../models/ProgramacionProfesor');

// GET - Get all classrooms
exports.getAulas = async (req, res) => {
  try {
    const aulas = await Aula.find();
    res.json(aulas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Get classroom by ID
exports.getAulaById = async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    if (aula) {
      res.json(aula);
    } else {
      res.status(404).json({ message: 'Classroom not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Create new classroom
exports.createAula = async (req, res) => {
  const aula = new Aula({
    numeroAula: req.body.numeroAula,
    capacidad: req.body.capacidad,
    estado: req.body.estado
  });

  try {
    const newAula = await aula.save();
    res.status(201).json(newAula);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT - Update classroom
exports.updateAula = async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    if (aula) {
      Object.assign(aula, req.body);
      const updatedAula = await aula.save();
      res.json(updatedAula);
    } else {
      res.status(404).json({ message: 'Classroom not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE - Delete classroom
exports.deleteAula = async (req, res) => {
  try {
    const aula = await Aula.findById(req.params.id);
    if (!aula) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Verificar si el aula está asociada a alguna programación
    // Buscar en programaciones de clases que puedan tener referencia al aula
    const programacionesClase = await ProgramacionClase.find({
      $or: [
        { aula: aula._id },
        { 'aula.numeroAula': aula.numeroAula }
      ]
    });

    // Buscar en programaciones de profesores que puedan tener referencia al aula
    const programacionesProfesor = await ProgramacionProfesor.find({
      $or: [
        { aula: aula._id },
        { 'aula.numeroAula': aula.numeroAula }
      ]
    });

    // Si hay programaciones asociadas, no permitir la eliminación
    if (programacionesClase.length > 0 || programacionesProfesor.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el aula porque está asociada a programaciones de clases. Considere cambiar su estado a "Inactivo" en lugar de eliminarla.' 
      });
    }

    // Si no hay programaciones asociadas, proceder con la eliminación
    await aula.deleteOne();
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    console.error('Error deleting aula:', error);
    res.status(500).json({ message: error.message });
  }
};