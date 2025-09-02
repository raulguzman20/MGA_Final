"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Autocomplete,
  InputAdornment,
  Alert,
  CircularProgress,
} from "@mui/material"
import { green } from "@mui/material/colors"
import { useAlertVentas } from '../context/AlertVentasContext'
import axios from 'axios';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { addMonths } from 'date-fns';

const VentaCursosFormNew = ({ open, onClose, onSubmit }) => {
  const { showError, showSuccess } = useAlertVentas();
  // Estados para el formulario
 const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    beneficiarioId: '',
    cursoId: '',
    numero_de_clases: '',
    ciclo: 1,
    tipo: 'curso',
    fechaInicio: new Date(),
    fechaFin: null,
    estado: 'vigente',
    valor_total: 0,
    motivoAnulacion: '',
    metodoPago: 'Efectivo', // Valor predeterminado para metodoPago
    numeroTransaccion: ''
  });

  // Estados para datos relacionados
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [valorPorHora, setValorPorHora] = useState(0);
  const [nextConsecutivo, setNextConsecutivo] = useState(null);

  // Cargar beneficiarios filtrados

  const loadBeneficiarios = async (searchText = '') => {
    try {
      const response = await axios.get(`http://localhost:3000/api/beneficiarios?search=${searchText}`);
      const filteredBeneficiarios = response.data.filter(beneficiario => 
        beneficiario.clienteId && !beneficiario.clienteId.toLowerCase().includes('cliente')
      );
      setBeneficiarios(filteredBeneficiarios);
    } catch (error) {
      console.error('Error al cargar beneficiarios:', error);
      showError('Error al cargar beneficiarios');
    }
  };

  // Cargar cursos
  const loadCursos = async (searchText) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/cursos?search=${searchText}`);
      setCursos(response.data);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
      showError('Error al cargar cursos');
    }
  };

  // Cargar información del cliente
  const loadClienteInfo = async (beneficiarioId) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/beneficiarios/${beneficiarioId}`);
      setClienteInfo(response.data);
    } catch (error) {
      console.error('Error al cargar información del cliente:', error);
    }
  };

  // Obtener el siguiente consecutivo
  const loadNextConsecutivo = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/ventas/next-consecutivo');
      setNextConsecutivo(response.data.nextConsecutivo);
    } catch (error) {
      console.error('Error al cargar siguiente consecutivo:', error);
      showError('Error al obtener consecutivo');
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadBeneficiarios();
      loadCursos('');
      loadNextConsecutivo();
    }
  }, [open]);

  // Efecto para limpiar el formulario cuando se cierra el diálogo
  useEffect(() => {
    if (!open) {
      setFormData({
        beneficiarioId: null,
        cursoId: null,
        numero_de_clases: '',
        ciclo: 1,
        tipo: 'curso',
        fechaInicio: null,
        fechaFin: null,
        estado: 'vigente',
        valor_total: 0,
        motivoAnulacion: null,
        metodoPago: 'Efectivo', // Valor predeterminado para metodoPago
        numeroTransaccion: ''
      });
      setBeneficiarios([]);
      setCursos([]);
      setClienteInfo(null);
      setValorPorHora(0);
      setNextConsecutivo(null);
    }
  }, [open]);

  // Manejar cambio de beneficiario
  const handleBeneficiarioChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({ ...prev, beneficiarioId: newValue._id }));
      loadClienteInfo(newValue.clienteId);
    } else {
      setFormData(prev => ({ ...prev, beneficiarioId: null }));
      setClienteInfo(null);
    }
  };

  // Manejar cambio de curso
  const handleCursoChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({ ...prev, cursoId: newValue._id }));
      setValorPorHora(newValue.valor_por_hora || 0);
      calcularValorTotal(formData.numero_de_clases, newValue.valor_por_hora);
    } else {
      setFormData(prev => ({ ...prev, cursoId: null }));
      setValorPorHora(0);
      calcularValorTotal(formData.numero_de_clases, 0);
    }
  };

  // Manejar cambio de número de clases
  const handleNumeroClasesChange = (event) => {
    const value = event.target.value;
    if (value === '' || (Number(value) >= 1 && Number(value) <= 720)) {
      setFormData(prev => ({ ...prev, numero_de_clases: value }));
      calcularValorTotal(value, valorPorHora);
    }
  };

  // Calcular valor total
  const calcularValorTotal = (numClases, valorHora) => {
    const total = Number(numClases) * Number(valorHora);
    setFormData(prev => ({ ...prev, valor_total: total }));
  };

  // Manejar cambio de fecha de inicio
  const handleFechaInicioChange = (newValue) => {
    setFormData(prev => ({
      ...prev,
      fechaInicio: newValue,
      fechaFin: addMonths(newValue, 1)
    }));
  };

  // Validar formulario con reglas de negocio
  const validateForm = () => {
    if (!formData.beneficiarioId) {
      showError('Debe seleccionar un beneficiario');
      return false;
    }
    if (!formData.cursoId) {
      showError('Debe seleccionar un curso');
      return false;
    }
    if (!formData.numero_de_clases || formData.numero_de_clases < 1 || formData.numero_de_clases > 720) {
      showError('Debe ingresar un número válido de clases (1-720)');
      return false;
    }
    if (!formData.fechaInicio) {
      showError('Debe seleccionar una fecha de inicio');
      return false;
    }
    if (!formData.metodoPago) {
      showError('Debe seleccionar un método de pago');
      return false;
    }
    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;
    setIsSubmitting(true);

    const dataToSend = {
      ...formData,
      numero_de_clases: parseInt(formData.numero_de_clases, 10),
      ciclo: formData.ciclo ? parseInt(formData.ciclo, 10) : null,
      codigoVenta: nextConsecutivo ? `CU-${String(nextConsecutivo).padStart(4, '0')}` : `AUTO-${Date.now()}`,
      consecutivo: nextConsecutivo || 1,
      valor_total: Number(formData.numero_de_clases) * valorPorHora,
      fechaInicio: formData.fechaInicio ? new Date(formData.fechaInicio) : undefined,
      fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : undefined,
      metodoPago: formData.metodoPago || 'Efectivo',
      numeroTransaccion: formData.numeroTransaccion,
    };
    if (!formData.motivoAnulacion) delete dataToSend.motivoAnulacion;

    try {
      const response = await axios.post('http://localhost:3000/api/ventas', dataToSend);
      showSuccess('Venta creada exitosamente');
      if (onSubmit) onSubmit(response.data);
      onClose();
    } catch (error) {
      console.error('Error al crear la venta:', error);
      if (error.response) console.error('Detalles del error:', error.response.data);
      showError('Error al crear la venta: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Crear Venta de Curso</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={beneficiarios}
                getOptionLabel={(option) => `${option.nombre} ${option.apellido}`}
                onChange={handleBeneficiarioChange}
                onInputChange={(event, value) => loadBeneficiarios(value)}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionKey={(option) => option._id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nombre Beneficiario"
                    size="small"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre Cliente"
                value={clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : ''}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={cursos}
                getOptionLabel={(option) => option.nombre}
                onChange={handleCursoChange}
                onInputChange={(event, value) => loadCursos(value)}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionKey={(option) => option._id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Curso"
                    size="small"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Valor por Hora"
                value={valorPorHora}
                size="small"
                fullWidth
                disabled
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Ciclo</InputLabel>
                <Select
                  value={formData.ciclo}
                  label="Ciclo"
                  onChange={(e) => setFormData(prev => ({ ...prev, ciclo: e.target.value }))}
                >
                  {[...Array(50)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Número de Clases"
                value={formData.numero_de_clases}
                onChange={handleNumeroClasesChange}
                type="number"
                inputProps={{ min: 1, max: 720 }}
                size="small"
                fullWidth
                helperText="Máximo 720 clases (horas máximas por mes)"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Valor Total"
                value={formData.valor_total}
                size="small"
                fullWidth
                disabled
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Inicio"
                  value={formData.fechaInicio}
                  onChange={handleFechaInicioChange}
                  renderInput={(params) => (
                    <TextField {...params} size="small" fullWidth />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Fin"
                  value={formData.fechaFin}
                  disabled
                  renderInput={(params) => (
                    <TextField {...params} size="small" fullWidth />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={formData.metodoPago || 'Efectivo'}
                  label="Método de Pago"
                  onChange={(e) => setFormData(prev => ({ ...prev, metodoPago: e.target.value }))}
                >
                  <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                  <MenuItem value="Transferencia">Transferencia</MenuItem>
                  <MenuItem value="Efectivo">Efectivo</MenuItem>
                  <MenuItem value="PSE">PSE</MenuItem>
                  <MenuItem value="Nequi">Nequi</MenuItem>
                  <MenuItem value="Daviplata">Daviplata</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Número de Transacción"
                value={formData.numeroTransaccion}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroTransaccion: e.target.value }))}
                size="small"
                fullWidth
                placeholder="Ingrese el número de transacción"
              />
            </Grid>

          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
       <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isSubmitting}>
          Crear Venta
        </Button>
        {isSubmitting && (
          <CircularProgress
            size={24}
            sx={{
              color: green[500],
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-12px",
              marginLeft: "-12px",
            }}
          />
        )}
      </Box>
      </DialogActions>
    </Dialog>
  );
};

export default VentaCursosFormNew;