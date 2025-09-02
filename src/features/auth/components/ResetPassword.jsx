import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { authService } from '../../../shared/services/auth.service';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false
  });

  const handleClickShowPassword = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Token de restablecimiento no válido');
      navigate('/auth');
      return;
    }

    // Verificar validez del token
    const verifyToken = async () => {
      try {
        const response = await authService.verifyResetToken(token);
        setTokenValid(response.valid);
        if (!response.valid) {
          toast.error(response.message || 'Token inválido o expirado');
        }
      } catch (error) {
        setTokenValid(false);
        toast.error('Error al verificar el token');
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!passwords.newPassword) {
      toast.error('Por favor, ingrese la nueva contraseña');
      return false;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const response = await authService.resetPassword(token, passwords.newPassword);
      
      if (response.success) {
        toast.success('Contraseña restablecida exitosamente');
        window.location.href = '/';
      } else {
        toast.error(response.message || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      toast.error('Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
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
        <CircularProgress />
      </Box>
    );
  }

  if (tokenValid === false) {
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
          <Alert severity="error">
            El enlace de restablecimiento es inválido o ha expirado.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Volver al Login
          </Button>
        </Paper>
      </Box>
    );
  }

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
          Restablecer Contraseña
        </Typography>

        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Ingrese su nueva contraseña
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nueva contraseña"
            name="newPassword"
            type={showPassword.newPassword ? 'text' : 'password'}
            value={passwords.newPassword}
            onChange={handleInputChange}
            margin="normal"
            required
            helperText={
              <Box component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                  variant="caption"
                  color={passwords.newPassword.length >= 8 ? 'success.main' : 'text.secondary'}
                >
                  ✓ Mínimo 8 caracteres
                </Typography>
              </Box>
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleClickShowPassword('newPassword')}
                    edge="end"
                  >
                    {showPassword.newPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirmar contraseña"
            name="confirmPassword"
            type={showPassword.confirmPassword ? 'text' : 'password'}
            value={passwords.confirmPassword}
            onChange={handleInputChange}
            margin="normal"
            required
            helperText={
              passwords.confirmPassword && (
                <Typography
                  variant="caption"
                  color={passwords.newPassword === passwords.confirmPassword ? 'success.main' : 'error.main'}
                >
                  {passwords.newPassword === passwords.confirmPassword
                    ? '✓ Las contraseñas coinciden'
                    : '✗ Las contraseñas no coinciden'}
                </Typography>
              )
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleClickShowPassword('confirmPassword')}
                    edge="end"
                  >
                    {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Restablecer Contraseña'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/')}
            sx={{ mt: 1 }}
          >
            Volver al Login
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ResetPassword;