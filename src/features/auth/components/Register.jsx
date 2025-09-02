import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usuariosService, usuariosHasRolService } from '../../../shared/services/api'
import { authService } from '../../../shared/services/auth.service'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    confirmacionContrasena: ''
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validar que las contraseñas coincidan
    if (formData.contrasena !== formData.confirmacionContrasena) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      // Registrar usuario
      const registerResponse = await usuariosService.create(formData)
      
      if (!registerResponse) {
        setError('Error al registrar usuario')
        return
      }

      // Login automático después del registro
      const loginResponse = await authService.login(formData.correo, formData.contrasena)
      
      if (loginResponse.success) {
        // Obtener roles del usuario
        const rolesResponse = await usuariosHasRolService.getByUsuarioId(loginResponse.user.id)
        
        if (rolesResponse) {
          // Guardar roles en el localStorage
          localStorage.setItem('userRoles', JSON.stringify(rolesResponse))
        }

        // Redirigir al dashboard
        navigate('/dashboard')
      } else {
        setError('Registro exitoso pero hubo un error al iniciar sesión')
      }
    } catch (error) {
      setError('Error al registrar usuario')
      console.error('Error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registrar nueva cuenta
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="nombre" className="sr-only">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nombre"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="apellido" className="sr-only">Apellido</label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Apellido"
                value={formData.apellido}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="correo" className="sr-only">Correo electrónico</label>
              <input
                id="correo"
                name="correo"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={formData.correo}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="contrasena" className="sr-only">Contraseña</label>
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={formData.contrasena}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmacionContrasena" className="sr-only">Confirmar contraseña</label>
              <input
                id="confirmacionContrasena"
                name="confirmacionContrasena"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirmar contraseña"
                value={formData.confirmacionContrasena}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register