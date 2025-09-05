import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GenericList } from '../../../shared/components/GenericList';
import { DetailModal } from '../../../shared/components/DetailModal';
import { FormModal } from '../../../shared/components/FormModal';
import { StatusButton } from '../../../shared/components/StatusButton';
import AlertDialog from '../../../shared/components/AlertDialog';
import { Snackbar, Alert } from '@mui/material';
import { API_CONFIG } from '../../../shared/config/api.config';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Helper: agrega el header Authorization con el token almacenado
  const getAuthHeaders = () => {
    // 1) Si axios ya tiene el header configurado por AuthContext, úsalo
    const defaultAuth = axios?.defaults?.headers?.common?.Authorization || axios?.defaults?.headers?.common?.authorization;
    if (defaultAuth) {
      return { Authorization: defaultAuth };
    }

    // 2) Intentar leer el token directo
    let token = localStorage.getItem('token');

    // 3) Si no existe, intentar leerlo desde el objeto 'user' en localStorage
    if (!token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          token = userObj?.token || userObj?.usuario?.token || userObj?.data?.token || null;
        } catch (e) {
          // Si falla el parseo, no hacemos nada y continuamos sin token
        }
      }
    }

    // 4) Si tenemos token, asegurarnos de enviar el prefijo Bearer
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      return { Authorization: value };
    }

    // 5) Si no hay token, devolvemos objeto vacío (las rutas protegidas devolverán 401)
    return {};
  };

  // Utilidad: formatea una fecha (ISO o Date) al formato requerido por inputs type="date" (yyyy-MM-dd)
  const formatDateForInput = (dateLike) => {
    if (!dateLike) return '';
    const date = new Date(dateLike);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      // Obtener beneficiarios
      const beneficiariosResponse = await axios.get(`${API_CONFIG.BASE_URL}/beneficiarios`, { headers: getAuthHeaders() });
      const beneficiarios = beneficiariosResponse.data;

      // Obtener usuarios_has_rol
      const usuariosHasRolResponse = await axios.get(`${API_CONFIG.BASE_URL}/usuarios_has_rol`, { headers: getAuthHeaders() });
      const usuariosHasRol = usuariosHasRolResponse.data;

      // Filtrar beneficiarios que son clientes (clienteId === _id O clienteId === 'cliente')
      const clientesFiltrados = beneficiarios.filter(beneficiario =>
        beneficiario.clienteId === beneficiario._id || beneficiario.clienteId === 'cliente'
      );

      // Mapear los datos incluyendo el correo desde usuario_has_rol
      const clientesFormateados = clientesFiltrados.map(cliente => {
        // Buscar el usuario_has_rol correspondiente
        const usuarioHasRol = usuariosHasRol.find(u => u._id === cliente.usuario_has_rolId);
        const correo = usuarioHasRol?.usuarioId?.correo || '';

        return {
          id: cliente._id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          tipoDocumento: cliente.tipo_de_documento,
          numeroDocumento: cliente.numero_de_documento,
          fechaNacimiento: cliente.fechaDeNacimiento,
          direccion: cliente.direccion,
          telefono: cliente.telefono,
          correo: correo,
          esBeneficiario: cliente.esBeneficiario || false,
          estado: cliente.estado !== undefined ? cliente.estado : true // Usar el estado del beneficiario si existe
        };
      });

      setClientes(clientesFormateados);
    } catch (error) {
      console.error('Error al obtener los clientes:', error);
    }
  };

  const handleCreate = () => {
    setIsEditing(false);
    setSelectedCliente(null);
    setFormModalOpen(true);
  };

  const handleEdit = (cliente) => {
    try {
      if (!cliente) {
        setSnackbar({
          open: true,
          message: 'Error: No se pudo cargar el cliente para editar.',
          severity: 'error'
        });
        return;
      }
      setIsEditing(true);
      // Mapear los campos del cliente a los IDs de los campos del formulario
      const clienteMapeado = {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        tipo_de_documento: cliente.tipoDocumento,
        numero_de_documento: cliente.numeroDocumento,
        // El formulario de fecha requiere formato yyyy-MM-dd
        fechaDeNacimiento: formatDateForInput(cliente.fechaNacimiento),
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        correo: cliente.correo,
        esBeneficiario: cliente.esBeneficiario || false,
        estado: cliente.estado,
        // No incluimos contraseña ni confirmar_contraseña ya que son campos que se llenarán solo si se quieren cambiar
      };
      setSelectedCliente(clienteMapeado);
      setFormModalOpen(true);
    } catch (error) {
      console.error('Error al editar cliente:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar el formulario de edición.',
        severity: 'error'
      });
    }
  };

  const handleSubmit = async (formData) => {
    try {
      // Crear copia del formData sin confirmar_contrasena
      const { confirmar_contrasena, ...formDataSinConfirmacion } = formData;

      // -------------------
      // VALIDACIONES BÁSICAS
      // -------------------

      // Limpiar y validar el número de documento
      let numeroDocumentoLimpio = String(formDataSinConfirmacion.numero_de_documento).replace(/\D/g, '');
      if (numeroDocumentoLimpio.length < 6 || numeroDocumentoLimpio.length > 15) {
        setAlertDialog({
          open: true,
          title: 'Error de validación',
          message: 'El número de documento debe tener entre 6 y 15 dígitos.',
          onConfirm: null
        });
        return;
      }

      // Validar que el documento solo tenga dígitos
      if (!/^\d+$/.test(numeroDocumentoLimpio)) {
        setAlertDialog({
          open: true,
          title: 'Error de validación',
          message: 'El número de documento debe contener solo números.',
          onConfirm: null
        });
        return;
      }

      // Validar fecha de nacimiento
      const fechaNacimiento = new Date(formDataSinConfirmacion.fechaDeNacimiento);
      const añoActual = new Date().getFullYear();
      if (fechaNacimiento.getFullYear() >= añoActual) {
        setAlertDialog({
          open: true,
          title: 'Error de validación',
          message: 'La fecha de nacimiento no puede ser del año actual o futuro.',
          onConfirm: null
        });
        return;
      }

      // Validar teléfono: exactamente 10 dígitos numéricos
      if (!/^[0-9]{10}$/.test(formDataSinConfirmacion.telefono)) {
        setAlertDialog({
          open: true,
          title: 'Error de validación',
          message: 'El teléfono debe contener exactamente 10 dígitos numéricos.',
          onConfirm: null
        });
        return;
      }

      // Asignar documento ya validado
      formDataSinConfirmacion.numero_de_documento = numeroDocumentoLimpio;

      // -------------------
      // PROCESO DE EDICIÓN
      // -------------------
      if (isEditing) {
        try {
          await axios.put(`${API_CONFIG.BASE_URL}/beneficiarios/${selectedCliente.id}`, {
            nombre: formDataSinConfirmacion.nombre,
            apellido: formDataSinConfirmacion.apellido,
            tipo_de_documento: formDataSinConfirmacion.tipo_de_documento,
            numero_de_documento: numeroDocumentoLimpio,
            fechaDeNacimiento: formDataSinConfirmacion.fechaDeNacimiento,
            direccion: formDataSinConfirmacion.direccion,
            telefono: formDataSinConfirmacion.telefono,
            correo: formDataSinConfirmacion.correo,
            esBeneficiario: formDataSinConfirmacion.esBeneficiario || false
          }, { headers: getAuthHeaders() });

          const beneficiarioResponse = await axios.get(`${API_CONFIG.BASE_URL}/beneficiarios/${selectedCliente.id}`, { headers: getAuthHeaders() });
          const usuarioHasRolResponse = await axios.get(`${API_CONFIG.BASE_URL}/usuarios_has_rol/${beneficiarioResponse.data.usuario_has_rolId}`, { headers: getAuthHeaders() });
          const usuarioId = typeof usuarioHasRolResponse.data.usuarioId === 'string'
            ? usuarioHasRolResponse.data.usuarioId
            : usuarioHasRolResponse.data.usuarioId?._id;

          const usuarioResponse = await axios.get(`${API_CONFIG.BASE_URL}/usuarios/${usuarioId}`, { headers: getAuthHeaders() });
          const usuarioActual = usuarioResponse.data.usuario || usuarioResponse.data;

          const usuarioUpdateData = {
            nombre: formDataSinConfirmacion.nombre,
            apellido: formDataSinConfirmacion.apellido,
            tipo_de_documento: formDataSinConfirmacion.tipo_de_documento,
            documento: numeroDocumentoLimpio,
            correo: formDataSinConfirmacion.correo,
            estado: usuarioActual.estado || true
          };

          if (usuarioActual.rol) usuarioUpdateData.rol = usuarioActual.rol;
          if (formDataSinConfirmacion.contrasena) usuarioUpdateData.contrasena = formDataSinConfirmacion.contrasena;

          await axios.put(`${API_CONFIG.BASE_URL}/usuarios/${usuarioId}`, usuarioUpdateData, { headers: getAuthHeaders() });
        } catch (error) {
          console.error('Error al actualizar el cliente:', error);
          throw error;
        }
      } else {
        // -------------------
        // PROCESO DE CREACIÓN
        // -------------------

        // Validar contraseña mínima
        if (!formDataSinConfirmacion.contrasena || formDataSinConfirmacion.contrasena.length < 8) {
          setAlertDialog({
            open: true,
            title: 'Error de validación',
            message: 'La contraseña debe tener al menos 8 caracteres y maximo 10.',
            onConfirm: null
          });
          return;
        }

        // Preparar datos del usuario
        const usuarioData = {
          nombre: formDataSinConfirmacion.nombre.trim(),
          apellido: formDataSinConfirmacion.apellido.trim(),
          correo: formDataSinConfirmacion.correo.toLowerCase().trim(),
          contrasena: formDataSinConfirmacion.contrasena,
          tipo_de_documento: formDataSinConfirmacion.tipo_de_documento,
          documento: numeroDocumentoLimpio,
          rol: 'usuario'
        };
        // 🔍 LOG para depurar
        console.log('Payload enviado a /usuarios:', usuarioData);

        const usuarioResponse = await axios.post(`${API_CONFIG.BASE_URL}/usuarios`, usuarioData, { headers: getAuthHeaders() });
        const usuarioId = usuarioResponse.data._id || usuarioResponse.data?.usuario?._id;

        // Enviar correo de bienvenida (no interrumpe flujo si falla)
        try {
          await axios.post(`${API_CONFIG.BASE_URL}/email/welcome`, {
            email: usuarioData.correo,
            nombre: usuarioData.nombre,
            apellido: usuarioData.apellido,
            username: usuarioData.correo,
            password: usuarioData.contrasena
          }, { headers: getAuthHeaders() });
        } catch (emailError) {
          console.error('Error al enviar correo de bienvenida:', emailError);
        }

        // Obtener roles disponibles
        const rolesResponse = await axios.get(`${API_CONFIG.BASE_URL}/roles`, { headers: getAuthHeaders() });
        const roles = rolesResponse.data.roles || rolesResponse.data || [];
        const clienteRol = Array.isArray(roles)
          ? roles.find((rol) => rol.nombre === 'Cliente')
          : null;

        if (!clienteRol) throw new Error('Rol "Cliente" not found');

        // Crear relación usuario-rol
        const usuarioHasRolResponse = await axios.post(`${API_CONFIG.BASE_URL}/usuarios_has_rol`, {
          usuarioId,
          rolId: clienteRol._id
        }, { headers: getAuthHeaders() });
        const usuario_has_rolId = usuarioHasRolResponse.data._id || usuarioHasRolResponse.data[0]?._id;

        // Crear beneficiario
        const beneficiarioData = {
          nombre: usuarioData.nombre,
          apellido: usuarioData.apellido,
          tipo_de_documento: usuarioData.tipo_de_documento,
          numero_de_documento: numeroDocumentoLimpio,
          telefono: formDataSinConfirmacion.telefono,
          direccion: formDataSinConfirmacion.direccion,
          fechaDeNacimiento: formDataSinConfirmacion.fechaDeNacimiento,
          correo: usuarioData.correo,
          usuario_has_rolId,
          clienteId: 'cliente',
          estado: true
        };
        // 🔍 LOG para depurar
        console.log('Payload enviado a /beneficiarios:', beneficiarioData);

        const beneficiarioResponse = await axios.post(`${API_CONFIG.BASE_URL}/beneficiarios`, beneficiarioData, { headers: getAuthHeaders() });

        // Si es beneficiario también, actualizar su clienteId
        if (formDataSinConfirmacion.esBeneficiario) {
          await axios.put(`${API_CONFIG.BASE_URL}/beneficiarios/${beneficiarioResponse.data._id}`, {
            clienteId: beneficiarioResponse.data._id
          }, { headers: getAuthHeaders() });
        }
      }

      // Refrescar lista y cerrar modal
      fetchClientes();
      handleCloseForm();

      // Alerta de éxito
      setSnackbar({
        open: true,
        message: isEditing
          ? 'Cliente actualizado correctamente.'
          : 'Cliente creado correctamente. Se ha enviado un correo de bienvenida.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al guardar el cliente:', error);

      if (error.response) {
        setSnackbar({
          open: true,
          message: `Error ${error.response.status}: ${error.response.data.message || 'Error al guardar el cliente'}`,
          severity: 'error'
        });
      } else if (error.request) {
        setSnackbar({
          open: true,
          message: 'No se recibió respuesta del servidor. Verifique su conexión.',
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Error: ${error.message}`,
          severity: 'error'
        });
      }
    }
  };


  const handleDelete = async (cliente) => {
    setAlertDialog({
      open: true,
      title: 'Confirmar eliminación',
      message: `¿Está seguro de eliminar el cliente ${cliente.nombre}?`,
      onConfirm: () => confirmDeleteCliente(cliente)
    });
  };

  const confirmDeleteCliente = async (cliente) => {
    setAlertDialog(prev => ({ ...prev, open: false }));
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/beneficiarios/${cliente.id}`, { headers: getAuthHeaders() });
      fetchClientes();
      // Notificación de éxito
      setSnackbar({
        open: true,
        message: 'Cliente eliminado correctamente.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al eliminar el cliente:', error);

      // Mostrar mensaje de error específico si el cliente está asociado a ventas
      if (error.response && error.response.status === 400) {
        // Asegurarse de que se muestra el mensaje correcto
        const errorMessage = 'No se puede eliminar el cliente porque está asociado a una venta de curso o matrícula';
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Error al eliminar el cliente. Por favor, inténtelo de nuevo.',
          severity: 'error'
        });
      }
    }
  };

  const handleView = (cliente) => {
    setSelectedCliente(cliente);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedCliente(null);
  };

  const handleCloseForm = () => {
    setFormModalOpen(false);
    setSelectedCliente(null);
    setIsEditing(false);
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleToggleStatus = async (clienteId) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) return;

      const updatedStatus = !cliente.estado;

      await axios.put(`${API_CONFIG.BASE_URL}/beneficiarios/${clienteId}`, {
        ...cliente,
        estado: updatedStatus
      }, { headers: getAuthHeaders() });

      fetchClientes();
    } catch (error) {
      console.error('Error al actualizar el estado del cliente:', error);
    }
  };

  const columns = [
    { id: 'nombre', label: 'Nombre' },
    { id: 'apellido', label: 'Apellido' },
    { id: 'tipoDocumento', label: 'Tipo Documento' },
    { id: 'numeroDocumento', label: 'N° Documento' },
    { id: 'fechaNacimiento', label: 'Fecha Nacimiento' },
    { id: 'direccion', label: 'Dirección' },
    { id: 'telefono', label: 'Teléfono' },
    { id: 'correo', label: 'Correo' },
    {
      id: 'estado',
      label: 'Estado',
      render: (value, row) => (
        <StatusButton
          active={value}
          onClick={() => handleToggleStatus(row?.id)}
        />
      )
    }
  ];

  const detailFields = [
    { id: 'nombre', label: 'Nombre' },
    { id: 'apellido', label: 'Apellido' },
    { id: 'tipoDocumento', label: 'Tipo de Documento' },
    { id: 'numeroDocumento', label: 'Número de Documento' },
    { id: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
    { id: 'direccion', label: 'Dirección' },
    { id: 'telefono', label: 'Teléfono' },
    { id: 'correo', label: 'Correo Electrónico' },
    {
      id: 'estado',
      label: 'Estado',
      render: (value, row) => (
        <StatusButton
          active={value}
          onClick={() => handleToggleStatus(row?.id)}
        />
      )
    }
  ];

  useEffect(() => {
    if (selectedCliente && selectedCliente.fechaNacimiento) {
      const edadCalculada = calcularEdad(selectedCliente.fechaNacimiento);
      setSelectedCliente(prev => ({ ...prev, age: edadCalculada }));
    }
  }, [selectedCliente?.fechaNacimiento]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCloseAlertDialog = () => {
    setAlertDialog(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <GenericList
        data={clientes}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onCreate={handleCreate}
        title="Gestión de Clientes"
      />

      <DetailModal
        title={`Detalle del Cliente: ${selectedCliente?.nombre}`}
        data={selectedCliente}
        fields={detailFields}
        open={detailModalOpen}
        onClose={handleCloseDetail}
      />

      <FormModal
        open={formModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={selectedCliente}
        isEditing={isEditing}
        title={isEditing ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
        fields={[
          { id: 'nombre', label: 'Nombre', type: 'text', required: true, section: 'datos_personales' },
          { id: 'apellido', label: 'Apellido', type: 'text', required: true, section: 'datos_personales' },
          { id: 'correo', label: 'Correo', type: 'email', required: true, section: 'datos_contacto' },
          {
            id: 'contrasena',
            label: 'Contraseña',
            type: 'password',
            required: !isEditing,
            section: 'datos_contacto',
            maxLength: 10,
            validate: (value) => {
              // Si estamos editando y no se proporciona valor, no validamos
              if (isEditing && !value) return null;

              // Si no estamos editando o se proporciona un valor, validamos
              if (!isEditing || value) {
                if (value.length > 10) {
                  return 'La contraseña no debe exceder los 10 caracteres';
                }

                // Verificar que contenga al menos una letra mayúscula, una minúscula y un número
                const hasUpperCase = /[A-Z]/.test(value);
                const hasLowerCase = /[a-z]/.test(value);
                const hasNumber = /[0-9]/.test(value);

                if (!hasUpperCase || !hasLowerCase || !hasNumber) {
                  return 'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y maximo 10 caracteres';
                }
              }

              return null;
            },
            validateOnChange: true,
            helperText: isEditing ? 'Dejar en blanco para mantener la contraseña actual' : ''
          },
          {
            id: 'confirmar_contrasena',
            label: 'Confirmar Contraseña',
            type: 'password',
            required: !isEditing,
            section: 'datos_contacto',
            maxLength: 10,
            validate: (value, formData) => {
              // Si estamos editando y no hay contraseña nueva, no validamos
              if (isEditing && !formData.contrasena) return null;

              // Si no hay valor de confirmación pero la contraseña es requerida o se proporcionó una
              if (!value && (!isEditing || formData.contrasena)) {
                return 'Debe confirmar la contraseña';
              }

              // Si hay valor de confirmación, validamos que coincida con la contraseña
              if (value && value !== formData.contrasena) {
                return 'Las contraseñas no coinciden';
              }

              return null;
            },
            validateOnChange: true,
            helperText: isEditing ? 'Dejar en blanco si no cambia la contraseña' : ''
          },
          {
            id: 'tipo_de_documento',
            label: 'Tipo de Documento',
            type: 'select',
            required: true,
            section: 'datos_personales',
            options: [
              { value: 'TI', label: 'TI' },
              { value: 'CC', label: 'CC' },
              { value: 'CE', label: 'CE' },
              { value: 'PP', label: 'PP' },
              { value: 'NIT', label: 'NIT' }
            ]
          },
          { id: 'numero_de_documento', label: 'Número de Documento', type: 'text', required: true, section: 'datos_personales', maxLength: 10 },//Se le puso un límite al documento por peticion del instructor
          { id: 'telefono', label: 'Teléfono', type: 'text', required: true, section: 'datos_contacto', maxLength: 10 },
          { id: 'direccion', label: 'Dirección', type: 'text', required: true, section: 'datos_contacto', maxLength: 20 },
          {
            id: 'fechaDeNacimiento',
            label: 'Fecha de Nacimiento',
            type: 'date',
            required: true,
            section: 'datos_personales',
            validate: (value) => {
              if (!value) return null; // La validación de campo requerido ya se maneja automáticamente

              const fechaNacimiento = new Date(value);
              const añoActual = new Date().getFullYear();

              if (fechaNacimiento.getFullYear() >= añoActual) {
                return 'La fecha de nacimiento no puede ser del año actual o futuro';
              }

              return null;
            },
            validateOnChange: true
          },
          { id: 'esBeneficiario', label: '¿Es también beneficiario?', type: 'checkbox', section: 'datos_adicionales' }
        ]}
      />

      {/* Diálogo de alerta para confirmaciones y mensajes */}
      <AlertDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={handleCloseAlertDialog}
        onConfirm={alertDialog.onConfirm}
      />

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            minWidth: '250px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '8px'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Clientes;