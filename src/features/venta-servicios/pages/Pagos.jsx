import { useState, useEffect } from 'react';
import axios from 'axios';
import { GenericList } from '../../../shared/components/GenericList';
import { DetailModal } from '../../../shared/components/DetailModal';
import { FormModal } from '../../../shared/components/FormModal';
import { StatusButton } from '../../../shared/components/StatusButton.jsx';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { Box, Typography, Grid } from '@mui/material';
import * as XLSX from 'xlsx';
import { SuccessAlert } from '../../../shared/components/SuccessAlert';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { API_CONFIG } from '../../../shared/config/api.config'


// Form fields configuration
const getFormFields = () => [
  {
    id: 'ventas',  // Actualizado de 'venta' a 'ventas'
    label: 'ID de Venta *',
    type: 'text',
    required: true,
    placeholder: 'Ingrese el ID de la venta'
  },
  {
    id: 'fechaPago',
    label: 'Fecha de Pago *',
    type: 'date',
    required: true
  },
  {
    id: 'metodoPago',
    label: 'Método de Pago *',
    type: 'select',
    options: [
      { value: 'Tarjeta', label: 'Tarjeta' },
      { value: 'Transferencia', label: 'Transferencia' },
      { value: 'Efectivo', label: 'Efectivo' },
      { value: 'PSE', label: 'PSE' },
      { value: 'Nequi', label: 'Nequi' },
      { value: 'Daviplata', label: 'Daviplata' }
    ],
    required: true
  },
  {
    id: 'valor_total',
    label: 'Valor Total *',
    type: 'number',
    required: true,
    placeholder: 'Ingrese el valor total del pago'
  },
  {
    id: 'descripcion',
    label: 'Descripción',
    type: 'text',
    required: false,
    placeholder: 'Ingrese una descripción del pago (opcional)'
  },
  {
    id: 'numeroTransaccion',
    label: 'Número de Transacción',
    type: 'text',
    required: false,
    placeholder: 'Ingrese el número de transacción (opcional)'
  },
  {
    id: 'estado',
    label: 'Estado',
    type: 'select',
    options: [
      { value: 'pendiente', label: 'Pendiente' },
      { value: 'completado', label: 'Completado' },
      { value: 'fallido', label: 'Fallido' },
      { value: 'cancelado', label: 'Cancelado' }
    ],
    defaultValue: 'completado'
  }
];


// Función auxiliar para obtener información del beneficiario (solo ventas.beneficiario, ya que backend unifica)
const getBeneficiarioInfo = (payment) => {
  let beneficiario = null;
  const bene = payment.ventas?.beneficiario;
  if (bene && typeof bene === 'object') {
    beneficiario = {
      nombre: bene.nombre || '',
      apellido: bene.apellido || '',
      documento: bene.numero_de_documento || bene.numeroDocumento || 'No disponible',
      telefono: bene.telefono || 'No disponible',
      email: bene.email || bene.correo || '',
      tipo_de_documento: bene.tipoDocumento || bene.tipo_de_documento || '',
      direccion: bene.direccion || '',
      fechaDeNacimiento: bene.fechaNacimiento || bene.fecha_de_nacimiento || ''
    };
  }
  return beneficiario;
};


// Función auxiliar para obtener información del cliente (simplificada)
const getClienteInfo = (payment) => {
  let cliente = null;
  const bene = payment.ventas?.beneficiario;
 
  if (!bene) return null;
 
  console.log('=== DEBUG GETCLIENTEINFO ===');
  console.log('Bene:', bene);
  console.log('ClienteId:', bene.clienteId);
  console.log('Cliente info from backend:', bene.cliente);
 
  // Usar la información del cliente que ya viene del backend
  if (bene.cliente) {
    console.log('Usando información del cliente del backend');
    const cli = bene.cliente;
    cliente = {
      nombre: cli.nombre || '',
      apellido: cli.apellido || '',
      documento: cli.numeroDocumento || cli.numero_de_documento || cli.documento || 'No disponible',
      telefono: cli.telefono || 'No disponible',
      tipo_de_documento: cli.tipoDocumento || cli.tipo_de_documento || cli.tipoDocumento || ''
    };
  } else {
    console.log('No hay información del cliente del backend');
    // Si no hay información del cliente del backend, mostrar el ID
    cliente = {
      nombre: 'Cliente ID: ' + (bene.clienteId || 'No disponible'),
      apellido: '',
      documento: bene.clienteId || 'No disponible',
      telefono: 'No disponible',
      tipo_de_documento: 'No disponible'
    };
  }
 
  console.log('Cliente final:', cliente);
  return cliente;
};


// Función para formatear nombre completo
const formatearNombreCompleto = (beneficiario) => {
  if (!beneficiario) return 'No disponible';
 
  let nombreCompleto = '';
 
  if (beneficiario.nombre) {
    nombreCompleto = beneficiario.nombre.trim();
    if (beneficiario.apellido && beneficiario.apellido.trim() !== '') {
      nombreCompleto += ` ${beneficiario.apellido.trim()}`;
    }
  }
 
  return nombreCompleto || 'Sin nombre';
};


// Función para formatear método de pago
const formatearMetodoPago = (metodo) => {
  if (!metodo) return 'No disponible';
 
  const metodos = {
    'transferencia_bancaria': 'Transferencia',
    'transferencia': 'Transferencia',
    'efectivo': 'Efectivo',
    'tarjeta': 'Tarjeta',
    'pse': 'PSE',
    'nequi': 'Nequi',
    'daviplata': 'Daviplata'
  };
 
  return metodos[metodo.toLowerCase()] || metodo;
};


const Pagos = () => {
  const { user } = useAuth(); // Obtener el usuario autenticado
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: ''
  });
 
  // Verificar si el usuario es cliente
  const isCliente = user?.role === 'cliente';


  const handleView = (payment) => {
    console.log('=== VIEWING PAYMENT ===');
    console.log('Payment data:', JSON.stringify(payment, null, 2));
   
    // Si es un grupo, mostrar todos los pagos del beneficiario
    if (payment.es_grupo) {
      setSelectedPayment({
        ...payment,
        pagos_detalle: payment.pagos
      });
    } else {
    setSelectedPayment(payment);
    }
    setDetailModalOpen(true);
  };


  const handleCreate = () => {
    // Clientes no pueden crear pagos
    if (isCliente) {
      setAlert({
        open: true,
        message: 'Los clientes no pueden crear pagos'
      });
      return;
    }
   
    setIsEditing(false);
    setSelectedPayment(null);
    setFormModalOpen(true);
  };


  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedPayment(null);
  };


  // Función para agrupar pagos por beneficiario
  const agruparPagosPorBeneficiario = (pagos) => {
    const grupos = {};
   
    pagos.forEach(pago => {
      const beneficiario = getBeneficiarioInfo(pago);
      const beneficiarioId = beneficiario?.documento || pago.ventas?.beneficiario?._id || 'sin_identificar';
      const beneficiarioNombre = formatearNombreCompleto(beneficiario);
     
      if (!grupos[beneficiarioId]) {
        // Obtener información completa del beneficiario
        const beneficiarioCompleto = getBeneficiarioInfo(pago);
        const clienteCompleto = getClienteInfo(pago);
       
        grupos[beneficiarioId] = {
          _id: `grupo_${beneficiarioId}`,
          beneficiarioId: beneficiarioId,
          beneficiarioNombre: beneficiarioNombre,
          beneficiario: {
            ...beneficiarioCompleto,
            cliente: clienteCompleto
          },
          pagos: [],
          valor_total: 0,
          cantidad_pagos: 0,
          fecha_ultimo_pago: null,
          metodo_pago_principal: null,
          estado_principal: null,
          es_grupo: true
        };
      } else {
        // Asegurar que la información del cliente se mantenga si no existe
        if (pago.ventas?.beneficiario?.cliente && !grupos[beneficiarioId].beneficiario?.cliente) {
          const clienteCompleto = getClienteInfo(pago);
          grupos[beneficiarioId].beneficiario = {
            ...grupos[beneficiarioId].beneficiario,
            cliente: clienteCompleto
          };
        }
      }
     
      // Agregar el pago al grupo
      grupos[beneficiarioId].pagos.push(pago);
      grupos[beneficiarioId].valor_total += pago.valor_total || 0;
      grupos[beneficiarioId].cantidad_pagos += 1;
     
      // Actualizar fecha del último pago
      const fechaPago = new Date(pago.fechaPago || pago.createdAt);
      if (!grupos[beneficiarioId].fecha_ultimo_pago || fechaPago > new Date(grupos[beneficiarioId].fecha_ultimo_pago)) {
        grupos[beneficiarioId].fecha_ultimo_pago = fechaPago;
      }
     
      // Método de pago más frecuente
      if (pago.metodoPago) {
        if (!grupos[beneficiarioId].metodo_pago_principal) {
          grupos[beneficiarioId].metodo_pago_principal = pago.metodoPago;
        }
      }
     
      // Estado más frecuente
      if (pago.estado) {
        if (!grupos[beneficiarioId].estado_principal) {
          grupos[beneficiarioId].estado_principal = pago.estado;
        }
      }
    });
   
    // Convertir grupos a array y ordenar por valor total descendente
    return Object.values(grupos).sort((a, b) => b.valor_total - a.valor_total);
  };


  // Columnas actualizadas para mostrar información agrupada
  const columns = [
    {
      id: 'beneficiario',
      label: 'Beneficiario',
      render: (value, row) => {
        if (row.es_grupo) {
          return `${row.beneficiarioNombre} (${row.cantidad_pagos} pagos)`;
        }
        const beneficiario = getBeneficiarioInfo(row);
        return formatearNombreCompleto(beneficiario);
      }
    },
    {
      id: 'valor_total',
      label: 'Valor Total',
      render: (value, row) => {
        if (row.es_grupo) {
          return `$${row.valor_total.toLocaleString('es-CO')}`;
        }
        return `$${(row.ventas?.valor_total || 0).toLocaleString('es-CO')}`;
      }
    },
    {
      id: 'fechaPago',
      label: 'Último Pago',
      render: (value, row) => {
        if (row.es_grupo) {
          if (!row.fecha_ultimo_pago) return 'No disponible';
          const date = new Date(row.fecha_ultimo_pago);
          return date.toLocaleDateString('es-CO');
        }
        if (!value) return 'No disponible';
        const date = new Date(value);
        return date.toLocaleDateString('es-CO');
      }
    },
    {
      id: 'metodoPago',
      label: 'Método',
      render: (value, row) => {
        if (row.es_grupo) {
          return formatearMetodoPago(row.metodo_pago_principal);
        }
        return formatearMetodoPago(value);
      }
    },
    {
      id: 'estado',
      label: 'Estado',
      render: (value, row) => {
        const estadoValue = row.es_grupo ? row.estado_principal : value;
        const estados = {
          'pendiente': '🟡 Pendiente',
          'completado': '🟢 Completado',
          'fallido': '🔴 Fallido',
          'cancelado': '⚫ Cancelado',
          'pagado': '🟢 Pagado',
          'anulado': '⚫ Anulado'
        };
        return estados[estadoValue] || estadoValue || 'No disponible';
      }
    }
  ];


  // Campos de detalle actualizados para la nueva estructura
  const detailFields = [
    {
      id: 'historial',
      render: (value, data) => {
        console.log('=== RENDERING DETAIL ===');
        console.log('Data received:', JSON.stringify(data, null, 2));
       
        // Si es un grupo, mostrar información agrupada
        if (data.es_grupo) {
          return (
            <Box sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              margin: 0
            }}>
              {/* Título */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography
                    variant="h5"
                    sx={{
                      textAlign: 'center',
                      mb: 3,
                      color: '#0455a2',
                      fontWeight: 500
                    }}
                  >
                    Resumen de Pagos - {data.beneficiarioNombre}
                  </Typography>
                </Grid>
              </Grid>
             
              {/* Información del beneficiario y cliente */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Beneficiario:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>{data.beneficiarioNombre}</Typography>
                   
                    {data.beneficiario?.telefono && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                        Teléfono: {data.beneficiario.telefono}
                      </Typography>
                    )}
                    {data.beneficiario?.email && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                        Email: {data.beneficiario.email}
                      </Typography>
                    )}
                    {data.beneficiario?.documento && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                        Documento: {data.beneficiario.documento}
                      </Typography>
                    )}
                    {data.beneficiario?.tipo_de_documento && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                        Tipo de Documento: {data.beneficiario.tipo_de_documento}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 1.5, backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Cliente:</Typography>
                    {data.beneficiario?.cliente ? (
                      <>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
                          {formatearNombreCompleto(data.beneficiario.cliente)}
                        </Typography>
                        {data.beneficiario.cliente.telefono && (
                          <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                            Teléfono: {data.beneficiario.cliente.telefono}
                          </Typography>
                        )}
                        {data.beneficiario.cliente.documento && (
                          <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                            Documento: {data.beneficiario.cliente.documento}
                          </Typography>
                        )}
                        {data.beneficiario.cliente.tipo_de_documento && (
                          <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                            Tipo de Documento: {data.beneficiario.cliente.tipo_de_documento}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#666' }}>No disponible</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
             
              {/* Resumen del grupo */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Total Pagos:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                      {data.cantidad_pagos}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Valor Total:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      ${data.valor_total.toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#fff3e0', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Último Pago:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f57c00' }}>
                      {data.fecha_ultimo_pago ? new Date(data.fecha_ultimo_pago).toLocaleDateString('es-CO') : 'No disponible'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ p: 1.5, backgroundColor: '#f3e5f5', borderRadius: '6px' }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, display: 'block', mb: 0.5 }}>Estado Principal:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#7b1fa2' }}>
                      {data.estado_principal || 'No disponible'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
             
              {/* Lista de pagos individuales */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: '8px' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#666', fontWeight: 600 }}>Detalle de Pagos:</Typography>
                    {data.pagos_detalle && data.pagos_detalle.map((pago, index) => (
                      <Box key={pago._id || index} sx={{
                        p: 1.5,
                        mb: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        backgroundColor: '#fff'
                      }}>
                        <Grid container spacing={1}>
                          <Grid item xs={2}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 0.5 }}>Fecha:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#333', fontSize: '0.75rem' }}>
                              {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-CO') : 'No disponible'}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 0.5 }}>Valor:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', fontSize: '0.75rem' }}>
                              ${(pago.valor_total || 0).toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 0.5 }}>Método:</Typography>
                            <Typography variant="body2" sx={{
                              fontWeight: 600,
                              color: '#333',
                              fontSize: '0.75rem',
                              wordBreak: 'break-word',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {formatearMetodoPago(pago.metodoPago)}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 0.5 }}>Estado:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32', fontSize: '0.75rem' }}>
                              {pago.estado || 'No disponible'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          );
        }
       
        // ACTUALIZADO: Usar la función auxiliar corregida para pagos individuales
        const beneficiario = getBeneficiarioInfo(data);
        const cliente = getClienteInfo(data);  // Ya no necesita clientesInfo
        const beneficiarioNombre = formatearNombreCompleto(beneficiario);
       
        // Modificación en el render del detalle para incluir información del cliente
        return (
          <Box sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            margin: 0
          }}>
            {/* Título */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography
                  variant="h5"
                  sx={{
                    textAlign: 'center',
                    mb: 3,
                    color: '#0455a2',
                    fontWeight: 500
                  }}
                >
                  Detalle del Pago
                </Typography>
              </Grid>
            </Grid>
           
            {/* Información del beneficiario y cliente */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Beneficiario:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{beneficiarioNombre}</Typography>
                 
                  {beneficiario?.telefono && (
                    <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                      Teléfono: {beneficiario.telefono}
                    </Typography>
                  )}
                  {beneficiario?.email && (
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Email: {beneficiario.email}
                    </Typography>
                  )}
                  {beneficiario?.documento && (
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Documento: {beneficiario.documento}
                    </Typography>
                  )}
                  {beneficiario?.tipo_de_documento && (
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Tipo de Documento: {beneficiario.tipo_de_documento}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Cliente:</Typography>
                  {cliente ? (
                    <>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{formatearNombreCompleto(cliente)}</Typography>
                      {cliente.telefono && (
                        <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                          Teléfono: {cliente.telefono}
                        </Typography>
                      )}
                     
                      {cliente.documento && (
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Documento: {cliente.documento}
                        </Typography>
                      )}
                      {cliente.tipo_de_documento && (
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Tipo de Documento: {cliente.tipo_de_documento}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#666' }}>No disponible</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
           
            {/* Información básica del pago */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Fecha:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {data.fechaPago ? new Date(data.fechaPago).toLocaleDateString('es-CO') : 'No disponible'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Método:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.metodoPago || 'No disponible'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Estado:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {data.estado ? data.estado.charAt(0).toUpperCase() + data.estado.slice(1) : 'No disponible'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
           
            {/* Información adicional */}
            {(data.descripcion || data.numeroTransaccion) && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {data.descripcion && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                      <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Descripción:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.descripcion}</Typography>
                    </Box>
                  </Grid>
                )}
                {data.numeroTransaccion && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                      <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Número de Transacción:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.numeroTransaccion}</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
           
            {/* Información de la venta - ACTUALIZADO */}
            {data.ventas && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>Información de la Venta:</Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      ID: {data.ventas._id || 'No disponible'}
                    </Typography>
                    {data.ventas.codigoVenta && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Código: {data.ventas.codigoVenta}
                      </Typography>
                    )}
                    {data.ventas.tipo && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Tipo: {data.ventas.tipo}
                      </Typography>
                    )}
                    {data.ventas.estado && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Estado: {data.ventas.estado}
                      </Typography>
                    )}
                    {data.ventas.valor_total && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Valor Venta: ${data.ventas.valor_total.toLocaleString()}
                      </Typography>
                    )}
                    {data.ventas.fechaInicio && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Fecha Inicio: {new Date(data.ventas.fechaInicio).toLocaleDateString('es-CO')}
                      </Typography>
                    )}
                    {data.ventas.fechaFin && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Fecha Fin: {new Date(data.ventas.fechaFin).toLocaleDateString('es-CO')}
                      </Typography>
                    )}
                    {data.ventas.numero_de_clases && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Número de Clases: {data.ventas.numero_de_clases}
                      </Typography>
                    )}
                    {data.ventas.ciclo && (
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Ciclo: {data.ventas.ciclo}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
           
            {/* Valor total */}
            <Grid container sx={{ mt: 3 }}>
              <Grid item xs={12}>
                <Box sx={{
                  p: 2,
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'flex-start'
                }}>
                  <Typography variant="h6" sx={{ color: '#0455a2' }}>
                    Valor Total: ${data.ventas?.valor_total ? data.ventas.valor_total.toLocaleString() : '0'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      }
    }
  ];


  // Función para exportar Excel CORREGIDA
  const handleExportExcel = () => {
    try {
      console.log('=== EXPORTING TO EXCEL CORREGIDO ===');
     
      const workbook = XLSX.utils.book_new();


      // Preparar los datos para Excel - CORREGIDO
      const worksheetData = [
        ['Beneficiario', 'Cantidad Pagos', 'Valor Total', 'Último Pago', 'Método Pago', 'Estado', 'Documento Beneficiario', 'Teléfono Beneficiario'],
        ...payments.map(payment => {
          if (payment.es_grupo) {
            // Para grupos
            return [
              payment.beneficiarioNombre,
              payment.cantidad_pagos,
              payment.valor_total,
              payment.fecha_ultimo_pago ? new Date(payment.fecha_ultimo_pago).toLocaleDateString('es-CO') : 'No disponible',
              payment.metodo_pago_principal || 'No disponible',
              payment.estado_principal || 'No disponible',
              payment.beneficiario?.documento || 'No disponible',
              payment.beneficiario?.telefono || 'No disponible'
            ];
          } else {
            // Para pagos individuales
          const beneficiario = getBeneficiarioInfo(payment);
          const beneficiarioNombre = formatearNombreCompleto(beneficiario);
         
                       return [
             beneficiarioNombre,
              1, // Cantidad de pagos para pagos individuales
             payment.valor_total || 0,
             payment.fechaPago ? new Date(payment.fechaPago).toLocaleDateString('es-CO') : 'No disponible',
             payment.metodoPago || 'No disponible',
             payment.estado || 'No disponible',
              beneficiario?.documento || 'No disponible',
              beneficiario?.telefono || 'No disponible'
           ];
          }
        })
      ];


      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos Agrupados');
      XLSX.writeFile(workbook, 'pagos_agrupados.xlsx');
     
      setAlert({
        open: true,
        message: 'Archivo Excel exportado correctamente'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setAlert({
        open: true,
        message: 'Error al exportar archivo Excel'
      });
    }
  };


  const fetchPagos = async () => {
    try {
      console.log('=== FETCHING PAGOS ===');
     
      const url = `${API_CONFIG.BASE_URL}/pagos`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      console.log('API Response:', response.data);
     
      if (response.data && response.data.success) {
        // Usar directamente los datos del backend que ya incluyen la información del cliente
        let pagosFormateados = response.data.data.map(pago => ({
          ...pago,
          valor_total: pago.valor_total || pago.ventas?.valor_total || 0,
          valorTotal: pago.valor_total || pago.ventas?.valor_total || 0
        }));
       
        // Si no hay pagos, mostrar mensaje
        if (pagosFormateados.length === 0 && isCliente) {
          setAlert({
            open: true,
            message: 'No tienes pagos registrados'
          });
        }
       
        console.log('Pagos recibidos:', pagosFormateados);
       
        // Agrupar pagos por beneficiario
        const pagosAgrupados = agruparPagosPorBeneficiario(pagosFormateados);
       
        setPayments(pagosAgrupados);
        console.log('Payments agrupados:', pagosAgrupados);
      }
    } catch (error) {
      console.error('Error fetching pagos:', error);
      setAlert({
        open: true,
        message: 'Error al cargar los pagos'
      });
    }
  };


  useEffect(() => {
    console.log('=== COMPONENT MOUNTED ===');
    fetchPagos();
  }, [isCliente, user?.documento]);










  const handleSubmit = async (formData) => {
    try {
      console.log('=== FORM SUBMIT ===');
      console.log('isEditing:', isEditing);
      console.log('formData:', JSON.stringify(formData, null, 2));


      // Validar campos requeridos
      const requiredFields = ['venta', 'fechaPago', 'metodoPago', 'valor_total'];
      const missingFields = requiredFields.filter(field => {
        const value = formData[field];
        return !value || value.toString().trim() === '';
      });


      if (missingFields.length > 0) {
        setAlert({
          open: true,
          message: `Los campos ${missingFields.join(', ')} son obligatorios`
        });
        return;
      }


      // Preparar datos según el modelo del backend
      const pagoData = {
        ventas: formData.ventas.trim(),  // Actualizado de 'venta' a 'ventas'
        fechaPago: formData.fechaPago,
        metodoPago: formData.metodoPago,
        valor_total: parseFloat(formData.valor_total) || 0,
        estado: formData.estado || 'completado',
        descripcion: (formData.descripcion || '').trim(),
        numeroTransaccion: (formData.numeroTransaccion || '').trim()
      };


      console.log('Prepared payment data:', JSON.stringify(pagoData, null, 2));


      const config = {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
        },
        timeout: 10000
      };


      if (isEditing) {
        const url = `${API_CONFIG.BASE_URL}/pagos/${selectedPayment._id}`;
        console.log(`Making PUT request to: ${url}`);
        await axios.put(url, pagoData, config);
        setAlert({
          open: true,
          message: 'Pago actualizado correctamente'
        });
      } else {
        const url = `${API_CONFIG.BASE_URL}/pagos`;
        console.log(`Making POST request to: ${url}`);
        await axios.post(url, pagoData, config);
        setAlert({
          open: true,
          message: 'Pago creado correctamente'
        });
      }


      await fetchPagos();
      handleCloseForm();


    } catch (error) {
      console.error('=== SUBMIT ERROR ===');
      console.error('Error:', error);
     
      let errorMessage = 'Error al guardar el pago';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
     
      setAlert({
        open: true,
        message: errorMessage
      });
    }
  };


  const handleToggleStatus = async (paymentId) => {
    try {
      console.log('=== TOGGLING STATUS ===');
      console.log('Payment ID:', paymentId);
     
      const payment = payments.find(p => p._id === paymentId);
      if (!payment) {
        console.error('Payment not found for ID:', paymentId);
        return;
      }


      // No permitir cambiar estado de grupos directamente
      if (payment.es_grupo) {
        setAlert({
          open: true,
          message: 'No se puede cambiar el estado de un grupo de pagos. Seleccione un pago individual.'
        });
        return;
      }


      // Determinar el siguiente estado
      const estadosOrden = ['pendiente', 'completado', 'fallido', 'cancelado'];
      const currentIndex = estadosOrden.indexOf(payment.estado);
      const nextIndex = (currentIndex + 1) % estadosOrden.length;
      const nuevoEstado = estadosOrden[nextIndex];
     
      console.log('Current status:', payment.estado);
      console.log('New status:', nuevoEstado);
     
      const url = `${API_CONFIG.BASE_URL}/pagos/${paymentId}`;
      const data = { estado: nuevoEstado };
     
      await axios.put(url, data, {
        headers: { 
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });


      // Actualizar en el frontend y reagrupar
      await fetchPagos();


      setAlert({
        open: true,
        message: 'Estado actualizado correctamente'
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      setAlert({
        open: true,
        message: error.response?.data?.message || 'Error al actualizar el estado'
      });
    }
  };


  const handleCloseForm = () => {
    setFormModalOpen(false);
    setSelectedPayment(null);
    setIsEditing(false);
  };


  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };


  console.log('=== RENDER ===');
  console.log('Payments count:', payments.length);


  return (
    <>
      <GenericList
        data={payments}
        columns={columns}
        rowKey="_id" // Asegurarse de que esta prop esté presente
        onView={handleView}
        onExportPdf={handleExportExcel}
        title="Gestión de Pagos"
        showEditButton={false}
        showDeleteButton={false}
        showCreateButton={false}
        showViewButton={true}
        customSearch={(row, term) => {
          const t = (term || '').toString().toLowerCase().trim();
          if (!t) return true;
          // Para grupos
          if (row.es_grupo) {
            const nombre = (row.beneficiarioNombre || '').toLowerCase();
            const doc = (row.beneficiario?.documento || '').toLowerCase();
            const tel = (row.beneficiario?.telefono || '').toLowerCase();
            const estado = (row.estado_principal || '').toString().toLowerCase();
            const metodo = (row.metodo_pago_principal || '').toString().toLowerCase();
            const fecha = row.fecha_ultimo_pago ? new Date(row.fecha_ultimo_pago).toLocaleDateString('es-CO').toLowerCase() : '';
            const total = (row.valor_total || 0).toString();
            const cantidad = (row.cantidad_pagos || 0).toString();
            return (
              nombre.includes(t) ||
              doc.includes(t) ||
              tel.includes(t) ||
              estado.includes(t) ||
              metodo.includes(t) ||
              fecha.includes(t) ||
              total.includes(t) ||
              cantidad.includes(t)
            );
          }
          // Pagos individuales
          const beneficiario = row.ventas?.beneficiario;
          const beneNombre = beneficiario ? `${(beneficiario.nombre||'').trim()} ${(beneficiario.apellido||'').trim()}`.trim().toLowerCase() : '';
          const beneDoc = (beneficiario?.numero_de_documento || beneficiario?.numeroDocumento || beneficiario?.documento || '').toLowerCase();
          const beneTel = (beneficiario?.telefono || '').toLowerCase();
          const metodo = (row.metodoPago || '').toString().toLowerCase();
          const estado = (row.estado || '').toString().toLowerCase();
          const fecha = row.fechaPago ? new Date(row.fechaPago).toLocaleDateString('es-CO').toLowerCase() : '';
          const valor = (row.valor_total || row.ventas?.valor_total || 0).toString();
          return (
            beneNombre.includes(t) ||
            beneDoc.includes(t) ||
            beneTel.includes(t) ||
            metodo.includes(t) ||
            estado.includes(t) ||
            fecha.includes(t) ||
            valor.includes(t)
          );
        }}
      />
     
      <DetailModal
        title={`Detalle del Pago: ${selectedPayment?._id || 'N/A'}`}
        data={selectedPayment}
        fields={detailFields}
        open={detailModalOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      />


      <FormModal
        title={isEditing ? 'Editar Pago' : 'Crear Nuevo Pago'}
        fields={getFormFields()}
        initialData={selectedPayment}
        open={formModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        maxWidth="md"
        fullWidth={true}
      />
     
      <SuccessAlert
        open={alert.open}
        message={alert.message}
        onClose={handleCloseAlert}
      />
    </>
  );
};


export default Pagos;