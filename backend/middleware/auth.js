const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');
const UsuarioHasRol = require('../models/UsuarioHasRol');

// Use the same fallback as authController to ensure tokens can be verified in dev when JWT_SECRET is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_jwt';

const authMiddleware = {
  // Middleware para verificar el token JWT
  verifyToken: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      // Verify using a consistent secret
      const decoded = jwt.verify(token, JWT_SECRET);
      const usuario = await Usuario.findById(decoded.id);

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      req.user = decoded;
      req.token = token;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: error.message
      });
    }
  },
  
  // Middleware para verificar roles específicos
  checkRole: (roles) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
        }

        const usuarioHasRol = await UsuarioHasRol.findOne({
          usuarioId: req.user.id
        }).populate('rolId');

        if (!usuarioHasRol) {
          return res.status(403).json({
            success: false,
            message: 'Usuario sin roles asignados'
          });
        }

        const userRole = usuarioHasRol.rolId.nombre;

        if (roles.includes(userRole)) {
          next();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado. No tiene los permisos necesarios.'
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error al verificar rol',
          error: error.message
        });
      }
    };
  }
};

module.exports = authMiddleware;