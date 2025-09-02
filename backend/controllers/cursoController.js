const Curso = require('../models/Curso');

// GET - Get all courses
exports.getCursos = async (req, res) => {
  try {
    const cursos = await Curso.find();
    res.json(cursos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Get course by ID
exports.getCursoById = async (req, res) => {
  try {
    const curso = await Curso.findById(req.params.id);
    if (curso) {
      res.json(curso);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Create new course
exports.createCurso = async (req, res) => {
  const curso = new Curso({
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    valor_por_hora: req.body.valor_por_hora,
    estado: req.body.estado
  });

  try {
    const newCurso = await curso.save();
    res.status(201).json(newCurso);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT - Update course
exports.updateCurso = async (req, res) => {
  try {
    // Log para depuración
    console.log('updateCurso - req.body:', req.body);
    console.log('updateCurso - req.params.id:', req.params.id);
    
    const curso = await Curso.findById(req.params.id);
    if (!curso) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Verificar si el curso está asociado a una venta
    const Venta = require('../models/Venta');
    const ventaAsociada = await Venta.findOne({ cursoId: req.params.id });
    
    if (ventaAsociada) {
      console.log('Venta asociada encontrada:', ventaAsociada._id);
      
      // Si está asociado a una venta, solo permitir actualizar el estado
      console.log('Verificando condición de solo estado:', Object.keys(req.body));
      console.log('req.body tiene estado:', req.body.hasOwnProperty('estado'));
      console.log('Cantidad de propiedades:', Object.keys(req.body).length);
      
      // Permitir actualizar el estado independientemente de otros campos
      if (req.body.hasOwnProperty('estado')) {
        curso.estado = req.body.estado;
        const updatedCurso = await curso.save();
        return res.json({
          message: 'Estado del curso actualizado con éxito',
          curso: updatedCurso
        });
      } else {
        // Si no se está actualizando el estado, mostrar mensaje de error
        return res.status(400).json({ 
          message: 'No se puede editar el curso porque está asociado a una venta. Solo se permite modificar el estado.', 
          ventaId: ventaAsociada._id,
          codigoVenta: ventaAsociada.codigoVenta
        });
      }
    }
    
    // Si no está asociado a una venta, permitir actualizar todos los campos
    Object.assign(curso, req.body);
    const updatedCurso = await curso.save();
    res.json(updatedCurso);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE - Delete course
exports.deleteCurso = async (req, res) => {
  try {
    const curso = await Curso.findById(req.params.id);
    if (!curso) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    try {
      // Verificar si el curso está asociado a una venta
      const Venta = require('../models/Venta');
      const ventaAsociada = await Venta.findOne({ cursoId: req.params.id });
      
      if (ventaAsociada) {
        // En lugar de rechazar la eliminación, cambiar el estado a inactivo (false)
        console.log('Curso asociado a venta, cambiando estado a inactivo:', req.params.id);
        curso.estado = false;
        const updatedCurso = await curso.save();
        return res.json({ 
          message: 'El curso está asociado a una venta. Se ha cambiado su estado a inactivo.', 
          curso: updatedCurso,
          ventaId: ventaAsociada._id,
          codigoVenta: ventaAsociada.codigoVenta
        });
      }
      
      await curso.deleteOne();
      return res.json({ message: 'Course deleted successfully' });
    } catch (findError) {
      // Si hay un error al buscar la venta asociada, intentamos cambiar el estado a inactivo
      console.log('Error al buscar venta asociada, cambiando estado a inactivo:', req.params.id);
      curso.estado = false;
      const updatedCurso = await curso.save();
      return res.json({ 
        message: 'Se ha cambiado el estado del curso a inactivo debido a un error al verificar asociaciones.', 
        curso: updatedCurso
      });
    }
  } catch (error) {
    console.error('Error en deleteCurso:', error);
    res.status(500).json({ message: error.message });
  }
};