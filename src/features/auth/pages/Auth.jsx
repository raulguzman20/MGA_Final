import { useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Checkbox,
  FormControlLabel,
  Link,
  Alert
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (!result?.success) {
        setLoginError(result?.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setLoginError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const isInvalidCreds = loginError.toLowerCase().includes('credenciales inválidas') || loginError.toLowerCase().includes('credenciales invalidas');

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        height: '100vh',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        mt: -10
      }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" sx={{ mb: 4, color: '#0455a2' }}>
            Iniciar Sesión
          </Typography>

          {loginError && (
            <Alert severity="error" onClose={() => setLoginError('')} sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                error={isInvalidCreds}
                helperText={isInvalidCreds ? 'Correo o contraseña incorrectos' : ''}
              />
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 1
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{ color: '#0455a2', '&.Mui-checked': { color: '#0455a2' } }}
                    />
                  }
                  label="Mantener sesión iniciada"
                />
                <Link 
                  href="/forgot-password"
                  sx={{ 
                    color: '#0455a2',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  ¿Olvidó su contraseña?
                </Link>
              </Box>
              
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth
                disabled={loading}
                sx={{ 
                  mt: 2,
                  backgroundColor: '#0455a2',
                  '&:hover': {
                    backgroundColor: '#7c9427'
                  }
                }}
              >
                Iniciar Sesión
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Auth;