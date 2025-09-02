const Usuario = require('../models/usuario');
const UsuarioHasRol = require('../models/UsuarioHasRol');
const Rol = require('../models/rol');
const RolPermisoPrivilegio = require('../models/RolPermisoPrivilegio');
const Permiso = require('../models/Permiso');
const Privilegio = require('../models/Privilegio');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_jwt';

const loginController = {
  login: async (req, res) => {
    try {
      console.log('=== INICIO DE LOGIN ===' );
      console.log('Body recibido:', req.body);
      
      const { correo, contrasena } = req.body;
      
      // 1. Recibir correo y contraseña del usuario
      if (!correo || !contrasena) {
        console.log('❌ Faltan credenciales');
        return res.status(400).json({
          success: false,
          message: 'Por favor, ingrese correo y contraseña'
        });
      }
      
      console.log(`Intentando login para: ${correo}`);
      
      // 2. Consultar la API de Usuarios para ver si existe un usuario con ese correo
      const usuario = await Usuario.findOne({ correo: correo.toLowerCase() })
        .select('_id nombre apellido correo contrasena estado documento tipo_de_documento');
      
      console.log('Usuario encontrado:', usuario ? `${usuario.nombre} ${usuario.apellido}` : 'No encontrado');
      
      if (!usuario) {
        console.log('❌ Usuario no existe');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      if (!usuario.estado) {
        console.log('❌ Usuario desactivado');
        return res.status(403).json({
          success: false,
          message: 'Usuario desactivado'
        });
      }
      
      console.log('Verificando contraseña...');
      console.log('Contraseña ingresada:', contrasena);
      console.log('Hash almacenado:', usuario.contrasena.substring(0, 20) + '...');
      
      // 3. Validar la contraseña (manejar tanto hash como texto plano)
      let isMatch = false;
      
      // Verificar si la contraseña está hasheada con bcrypt
      const isBcryptHash = usuario.contrasena.startsWith('$2b$') || usuario.contrasena.startsWith('$2a$');
      
      if (isBcryptHash) {
        // Contraseña hasheada - usar bcrypt.compare
        isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
        console.log('Verificación con bcrypt:', isMatch ? '✅ Coincide' : '❌ No coincide');
      } else {
        // Contraseña en texto plano - comparación directa
        isMatch = contrasena === usuario.contrasena;
        console.log('Verificación texto plano:', isMatch ? '✅ Coincide' : '❌ No coincide');
        
        if (isMatch) {
          console.log('⚠️  ADVERTENCIA: Contraseña almacenada sin hashear. Se recomienda actualizar.');
        }
      }
      
      if (!isMatch) {
        console.log('❌ Contraseña incorrecta');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }
      
      // 4. Consultar la API de UsuarioHasRol para obtener todos los roles del usuario
      console.log('Buscando roles del usuario...');
      const usuarioHasRoles = await UsuarioHasRol.find({ usuarioId: usuario._id, estado: true })
        .populate('rolId', '_id nombre descripcion')
        .sort({ _id: 1 }); // Ordenar por ID para consistencia
      
      console.log('Roles encontrados:', usuarioHasRoles.length);
      
      if (!usuarioHasRoles || usuarioHasRoles.length === 0) {
        console.log('❌ Usuario sin roles asignados');
        return res.status(403).json({
          success: false,
          message: 'Usuario sin roles asignados'
        });
      }
      
      // Usar el primer rol como rol principal por defecto
      const rolPrincipal = usuarioHasRoles[0].rolId;
      const todosLosRoles = usuarioHasRoles.map(uhr => uhr.rolId);
      
      // 5. Consultar la API rol_permiso_privilegio para obtener permisos y privilegios del rol principal
      console.log('Consultando permisos y privilegios del rol principal...');
      const rolPermisosPrivilegios = await RolPermisoPrivilegio.find({ rolId: rolPrincipal._id })
        .populate('permisoId', '_id permiso')
        .populate('privilegioId', '_id nombre_privilegio');
      
      console.log(`Encontrados ${rolPermisosPrivilegios.length} permisos/privilegios para el rol`);
      
      // 6. Agrupar los privilegios por nombre de módulo (permiso)
      const permisosAgrupados = {};
      
      rolPermisosPrivilegios.forEach(rpp => {
        const nombrePermiso = rpp.permisoId.permiso;
        const nombrePrivilegio = rpp.privilegioId.nombre_privilegio;
        
        if (!permisosAgrupados[nombrePermiso]) {
          permisosAgrupados[nombrePermiso] = {
            permisoId: rpp.permisoId._id,
            nombre: nombrePermiso,
            privilegios: []
          };
        }
        
        permisosAgrupados[nombrePermiso].privilegios.push({
          privilegioId: rpp.privilegioId._id,
          nombre: nombrePrivilegio
        });
      });
      
      console.log('Permisos agrupados:', Object.keys(permisosAgrupados));
      
      // 7. Crear y devolver un token JWT con información completa
      console.log('Creando token JWT con permisos...');
      const token = jwt.sign(
        { 
          id: usuario._id,
          correo: usuario.correo,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rolId: rolPrincipal._id,
          rolNombre: rolPrincipal.nombre,
          todosLosRoles: todosLosRoles.map(r => ({ id: r._id, nombre: r.nombre })),
          permisos: permisosAgrupados
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      console.log('✅ Login exitoso con permisos completos');
      
      // 8. Devolver respuesta completa al frontend
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          documento: usuario.documento,
          tipo_de_documento: usuario.tipo_de_documento,
          rol: {
            id: rolPrincipal._id,
            nombre: rolPrincipal.nombre,
            descripcion: rolPrincipal.descripcion
          },
          todosLosRoles: todosLosRoles.map(r => ({
            id: r._id,
            nombre: r.nombre,
            descripcion: r.descripcion
          })),
          permisos: permisosAgrupados
        },
        usuarioHasRoles: usuarioHasRoles.map(uhr => ({
          id: uhr._id,
          usuarioId: uhr.usuarioId,
          rolId: uhr.rolId._id,
          rolNombre: uhr.rolId.nombre
        }))
      });
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  },

  // Nuevo endpoint para cambiar de rol
  cambiarRol: async (req, res) => {
    try {
      console.log('=== CAMBIO DE ROL ===');
      const { usuarioId, nuevoRolId } = req.body;
      
      if (!usuarioId || !nuevoRolId) {
        return res.status(400).json({
          success: false,
          message: 'Usuario ID y Rol ID son requeridos'
        });
      }

      // Verificar que el usuario tenga el rol solicitado
      const usuarioHasRol = await UsuarioHasRol.findOne({ 
        usuarioId: usuarioId, 
        rolId: nuevoRolId,
        estado: true 
      }).populate('rolId', '_id nombre descripcion');

      if (!usuarioHasRol) {
        return res.status(403).json({
          success: false,
          message: 'El usuario no tiene asignado este rol'
        });
      }

      // Obtener información del usuario
      const usuario = await Usuario.findById(usuarioId)
        .select('_id nombre apellido correo documento tipo_de_documento');

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener todos los roles del usuario
      const usuarioHasRoles = await UsuarioHasRol.find({ usuarioId: usuarioId, estado: true })
        .populate('rolId', '_id nombre descripcion')
        .sort({ _id: 1 });

      const todosLosRoles = usuarioHasRoles.map(uhr => uhr.rolId);
      const nuevoRol = usuarioHasRol.rolId;

      // Obtener permisos del nuevo rol
      const rolPermisosPrivilegios = await RolPermisoPrivilegio.find({ rolId: nuevoRolId })
        .populate('permisoId', '_id permiso')
        .populate('privilegioId', '_id nombre_privilegio');

      // Agrupar permisos
      const permisosAgrupados = {};
      rolPermisosPrivilegios.forEach(rpp => {
        const nombrePermiso = rpp.permisoId.permiso;
        const nombrePrivilegio = rpp.privilegioId.nombre_privilegio;
        
        if (!permisosAgrupados[nombrePermiso]) {
          permisosAgrupados[nombrePermiso] = {
            permisoId: rpp.permisoId._id,
            nombre: nombrePermiso,
            privilegios: []
          };
        }
        
        permisosAgrupados[nombrePermiso].privilegios.push({
          privilegioId: rpp.privilegioId._id,
          nombre: nombrePrivilegio
        });
      });

      // Crear nuevo token
      const token = jwt.sign(
        { 
          id: usuario._id,
          correo: usuario.correo,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rolId: nuevoRol._id,
          rolNombre: nuevoRol.nombre,
          todosLosRoles: todosLosRoles.map(r => ({ id: r._id, nombre: r.nombre })),
          permisos: permisosAgrupados
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      console.log('✅ Cambio de rol exitoso');
      
      return res.status(200).json({
        success: true,
        message: 'Cambio de rol exitoso',
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          documento: usuario.documento,
          tipo_de_documento: usuario.tipo_de_documento,
          rol: {
            id: nuevoRol._id,
            nombre: nuevoRol.nombre,
            descripcion: nuevoRol.descripcion
          },
          todosLosRoles: todosLosRoles.map(r => ({
            id: r._id,
            nombre: r.nombre,
            descripcion: r.descripcion
          })),
          permisos: permisosAgrupados
        }
      });
      
    } catch (error) {
      console.error('❌ Error en cambio de rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: error.message
      });
    }
  }
};

module.exports = loginController;