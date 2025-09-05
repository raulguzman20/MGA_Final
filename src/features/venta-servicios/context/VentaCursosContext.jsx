import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../../shared/config/api.config';

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
  // Caches que persisten entre renders para evitar solicitudes repetidas
  const clienteCacheRef = useRef(new Map());
  const missingIdsRef = useRef(new Set());
  const didInitRef = useRef(false);

  const getAuthHeaders = () => {
    try {
      // 1) Prefer defaults if already set globally (e.g., via interceptor)
      const defaultAuth = axios.defaults?.headers?.common?.Authorization;
      if (defaultAuth && defaultAuth.startsWith('Bearer ')) {
        return { Authorization: defaultAuth };
      }

      // 2) Try raw token from localStorage
      let token = localStorage.getItem('token');

      // 3) Fallback: token inside stored user object
      if (!token) {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          try {
            const user = JSON.parse(userRaw);
            token = user?.token || user?.accessToken || user?.jwt;
          } catch (e) {
            // ignore JSON parse errors
          }
        }
      }

      if (token && !token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }

      return token ? { Authorization: token } : {};
    } catch {
      return {};
    }
  };

  const refreshVentas = async () => {
    await fetchVentas();
  };

  const fetchVentas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/ventas`, { headers: getAuthHeaders() });
      console.log('Respuesta de la API:', response.data);
      // Verificar que response.data sea un array
      const ventasData = Array.isArray(response.data) ? response.data : response.data.ventas || [];
      console.log('Datos procesados:', ventasData);
      // Filtrar solo las ventas de tipo "curso"
      const ventasCursos = ventasData.filter(venta => venta.tipo === 'curso');
      console.log('Ventas de cursos filtradas:', ventasCursos);
      
      // Mapa de beneficiarios existentes para evitar requests si clienteId coincide con algún beneficiario
      const beneficiariosMap = new Map();
      for (const v of ventasCursos) {
        const b = v?.beneficiarioId;
        if (b && b._id) {
          beneficiariosMap.set(String(b._id), b);
        }
      }
      
      // Obtener información de los clientes para cada beneficiario (manejo seguro de 404/IDs inválidos)
      // Cache persistente por ejecución para no repetir solicitudes del mismo ID
      const clienteCache = clienteCacheRef.current;

      const fetchClienteConFallback = async (id) => {
        try {
          // Intentar primero como Beneficiario (en muchos datos clienteId referencia a beneficiario)
          const resB = await axios.get(`${API_CONFIG.BASE_URL}/beneficiarios/${id}`, { headers: getAuthHeaders() });
          return resB.data;
        } catch (errB) {
          if (errB.response?.status !== 404) {
            return null;
          }
          // Si no existe como beneficiario, intentar como Cliente
          try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/clientes/${id}`, { headers: getAuthHeaders() });
            return res.data;
          } catch (err) {
            // Marcar como missing para no insistir de nuevo
            missingIdsRef.current.add(String(id));
            return null;
          }
        }
      };

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

          // Si el clienteId coincide con otro beneficiario presente en la data, úsalo directamente
          const posibleBeneficiarioCliente = beneficiariosMap.get(String(clienteId));
          if (posibleBeneficiarioCliente) {
            return { ...venta, cliente: posibleBeneficiarioCliente };
          }

          // Evitar IDs centinela como "cliente" o valores no ObjectId válidos
          if (typeof clienteId === 'string' && clienteId.toLowerCase().includes('cliente')) {
            return venta;
          }
          const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(String(clienteId));
          if (!isValidObjectId) return venta;

          const key = String(clienteId);
          if (missingIdsRef.current.has(key)) {
            return venta;
          }
          if (!clienteCache.has(key)) {
            clienteCache.set(key, fetchClienteConFallback(key));
          }
          const clienteData = await clienteCache.get(key);
          if (clienteData) {
            return { ...venta, cliente: clienteData };
          }
          return venta;
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
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchVentas();
  }, []);

  const anularVenta = async (ventaId, motivoAnulacion) => {
    try {
      setLoading(true);
      await axios.patch(`${API_CONFIG.BASE_URL}/ventas/${ventaId}/anular`, {
        motivoAnulacion
      }, { headers: getAuthHeaders() });
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
      await axios.delete(`${API_CONFIG.BASE_URL}/ventas/${ventaId}`, { headers: getAuthHeaders() });
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