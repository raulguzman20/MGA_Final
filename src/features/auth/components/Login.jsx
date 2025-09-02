import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';
import { authService } from '../../../shared/services/auth.service';
import { usuariosService, usuariosHasRolService } from '../../../shared/services/api';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    correo: '',
    contrasena: ''
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!credentials.correo) {
      toast.error('Por favor, ingrese su correo electrónico');
      return false;
    }
    if (!credentials.contrasena) {
      toast.error('Por favor, ingrese su contraseña');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setLoginError('');

    try {
      const response = await authService.login(credentials.correo, credentials.contrasena);
      
      if (response.success) {
        // Obtener roles del usuario
        try {
          const rolesResponse = await usuariosHasRolService.getByUsuarioId(response.user.id);
          
          if (rolesResponse) {
            // Guardar roles en el localStorage
            localStorage.setItem('userRoles', JSON.stringify(rolesResponse));
          }
          
          // Redirección basada en el rol del usuario
          const userRole = response.user.rol?.nombre?.toLowerCase();
          let dashboardPath = '/dashboard'; // Por defecto para administradores
          
          if (userRole === 'profesor') {
            dashboardPath = '/servicios-musicales/programacion-profesores'; // Redirección a programación de profesores
          } else if (userRole === 'beneficiario') {
            dashboardPath = '/dashboard-beneficiario';
          } else if (userRole === 'cliente') {
            dashboardPath = '/venta-servicios/beneficiarios'; // Redirección a beneficiarios para clientes
          }
          
          navigate(dashboardPath);
          toast.success('¡Bienvenido!');
        } catch (error) {
          console.error('Error al obtener roles:', error);
          navigate('/dashboard');
          toast.success('¡Bienvenido!');
        }
      } else {
        // Mostrar alerta visual e indicar error en el campo contraseña cuando las credenciales son inválidas
        setLoginError(response.message || 'Credenciales inválidas');
        toast.error(response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      setLoginError(error?.response?.data?.message || error.message || 'Error al iniciar sesión');
      toast.error(error?.response?.data?.message || error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!recoveryEmail) {
      toast.error('Por favor, ingrese su correo electrónico');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.forgotPassword(recoveryEmail);
      
      if (response.success) {
        toast.success(response.message || 'Se ha enviado un enlace de restablecimiento a su correo electrónico');
        setForgotPasswordOpen(false);
        setRecoveryEmail('');
      } else {
        toast.error(response.message || 'Error al procesar la solicitud');
      }
    } catch (error) {
      toast.error(error.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Typography variant="h5" align="center" gutterBottom>
          Iniciar Sesión
        </Typography>

        {loginError && (
          <Alert severity="error" onClose={() => setLoginError('')}>
            {loginError}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Correo electrónico"
            name="correo"
            type="email"
            value={credentials.correo}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Contraseña"
            name="contrasena"
            type="password"
            value={credentials.contrasena}
            onChange={handleInputChange}
            margin="normal"
            required
            error={loginError?.toLowerCase().includes('credenciales inválidas') || loginError?.toLowerCase().includes('credenciales invalidas')}
            helperText={
              (loginError?.toLowerCase().includes('credenciales inválidas') || loginError?.toLowerCase().includes('credenciales invalidas'))
                ? 'Correo o contraseña incorrectos'
                : ''
            }
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
          </Button>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button color="primary">
                Registrarse
              </Button>
            </Link>
            <Button
              color="primary"
              onClick={() => setForgotPasswordOpen(true)}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </Box>
        </form>
      </Paper>

      <Dialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      >
        <DialogTitle>Restablecer Contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingrese su correo electrónico para recibir un enlace de restablecimiento de contraseña.
          </Typography>
          <TextField
            fullWidth
            label="Correo electrónico"
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setForgotPasswordOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleForgotPassword}
            disabled={loading}
            variant="contained"
          >
            {loading ? <CircularProgress size={24} /> : 'Enviar enlace'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;