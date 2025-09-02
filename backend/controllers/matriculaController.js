const Matricula = require('../models/Matricula');

// GET - Get all enrollments
exports.getMatriculas = async (req, res) => {
  try {
    const matriculas = await Matricula.find();
    res.json(matriculas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Get enrollment by ID
exports.getMatriculaById = async (req, res) => {
  try {
    const matricula = await Matricula.findById(req.params.id);
    if (matricula) {
      res.json(matricula);
    } else {
      res.status(404).json({ message: 'Enrollment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Create new enrollment
exports.createMatricula = async (req, res) => {
  const matricula = new Matricula({
    nombre: req.body.nombre,
    valorMatricula: req.body.valorMatricula,
    estado: req.body.estado
  });

  try {
    const newMatricula = await matricula.save();
    res.status(201).json(newMatricula);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT - Update enrollment
exports.updateMatricula = async (req, res) => {
  try {
    // Log para depuración
    console.log('updateMatricula - req.body:', req.body);
    console.log('updateMatricula - req.params.id:', req.params.id);
    
    const matricula = await Matricula.findById(req.params.id);
    if (!matricula) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    try {
      // Verificar si la matrícula está asociada a una venta
      const Venta = require('../models/Venta');
      const ventaAsociada = await Venta.findOne({ matriculaId: req.params.id });
      
      if (ventaAsociada) {
        console.log('Venta asociada encontrada:', ventaAsociada._id);
        
        // Si está asociada a una venta, solo permitir actualizar el estado
        console.log('Verificando condición de solo estado:', Object.keys(req.body));
        console.log('req.body tiene estado:', req.body.hasOwnProperty('estado'));
        console.log('Cantidad de propiedades:', Object.keys(req.body).length);
        
        // Permitir actualizar el estado independientemente de otros campos
        if (req.body.hasOwnProperty('estado')) {
          // Asegurarse de que el estado sea un booleano
          matricula.estado = Boolean(req.body.estado);
          const updatedMatricula = await matricula.save();
          return res.json({
            message: 'Estado de la matrícula actualizado con éxito',
            matricula: updatedMatricula
          });
        } else {
          // Si no se está actualizando el estado, mostrar mensaje de error
          return res.status(400).json({ 
            message: 'No se puede editar la matrícula porque está asociada a una venta. Solo se permite modificar el estado.', 
            ventaId: ventaAsociada._id,
            codigoVenta: ventaAsociada.codigoVenta
          });
        }
      }
      
      // Si no está asociada a una venta, permitir actualizar solo los campos válidos
      const allowedFields = ['nombre', 'valorMatricula', 'estado'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData[field] = req.body[field];
        }
      });
      
      Object.assign(matricula, updateData);
      const updatedMatricula = await matricula.save();
      return res.json(updatedMatricula);
    } catch (findError) {
      console.error('Error al verificar venta asociada:', findError);
      
      // Si hay un error al verificar la venta, intentamos actualizar solo el estado si está presente
      if (req.body.hasOwnProperty('estado')) {
        matricula.estado = Boolean(req.body.estado);
        const updatedMatricula = await matricula.save();
        return res.json({
          message: 'Estado de la matrícula actualizado con éxito (modo seguro)',
          matricula: updatedMatricula
        });
      }
      
      // Si no hay estado para actualizar, intentamos actualizar solo los campos válidos
      const allowedFields = ['nombre', 'valorMatricula', 'estado'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData[field] = req.body[field];
        }
      });
      
      Object.assign(matricula, updateData);
      const updatedMatricula = await matricula.save();
      return res.json(updatedMatricula);
    }
  } catch (error) {
    console.error('Error en updateMatricula:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE - Delete matricula
exports.deleteMatricula = async (req, res) => {
  try {
    const matricula = await Matricula.findById(req.params.id);
    if (!matricula) {
      return res.status(404).json({ message: 'Matricula not found' });
    }
    
    try {
      // Verificar si la matrícula está asociada a una venta
      const Venta = require('../models/Venta');
      const ventaAsociada = await Venta.findOne({ matriculaId: req.params.id });
      
      if (ventaAsociada) {
        // En lugar de rechazar la eliminación, cambiar el estado a inactivo (false)
        console.log('Matrícula asociada a venta, cambiando estado a inactivo:', req.params.id);
        matricula.estado = false;
        const updatedMatricula = await matricula.save();
        return res.json({ 
          message: 'La matrícula está asociada a una venta. Se ha cambiado su estado a inactivo.', 
          matricula: updatedMatricula,
          ventaId: ventaAsociada._id,
          codigoVenta: ventaAsociada.codigoVenta
        });
      }
      
      await matricula.deleteOne();
      return res.json({ message: 'Matricula deleted successfully' });
    } catch (findError) {
      // Si hay un error al buscar la venta asociada, intentamos cambiar el estado a inactivo
      console.log('Error al buscar venta asociada, cambiando estado a inactivo:', req.params.id);
      matricula.estado = false;
      const updatedMatricula = await matricula.save();
      return res.json({ 
        message: 'Se ha cambiado el estado de la matrícula a inactivo debido a un error al verificar asociaciones.', 
        matricula: updatedMatricula
      });
    }
  } catch (error) {
    console.error('Error en deleteMatricula:', error);
    res.status(500).json({ message: error.message });
  }
};