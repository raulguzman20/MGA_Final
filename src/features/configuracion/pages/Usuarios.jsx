'use client'

import { useState, useEffect, useMemo } from "react"
import { GenericList } from "../../../shared/components/GenericList"
import { DetailModal } from "../../../shared/components/DetailModal"
import { FormModal } from "../../../shared/components/FormModal"
import { StatusButton } from "../../../shared/components/StatusButton"
import { UserRoleAssignment } from "../../../shared/components/UserRoleAssignment"
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog'
import axios from 'axios'
import { Button, Box, Typography, Chip, Alert, Snackbar } from "@mui/material"
import { PersonAdd as PersonAddIcon } from "@mui/icons-material"
import { usuariosService, rolesService, usuariosHasRolService } from "../../../shared/services/api"
import { toast } from 'react-toastify'

const Usuarios = () => {
  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [selectedUsuario, setSelectedUsuario] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [roleAssignmentOpen, setRoleAssignmentOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  })
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  const fetchData = async () => {
    try {
      const [usuariosResp, rolesResp, usuariosHasRolResp] = await Promise.all([
        usuariosService.getAll(),
        rolesService.getAll(),
        usuariosHasRolService.getAll()
      ]);

      // Extraer arrays de la respuesta, protegiendo si vienen como objeto
      const usuariosData = Array.isArray(usuariosResp)
        ? usuariosResp
        : (Array.isArray(usuariosResp?.usuarios) ? usuariosResp.usuarios : []);
      const rolesData = Array.isArray(rolesResp)
        ? rolesResp
        : (Array.isArray(rolesResp?.roles) ? rolesResp.roles : []);
      const usuariosHasRolData = Array.isArray(usuariosHasRolResp)
        ? usuariosHasRolResp
        : (Array.isArray(usuariosHasRolResp?.asignaciones) ? usuariosHasRolResp.asignaciones : []);

      // Procesar usuarios con sus roles

      // Asignar roles a cada usuario
      const usuariosConRoles = usuariosData.map(usuario => {
        // Obtener todas las asignaciones del usuario
        const asignacionesUsuario = usuariosHasRolData.filter(asignacion => {
          if (!asignacion.usuarioId) return false;

          // Manejar tanto ObjectId como objeto poblado
          const usuarioIdEnAsignacion = typeof asignacion.usuarioId === 'string'
            ? asignacion.usuarioId
            : asignacion.usuarioId._id || asignacion.usuarioId.id;

          return usuarioIdEnAsignacion === usuario._id;
        });

        // Extraer roles de las asignaciones activas
        const rolesUsuario = asignacionesUsuario
          .filter(asignacion => {
            // Por defecto, considerar activo si no hay campo estado
            const estado = asignacion.estado !== false;
            return estado && asignacion.rolId;
          })
          .map(asignacion => asignacion.rolId)
          .filter(rol => rol); // Solo roles válidos

        return {
          ...usuario,
          roles: rolesUsuario
        };
      });

      console.log('Usuarios procesados con roles activos:', usuariosConRoles);

      setUsuarios(usuariosConRoles);
      setRoles(rolesData);
      return usuariosConRoles;
    } catch (error) {
      console.error('Error al cargar datos:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setIsEditing(false);
    setSelectedUsuario(null);
    setPasswordError('');
    setConfirmPassword('');
    setPasswordRequirements({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false
    });
    setFormModalOpen(true);
  }

  const handleEdit = async (usuario) => {
    try {
      // Obtener las asignaciones actuales del usuario
      const allAssignments = await usuariosHasRolService.getAll();
      const userAssignments = allAssignments.filter(assignment =>
        assignment.usuarioId && assignment.usuarioId._id === usuario._id
      );

      // Obtener los roles completos para cada asignación
      const rolesAsignados = userAssignments.map(assignment => {
        // Si rolId ya es un objeto completo, usarlo directamente
        if (assignment.rolId && typeof assignment.rolId === 'object') {
          return assignment.rolId;
        }
        // Si no, buscar el rol completo en la lista de roles
        return roles.find(rol => rol._id === assignment.rolId);
      }).filter(Boolean); // Eliminar posibles valores null/undefined

      const usuarioConRoles = {
        ...usuario,
        roles: rolesAsignados,
        rolId: rolesAsignados.length > 0 ? rolesAsignados[0]._id : ''
      };

      // Establecer el rolId en el usuario
      if (rolesAsignados.length > 0) {
        usuarioConRoles.rolId = rolesAsignados[0]._id;
      }

      // Editar información del usuario directamente
      setIsEditing(true);
      setSelectedUsuario(usuarioConRoles);
      setFormModalOpen(true);
    } catch (error) {
      console.error('Error al cargar los roles del usuario:', error);
      alert('Error al cargar los roles del usuario');
    }
  }

  const handleDelete = async (usuario) => {
    setConfirmationDialog({
      open: true,
      title: 'Confirmar Eliminación',
      message: `¿Está seguro que desea eliminar al usuario ${usuario.nombre} ${usuario.apellido}?`,
      onConfirm: async () => {
        try {
          await usuariosService.delete(usuario._id);
          setUsuarios((prev) => prev.filter((item) => item._id !== usuario._id))
          setAlert({
            open: true,
            message: 'Usuario eliminado correctamente',
            severity: 'success'
          });
          toast.success('Usuario eliminado correctamente');
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          toast.error('Error al eliminar usuario');
        }
        setConfirmationDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  }

  const handleView = (usuario) => {
    console.log('Usuario seleccionado para ver detalles:', usuario);
    // Asegurarse de que el usuario tenga la propiedad roles
    let usuarioConRoles = usuario;

    if (!usuario.roles || !Array.isArray(usuario.roles)) {
      // Buscar el usuario en el estado actual para obtener sus roles
      const usuarioCompleto = usuarios.find(u => u._id === usuario._id);
      if (usuarioCompleto && Array.isArray(usuarioCompleto.roles)) {
        usuarioConRoles = usuarioCompleto;
      } else {
        usuarioConRoles = { ...usuario, roles: [] };
      }
    }

    console.log('Usuario con roles:', usuarioConRoles);
    setSelectedUsuario(usuarioConRoles);
    setDetailModalOpen(true);
  }

  const handlePasswordChange = (value, formData, setFieldValue) => {
    setFieldValue("contrasena", value);

    // Use setTimeout to avoid blocking input
    setTimeout(() => {
      validatePassword(value, formData?.confirmacionContrasena);

      // Sincronizar confirmación en estado si existe
      if (formData?.confirmacionContrasena) {
        setConfirmPassword(formData.confirmacionContrasena);
      }
    }, 0);
  };

  const handleConfirmPasswordChange = (value, formData, setFieldValue) => {
    setFieldValue("confirmacionContrasena", value);

    // Use setTimeout to avoid blocking input
    setTimeout(() => {
      setConfirmPassword(value);
      if (formData?.contrasena) {
        validatePassword(formData.contrasena, value);
      }
    }, 0);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false)
    setSelectedUsuario(null)
  }

  // Validación en tiempo real de la contraseña
  const validatePassword = (password, confirmation) => {
    const requirements = {
      length: password?.length >= 8,
      uppercase: /[A-Z]/.test(password || ''),
      lowercase: /[a-z]/.test(password || ''),
      number: /[0-9]/.test(password || '')
    };

    // Mantenemos el estado para otros usos, pero no lo usamos en formFields
    setPasswordRequirements(requirements);

    if (!password) {
      setPasswordError('La contraseña es requerida');
      return false;
    }

    if (!requirements.length) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }

    if (!requirements.uppercase || !requirements.lowercase || !requirements.number) {
      setPasswordError('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número');
      return false;
    }

    const confirmToUse = typeof confirmation !== 'undefined' ? confirmation : confirmPassword;
    if (confirmToUse && password !== confirmToUse) {
      setPasswordError('Las contraseñas no coinciden');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleCloseForm = (action) => {
    if (action === 'assignRoles' && selectedUsuario) {
      // Si se cerró el formulario con la acción de asignar roles, abrir el diálogo de asignación
      setRoleAssignmentOpen(true);
    } else {
      setFormModalOpen(false);
      setSelectedUsuario(null);
      setIsEditing(false);
      setPasswordError('');
      setConfirmPassword('');
      setPasswordRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false
      });
    }
  }

  const handleSubmit = async (formData) => {
    try {
      // Validar campos requeridos
      if (!formData.nombre || !formData.apellido || !formData.correo || !formData.tipo_de_documento || !formData.documento) {
        setAlert({
          open: true,
          message: 'Por favor complete todos los campos obligatorios',
          severity: 'error'
        });
        return;
      }

      // Validar formato de correo: permitir letras latinas con acentos y ñ
      const emailRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9._%+-]+@[A-Za-zÁÉÍÓÚáéíóúÑñ0-9.-]+\.[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}$/;
      if (!emailRegex.test(formData.correo)) {
        setAlert({
          open: true,
          message: 'El formato del correo electrónico no es válido',
          severity: 'error'
        });
        return;
      }

      // Validar contraseña si es un nuevo usuario
      if (!isEditing) {
        if (!formData.contrasena) {
          setAlert({
            open: true,
            message: 'La contraseña es requerida',
            severity: 'error'
          });
          return;
        }

        if (formData.contrasena.length < 8) {
          setAlert({
            open: true,
            message: 'La contraseña debe tener al menos 8 caracteres',
            severity: 'error'
          });
          return;
        }

        const hasUpperCase = /[A-Z]/.test(formData.contrasena);
        const hasLowerCase = /[a-z]/.test(formData.contrasena);
        const hasNumber = /[0-9]/.test(formData.contrasena);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          setAlert({
            open: true,
            message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número',
            severity: 'error'
          });
          return;
        }

        if (formData.contrasena !== formData.confirmacionContrasena) {
          setAlert({
            open: true,
            message: 'Las contraseñas no coinciden',
            severity: 'error'
          });
          return;
        }
      }

      const { confirmacionContrasena, rolId, contrasena, telefono, direccion, especialidades, ...userData } = formData;

      // Verificar si el rol seleccionado es de profesor (solo para creación)
      const profesorRol = roles.find(rol => rol.nombre.toLowerCase().includes('profesor'));
      const isProfesorRole = !isEditing && profesorRol && rolId === profesorRol._id;

      if (isEditing) {
        // Al editar, solo actualizamos los datos del usuario, no los roles
        const updatedUser = await usuariosService.update(selectedUsuario._id, userData);

        // Si el usuario tiene rol de profesor, actualizar datos del profesor
        const tieneRolProfesor = selectedUsuario.roles?.some(rol =>
          (typeof rol === 'string' && rol === profesorRol?._id) ||
          (typeof rol === 'object' && rol._id === profesorRol?._id)
        );

        if (tieneRolProfesor && (telefono || direccion || especialidades)) {
          try {
            // Verificar si ya existe un profesor asociado a este usuario
            const response = await axios.get(`http://localhost:3000/api/profesores?usuarioId=${selectedUsuario._id}`);
            const profesoresData = response.data;
            const profesorExistente = profesoresData.find(p => p.usuarioId === selectedUsuario._id);

            if (profesorExistente && (telefono || direccion || especialidades)) {
              // Solo actualizar si se proporcionaron datos de profesor
              const profesorData = {
                usuarioId: selectedUsuario._id,
                nombres: userData.nombre,
                apellidos: userData.apellido,
                tipoDocumento: userData.tipo_de_documento,
                identificacion: userData.documento,
                correo: userData.correo,
                estado: 'Activo'
              };

              if (telefono) profesorData.telefono = telefono;
              if (direccion) profesorData.direccion = direccion;
              if (especialidades && Array.isArray(especialidades) && especialidades.length > 0) {
                profesorData.especialidades = especialidades;
              }

              await axios.put(`http://localhost:3000/api/profesores/${profesorExistente._id}`, profesorData);
              toast.success('Usuario y datos de profesor actualizados correctamente');
            } else {
              toast.success('Usuario actualizado correctamente');
            }
          } catch (profesorError) {
            console.error('Error al actualizar profesor:', profesorError);
            toast.error(`Error al actualizar datos de profesor: ${profesorError.message}`);
          }
        } else {
          toast.success('Usuario actualizado correctamente');
        }

        // Mostrar alerta de éxito
        setAlert({
          open: true,
          message: 'Usuario actualizado correctamente',
          severity: 'success'
        });

        // Recargar datos
        await fetchData();
      } else {
        // Crear el usuario primero
        const newUser = await usuariosService.create({
          ...userData,
          contrasena // Solo incluimos la contraseña al crear
        });

        // Mostrar alerta de éxito para la creación
        setAlert({
          open: true,
          message: 'Usuario creado correctamente',
          severity: 'success'
        });

        if (!newUser || !newUser._id) {
          throw new Error('Error al crear el usuario: respuesta inválida del servidor');
        }

        // Crear la asignación de rol si se proporcionó un rolId
        if (rolId) {
          try {
            console.log('Creando asignación de rol para:', { usuarioId: newUser._id, rolId });

            // Verificar que el rol existe
            const rol = await rolesService.getById(rolId);
            if (!rol) {
              throw new Error(`Rol con ID ${rolId} no encontrado`);
            }

            // Crear la asignación de rol
            const asignacionData = {
              usuarioId: String(newUser._id),
              rolId: typeof rolId === 'object' ? (rolId._id || rolId.id || String(rolId)) : String(rolId)
            };

            console.log('Datos de asignación:', asignacionData);

            const asignacionResult = await usuariosHasRolService.create(asignacionData);
            console.log('Resultado de asignación:', asignacionResult);

            // Añadir el rol al nuevo usuario
            newUser.roles = rol ? [rol] : [];

          } catch (rolError) {
            console.error('Error al asignar rol:', rolError);
            // Si falla la asignación del rol, eliminar el usuario creado
            try {
              await usuariosService.delete(newUser._id);
            } catch (deleteError) {
              console.error('Error al eliminar usuario tras fallo de rol:', deleteError);
            }
            throw new Error(`Error al asignar el rol: ${rolError.message || rolError}`);
          }
        } else {
          newUser.roles = [];
        }

        // Si es un profesor, crear el registro de profesor
        if (isProfesorRole) {
          try {
            // Asegurar que las especialidades no estén vacías
            const especialidadesArray = especialidades && Array.isArray(especialidades) && especialidades.length > 0
              ? especialidades
              : ['Piano']; // Especialidad por defecto si no se proporciona

            const profesorData = {
              usuarioId: newUser._id,
              nombres: userData.nombre,
              apellidos: userData.apellido,
              tipoDocumento: userData.tipo_de_documento,
              identificacion: userData.documento,
              telefono: telefono || '3000000000',
              correo: userData.correo,
              especialidades: especialidadesArray,
              estado: 'Activo'
            };

            if (direccion) {
              profesorData.direccion = direccion;
            }

            console.log('Datos del profesor a crear:', profesorData);

            // Crear nuevo profesor
            const profesorResponse = await axios.post('http://localhost:3000/api/profesores', profesorData);

            console.log('Profesor creado correctamente:', profesorResponse.data);
            toast.success('Usuario y profesor creados correctamente');
          } catch (profesorError) {
            console.error('Error al crear profesor:', profesorError);
            console.error('Detalles del error:', profesorError.response?.data);
            toast.error(`Error al crear profesor: ${profesorError.response?.data?.details || profesorError.message}`);
            // No eliminamos el usuario creado, pero mostramos el error
          }
        }

        setUsuarios((prev) => [...prev, newUser]);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setAlert({
        open: true,
        message: `Error: ${error.message || 'Ocurrió un error al procesar la solicitud'}`,
        severity: 'error'
      });
      toast.error(`Error: ${error.message || 'Ocurrió un error al procesar la solicitud'}`);
    }
  };

  // Estado para controlar los campos adicionales del profesor
  const [showProfesorFields, setShowProfesorFields] = useState(false);

  // Cursos (usados como especialidades en el formulario de usuarios/profesores)
  const [cursosOptions, setCursosOptions] = useState([]);

  // Lista por defecto (fallback) en caso de que la API no responda
  const defaultCursos = [
    { value: "Piano", label: "Piano" },
    { value: "Guitarra", label: "Guitarra" },
    { value: "Violín", label: "Violín" },
    { value: "Batería", label: "Batería" },
    { value: "Canto", label: "Canto" },
    { value: "Flauta", label: "Flauta" },
    { value: "Saxofón", label: "Saxofón" },
    { value: "Trompeta", label: "Trompeta" },
    { value: "Bajo", label: "Bajo" },
    { value: "Teoría Musical", label: "Teoría Musical" }
  ];

  const fetchCursos = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/cursos');
      if (!Array.isArray(response.data)) {
        setCursosOptions(defaultCursos);
        return;
      }

      const nombresUnicos = [...new Set(
        response.data
          .filter(c => c && c.estado === true && c.nombre)
          .map(c => c.nombre.toString())
      )].sort();

      const options = nombresUnicos.map(n => ({ value: n, label: n }));
      setCursosOptions(options.length > 0 ? options : defaultCursos);
    } catch (error) {
      console.error('Error al cargar cursos (para especialidades):', error);
      setCursosOptions(defaultCursos);
    }
  };

  // Cuando se abre el formulario para editar, verificar si el usuario ya tiene rol de profesor
  useEffect(() => {
    if (isEditing && selectedUsuario && selectedUsuario.roles) {
      console.log('Usuario seleccionado para editar:', selectedUsuario);

      // Buscar el rol de profesor
      const profesorRol = roles.find(rol => rol.nombre.toLowerCase().includes('profesor'));

      // Verificar si el usuario tiene rol de profesor
      if (roles.length > 0) {
        const tieneRolProfesor = selectedUsuario.roles.some(rol =>
          (typeof rol === 'string' && rol === profesorRol?._id) ||
          (typeof rol === 'object' && rol._id === profesorRol?._id)
        );

        if (tieneRolProfesor) {
          setShowProfesorFields(true);

          // Cargar información adicional del profesor si existe
          const cargarDatosProfesor = async () => {
            try {
              const response = await axios.get(`http://localhost:3000/api/profesores?usuarioId=${selectedUsuario._id}`);
              if (response.data && response.data.length > 0) {
                const profesorData = response.data[0];
                // Actualizar el usuario seleccionado con los datos del profesor
                setSelectedUsuario(prev => ({
                  ...prev,
                  telefono: profesorData.telefono || '',
                  direccion: profesorData.direccion || '',
                  especialidades: profesorData.especialidades || []
                }));
              }
            } catch (error) {
              console.error('Error al cargar datos del profesor:', error);
            }
          };

          cargarDatosProfesor();
        } else {
          setShowProfesorFields(false);
        }
      }
    } else if (!isEditing) {
      setShowProfesorFields(false);
    }
  }, [isEditing, selectedUsuario?._id, roles]);

  // Cargar cursos al montar el componente
  useEffect(() => {
    fetchCursos();
  }, []);

  // Definir los campos del formulario según el modo (crear o editar)


  const formFields = useMemo(() => [
    // Solo mostrar campo de rol al crear nuevo usuario, no al editar
    ...(!isEditing ? [{
      id: "rolId",
      label: "Rol",
      type: "select",
      required: true,
      validation: (value) => !value ? "Debe seleccionar un rol" : null,
      options: roles
        .filter(role => role.nombre === 'Administrador' || role.nombre === 'Profesor')
        .map(role => ({
          value: role._id,
          label: role.nombre
        })),
      onChange: (value) => {
        // Verificar si es rol de profesor para mostrar campos adicionales
        const profesorRol = roles.find(rol => rol.nombre.toLowerCase().includes('profesor'));
        setShowProfesorFields(value === profesorRol?._id);
      }
    }] : [
      // Campo especial para mostrar y editar roles en modo edición
      {
        id: "rolesAsignados",
        label: "Roles Asignados",
        type: "custom",
        render: (value, onChange, formData) => {
          const userRoles = selectedUsuario?.roles || [];
          return (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Roles actuales:
              </Typography>
              {userRoles.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  {userRoles.map((rol, index) => (
                    <Chip
                      key={index}
                      label={rol.nombre || 'Rol sin nombre'}
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sin roles asignados
                </Typography>
              )}

            </Box>
          );
        }
      }
    ]),
    // Campos adicionales para profesor
    ...(showProfesorFields ? [
      {
        id: "telefono",
        label: "Teléfono",
        type: "text",
        required: true,
        maxLength: 10,
        validation: (value) => {
          if (!value) return "El teléfono es requerido";
          if (!/^\d{10}$/.test(value)) return "El teléfono debe tener exactamente 10 dígitos";
          return null;
        }
      },

      {
        id: "direccion",
        label: "Dirección",
        type: "text",
        required: false
      },
      {
        id: "especialidades",
        label: "Especialidades",
        type: "multiSelect",
        required: true,
        validation: (value) => {
          if (!value || !Array.isArray(value) || value.length === 0) return "Debe seleccionar al menos una especialidad";
          return null;
        },
        options: cursosOptions
      }
    ] : []),
    {
      id: "nombre",
      label: "Nombre",
      type: "text",
      required: true,
      validation: (value) => !value ? "El nombre es requerido" : null
    },
    {
      id: "apellido",
      label: "Apellido",
      type: "text",
      required: true,
      validation: (value) => !value ? "El apellido es requerido" : null
    },
    {
      id: "tipo_de_documento",
      label: "Tipo de Documento",
      type: "select",
      required: true,
      validation: (value) => !value ? "El tipo de documento es requerido" : null,
      options: [
        { value: "TI", label: "Tarjeta de Identidad" },
        { value: "CC", label: "Cédula de Ciudadanía" },
        { value: "CE", label: "Cédula de Extranjería" },
        { value: "PP", label: "Pasaporte" },
        { value: "NIT", label: "NIT" }
      ]
    },
    {
      id: "documento",
      label: "N° Documento",
      type: "text",
      required: true,
      maxLength: 11,
      validation: (value) => {
        if (!value) return "El número de documento es requerido";
        if (!/^\d+$/.test(value)) return "El documento debe contener solo números";
        if (value.length > 11) return "El documento no puede tener más de 11 caracteres";
        return null;
      }
    },
    {
      id: "correo",
      label: "Correo",
      // Usamos text en lugar de email para evitar la validación HTML5 del navegador
      // (que puede rechazar caracteres Unicode en la parte del dominio). Validamos manualmente
      // con una expresión que acepta letras Unicode (incluida la 'ñ').
      type: "text",
      required: true,
      validation: (value) => {
        if (!value) return "El correo es requerido";
        // Permitir letras latinas (incluye ñ y vocales acentuadas) en local y dominio
        const emailRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9._%+-]+@[A-Za-zÁÉÍÓÚáéíóúÑñ0-9.-]+\.[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}$/;
        if (!emailRegex.test(value)) return "El correo no es válido";
        return null;
      }
    },
    // Mostrar campos de contraseña solo al crear nuevo usuario
    ...(!isEditing ? [
      {
        id: "contrasena",
        label: "Contraseña",
        type: "password",
        required: true,
        maxLength: 15,
        validation: (value) => {
          if (!value) return "La contraseña es requerida";
          if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres";

          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumber = /[0-9]/.test(value);

          if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return "La contraseña debe contener al menos una letra mayúscula, una minúscula y un número";
          }
          return null;
        },
        validateOnChange: true,
        helperText: (value) => {
          const reqs = {
            length: value?.length >= 8,
            uppercase: /[A-Z]/.test(value || ''),
            lowercase: /[a-z]/.test(value || ''),
            number: /[0-9]/.test(value || '')
          };

          const messages = [];
          messages.push((reqs.length ? '✓' : '•') + ' Mínimo 8 caracteres');
          messages.push((reqs.uppercase ? '✓' : '•') + ' Al menos una mayúscula');
          messages.push((reqs.lowercase ? '✓' : '•') + ' Al menos una minúscula');
          messages.push((reqs.number ? '✓' : '•') + ' Al menos un número');

          return messages.join(' | ');
        },
        onChange: (value, formData, setFieldValue) => handlePasswordChange(value, formData, setFieldValue)
      },
      {
        id: "confirmacionContrasena",
        label: "Confirmar Contraseña",
        type: "password",
        required: true,
        maxLength: 15,
        validation: (value, formData) => {
          if (!value) return "La confirmación de contraseña es requerida";
          if (formData && value !== formData.contrasena) return "La contraseña coincide";
          return null;
        },
        validateOnChange: true,
        helperText: (value, formData) => {
          if (!value) return '';
          return value === formData?.contrasena
            ? ''
            : 'la contraseña';
        },
        onChange: (value, formData, setFieldValue) => handleConfirmPasswordChange(value, formData, setFieldValue)
      }
    ] : []),
    { id: "estado", label: "Estado", type: "switch", defaultValue: true },
  ], [roles, isEditing, showProfesorFields]);

  const handleToggleStatus = async (usuarioId) => {
    try {
      const usuario = usuarios.find(u => u._id === usuarioId);
      const updatedUser = await usuariosService.update(usuarioId, {
        ...usuario,
        estado: !usuario.estado
      });
      setUsuarios((prev) => prev.map((item) => (item._id === usuarioId ? updatedUser : item)));
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  }

  const handleSaveRoleAssignment = async (data) => {
    try {
      const { userId, roleIds, primaryRoleId } = data;
      console.log('Guardando asignación de roles:', { userId, roleIds, primaryRoleId });

      // Primero eliminar todas las asignaciones existentes del usuario
      try {
        await usuariosHasRolService.deleteByUsuarioId(userId);
        console.log('Asignaciones anteriores eliminadas');
      } catch (error) {
        console.log('No había asignaciones anteriores o error al eliminar:', error);
      }

      // Normalizar a strings para evitar enviar objetos completos
      const normalizedUserId = typeof userId === 'object' ? (userId._id || userId.id || String(userId)) : String(userId);
      const normalizedRoleIds = roleIds.map(r => typeof r === 'object' ? (r._id || r.id || String(r)) : String(r));
      console.log('Creando asignaciones para roles (normalizados):', normalizedRoleIds);
      const assignmentPromises = normalizedRoleIds.map(roleId => {
        const newAssignment = {
          usuarioId: normalizedUserId,
          rolId: roleId,
          estado: true,
          esPrimario: roleId === (primaryRoleId && (primaryRoleId._id || primaryRoleId.id || primaryRoleId))
        };
        console.log('Creando asignación:', newAssignment);
        return usuariosHasRolService.create(newAssignment);
      });

      const results = await Promise.allSettled(assignmentPromises);

      // Verificar si hubo errores en las asignaciones
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        console.warn('Algunos roles no pudieron ser asignados:', errors);
        // Continuar con el proceso aunque haya algunos errores
      }

      // Recargar todos los datos usando la función fetchData
      const usuariosConRoles = await fetchData();

      // Actualizar el usuario seleccionado si está siendo mostrado
      if (selectedUsuario && selectedUsuario._id === userId) {
        const usuarioActualizado = usuariosConRoles.find(u => u._id === userId);
        setSelectedUsuario(usuarioActualizado);
      }

      // Cerrar el modal de asignación de roles
      setRoleAssignmentOpen(false);

      // Mostrar mensaje de éxito
      toast.success('Roles asignados correctamente');

    } catch (error) {
      console.error('Error al asignar roles:', error);
      toast.error('Error al asignar roles: ' + error.message);
    }
  }

  const columns = [
    { id: "nombre", label: "Nombre" },
    { id: "apellido", label: "Apellido" },
    { id: "tipo_de_documento", label: "Tipo de Documento" },
    { id: "documento", label: "N° Documento" },
    { id: "correo", label: "Correo" },
    {
      id: "roles",
      label: "Roles Actuales",
      render: (_, row) => {
        if (row.roles && Array.isArray(row.roles) && row.roles.length > 0) {
          return row.roles.map(rol => {
            if (typeof rol === 'object' && rol !== null) {
              return rol.nombre || rol.name || 'Rol sin nombre';
            }
            return 'Rol sin nombre';
          }).join(", ");
        }
        return "Sin roles asignados";
      }
    },
    {
      id: "estado",
      label: "Estado",
      render: (value, row) => <StatusButton active={value} onClick={() => handleToggleStatus(row._id)} />,
    }
  ]

  const detailFields = [
    { id: "nombre", label: "Nombre" },
    { id: "apellido", label: "Apellido" },
    { id: "tipo_de_documento", label: "Tipo de Documento" },
    { id: "documento", label: "Número de Documento" },
    { id: "correo", label: "Correo" },
    {
      id: "roles",
      label: "Roles Asignados",
      render: (value, row) => {
        // Usar selectedUsuario si está disponible, sino usar la fila
        const usuario = selectedUsuario || row;
        const userRoles = usuario?.roles;

        if (userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
          return userRoles.map(rol => {
            if (typeof rol === 'object' && rol !== null) {
              return rol.nombre || rol.name || 'Rol sin nombre';
            }
            return 'Rol sin nombre';
          }).join(", ");
        }
        return "Sin roles asignados";
      },
    },
    { id: "estado", label: "Estado", render: (value) => <StatusButton active={value} /> },
  ]

  // Función para cerrar la alerta
  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({
      ...alert,
      open: false
    });
  };

  // Efecto para cerrar automáticamente la alerta después de mostrarla
  useEffect(() => {
    if (alert.open) {
      const timer = setTimeout(() => {
        setAlert({
          ...alert,
          open: false
        });
      }, 1000); // 1 segundo

      return () => clearTimeout(timer);
    }
  }, [alert.open, alert.message]);

  return (
    <div className="usuarios-container">
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ marginTop: '60px' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%', fontSize: '1rem', padding: '10px 16px' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <GenericList
        data={usuarios}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onCreate={handleCreate}
        title="Gestión de Usuarios"
      />

      <DetailModal
        title={`Detalle del Usuario: ${selectedUsuario?.nombre}`}
        data={selectedUsuario}
        fields={detailFields}
        open={detailModalOpen}
        onClose={handleCloseDetail}
      />

      <FormModal
        title={isEditing ? "Editar Usuario" : "Crear Nuevo Usuario"}
        fields={formFields}
        initialData={selectedUsuario}
        open={formModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />

      <UserRoleAssignment
        open={roleAssignmentOpen}
        onClose={() => setRoleAssignmentOpen(false)}
        usuario={selectedUsuario}
        roles={roles}
        onSave={handleSaveRoleAssignment}
      />

      <ConfirmationDialog
        open={confirmationDialog.open}
        title={confirmationDialog.title}
        content={confirmationDialog.message}
        onConfirm={confirmationDialog.onConfirm}
        onClose={() => setConfirmationDialog({ open: false, title: '', message: '', onConfirm: null })}
        confirmButtonText="Eliminar"
        cancelButtonText="Cancelar"
      />

    </div>
  )
}

export default Usuarios