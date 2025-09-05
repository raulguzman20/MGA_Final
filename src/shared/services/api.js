import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    ...API_CONFIG.HEADERS,
    'Accept': 'application/json'
  },
  timeout: 10000
});

// Interceptor para adjuntar Authorization automáticamente desde axios.defaults o localStorage
api.interceptors.request.use(
  (config) => {
    try {
      // Priorizar cualquier Authorization ya presente
      if (!config.headers) config.headers = {};
      if (config.headers.Authorization || config.headers.authorization) {
        return config;
      }

      // 1) Intentar desde axios.defaults (AuthContext lo configura)
      const defaultAuth = axios?.defaults?.headers?.common?.Authorization || axios?.defaults?.headers?.common?.authorization;
      if (defaultAuth) {
        config.headers.Authorization = defaultAuth;
        return config;
      }

      // 2) Intentar desde localStorage ('token' directo o dentro de 'user')
      let token = localStorage.getItem('token');
      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            token = userObj?.token || userObj?.usuario?.token || userObj?.data?.token || null;
          } catch (e) {
            // ignorar error de parseo
          }
        }
      }

      if (token) {
        config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
    } catch (e) {
      // No bloquear la request si hay un error obteniendo el token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('Error en la llamada API:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error.response?.data || error;
  }
);

// Servicios para usuarios
export const usuariosService = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.USUARIOS);
      return response;
    } catch (error) {
      console.error('Error en getAll usuarios:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.USUARIOS}/${id}`);
      return response;
    } catch (error) {
      console.error('Error en getById usuarios:', error);
      throw error;
    }
  },

  create: async (userData) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.USUARIOS, userData);
      return response;
    } catch (error) {
      console.error('Error en create usuarios:', error);
      throw error;
    }
  },

  update: async (id, userData) => {
    try {
      const response = await api.put(`${API_CONFIG.ENDPOINTS.USUARIOS}/${id}`, userData);
      return response;
    } catch (error) {
      console.error('Error en update usuarios:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_CONFIG.ENDPOINTS.USUARIOS}/${id}`);
      return response;
    } catch (error) {
      console.error('Error en delete usuarios:', error);
      throw error;
    }
  },
};

// Servicios para roles
export const rolesService = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.ROLES);
      return response;
    } catch (error) {
      console.error('Error en getAll roles:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`);
      return response;
    } catch (error) {
      console.error('Error en getById roles:', error);
      throw error;
    }
  },
};

// Servicios para usuarios_has_rol
export const usuariosHasRolService = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL);
      return response;
    } catch (error) {
      console.error('Error en getAll usuariosHasRol:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL}/${id}`);
      return response;
    } catch (error) {
      console.error('Error en getById usuariosHasRol:', error);
      throw error;
    }
  },

  getByUsuarioId: async (usuarioId) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL}/usuario/${usuarioId}`);
      return response;
    } catch (error) {
      console.error('Error en getByUsuarioId usuariosHasRol:', error);
      throw error;
    }
  },

  create: async (usuarioRolData) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL, usuarioRolData);
      return response;
    } catch (error) {
      console.error('Error en create usuariosHasRol:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL}/${id}`);
      return response;
    } catch (error) {
      console.error('Error en delete usuariosHasRol:', error);
      throw error;
    }
  },

  deleteByUsuarioId: async (usuarioId) => {
    try {
      const response = await api.delete(`${API_CONFIG.ENDPOINTS.USUARIOS_HAS_ROL}/usuario/${usuarioId}`);
      return response;
    } catch (error) {
      console.error('Error en deleteByUsuarioId usuariosHasRol:', error);
      throw error;
    }
  },
};

// Servicios para ventas
export const ventasService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.VENTAS, { params })
      return response
    } catch (error) {
      console.error('Error en getAll ventas:', error)
      throw error
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.VENTAS}/${id}`)
      return response
    } catch (error) {
      console.error('Error en getById ventas:', error)
      throw error
    }
  },

  create: async (ventaData, config = {}) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.VENTAS, ventaData, config)
      return response
    } catch (error) {
      console.error('Error en create ventas:', error)
      throw error
    }
  },

  update: async (id, ventaData) => {
    try {
      const response = await api.put(`${API_CONFIG.ENDPOINTS.VENTAS}/${id}`, ventaData)
      return response
    } catch (error) {
      console.error('Error en update ventas:', error)
      throw error
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_CONFIG.ENDPOINTS.VENTAS}/${id}`)
      return response
    } catch (error) {
      console.error('Error en delete ventas:', error)
      throw error
    }
  },

  anular: async (id, motivoAnulacion) => {
    try {
      const response = await api.patch(`${API_CONFIG.ENDPOINTS.VENTAS}/${id}/anular`, { motivoAnulacion })
      return response
    } catch (error) {
      console.error('Error en anular ventas:', error)
      throw error
    }
  },

  getNextConsecutivo: async () => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.VENTAS}/next-consecutivo`)
      return response
    } catch (error) {
      console.error('Error en getNextConsecutivo ventas:', error)
      throw error
    }
  },
}

// Servicios para beneficiarios (extendidos)
export const beneficiariosService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.BENEFICIARIOS, { params })
      return response
    } catch (error) {
      console.error('Error en getAll beneficiarios:', error)
      throw error
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.BENEFICIARIOS}/${id}`)
      return response
    } catch (error) {
      console.error('Error en getById beneficiarios:', error)
      throw error
    }
  },

  create: async (data) => {
    try {
      const response = await api.post(API_CONFIG.ENDPOINTS.BENEFICIARIOS, data)
      return response
    } catch (error) {
      console.error('Error en create beneficiarios:', error)
      throw error
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`${API_CONFIG.ENDPOINTS.BENEFICIARIOS}/${id}`, data)
      return response
    } catch (error) {
      console.error('Error en update beneficiarios:', error)
      throw error
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_CONFIG.ENDPOINTS.BENEFICIARIOS}/${id}`)
      return response
    } catch (error) {
      console.error('Error en delete beneficiarios:', error)
      throw error
    }
  },
}

// Servicio para cursos (mínimo necesarios)
export const cursosService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.CURSOS, { params })
      return response
    } catch (error) {
      console.error('Error en getAll cursos:', error)
      throw error
    }
  },
}

// Servicio para email
export const emailService = {
  welcome: async ({ email, nombre, apellido, username, password }) => {
    try {
      const response = await api.post('/email/welcome', { email, nombre, apellido, username, password })
      return response
    } catch (error) {
      console.error('Error en email.welcome:', error)
      throw error
    }
  }
}