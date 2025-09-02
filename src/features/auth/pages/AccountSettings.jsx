import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import { Person, Visibility, VisibilityOff, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    nombre: user?.name?.split(' ')[0] || '',
    apellido: user?.name?.split(' ').slice(1).join(' ') || '',
    tipoDocumento: user?.tipo_de_documento || 'CC',
    documento: user?.documento || '',
    email: user?.email || '',
    rolPrincipal: user?.role || '',
    password: '********',
    confirmPassword: '********'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Verificar que las contraseñas coincidan si se está cambiando la contraseña
    if (formData.password !== '********') {
      if (formData.password !== formData.confirmPassword) {
        setPasswordError('Las contraseñas no coinciden');
        return;
      }
    }
    
    // Eliminar confirmPassword antes de enviar al backend
    const formDataToSubmit = { ...formData };
    delete formDataToSubmit.confirmPassword;
    
    updateUser(formDataToSubmit);
  };

  // Determinar una ruta segura según rol/permisos del usuario
  const getSafeRoute = () => {
    const role = user?.role;
    const permissions = user?.permissions || [];

    if (role === 'cliente') return '/venta-servicios/beneficiarios';
    if (role === 'profesor') return '/servicios-musicales/programacion-profesores';
    if (role === 'beneficiario') return '/servicios-musicales/programacion-clases';
    if (permissions.includes('dashboard') || permissions.includes('*')) return '/dashboard';
    return '/servicios-musicales/programacion-clases';
  };

  const handleClose = () => {
    // En lugar de forzar '/dashboard', redirigir a una ruta segura para evitar Acceso denegado
    const target = getSafeRoute();
    navigate(target);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'grey.500'
          }}
        >
          <Close />
        </IconButton>
        <Typography variant="h4" gutterBottom>
          Configuración de Cuenta
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                mb: 2,
                bgcolor: 'primary.main'
              }}
            >
              <Person sx={{ fontSize: 60 }} />
            </Avatar>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de Documento"
                name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={handleChange}
                variant="outlined"
                select
              >
                <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                <MenuItem value="TI">Tarjeta de Identidad</MenuItem>
                <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                <MenuItem value="PA">Pasaporte</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de Documento"
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Rol Principal"
                name="rolPrincipal"
                value={formData.rolPrincipal}
                onChange={handleChange}
                variant="outlined"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                InputProps={{
                  endAdornment: formData.password !== '********' && (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirmar Contraseña"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                variant="outlined"
                InputProps={{
                  endAdornment: formData.confirmPassword !== '********' && (
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            {passwordError && (
              <Grid item xs={12}>
                <Alert severity="error">{passwordError}</Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Guardar Cambios
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default AccountSettings;