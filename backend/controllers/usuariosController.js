const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const emailController = require('./emailController');

// GET - Obtener todos los usuarios
exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-contrasena');
    res.json({ success: true, usuarios });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET - Obtener un usuario por ID
exports.getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-contrasena');
    if (usuario) {
      res.json({ success: true, usuario });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST - Crear nuevo usuario
exports.createUsuario = async (req, res) => {
  try {
    // Limpieza: se removieron logs de diagnóstico y depuración

    // Sanitizar body para evitar campos ajenos al modelo Usuario (p. ej. de Profesor)
    const { telefono, direccion, especialidades, ...safeBody } = req.body || {};

    // Validar campos requeridos
    if (!safeBody.nombre || !safeBody.apellido || !safeBody.correo || !safeBody.tipo_de_documento || !safeBody.documento) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben ser proporcionados' });
    }

    // Validar formato de correo
    const emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(safeBody.correo)) {
      let codePoints = [];
      try {
        codePoints = Array.from(safeBody.correo).map(ch => ch.codePointAt(0));
      } catch (e) {
        codePoints = [];
      }
      return res.status(400).json({
        message: 'El formato del correo electrónico no es válido',
        receivedCorreo: safeBody.correo,
        codePoints,
        regex: emailRegex.toString()
      });
    }

    // Validar existencia por correo o documento
    const usuarioExistente = await Usuario.findOne({
      $or: [
        { correo: safeBody.correo.toLowerCase() },
        { documento: safeBody.documento }
      ]
    });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Ya existe un usuario con este correo o documento' });
    }

    // Encriptar contraseña
    let hash = safeBody.contrasena;
    if (safeBody.contrasena) {
      const salt = await bcrypt.genSalt(10);
      hash = await bcrypt.hash(safeBody.contrasena, salt);
    }

    // Validar tipo de documento
    const tiposDocumentoValidos = ['TI', 'CC', 'CE', 'PP', 'NIT'];
    if (!tiposDocumentoValidos.includes(safeBody.tipo_de_documento)) {
      return res.status(400).json({ message: 'Tipo de documento no válido' });
    }

    // Validar formato de documento
    const documentoRegex = /^[0-9]{6,15}$/;
    if (!documentoRegex.test(safeBody.documento)) {
      return res.status(400).json({ message: 'El documento debe contener solo números, entre 6 y 15 dígitos' });
    }

    // Crear nuevo usuario (solo con campos válidos del modelo)
    const usuario = new Usuario({
      nombre: safeBody.nombre,
      apellido: safeBody.apellido,
      tipo_de_documento: safeBody.tipo_de_documento,
      documento: safeBody.documento,
      correo: safeBody.correo.toLowerCase(),
      contrasena: hash,
      estado: safeBody.estado !== undefined ? safeBody.estado : true,
      rol: safeBody.rol || 'usuario'
    });

    const nuevoUsuario = await usuario.save();
    const usuarioRespuesta = nuevoUsuario.toObject();
    delete usuarioRespuesta.contrasena;

    // Enviar correo de bienvenida
    if (safeBody.contrasena) {
      await emailController.sendWelcomeEmail(usuario.correo, usuario.nombre, safeBody.contrasena);
    }

    res.status(201).json(usuarioRespuesta);
  } catch (error) {
    console.error('Error detallado al crear usuario:', error);
    // Si el error es de validación, incluir claves de errores para diagnóstico
    if (error && error.name === 'ValidationError') {
      const errorKeys = Object.keys(error.errors || {});
      return res.status(400).json({
        message: error.message,
        errorName: error.name,
        errorKeys,
        stack: error.stack
      });
    }
    // Intentar obtener la configuración del validador de la colección
    let collValidation = null;
    try {
      const list = await Usuario.db.db.listCollections({ name: Usuario.collection.name }).toArray();
      if (list && list[0] && list[0].options) {
        const { validator = null, validationLevel = null, validationAction = null } = list[0].options;
        collValidation = { validator, validationLevel, validationAction };
        console.error('[createUsuario] Collection validation options:', JSON.stringify(collValidation, null, 2));
      }
    } catch (e) {
      console.warn('[createUsuario] No se pudo obtener opciones de colección:', e?.message);
    }
    // Loggear detalles de validación de Mongo (errInfo)
    if (error && error.errInfo) {
      try {
        console.error('[createUsuario] Mongo errInfo:', JSON.stringify(error.errInfo, null, 2));
      } catch (e) {
        console.error('[createUsuario] No se pudo serializar errInfo');
      }
    }
    res.status(400).json({
      message: error.message,
      errorName: error.name,
      code: error.code,
      errInfo: error.errInfo || null,
      collectionValidation: collValidation,
      stack: error.stack
    });
  }
};

// PUT - Actualizar usuario
exports.updateUsuario = async (req, res) => {
  try {
    // Validar formato de correo si se proporciona (ASCII-only)
    if (req.body.correo) {
  const emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(req.body.correo)) {
        let codePoints = [];
        try {
          codePoints = Array.from(req.body.correo).map(ch => ch.codePointAt(0));
        } catch (e) {
          codePoints = [];
        }
        return res.status(400).json({
          message: 'El formato del correo electrónico no es válido',
          receivedCorreo: req.body.correo,
          codePoints,
          regex: emailRegex.toString()
        });
      }
    }

    // Validar tipo de documento si se proporciona
    if (req.body.tipo_de_documento) {
      const tiposDocumentoValidos = ['TI', 'CC', 'CE', 'PP', 'NIT'];
      if (!tiposDocumentoValidos.includes(req.body.tipo_de_documento)) {
        return res.status(400).json({ message: 'Tipo de documento no válido' });
      }
    }

    // Validar formato de documento si se proporciona
    if (req.body.documento) {
      const documentoRegex = /^[0-9]{6,15}$/;
      if (!documentoRegex.test(req.body.documento)) {
        return res.status(400).json({ message: 'El documento debe contener solo números, entre 6 y 15 dígitos' });
      }
    }

    const usuario = await Usuario.findById(req.params.id);
    if (usuario) {
      // Campos que se pueden actualizar
      const camposActualizables = [
        'nombre',
        'apellido',
        'tipo_de_documento',
        'documento',
        'correo',
        'estado',
        'rol'
      ];

      // Verificar si el correo ya existe en otro usuario
      if (req.body.correo && req.body.correo !== usuario.correo) {
        const usuarioExistente = await Usuario.findOne({
          _id: { $ne: req.params.id },
          correo: req.body.correo.toLowerCase()
        });
        if (usuarioExistente) {
          return res.status(400).json({ message: 'Ya existe un usuario con este correo' });
        }
      }

      // Verificar si el documento ya existe en otro usuario
      if (req.body.documento && req.body.documento !== usuario.documento) {
        const usuarioExistente = await Usuario.findOne({
          _id: { $ne: req.params.id },
          documento: req.body.documento
        });
        if (usuarioExistente) {
          return res.status(400).json({ message: 'Ya existe un usuario con este documento' });
        }
      }

      // Actualizar solo los campos permitidos que vienen en el request
      camposActualizables.forEach(campo => {
        if (req.body[campo] !== undefined) {
          usuario[campo] = campo === 'correo' ? req.body[campo].toLowerCase() : req.body[campo];
        }
      });

      // Solo actualizar contraseña si se proporciona una nueva
      if (req.body.contrasena) {
        const salt = await bcrypt.genSalt(10);
        usuario.contrasena = await bcrypt.hash(req.body.contrasena, salt);
      }

      const usuarioActualizado = await usuario.save();
      
      const usuarioRespuesta = usuarioActualizado.toObject();
      delete usuarioRespuesta.contrasena;
      return res.json(usuarioRespuesta);
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE - Eliminar usuario
exports.deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener los roles del usuario
    const UsuarioHasRol = require('../models/UsuarioHasRol');
    const Rol = require('../models/rol');
    
    const usuarioRoles = await UsuarioHasRol.find({ usuarioId: req.params.id })
      .populate('rolId');
    
    const rolesNombres = usuarioRoles.map(ur => ur.rolId.nombre.toLowerCase());
    
    // Validaciones de integridad referencial según el rol
    
    // 1. Si el usuario tiene rol de Cliente
    if (rolesNombres.includes('cliente')) {
      const Beneficiario = require('../models/Beneficiario');
      const beneficiariosAsociados = await Beneficiario.find({ clienteId: req.params.id });
      
      if (beneficiariosAsociados.length > 0) {
        return res.status(400).json({
          message: 'No se puede eliminar el usuario porque tiene beneficiarios asociados',
          details: `El usuario está asociado a ${beneficiariosAsociados.length} beneficiario(s)`,
          associatedRecords: beneficiariosAsociados.map(b => ({
            id: b._id,
            nombre: `${b.nombre} ${b.apellido}`,
            documento: b.numero_de_documento
          }))
        });
      }
    }
    
    // 2. Si el usuario tiene rol de Beneficiario
    if (rolesNombres.includes('beneficiario')) {
      // Verificar si está asociado a matrículas
      const Matricula = require('../models/Matricula');
      const Venta = require('../models/Venta');
      
      // Buscar ventas donde el beneficiario sea el usuario actual
      const ventasAsociadas = await Venta.find({ beneficiario: req.params.id });
      
      if (ventasAsociadas.length > 0) {
        return res.status(400).json({
          message: 'No se puede eliminar el usuario porque está asociado a ventas/matrículas',
          details: `El usuario está asociado a ${ventasAsociadas.length} venta(s)`,
          associatedRecords: ventasAsociadas.map(v => ({
            id: v._id,
            codigoVenta: v.codigoVenta,
            fechaVenta: v.fechaVenta
          }))
        });
      }
      
      // Verificar si está asociado a programaciones de clase
      const ProgramacionClase = require('../models/ProgramacionClase');
      const programacionesClase = await ProgramacionClase.find({
        $or: [
          { venta: { $in: ventasAsociadas.map(v => v._id) } },
          { beneficiariosAdicionales: { $in: ventasAsociadas.map(v => v._id) } }
        ]
      });
      
      if (programacionesClase.length > 0) {
        return res.status(400).json({
          message: 'No se puede eliminar el usuario porque está asociado a programaciones de clase',
          details: `El usuario está asociado a ${programacionesClase.length} programación(es) de clase`,
          associatedRecords: programacionesClase.map(pc => ({
            id: pc._id,
            dia: pc.dia,
            horaInicio: pc.horaInicio,
            horaFin: pc.horaFin,
            estado: pc.estado
          }))
        });
      }
    }
    
    // 3. Si el usuario tiene rol de Profesor
    if (rolesNombres.includes('profesor')) {
      const Profesor = require('../models/profesor');
      const ProgramacionProfesor = require('../models/ProgramacionProfesor');
      const ProgramacionClase = require('../models/ProgramacionClase');
      
      // Buscar el registro de profesor asociado al usuario
      const profesorRecord = await Profesor.findOne({ usuarioId: req.params.id });
      
      if (profesorRecord) {
        // Verificar programaciones de profesor
        const programacionesProfesor = await ProgramacionProfesor.find({ 
          profesor: profesorRecord._id,
          estado: { $in: ['activo', 'completado'] }
        });
        
        if (programacionesProfesor.length > 0) {
          return res.status(400).json({
            message: 'No se puede eliminar el usuario porque tiene programaciones de profesor asociadas',
            details: `El profesor está asociado a ${programacionesProfesor.length} programación(es) de profesor`,
            associatedRecords: programacionesProfesor.map(pp => ({
              id: pp._id,
              horaInicio: pp.horaInicio,
              horaFin: pp.horaFin,
              estado: pp.estado,
              diasSeleccionados: pp.diasSeleccionados
            }))
          });
        }
        
        // Verificar programaciones de clase donde participe el profesor
        const programacionesClaseProfesor = await ProgramacionClase.find({
          programacionProfesor: { $in: programacionesProfesor.map(pp => pp._id) }
        });
        
        if (programacionesClaseProfesor.length > 0) {
          return res.status(400).json({
            message: 'No se puede eliminar el usuario porque tiene programaciones de clase asociadas como profesor',
            details: `El profesor está asociado a ${programacionesClaseProfesor.length} programación(es) de clase`,
            associatedRecords: programacionesClaseProfesor.map(pc => ({
              id: pc._id,
              dia: pc.dia,
              horaInicio: pc.horaInicio,
              horaFin: pc.horaFin,
              estado: pc.estado
            }))
          });
        }
      }
    }
    
    // Si pasa todas las validaciones, proceder con la eliminación
    await usuario.deleteOne();
    
    // También eliminar las relaciones usuario-rol
    await UsuarioHasRol.deleteMany({ usuarioId: req.params.id });
    
    // Si el usuario tenía rol de cliente, eliminar también el registro de cliente
    if (rolesNombres.includes('cliente')) {
      const Cliente = require('../models/Cliente');
      // Buscar cliente por número de documento y nombre/apellido
      if (usuario.documento) {
        const clientesEliminados = await Cliente.deleteMany({
          numeroDocumento: usuario.documento,
          nombre: usuario.nombre,
          apellido: usuario.apellido
        });
        console.log(`Clientes eliminados: ${clientesEliminados.deletedCount}`);
      }
    }
    
    res.json({ 
      message: 'Usuario eliminado exitosamente',
      deletedUser: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo
      }
    });
    
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al eliminar usuario',
      error: error.message 
    });
  }
};