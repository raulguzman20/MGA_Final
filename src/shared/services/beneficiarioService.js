let setUsuariosState = null;

export const initializeUsuariosState = (_, setState) => {
  setUsuariosState = setState;
};

export const createBeneficiarioUser = (beneficiarioData) => {
  const userData = {
    id: beneficiarioData.numeroDocumento,
    nombre: `${beneficiarioData.nombre} ${beneficiarioData.apellido}`,
    tel: beneficiarioData.telefono,
    correo: beneficiarioData.correo,
    estado: true,
    roles: [{ id: 4, nombre: 'Beneficiario' }], // Asumiendo que Beneficiario tiene ID4
    primaryRoleId: 4
  };

  if (setUsuariosState) {
    setUsuariosState(prev => [...prev, userData]);
  }

  return userData;
}; 