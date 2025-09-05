import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../../shared/config/api.config';

// Configurar axios con el token desde el arranque del módulo (antes de que se monten componentes)
(() => {
  try {
    const tokenFromKey = localStorage.getItem('token');
    let tokenFromUser = null;
    const rawUser = localStorage.getItem('user');
    if (!tokenFromKey && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        tokenFromUser = parsed?.token || null;
      } catch (_) {
        tokenFromUser = null;
      }
    }
    const token = tokenFromKey || tokenFromUser;
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignorar errores de acceso a localStorage
  }
})();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Recuperar el usuario de localStorage al cargar la aplicación
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const navigate = useNavigate();

  // Asegurar que axios tenga el token configurado cuando cambie el usuario o si existe en localStorage
  useEffect(() => {
    try {
      const token = (user && user.token) || localStorage.getItem('token') || (() => {
        try {
          const parsed = JSON.parse(localStorage.getItem('user') || 'null');
          return parsed?.token || null;
        } catch (_) {
          return null;
        }
      })();
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }
    } catch (_) {
      // noop
    }
  }, [user?.token]);

  const login = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Obtener permisos desde la API rol_permiso_privilegio
        const permissionsSet = new Set();
        
        try {
          const roleId = data?.usuario?.rol?.id || data?.usuario?.rol?._id;
          const rolPermisoResponse = await fetch(`${API_CONFIG.BASE_URL}/rol_permiso_privilegio?rolId=${roleId}`, {
            headers: {
              'Authorization': `Bearer ${data.token}`,
              'Accept': 'application/json'
            }
          });
          const rolPermisoData = await rolPermisoResponse.json();
          
          // Mapeo de módulos del backend a permisos del frontend
          const moduloToPermission = {
            'beneficiarios': 'venta-servicios-beneficiarios',
            'asistencia': 'venta-servicios-asistencia',
            'pagos': 'venta-servicios-pagos',
            'programacion_de_clases': 'servicios-musicales-programacion-clases',
            'profesores': 'servicios-musicales-profesores',
            'programacion_de_profesores': 'servicios-musicales-programacion-profesores',
            'cursos_matriculas': 'servicios-musicales-cursos-matriculas',
            'aulas': 'servicios-musicales-aulas',
            'clases': 'servicios-musicales-clases',
            'clientes': 'venta-servicios-clientes',
            'venta_matriculas': 'venta-servicios-venta-matriculas',
            'venta_cursos': 'venta-servicios-venta-cursos',
            'roles': 'configuracion-roles',
            'usuarios': 'configuracion-usuarios',
            'dashboard': 'dashboard',
            // Aceptar también nombres ya normalizados desde backend
            'venta-servicios-pagos': 'venta-servicios-pagos',
            'venta-servicios-beneficiarios': 'venta-servicios-beneficiarios',
            'venta-servicios-asistencia': 'venta-servicios-asistencia',
            'venta-servicios-clientes': 'venta-servicios-clientes',
            'venta-servicios-venta-matriculas': 'venta-servicios-venta-matriculas',
            'venta-servicios-venta-cursos': 'venta-servicios-venta-cursos',
            'servicios-musicales-profesores': 'servicios-musicales-profesores',
            'servicios-musicales-programacion-profesores': 'servicios-musicales-programacion-profesores',
            'servicios-musicales-programacion-clases': 'servicios-musicales-programacion-clases',
            'servicios-musicales-cursos-matriculas': 'servicios-musicales-cursos-matriculas',
            'servicios-musicales-aulas': 'servicios-musicales-aulas',
            'servicios-musicales-clases': 'servicios-musicales-clases',
            'configuracion-roles': 'configuracion-roles',
            'configuracion-usuarios': 'configuracion-usuarios',
            'dashboard-administrador': 'dashboard',
            'dashboard-profesor': 'dashboard',
            'dashboard-beneficiario': 'dashboard',
          };
          
          // Procesar permisos desde la API
          if (rolPermisoData && Array.isArray(rolPermisoData)) {
            rolPermisoData.forEach(relacion => {
              const permisoNombre = relacion.permisoId?.permiso || relacion.permiso?.permiso;
              if (!permisoNombre) return;
              const mapped = moduloToPermission[permisoNombre];
              if (mapped) {
                permissionsSet.add(mapped);
              } else {
                // Si el backend ya envía la clave en formato del frontend, aceptarla
                if (/^(venta-servicios|servicios-musicales|configuracion|dashboard)/.test(permisoNombre)) {
                  permissionsSet.add(permisoNombre);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error al obtener permisos desde API:', error);
          // Fallback a permisos por defecto según el rol
        }
        
        // Agregar permisos específicos según el rol como fallback
        const rolNombre = data.usuario.rol.nombre.toLowerCase();
        
        if (rolNombre === 'administrador') {
          // Administradores tienen acceso a todo
          permissionsSet.add('*');
          permissionsSet.add('dashboard');
        } else if (rolNombre === 'profesor') {
          // Profesores pueden ver módulos relacionados con servicios musicales (excepto cursos-matriculas)
          permissionsSet.add('servicios-musicales-profesores');
          permissionsSet.add('servicios-musicales-programacion-profesores');
          permissionsSet.add('servicios-musicales-programacion-clases');
          // Eliminado acceso a Aulas para profesor
          permissionsSet.add('servicios-musicales-clases');
          permissionsSet.add('venta-servicios-asistencia');
        } else if (rolNombre === 'beneficiario') {
          // Beneficiarios deben poder ver programación de clases y pagos
          permissionsSet.add('servicios-musicales-programacion-clases');
          permissionsSet.add('venta-servicios-pagos');
        } else if (rolNombre === 'cliente') {
          // Clientes solo pueden ver pagos y beneficiarios
          permissionsSet.add('venta-servicios-pagos');
          permissionsSet.add('venta-servicios-beneficiarios');
        }
        
        const permissions = Array.from(permissionsSet);
        
        const userData = {
          id: data.usuario.id,
          name: `${data.usuario.nombre} ${data.usuario.apellido}`,
          email: data.usuario.correo,
          documento: data.usuario.documento,
          tipo_de_documento: data.usuario.tipo_de_documento,
          role: data.usuario.rol.nombre.toLowerCase(),
          currentRole: data.usuario.rol, // Rol actual completo
          allRoles: data.usuario.todosLosRoles || [data.usuario.rol], // Todos los roles disponibles
          permissions: permissions,
          permisos: data.usuario.permisos, // Guardar permisos originales del backend
          token: data.token
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', data.token);
        // Configurar axios globalmente con el token
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        // Redirigir según los permisos del usuario
        const getDefaultRoute = (permissions, role) => {
          if (role === 'cliente') {
            return '/venta-servicios/beneficiarios';
          } else if (role === 'profesor') {
            return '/servicios-musicales/programacion-profesores';
          } else if (role === 'beneficiario') {
            return '/servicios-musicales/programacion-clases';
          } else if (permissions.includes('dashboard') || permissions.includes('*')) {
            return '/dashboard';
          } else {
            return '/servicios-musicales/programacion-clases'; // Ruta por defecto
          }
        };
        
        navigate(getDefaultRoute(permissions, rolNombre));
        
        return { success: true, message: 'Inicio de sesión exitoso' };
      } else {
        return { success: false, message: data.message || 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error al iniciar sesión' };
    }
  };

  const changeRole = async (newRoleId) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/login/cambiar-rol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          usuarioId: user.id, 
          nuevoRolId: newRoleId 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Obtener permisos desde la API rol_permiso_privilegio
        const permissionsSet = new Set();
        
        try {
          const roleId = data?.usuario?.rol?.id || data?.usuario?.rol?._id;
          const rolPermisoResponse = await fetch(`${API_CONFIG.BASE_URL}/rol_permiso_privilegio?rolId=${roleId}`, {
            headers: {
              'Authorization': `Bearer ${data.token}`,
              'Accept': 'application/json'
            }
          });
          const rolPermisoData = await rolPermisoResponse.json();
          
          // Mapeo de módulos del backend a permisos del frontend
          const moduloToPermission = {
            'beneficiarios': 'venta-servicios-beneficiarios',
            'asistencia': 'venta-servicios-asistencia',
            'pagos': 'venta-servicios-pagos',
            'programacion_de_clases': 'servicios-musicales-programacion-clases',
            'profesores': 'servicios-musicales-profesores',
            'programacion_de_profesores': 'servicios-musicales-programacion-profesores',
            'cursos_matriculas': 'servicios-musicales-cursos-matriculas',
            'aulas': 'servicios-musicales-aulas',
            'clases': 'servicios-musicales-clases',
            'clientes': 'venta-servicios-clientes',
            'venta_matriculas': 'venta-servicios-venta-matriculas',
            'venta_cursos': 'venta-servicios-venta-cursos',
            'roles': 'configuracion-roles',
            'usuarios': 'configuracion-usuarios',
            'dashboard': 'dashboard',
            // Aceptar también nombres ya normalizados desde backend
            'venta-servicios-pagos': 'venta-servicios-pagos',
            'venta-servicios-beneficiarios': 'venta-servicios-beneficiarios',
            'venta-servicios-asistencia': 'venta-servicios-asistencia',
            'venta-servicios-clientes': 'venta-servicios-clientes',
            'venta-servicios-venta-matriculas': 'venta-servicios-venta-matriculas',
            'venta-servicios-venta-cursos': 'venta-servicios-venta-cursos',
            'servicios-musicales-profesores': 'servicios-musicales-profesores',
            'servicios-musicales-programacion-profesores': 'servicios-musicales-programacion-profesores',
            'servicios-musicales-programacion-clases': 'servicios-musicales-programacion-clases',
            'servicios-musicales-cursos-matriculas': 'servicios-musicales-cursos-matriculas',
            'servicios-musicales-aulas': 'servicios-musicales-aulas',
            'servicios-musicales-clases': 'servicios-musicales-clases',
            'configuracion-roles': 'configuracion-roles',
            'configuracion-usuarios': 'configuracion-usuarios',
            'dashboard-administrador': 'dashboard',
            'dashboard-profesor': 'dashboard',
            'dashboard-beneficiario': 'dashboard',
          };
          
          // Procesar permisos desde la API
          if (rolPermisoData && Array.isArray(rolPermisoData)) {
            rolPermisoData.forEach(relacion => {
              const permisoNombre = relacion.permisoId?.permiso || relacion.permiso?.permiso;
              if (!permisoNombre) return;
              const mapped = moduloToPermission[permisoNombre];
              if (mapped) {
                permissionsSet.add(mapped);
              } else {
                // Si el backend ya envía la clave en formato del frontend, aceptarla
                if (/^(venta-servicios|servicios-musicales|configuracion|dashboard)/.test(permisoNombre)) {
                  permissionsSet.add(permisoNombre);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error al obtener permisos desde API:', error);
          // Fallback a permisos por defecto según el rol
        }
        
        // Agregar permisos específicos según el rol como fallback
        const rolNombre = data.usuario.rol.nombre.toLowerCase();
        
        if (rolNombre === 'administrador') {
          // Administradores tienen acceso a todo
          permissionsSet.add('*');
          permissionsSet.add('dashboard');
        } else if (rolNombre === 'profesor') {
          // Profesores pueden ver módulos relacionados con servicios musicales (excepto cursos-matriculas)
          permissionsSet.add('servicios-musicales-profesores');
          permissionsSet.add('servicios-musicales-programacion-profesores');
          permissionsSet.add('servicios-musicales-programacion-clases');
          // Eliminado acceso a Aulas para profesor
          permissionsSet.add('servicios-musicales-clases');
          permissionsSet.add('venta-servicios-asistencia');
        } else if (rolNombre === 'beneficiario') {
          // Beneficiarios deben poder ver programación de clases y pagos
          permissionsSet.add('servicios-musicales-programacion-clases');
          permissionsSet.add('venta-servicios-pagos');
        } else if (rolNombre === 'cliente') {
          // Clientes solo pueden ver pagos y beneficiarios
          permissionsSet.add('venta-servicios-pagos');
          permissionsSet.add('venta-servicios-beneficiarios');
        }
        
        const permissions = Array.from(permissionsSet);
        
        const updatedUserData = {
          ...user,
          role: data.usuario.rol.nombre.toLowerCase(),
          currentRole: data.usuario.rol,
          allRoles: data.usuario.todosLosRoles,
          permissions: permissions,
          permisos: data.usuario.permisos,
          token: data.token
        };
        
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        localStorage.setItem('token', data.token);
        // Actualizar axios globalmente con el nuevo token
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        // Redirigir según los permisos del nuevo rol
        const getDefaultRoute = (permissions, role) => {
          if (role === 'cliente') {
            return '/venta-servicios/beneficiarios';
          } else if (role === 'profesor') {
            return '/servicios-musicales/programacion-profesores';
          } else if (role === 'beneficiario') {
            return '/servicios-musicales/programacion-clases';
          } else if (permissions.includes('dashboard') || permissions.includes('*')) {
            return '/dashboard';
          } else {
            return '/servicios-musicales/programacion-clases'; // Ruta por defecto
          }
        };
        
        navigate(getDefaultRoute(permissions, rolNombre));
        
        return { success: true, message: 'Rol cambiado exitosamente' };
      } else {
        return { success: false, message: data.message || 'Error al cambiar de rol' };
      }
    } catch (error) {
      console.error('Error al cambiar de rol:', error);
      return { success: false, message: 'Error al cambiar de rol' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Limpiar el header Authorization global de axios
    delete axios.defaults.headers.common['Authorization'];
    navigate('/');
  };

  // Verificación de privilegios por módulo/acción
  const hasPrivilege = (moduleKey, action) => {
    try {
      const normalize = (s) => (s || '').toString().trim().toLowerCase();
      const actionNorm = normalize(action);

      // Si tiene comodín '*' (administrador), acceso total
      if (user?.permissions?.includes('*')) return true;

      // Mapeo entre claves de módulo del backend y frontend
      const moduloToPermission = {
        'beneficiarios': 'venta-servicios-beneficiarios',
        'asistencia': 'venta-servicios-asistencia',
        'pagos': 'venta-servicios-pagos',
        'programacion_de_clases': 'servicios-musicales-programacion-clases',
        'profesores': 'servicios-musicales-profesores',
        'programacion_de_profesores': 'servicios-musicales-programacion-profesores',
        'cursos_matriculas': 'servicios-musicales-cursos-matriculas',
        'aulas': 'servicios-musicales-aulas',
        'clases': 'servicios-musicales-clases',
        'clientes': 'venta-servicios-clientes',
        'venta_matriculas': 'venta-servicios-venta-matriculas',
        'venta_cursos': 'venta-servicios-venta-cursos',
        'roles': 'configuracion-roles',
        'usuarios': 'configuracion-usuarios',
        'dashboard': 'dashboard',
        // Claves ya normalizadas aceptadas tal cual
        'venta-servicios-pagos': 'venta-servicios-pagos',
        'venta-servicios-beneficiarios': 'venta-servicios-beneficiarios',
        'venta-servicios-asistencia': 'venta-servicios-asistencia',
        'venta-servicios-clientes': 'venta-servicios-clientes',
        'venta-servicios-venta-matriculas': 'venta-servicios-venta-matriculas',
        'venta-servicios-venta-cursos': 'venta-servicios-venta-cursos',
        'servicios-musicales-profesores': 'servicios-musicales-profesores',
        'servicios-musicales-programacion-profesores': 'servicios-musicales-programacion-profesores',
        'servicios-musicales-programacion-clases': 'servicios-musicales-programacion-clases',
        'servicios-musicales-cursos-matriculas': 'servicios-musicales-cursos-matriculas',
        'servicios-musicales-aulas': 'servicios-musicales-aulas',
        'servicios-musicales-clases': 'servicios-musicales-clases',
        'configuracion-roles': 'configuracion-roles',
        'configuracion-usuarios': 'configuracion-usuarios',
      };

      const moduleNorm = normalize(moduleKey);
      const permissionKey = moduloToPermission[moduleNorm] || moduleNorm;

      const modulePrivileges = user?.permisos?.[permissionKey];
      if (!modulePrivileges || !Array.isArray(modulePrivileges)) return false;

      return modulePrivileges.some((p) => normalize(p) === actionNorm);
    } catch (e) {
      console.error('Error evaluando privilegios:', e);
      return false;
    }
  };

  useEffect(() => {
    // Si hay un usuario en localStorage, mantener la sesión
    const storedUser = localStorage.getItem('user');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, changeRole, hasPrivilege }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}