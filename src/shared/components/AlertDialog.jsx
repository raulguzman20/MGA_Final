import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button
} from '@mui/material';

const AlertDialog = ({ open, title, message, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {onConfirm ? (
          <>
            <Button onClick={onClose} color="primary">
              Cancelar
            </Button>
            <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
              Aceptar
            </Button>
          </>
        ) : (
          <Button onClick={onClose} color="primary" autoFocus>
            Aceptar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;