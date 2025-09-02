import { useAuth } from '../../features/auth/context/AuthContext';
import { Navigate } from 'react-router-dom';
import useAlert from '../hooks/useAlert';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user } = useAuth();
  const { showError } = useAlert();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si no hay permisos requeridos, permitir acceso
  if (requiredPermissions.length === 0) {
    return children;
  }

  // Para administradores, permitir acceso a todo
  if (user.role === 'administrador') {
    return children;
  }

  // Verificar permisos del usuario
  const userPermissions = user?.permissions || [];
  
  const hasAllPermissions = requiredPermissions.every(permission =>
    userPermissions.includes(permission) || userPermissions.includes('*')
  );

  if (!hasAllPermissions) {
    // Redirigir según el rol del usuario
    let redirectPath = '/';
    
    if (user.role === 'cliente') {
      redirectPath = '/venta-servicios/beneficiarios';
    } else if (user.role === 'profesor') {
      redirectPath = '/servicios-musicales/programacion-profesores';
    } else if (user.role === 'beneficiario') {
      redirectPath = '/servicios-musicales/programacion-clases';
    }

    // Mostrar alerta global
    showError('Acceso denegado');
    
    return <Navigate to={redirectPath} replace state={{ error: 'Acceso no autorizado' }} />;
  }

  return children;
};

export default ProtectedRoute;