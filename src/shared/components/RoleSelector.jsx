import React, { useState } from 'react';
import {
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  AccountCircle,
  School as SchoolIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../../features/auth/context/AuthContext';

const RoleSelector = ({ onClose }) => {
  const { user, changeRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleOpen = () => {
    setOpen(true);
    if (onClose) onClose();
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRole(null);
  };

  const handleRoleChange = async (roleId) => {
    if (roleId === user.currentRole?.id) {
      handleClose();
      return;
    }

    setLoading(true);
    setSelectedRole(roleId);
    
    try {
      const result = await changeRole(roleId);
      if (result.success) {
        handleClose();
        // Opcional: mostrar mensaje de éxito
      } else {
        alert(result.message || 'Error al cambiar de rol');
      }
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      alert('Error al cambiar de rol');
    } finally {
      setLoading(false);
      setSelectedRole(null);
    }
  };

  const getRoleIcon = (roleName) => {
    const role = roleName.toLowerCase().trim();
    
    switch (role) {
      case "profesor":
      case "teacher":
      case "prof":
        return <SchoolIcon />;
      case "estudiante":
      case "student":
      case "alumno":
      case "beneficiario":
        return <PersonIcon />;
      case "administrador":
      case "admin":
        return <AdminIcon />;
      case "cliente":
        return <BusinessIcon />;
      default:
        return <AccountCircle />;
    }
  };

  // Solo mostrar si el usuario tiene más de un rol
  if (!user?.allRoles || user.allRoles.length <= 1) {
    return null;
  }

  return (
    <>
      <MenuItem
        onClick={handleOpen}
        sx={{
          px: 2,
          py: 1.5,
          fontSize: "0.875rem",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
        }}
      >
        <SwapIcon
          fontSize="small"
          sx={{
            mr: 2,
            color: "rgba(0, 0, 0, 0.5)",
            fontSize: "1.2rem",
          }}
        />
        Cambiar Rol
      </MenuItem>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: 300
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapIcon color="primary" />
            <Typography variant="h6">Cambiar Rol</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona el rol con el que deseas continuar:
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Rol actual:
            </Typography>
            <Chip
              icon={getRoleIcon(user.currentRole?.nombre)}
              label={user.currentRole?.nombre}
              color="primary"
              variant="filled"
            />
          </Box>

          <List sx={{ width: '100%' }}>
            {user.allRoles.map((role) => {
              const isCurrentRole = role.id === user.currentRole?.id;
              const isSelected = selectedRole === role.id;
              const isLoading = loading && isSelected;
              
              return (
                <ListItem key={role.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleRoleChange(role.id)}
                    disabled={loading || isCurrentRole}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: isCurrentRole ? '2px solid' : '1px solid',
                      borderColor: isCurrentRole ? 'primary.main' : 'divider',
                      backgroundColor: isCurrentRole ? 'primary.50' : 'transparent',
                      '&:hover': {
                        backgroundColor: isCurrentRole ? 'primary.100' : 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon>
                      {isLoading ? (
                        <CircularProgress size={24} />
                      ) : isCurrentRole ? (
                        <CheckIcon color="primary" />
                      ) : (
                        getRoleIcon(role.nombre)
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={role.nombre}
                      secondary={role.descripcion}
                      primaryTypographyProps={{
                        fontWeight: isCurrentRole ? 600 : 400,
                        color: isCurrentRole ? 'primary.main' : 'text.primary'
                      }}
                    />
                    {isCurrentRole && (
                      <Chip
                        label="Actual"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoleSelector;