import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

// Create axios instance for auth service
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    ...API_CONFIG.HEADERS,
    'Accept': 'application/json'
  },
  timeout: 10000
});

const authService = {
  // Login
  login: async (email, password) => {
    try {
      console.log("=== AUTH SERVICE LOGIN ===")
      console.log("Email recibido:", email)
      console.log("Password length:", password?.length)

      // Convertir email a correo y password a contrasena para el backend
      const loginData = {
        correo: email,
        contrasena: password,
      }

      console.log("Datos enviados al backend:", loginData)

      const response = await axiosInstance.post("/login", loginData)

      console.log("Respuesta del servidor:", response.data)

      if (response.data.success && response.data.token) {
        const { token, usuario } = response.data

        // Para el nuevo endpoint simplificado, crear permisos básicos basados en el rol
        const permisosArray = []
        const rolNombre = usuario.rol?.nombre?.toLowerCase()
        
        if (rolNombre === 'administrador' || rolNombre === 'admin') {
          permisosArray.push('dashboard-administrador-Ver')
        } else if (rolNombre === 'profesor') {
          permisosArray.push('dashboard-profesor-Ver')
        } else if (rolNombre === 'beneficiario') {
          permisosArray.push('dashboard-beneficiario-Ver')
        } else if (rolNombre === 'secretaria') {
          permisosArray.push('dashboard-administrador-Ver')
        }

        const userWithPermissions = {
          ...usuario,
          permissions: permisosArray,
          permisos: {} // Estructura vacía para compatibilidad
        }

        console.log('Usuario con permisos:', userWithPermissions)

        // Guardar token y usuario en localStorage
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(userWithPermissions))

        // Configurar el token en axios para futuras peticiones
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`

        return {
          success: true,
          user: userWithPermissions,
          token: token,
          data: response.data,
        }
      }

      return {
        success: false,
        message: response.data.message || "Error en el login",
      }
    } catch (error) {
      console.error("Error en authService.login:", error)

      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`,
        }
      }

      if (error.request) {
        return {
          success: false,
          message: "No se pudo conectar con el servidor",
        }
      }

      return {
        success: false,
        message: "Error de configuración de la petición",
      }
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    delete axiosInstance.defaults.headers.common["Authorization"]
    return { success: true }
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    const token = localStorage.getItem("token")
    return !!token
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  },

  // Obtener token
  getToken: () => {
    return localStorage.getItem("token")
  },

  // Recuperar contraseña
  forgotPassword: async (email) => {
    try {
      const response = await axiosInstance.post("/password-reset/forgot-password", {
        email: email,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error) {
      console.error("Error en forgotPassword:", error)
      return {
        success: false,
        message: error.response?.data?.error || "Error al recuperar contraseña",
      }
    }
  },

  // Restablecer contraseña con token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await axiosInstance.post("/password-reset/reset-password", {
        token: token,
        newPassword: newPassword,
      })

      return {
        success: true,
        message: response.data.message,
      }
    } catch (error) {
      console.error("Error en resetPassword:", error)
      return {
        success: false,
        message: error.response?.data?.error || "Error al restablecer contraseña",
      }
    }
  },

  // Verificar token de restablecimiento
  verifyResetToken: async (token) => {
    try {
      const response = await axiosInstance.get(`/password-reset/verify-token/${token}`)

      return {
        valid: response.data.valid,
        message: response.data.message,
      }
    } catch (error) {
      console.error("Error en verifyResetToken:", error)
      return {
        valid: false,
        message: error.response?.data?.error || "Error al verificar token",
      }
    }
  },
}

export { authService }
export default authService
