import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const VentaCursosContext = createContext();

export const useVentaCursos = () => {
  const context = useContext(VentaCursosContext);
  if (!context) {
    throw new Error('useVentaCursos debe ser usado dentro de un VentaCursosProvider');
  }
  return context;
};

export const VentaCursosProvider = ({ children }) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshVentas = async () => {
    await fetchVentas();
  };

  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:3000/api/ventas');
      console.log('Respuesta de la API:', response.data);
      // Verificar que response.data sea un array
      const ventasData = Array.isArray(response.data) ? response.data : response.data.ventas || [];
      console.log('Datos procesados:', ventasData);
      // Filtrar solo las ventas de tipo "curso"
      const ventasCursos = ventasData.filter(venta => venta.tipo === 'curso');
      console.log('Ventas de cursos filtradas:', ventasCursos);
      
      // Obtener información de los clientes para cada beneficiario (manejo seguro de 404/IDs inválidos)
      const ventasConClientes = await Promise.all(ventasCursos.map(async (venta) => {
        try {
          const beneficiario = venta.beneficiarioId;
          const clienteId = beneficiario?.clienteId;

          // Si no hay clienteId, retornar tal cual
          if (!clienteId) return venta;

          // Si el cliente es el mismo beneficiario, reutilizar el objeto poblado
          if (beneficiario && String(clienteId) === String(beneficiario._id)) {
            return { ...venta, cliente: beneficiario };
          }

          // Evitar IDs centinela como "cliente" o valores no ObjectId válidos
          if (typeof clienteId === 'string' && clienteId.toLowerCase().includes('cliente')) {
            return venta;
          }
          const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(String(clienteId));
          if (!isValidObjectId) return venta;

          // Intentar cargar el cliente; si falla (404, etc.), continuar sin bloquear toda la página
          const clienteResponse = await axios.get(`http://localhost:3000/api/beneficiarios/${clienteId}`);
          console.log('Respuesta del cliente:', clienteResponse.data);
          return { ...venta, cliente: clienteResponse.data };
        } catch (cliErr) {
          console.warn('No se pudo cargar cliente para venta', venta?._id, cliErr.response?.status, cliErr.message);
          return venta;
        }
      }));

      console.log('Ventas con información de clientes:', ventasConClientes);
      setVentas(ventasConClientes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatVentaParaTabla = (venta) => {
    const fechaFin = new Date(venta.fechaFin);
    const fechaActual = new Date();
    let estado = venta.estado?.toLowerCase();

    // Determinar el estado basado en las reglas de negocio
    if (estado === 'anulada') {
      estado = 'anulada';
    } else if (fechaActual > fechaFin) {
      estado = 'vencida';
    } else {
      estado = 'vigente';
    }

    return {
      id: venta.codigoVenta,
      beneficiario: venta.beneficiarioId ? `${venta.beneficiarioId.nombre} ${venta.beneficiarioId.apellido}` : 'No especificado',
      cliente: venta.cliente ? `${venta.cliente.nombre} ${venta.cliente.apellido}` : 'No especificado',
      curso: venta.cursoId ? venta.cursoId.nombre : 'No especificado',
      ciclo: venta.ciclo,
      clases: venta.numero_de_clases,
      valorTotal: venta.valor_total,
      estado
    };
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  const anularVenta = async (ventaId, motivoAnulacion) => {
    try {
      setLoading(true);
      await axios.patch(`http://localhost:3000/api/ventas/${ventaId}/anular`, {
        motivoAnulacion
      });
      await fetchVentas();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteVenta = async (ventaId) => {
    try {
      setLoading(true);
      await axios.delete(`http://localhost:3000/api/ventas/${ventaId}`);
      await fetchVentas();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    ventas,
    loading,
    error,
    fetchVentas,
    refreshVentas,
    formatVentaParaTabla,
    anularVenta,
    deleteVenta
  };

  return (
    <VentaCursosContext.Provider value={value}>
      {children}
    </VentaCursosContext.Provider>
  );
};