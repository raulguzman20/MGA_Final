const Usuario = require('../models/usuario');
const UsuarioHasRol = require('../models/UsuarioHasRol');
const RolPermisoPrivilegio = require('../models/RolPermisoPrivilegio');
const Permiso = require('../models/Permiso');
const Privilegio = require('../models/Privilegio');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailController = require('./emailController');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_jwt';

const authController = {
  login: async (req, res) => {
    try {
      const { correo, contrasena } = req.body;
      
      // 1. Validar datos de entrada
      if (!correo || !contrasena) {
        return res.status(400).json({
          success: false,
          message: 'Por favor, ingrese correo y contraseña'
        });
      }
      
      // 2. Consultar la API de Usuarios - Buscar usuario por correo
      const usuario = await Usuario.findOne({ correo: correo.toLowerCase() })
        .select('_id nombre apellido correo contrasena estado');
      
      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      if (!usuario.estado) {
        return res.status(403).json({
          success: false,
          message: 'Usuario desactivado'
        });
      }
      
      // 3. Validar la contraseña usando bcrypt.compare()
      const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }
      
      // 4. Consultar la API de UsuarioHasRol para obtener el rol del usuario
      const usuarioHasRol = await UsuarioHasRol.findOne({ usuarioId: usuario._id })
        .populate('rolId', '_id nombre descripcion');
      
      if (!usuarioHasRol || !usuarioHasRol.rolId) {
        return res.status(403).json({
          success: false,
          message: 'Usuario sin rol asignado'
        });
      }
      
      const rol = usuarioHasRol.rolId;
      
      // Obtener permisos y privilegios del rol
      const permisoPrivilegios = await RolPermisoPrivilegio.find({ rolId: rol._id })
        .populate('permisoId', 'permiso')
        .populate('privilegioId', 'nombre_privilegio');

      // Agrupar permisos y privilegios por módulo
      const permisosAgrupados = permisoPrivilegios.reduce((acc, item) => {
        const modulo = item.permisoId.permiso;
        if (!acc[modulo]) {
          acc[modulo] = [];
        }
        acc[modulo].push(item.privilegioId.nombre_privilegio);
        return acc;
      }, {});

      // Agregar permisos específicos de dashboard según el rol
      const rolNombre = rol.nombre.toLowerCase();
      if (rolNombre === 'administrador' || rolNombre === 'admin') {
        if (!permisosAgrupados['dashboard-administrador']) {
          permisosAgrupados['dashboard-administrador'] = ['Ver'];
        }
      } else if (rolNombre === 'profesor') {
        if (!permisosAgrupados['dashboard-profesor']) {
          permisosAgrupados['dashboard-profesor'] = ['Ver'];
        }
      } else if (rolNombre === 'beneficiario') {
        if (!permisosAgrupados['dashboard-beneficiario']) {
          permisosAgrupados['dashboard-beneficiario'] = ['Ver'];
        }
      } else if (rolNombre === 'secretaria') {
        if (!permisosAgrupados['dashboard-administrador']) {
          permisosAgrupados['dashboard-administrador'] = ['Ver'];
        }
      }

      // 5. Crear y devolver un token JWT con información clave
      const token = jwt.sign(
        { 
          id: usuario._id,
          correo: usuario.correo,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rolId: rol._id,
          rolNombre: rol.nombre,
          permisos: permisosAgrupados
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      // 6. Devolver el token al cliente (frontend)
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          rol: {
            id: rol._id,
            nombre: rol.nombre,
            descripcion: rol.descripcion
          },
          permisos: permisosAgrupados
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  },
  
  forgotPassword: async (req, res) => {
    try {
      const { correo } = req.body;
      
      if (!correo) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere correo electrónico'
        });
      }
      
      const usuario = await Usuario.findOne({ correo });
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      const usuarioHasRol = await UsuarioHasRol.findOne({ usuarioId: usuario._id });
      
      if (!usuarioHasRol) {
        return res.status(403).json({
          success: false,
          message: 'Usuario sin rol asignado'
        });
      }
      
      // Aquí iría la lógica para generar y enviar el correo de recuperación
      // usando emailController
      
      return res.status(200).json({
        success: true,
        message: 'Se ha enviado un correo con las instrucciones para recuperar su contraseña'
      });
    } catch (error) {
      console.error('Error en forgotPassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  }
};

module.exports = authController;