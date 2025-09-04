"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  InputAdornment,
  Chip,
  CircularProgress,
  alpha,
  Snackbar,
  Alert,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  // FormControlLabel, // ELIMINADO
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  FilterAlt as FilterAltIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material"
import moment from "moment"
import "moment/locale/es"
import { ClassSchedulerModal } from "../components/ClassSchedulerModal"
import { ConfirmationDialog } from "../../../shared/components/ConfirmationDialog"
import axios from "axios"
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import { ThemeContext } from "../../../shared/contexts/ThemeContext";
import { useAuth } from "../../../features/auth/context/AuthContext";

moment.locale("es")

// Días de la semana INCLUYENDO DOMINGO
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const diasCodigo = {
  Lunes: "L",
  Martes: "M",
  Miércoles: "X",
  Jueves: "J",
  Viernes: "V",
  Sábado: "S",
  Domingo: "D",
}
const codigoDias = {
  L: "Lunes",
  M: "Martes",
  X: "Miércoles",
  J: "Jueves",
  V: "Viernes",
  S: "Sábado",
  D: "Domingo",
}

// HORARIOS EXPANDIDOS (6 AM a 11 PM)
const horasClase = [
  "06:00 - 07:00",
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
  "22:00 - 23:00",
]

// Estilos mejorados para scroll
const scrollbarStyles = {
  "&::-webkit-scrollbar": {
    width: "12px",
    height: "12px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f3f4",
    borderRadius: "8px",
    margin: "2px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(180deg, #0455a2 0%, #034589 100%)",
    borderRadius: "8px",
    border: "2px solid #f1f3f4",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "linear-gradient(180deg, #034589 0%, #023660 100%)",
    },
  },
  "&::-webkit-scrollbar-corner": {
    background: "#f1f3f4",
  },
  scrollbarWidth: "thin",
  scrollbarColor: "#0455a2 #f1f3f4",
}

const getClassColor = (especialidad) => {
  const colors = [
    "#4f46e5",
    "#0891b2",
    "#7c3aed",
    "#16a34a",
    "#ea580c",
    "#db2777",
    "#9333ea",
    "#0284c7",
    "#65a30d",
    "#0d9488",
  ]
  let hash = 0
  if (!especialidad) return "#cccccc"
  for (let i = 0; i < especialidad.length; i++) {
    hash = especialidad.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

const ProgramacionClases = () => {
  const theme = useTheme();
  const { darkMode } = useContext(ThemeContext);
  const { user, hasPrivilege } = useAuth();
  
  // Verificar si el usuario es beneficiario
  const isBeneficiario = user?.role === 'beneficiario';
  
  // Privilegios por módulo
  const canCreateClase = hasPrivilege?.('programacion_de_clases','crear');
  const canEditClase = hasPrivilege?.('programacion_de_clases','editar');
  const canDeleteClase = hasPrivilege?.('programacion_de_clases','eliminar');
  const canCancelClase = hasPrivilege?.('programacion_de_clases','editar');
  const canRegisterAttendance = hasPrivilege?.('programacion_de_clases','editar') || hasPrivilege?.('asistencia','crear') || hasPrivilege?.('asistencia','editar');
  
  // Título dinámico según el rol
  const getTitle = () => {
    if (isBeneficiario) {
      return "Mis Clases Programadas";
    }
    return "Programación de Clases";
  };
  const [clases, setClases] = useState([])
  const [profesores, setProfesores] = useState([])
  const [beneficiarios, setBeneficiarios] = useState([])
  const [aulas, setAulas] = useState([]) // ✅ NUEVO: Estado para aulas
  const [searchTerm, setSearchTerm] = useState("")
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false) // ✅ NUEVO
  const [selectedClase, setSelectedClase] = useState(null)
  const [editingClase, setEditingClase] = useState(null)
  const [cancelMotivo, setCancelMotivo] = useState("")
  const [attendanceData, setAttendanceData] = useState({}) // ✅ NUEVO
  const [date, setDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [schedulerOpen, setSchedulerOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [claseToDelete, setClaseToDelete] = useState(null)
  // Estado para el menú de múltiples clases en una celda
  const [multiClaseDialogOpen, setMultiClaseDialogOpen] = useState(false)
  const [multiClases, setMultiClases] = useState([])
  const [multiClasesDia, setMultiClasesDia] = useState("")
  const [multiClasesHora, setMultiClasesHora] = useState("")

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("🔄 Iniciando carga de datos...");

        // Cargar clases programadas
        let clasesResponse;
        if (user?.role === 'profesor') {
          // Si es profesor, filtrar solo sus clases
          clasesResponse = await axios.get("http://localhost:3000/api/programacion_de_clases");
          // Filtrar clases del profesor logueado por correo
          const todasLasClases = clasesResponse.data;
          const clasesFiltradas = todasLasClases.filter(clase => {
            // Verificar si el profesor de la clase coincide con el usuario logueado
            const profesorClase = clase.programacionProfesor?.profesor;
            return profesorClase?.correo === user.email;
          });
          console.log("✅ Clases filtradas para profesor:", clasesFiltradas);
          console.log("📧 Email del usuario:", user.email);
          setClases(clasesFiltradas);
        } else {
          // Para otros roles, cargar todas las clases
          clasesResponse = await axios.get("http://localhost:3000/api/programacion_de_clases");
          console.log("✅ Clases cargadas:", clasesResponse.data);
          setClases(clasesResponse.data);
        }

        // Cargar profesores
        const profesoresResponse = await axios.get("http://localhost:3000/api/profesores");
        setProfesores(profesoresResponse.data);

        // ✅ NUEVO: Cargar aulas
        const aulasResponse = await axios.get("http://localhost:3000/api/aulas");
        const aulasActivas = aulasResponse.data.filter((a) => a.estado === "Activo" || a.estado === "Disponible");
        setAulas(aulasActivas);

        // Cargar beneficiarios con populate=true para obtener datos completos
        const beneficiariosResponse = await axios.get("http://localhost:3000/api/ventas?populate=true");
        console.log("📦 Ventas recibidas:", beneficiariosResponse.data);
        
        // No filtrar por estado, solo por tipo curso
        const beneficiariosCursos = beneficiariosResponse.data.filter(venta => venta.tipo === "curso");
        console.log("✅ Beneficiarios de cursos:", beneficiariosCursos);
        setBeneficiarios(beneficiariosCursos);

      } catch (error) {
        console.error("Error al cargar datos:", error);
        setSnackbar({
          open: true,
          message: "Error al cargar los datos",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Procesar clases para la vista
  const clasesProcessed = useMemo(() => {
    console.log("🔄 Procesando clases:", clases);
    console.log("📦 Beneficiarios disponibles:", beneficiarios);
    console.log("👤 Usuario actual:", user);

    return clases
      .filter((clase) => {
        const pasaFiltro = (
          clase.especialidad &&
          clase.especialidad.trim() !== "" &&
          clase.beneficiarios?.length > 0 &&
          clase.programacionProfesor?.profesor &&
          clase.estado !== "reprogramada" &&
          clase.estado !== "ejecutada"
        );
        
        // Si es profesor, verificar que sea su clase (doble filtrado por seguridad)
        if (user?.role === 'profesor' && pasaFiltro) {
          const profesorClase = clase.programacionProfesor?.profesor;
          const esProfesorDeLaClase = profesorClase?.correo === user.email;
          if (!esProfesorDeLaClase) {
            console.log("❌ Clase filtrada para profesor (no es su clase):", {
              id: clase._id,
              especialidad: clase.especialidad,
              profesorClase: profesorClase?.correo,
              userEmail: user.email
            });
            return false;
          }
        }
        
        // Si es beneficiario, filtrar solo las clases donde él esté inscrito
        if (isBeneficiario && pasaFiltro) {
          const estaInscrito = clase.beneficiarios?.some(venta => {
            if (venta?.beneficiarioId) {
              const beneficiario = venta.beneficiarioId;
              // Verificar por documento, email o ID del usuario
              return beneficiario.numero_de_documento === user?.documento ||
                     beneficiario.email === user?.email ||
                     beneficiario._id === user?.id ||
                     beneficiario.correo === user?.email;
            }
            return false;
          });
          
          if (!estaInscrito) {
            console.log("❌ Clase filtrada para beneficiario (no inscrito):", {
              id: clase._id,
              especialidad: clase.especialidad,
              userDocumento: user?.documento,
              userEmail: user?.email,
              userID: user?.id
            });
            return false;
          }
          
          console.log("✅ Clase aprobada para beneficiario:", {
            id: clase._id,
            especialidad: clase.especialidad,
            userDocumento: user?.documento,
            userEmail: user?.email
          });
        }
        
        if (!pasaFiltro) {
          console.log("❌ Clase filtrada:", {
            id: clase._id,
            especialidad: clase.especialidad,
            beneficiarios: clase.beneficiarios?.length,
            profesor: !!clase.programacionProfesor?.profesor,
            estado: clase.estado
          });
        }
        
        return pasaFiltro;
      })
      .map((clase) => {
        const profesor = clase.programacionProfesor?.profesor;
        const aula = clase.aula;

        // USAR DIRECTAMENTE LOS OBJETOS DE VENTA QUE YA VIENEN EN beneficiarios
        const todosLosEstudiantes = (clase.beneficiarios || []).map(venta => {
          if (!venta || !venta.beneficiarioId) {
            return {
              id: venta?._id || 'N/A',
              nombre: 'Sin beneficiario',
              tipo: 'Beneficiario',
              codigoVenta: venta?.codigoVenta || '-',
              curso: (typeof venta?.cursoId === 'object' ? venta?.cursoId?.nombre : venta?.cursoId) || '-'
            };
          }
          return {
            id: venta._id,
            nombre: `${venta.beneficiarioId.nombre || ''} ${venta.beneficiarioId.apellido || ''}`.trim() || 'Sin nombre',
            tipo: 'Beneficiario',
            codigoVenta: venta.codigoVenta || '-',
            curso: (typeof venta.cursoId === 'object' ? venta.cursoId?.nombre : venta.cursoId) || '-'
          };
        });

        return {
          id: clase._id,
          dia: codigoDias[clase.dia] || clase.dia,
          diaCodigo: clase.dia,
          hora: `${clase.horaInicio} - ${clase.horaFin}`,
          horaInicio: clase.horaInicio,
          horaFin: clase.horaFin,
          clase: clase.especialidad,
          especialidad: clase.especialidad,
          profesor: profesor ? `${profesor.nombres || ''} ${profesor.apellidos || ''}` : "Sin profesor",
          profesorColor: profesor?.color || "#0455a2",
          aula: aula?.numeroAula || "Sin aula",
          aulaId: aula?._id,
          beneficiarios: todosLosEstudiantes.map(e => e.nombre),
          todosLosEstudiantes,
          totalBeneficiarios: todosLosEstudiantes.length,
          estado: clase.estado,
          fecha: clase.fecha,
          observaciones: clase.observaciones,
          asistencia: clase.asistencia,
          motivo: clase.motivo,
          fechaCreacion: clase.createdAt,
          fechaActualizacion: clase.updatedAt,
          original: clase,
        };
      });
  }, [clases]);

  // Filtrado por búsqueda
  const filteredClases = useMemo(() => {
    if (!searchTerm) return clasesProcessed
    return clasesProcessed.filter((c) =>
      [c.dia, c.hora, c.clase, c.profesor, ...c.beneficiarios]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
  }, [clasesProcessed, searchTerm])

  // Agrupar clases por día y hora para la grilla semanal (ahora array)
  const clasesPorDiaHora = useMemo(() => {
    const map = {}
    filteredClases.forEach((c) => {
      const key = `${c.dia}-${c.hora}`
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [filteredClases])

  // Handlers
  const handleDeleteClase = (clase) => {
    setClaseToDelete(clase)
    setConfirmDialogOpen(true)
  }

  const handleEditClase = (clase) => {
    setEditingClase({ ...clase })
    setEditDialogOpen(true)
  }

  const handleCancelClase = (clase) => {
    setSelectedClase(clase)
    setCancelMotivo("")
    setCancelDialogOpen(true)
  }

  // ✅ NUEVA FUNCIÓN: Manejar asistencia
  const handleAttendanceClase = (clase) => {
    setSelectedClase(clase)
    // Inicializar datos de asistencia con estructura completa
    const initialAttendance = {}
    clase.todosLosEstudiantes.forEach((estudiante) => {
      initialAttendance[estudiante.id] = {
        asistio: false,
        motivo: "",
      }
    })
    setAttendanceData(initialAttendance)
    setAttendanceDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!claseToDelete) return

    // Validar si tiene beneficiarios asignados
    if (claseToDelete.todosLosEstudiantes.length > 0) {
      setSnackbar({
        open: true,
        message: "No se puede eliminar una clase con beneficiarios asignados",
        severity: "warning",
      });
      setConfirmDialogOpen(false);
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/programacion_de_clases/${claseToDelete.id}`)
      await reloadClases()
      setSnackbar({
        open: true,
        message: "Clase eliminada correctamente",
        severity: "success",
      })
    } catch (error) {
      console.error("Error al eliminar:", error)
      setSnackbar({
        open: true,
        message: "Error al eliminar la clase",
        severity: "error",
      })
    } finally {
      setConfirmDialogOpen(false)
      setClaseToDelete(null)
      setDetailDialogOpen(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!selectedClase || !cancelMotivo.trim()) return

    try {
      await axios.patch(`http://localhost:3000/api/programacion_de_clases/${selectedClase.id}/estado`, {
        estado: "cancelada",
        motivo: cancelMotivo.trim(),
      })
      await reloadClases()
      setSnackbar({
        open: true,
        message: "Clase cancelada correctamente",
        severity: "success",
      })
    } catch (error) {
      console.error("Error al cancelar:", error)
      setSnackbar({
        open: true,
        message: "Error al cancelar la clase",
        severity: "error",
      })
    } finally {
      setCancelDialogOpen(false)
      setSelectedClase(null)
      setCancelMotivo("")
      setDetailDialogOpen(false)
    }
  }

  // ✅ NUEVA FUNCIÓN: Confirmar asistencia
  const handleConfirmAttendance = async () => {
    if (!selectedClase) return

    try {
      // Preparar los datos de asistencia para el endpoint
      const asistenciasParaActualizar = Object.entries(attendanceData).map(([ventaId, data]) => ({
        ventaId,
        estado: data.asistio ? 'asistio' : 'no_asistio',
        motivo: data.motivo || null
      }))

      console.log("📤 Datos de asistencia a enviar:", {
        programacionClaseId: selectedClase.id,
        asistencias: asistenciasParaActualizar
      })

      // ✅ SOLO REGISTRAR ASISTENCIAS - NO CAMBIAR ESTADO DE CLASE
      console.log("🔄 Registrando asistencias...");
      const asistenciaUrl = `http://localhost:3000/api/asistencias/programacion/${selectedClase.id}/bulk`;
      console.log("🌐 URL de asistencia:", asistenciaUrl);
      console.log("📋 Datos a enviar a asistencia:", { asistencias: asistenciasParaActualizar });
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.put(
        asistenciaUrl,
        { asistencias: asistenciasParaActualizar },
        { headers }
      )

      console.log("✅ Respuesta del servidor (asistencias):", response.data)

      // ✅ AUTOMÁTICO: Marcar clase como ejecutada al registrar asistencia
      console.log("🔄 Marcando clase como ejecutada automáticamente...");
      const estadoUrl = `http://localhost:3000/api/programacion_de_clases/${selectedClase.id}/estado`;
      console.log("🌐 URL de estado:", estadoUrl);
      console.log("📋 Datos a enviar a estado:", { estado: "ejecutada" });
      
      try {
        await axios.patch(estadoUrl, {
          estado: "ejecutada"
        }, { headers })
        console.log("✅ Clase marcada como ejecutada");
        await reloadAulas(); // Recargar aulas para liberar el aula
      } catch (error) {
        console.error("⚠️ Error al marcar clase como ejecutada:", error)
        console.error("⚠️ URL que falló:", error.config?.url)
        console.error("⚠️ Método que falló:", error.config?.method)
        console.error("⚠️ Datos enviados:", error.config?.data)
        console.error("⚠️ Respuesta del error:", error.response?.data)
        // No fallar todo el proceso si esto falla
      }

      await reloadClases()
      setSnackbar({
        open: true,
        message: "Asistencia registrada correctamente",
        severity: "success",
      })
    } catch (error) {
      console.error("❌ Error al registrar asistencia:", error)
      console.error("❌ URL que falló:", error.config?.url)
      console.error("❌ Método que falló:", error.config?.method)
      console.error("❌ Datos enviados:", error.config?.data)
      console.error("❌ Respuesta del error:", error.response?.data)
      console.error("❌ Status del error:", error.response?.status)
      
      console.error("📋 Error en registro de asistencias - Datos enviados:", {
        programacionClaseId: selectedClase.id,
        asistencias: Object.entries(attendanceData).map(([ventaId, data]) => ({
          ventaId,
          estado: data.asistio ? 'asistio' : 'no_asistio',
          motivo: data.motivo || null
        }))
      })
      
      setSnackbar({
        open: true,
        message: `Error al registrar asistencias: ${error.response?.data?.message || error.message}`,
        severity: "error",
      })
    } finally {
      setAttendanceDialogOpen(false)
      setSelectedClase(null)
      setAttendanceData({})
      setDetailDialogOpen(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingClase) return

    try {
      const updateData = {
        horaInicio: editingClase.horaInicio,
        horaFin: editingClase.horaFin,
        especialidad: editingClase.especialidad,
        observaciones: editingClase.observaciones,
      }

      await axios.put(`http://localhost:3000/api/programacion_de_clases/${editingClase.id}`, updateData)
      await reloadClases()
      setSnackbar({
        open: true,
        message: "Clase actualizada correctamente",
        severity: "success",
      })
    } catch (error) {
      console.error("Error al actualizar:", error)
      setSnackbar({
        open: true,
        message: "Error al actualizar la clase",
        severity: "error",
      })
    } finally {
      setEditDialogOpen(false)
      setEditingClase(null)
    }
  }

  const handleSchedulerSubmit = async (nuevaClase) => {
    try {
      console.log("📤 Enviando nueva clase al backend:", nuevaClase)

      // VALIDAR DATOS ANTES DE ENVIAR
      if (!nuevaClase.programacionProfesor) {
        throw new Error("El profesor es requerido")
      }
      if (!nuevaClase.dia || !nuevaClase.horaInicio || !nuevaClase.horaFin) {
        throw new Error("El horario es requerido (día y horas)")
      }
      if (!nuevaClase.especialidad) {
        throw new Error("La especialidad es requerida")
      }
      if (!nuevaClase.beneficiarios?.length) {
        throw new Error("Al menos un beneficiario es requerido")
      }
      if (!nuevaClase.aula) {
        throw new Error("El aula es requerida")
      }

      const response = await axios.post("http://localhost:3000/api/programacion_de_clases", nuevaClase)
      console.log("✅ Respuesta del servidor:", response.data)

      // ✅ ACTUALIZADO: Los registros de asistencia se crearán solo al registrar la asistencia
      // No se crean automáticamente al programar la clase

      // Agrega la clase recién creada a la lista local inmediatamente
      setClases((prev) => [response.data, ...prev])

      await reloadClases()
      setSnackbar({
        open: true,
        message: "Clase programada correctamente",
        severity: "success",
      })
    } catch (error) {
      console.error("❌ Error al crear clase:", error)
      console.error("📋 Datos enviados:", nuevaClase)
      console.error("📋 Respuesta del error:", error.response?.data)

      setSnackbar({
        open: true,
        message: `Error al programar la clase: ${error.response?.data?.message || error.message}`,
        severity: "error",
      })
    }
  }

  const reloadClases = async () => {
    try {
      const clasesResponse = await axios.get("http://localhost:3000/api/programacion_de_clases")
      setClases(clasesResponse.data)
    } catch (error) {
      console.error("Error al recargar clases:", error)
    }
  }

  // ✅ NUEVA FUNCIÓN: Recargar aulas
  const reloadAulas = async () => {
    try {
      const aulasResponse = await axios.get("http://localhost:3000/api/aulas")
      // Filtrar aulas activas y disponibles
      const aulasActivas = aulasResponse.data.filter((a) => a.estado === "Activo" || a.estado === "Disponible")
      setAulas(aulasActivas) // This state is not defined in the original file, so this line is commented out.
    } catch (error) {
      console.error("Error al recargar aulas:", error)
    }
  }

  // Nuevo handler para guardar beneficiarios en edición
  const handleEditSubmit = async (nuevaClase) => {
    try {
      await axios.put(`http://localhost:3000/api/programacion_de_clases/${editingClase.id}`, {
        beneficiarios: nuevaClase.beneficiarios, // array de _id de venta
        // Puedes agregar otros campos si quieres permitir editarlos
      });
      await reloadClases();
      setSnackbar({
        open: true,
        message: 'Beneficiarios actualizados correctamente',
        severity: 'success',
      });
      setEditDialogOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error al actualizar beneficiarios',
        severity: 'error',
      });
    }
  };

  // Vista semanal con scroll mejorado
  const renderWeekView = () => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Cabecera CON TÍTULOS DE DÍAS */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "120px repeat(7, 1fr)",
          bgcolor: theme.palette.primary.main,
          color: "white",
          borderBottom: `2px solid ${theme.palette.primary.dark}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: theme.shadows[3],
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRight: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: theme.palette.primary.main,
          }}
        >
          <TimeIcon sx={{ mr: 0.5, fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
            Horarios
          </Typography>
        </Box>

        {/* Actualizar los estilos de los días de la semana */}
        {diasSemana.map((dia, index) => (
          <Box
            key={dia}
            sx={{
              p: 1.5,
              textAlign: "center",
              borderRight: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: theme.palette.primary.main,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.3 }}>
              {dia}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.65rem" }}>
              {moment().startOf("week").add(index + 1, "day").format("DD/MM")}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Filas con scroll oculto y líneas unidas */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <Box sx={{ minWidth: "900px" }}>
          {horasClase.map((hora, index) => {
            const isEvenRow = index % 2 === 0
            return (
              <Box
                key={hora}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "120px repeat(7, 1fr)",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  minHeight: "80px",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transition: "all 0.2s ease",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRight: `1px solid ${theme.palette.primary.main}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: isEvenRow ? alpha(theme.palette.background.default, 0.5) : theme.palette.background.paper,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    boxShadow: theme.shadows[1],
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main, fontSize: "0.85rem" }}>
                      {hora.split(" - ")[0]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
                      {hora.split(" - ")[1]}
                    </Typography>
                  </Box>
                </Box>

                {/* Celdas de días */}
                {diasSemana.map((dia) => {
                  // Agrupación y orden seguro para evitar errores de redeclaración
                  const key = `${dia}-${hora}`
                  const clasesEnCelda = Array.isArray(clasesPorDiaHora[key]) ? clasesPorDiaHora[key] : []
                  const tieneClase = clasesEnCelda.length > 0
                  const clasesOrdenadas = tieneClase ? [...clasesEnCelda].sort((a, b) => b.totalBeneficiarios - a.totalBeneficiarios) : []
                  const clasePrincipal = clasesOrdenadas[0] || null
                  const numBeneficiarios = clasePrincipal?.totalBeneficiarios || 0

                  return (
                    <Box
                      key={`${hora}-${dia}`}
                      sx={{
                        p: 1,
                        borderRight: `1px solid ${theme.palette.divider}`,
                        height: "100%",
                        minHeight: "80px",
                        position: "relative",
                        bgcolor: isEvenRow ? alpha(theme.palette.background.default, 0.5) : theme.palette.background.paper,
                      }}
                    >
                      {tieneClase && clasePrincipal ? (
                        <Box sx={{ position: "relative", height: "100%" }}>
                          {/* Menú para múltiples programaciones */}
                          {clasesOrdenadas.length > 1 && (
                            <Box sx={{ position: "absolute", top: 4, right: 4, zIndex: 2 }}>
                              <Tooltip title="Ver todas las programaciones de este horario">
                                <Chip
                                  label={`+${clasesOrdenadas.length - 1}`}
                                  size="small"
                                  color="primary"
                                  sx={{ fontSize: "0.7rem", height: 18, cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMultiClases(clasesOrdenadas)
                                    setMultiClasesDia(dia)
                                    setMultiClasesHora(hora)
                                    setMultiClaseDialogOpen(true)
                                  }}
                                />
                              </Tooltip>
                            </Box>
                          )}
                          <Paper
                            elevation={0}
                            sx={{
                              height: "100%",
                              p: 1,
                              bgcolor: clasePrincipal.estado === "cancelada"
                                ? alpha(theme.palette.grey[500], 0.15)
                                : alpha(getClassColor(clasePrincipal.especialidad), 0.15),
                              borderLeft: `4px solid ${clasePrincipal.estado === "cancelada" ? theme.palette.grey[500] : getClassColor(clasePrincipal.especialidad)}`,
                              borderRadius: "6px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              transition: "all 0.2s ease",
                              position: "relative",
                              cursor: "pointer",
                              opacity: clasePrincipal.estado === "cancelada" ? 0.7 : 1,
                              "&:hover": {
                                bgcolor: clasePrincipal.estado === "cancelada"
                                  ? alpha(theme.palette.grey[500], 0.25)
                                  : alpha(getClassColor(clasePrincipal.especialidad), 0.25),
                                transform: clasePrincipal.estado === "cancelada" ? "none" : "translateY(-2px)",
                                boxShadow: clasePrincipal.estado === "cancelada" ? "none" : theme.shadows[4],
                              },
                            }}
                            onClick={() => {
                              setSelectedClase(clasePrincipal)
                              setDetailDialogOpen(true)
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.3, fontSize: "0.8rem" }}>
                              {clasePrincipal.especialidad}
                              {clasePrincipal.estado === "cancelada" && (
                                <Chip
                                  label="CANCELADA"
                                  size="small"
                                  color="error"
                                  sx={{
                                    ml: 0.5,
                                    fontSize: "0.6rem",
                                    height: 16,
                                    "& .MuiChip-label": { px: 0.5 },
                                  }}
                                />
                              )}
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                              <Typography
                                variant="caption"
                                sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}
                              >
                                <PersonIcon fontSize="inherit" />
                                {clasePrincipal.profesor}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}
                              >
                                {/* Agregar info del aula */}
                                <AssignmentIcon fontSize="inherit" />
                                Aula: {clasePrincipal.aula}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}
                              >
                                <GroupIcon fontSize="inherit" />
                                <Badge
                                  badgeContent={numBeneficiarios}
                                  color="primary"
                                  sx={{ "& .MuiBadge-badge": { fontSize: "0.55rem", height: 12, minWidth: 12 } }}
                                >
                                  <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                    Beneficiarios
                                  </Typography>
                                </Badge>
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5, gap: 0.3 }}>
                              {/* Botón de cancelar - según privilegios */}
                              {canCancelClase && (
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelClase(clasePrincipal)
                                  }}
                                  disabled={clasePrincipal.estado === "cancelada"}
                                  sx={{
                                    p: 0.3,
                                    "&:hover": {
                                      bgcolor: clasePrincipal.estado === "cancelada" ? "transparent" : alpha("#ff9800", 0.1),
                                    },
                                    opacity: clasePrincipal.estado === "cancelada" ? 0.3 : 1,
                                  }}
                                >
                                  <CancelIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                              
                              {/* Botones de edición y eliminación - según privilegios */}
                              {!isBeneficiario && (
                                <>
                                  {canEditClase && (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditClase(clasePrincipal)
                                      }}
                                      disabled={clasePrincipal.estado === "cancelada"}
                                      sx={{
                                        p: 0.3,
                                        "&:hover": {
                                          bgcolor: clasePrincipal.estado === "cancelada" ? "transparent" : alpha("#1976d2", 0.1),
                                        },
                                        opacity: clasePrincipal.estado === "cancelada" ? 0.3 : 1,
                                      }}
                                    >
                                      <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  )}
                                  {canDeleteClase && (
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteClase(clasePrincipal)
                                      }}
                                      disabled={clasePrincipal.estado === "cancelada"}
                                      sx={{
                                        p: 0.3,
                                        "&:hover": {
                                          bgcolor: clasePrincipal.estado === "cancelada" ? "transparent" : alpha("#f44336", 0.1),
                                        },
                                        opacity: clasePrincipal.estado === "cancelada" ? 0.3 : 1,
                                      }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  )}
                                </>
                              )}
                            </Box>
                            <Box
                              sx={{
                                position: "absolute",
                                top: 3,
                                right: 3,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor:
                                  clasePrincipal.estado === "ejecutada"
                                    ? "#4caf50"
                                    : clasePrincipal.estado === "cancelada"
                                      ? "#f44336"
                                      : clasePrincipal.estado === "programada"
                                        ? "#2196f3"
                                        : "#ffc107",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              }}
                            />
                          </Paper>
                        </Box>
                      ) : (
                        !isBeneficiario && canCreateClase && (
                          <Box
                            sx={{
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0.3,
                              transition: "all 0.2s ease",
                              "&:hover": {
                                opacity: 0.8,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                borderRadius: "6px",
                              },
                            }}
                          >
                            <Tooltip title="Agregar clase" arrow>
                              <IconButton
                                size="small"
                                onClick={() => setSchedulerOpen(true)}
                                sx={{
                                  "&:hover": {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  },
                                }}
                              >
                                <AddIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )
                      )}
                    </Box>
                  )
                })}
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", mt: 2 }}>
      {/* Barra superior */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          pb: 1,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 500 }}>
          {getTitle()}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            placeholder="Buscar..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "120px", sm: "200px" } }}
          />
          {!isBeneficiario && canCreateClase && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setSchedulerOpen(true)}
              sx={{
                bgcolor: "#0455a2",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#033b70",
                },
              }}
            >
              Nueva Clase
            </Button>
          )}
        </Box>
      </Box>

      {/* Barra de navegación simplificada */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          px: 1,
          py: 0.5,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            variant="text"
            onClick={() => setDate(new Date())}
            sx={{
              textTransform: "none",
              color: "#1a73e8",
              minWidth: "auto",
              px: 1,
              fontSize: "0.875rem",
            }}
          >
            Hoy
          </Button>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip label={`${filteredClases.length} clases`} color="primary" variant="outlined" size="small" />
        </Box>
      </Box>

      {/* Contenido principal */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress size={50} sx={{ color: "#0455a2" }} />
            <Typography variant="body1" sx={{ ml: 2, fontWeight: 500 }}>
              Cargando programación...
            </Typography>
          </Box>
        ) : (
          renderWeekView()
        )}
      </Paper>

      {/* ✅ MODAL DETALLE MEJORADO - Mostrar todos los beneficiarios */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedClase && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: getClassColor(selectedClase.especialidad),
                color: "white",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>Detalles de la Clase</Box>
              <IconButton onClick={() => setDetailDialogOpen(false)} sx={{ color: "white" }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, color: getClassColor(selectedClase.especialidad) }}>
                    {selectedClase.especialidad}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <TimeIcon fontSize="inherit" />
                    <strong>Día:</strong> {selectedClase.dia}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <TimeIcon fontSize="inherit" />
                    <strong>Hora:</strong> {selectedClase.hora}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <PersonIcon fontSize="inherit" />
                    <strong>Profesor:</strong> {selectedClase.profesor}
                  </Typography>
                </Grid>
                {/* Agregar Grid item para el aula */}
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <AssignmentIcon fontSize="inherit" />
                    <strong>Aula:</strong> {selectedClase.aula}
                  </Typography>
                </Grid>

                {/* ✅ MOSTRAR TODOS LOS BENEFICIARIOS */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
                    <GroupIcon fontSize="inherit" />
                    <strong>Beneficiarios ({selectedClase.totalBeneficiarios}):</strong>
                  </Typography>
                  <List dense sx={{ bgcolor: "#f8f9fa", borderRadius: 1, maxHeight: 200, overflow: "auto" }}>
                    {Array.isArray(selectedClase?.todosLosEstudiantes) && selectedClase.todosLosEstudiantes.map((estudiante, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <PersonIcon
                            fontSize="small"
                            color={estudiante.tipo === "Beneficiario" ? "primary" : "secondary"}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={estudiante.nombre}
                          secondary={`${estudiante.tipo} - ${estudiante.codigoVenta}`}
                          primaryTypographyProps={{ fontSize: "0.9rem" }}
                          secondaryTypographyProps={{ fontSize: "0.75rem" }}
                        />
                        {estudiante.tipo === "Beneficiario" && (
                          <Chip label="Beneficiario" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12}>
                  {selectedClase?.estado && (
                    <Chip
                      label={selectedClase.estado.charAt(0).toUpperCase() + selectedClase.estado.slice(1)}
                      color={
                        selectedClase.estado === "ejecutada"
                          ? "success"
                          : selectedClase.estado === "cancelada"
                            ? "error"
                            : selectedClase.estado === "programada"
                              ? "info"
                              : "default"
                      }
                      sx={{ mb: 2 }}
                    />
                  )}
                </Grid>
                {selectedClase.observaciones && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Observaciones:</strong> {selectedClase.observaciones}
                    </Typography>
                  </Grid>
                )}
                {selectedClase.motivo && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Motivo:</strong> {selectedClase.motivo}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              {/* ✅ SOLO BOTÓN DE ASISTENCIA (según privilegio) */}
              {canRegisterAttendance && (
                <Button
                  variant="contained"
                  startIcon={<AssignmentIcon />}
                  onClick={() => handleAttendanceClase(selectedClase)}
                  disabled={selectedClase.estado === "cancelada"}
                  sx={{
                    backgroundColor: selectedClase.estado === "cancelada" ? "#9e9e9e" : "#4caf50",
                    "&:hover": {
                      backgroundColor: selectedClase.estado === "cancelada" ? "#9e9e9e" : "#388e3c",
                    },
                    mr: 1,
                  }}
                >
                  {selectedClase.estado === "cancelada" ? "Clase Cancelada" : "Registrar Asistencia"}
                </Button>
              )}
              <Button
                variant="contained"
                onClick={() => setDetailDialogOpen(false)}
                sx={{
                  backgroundColor: "#0455a2",
                  "&:hover": {
                    backgroundColor: "#033b7a",
                  },
                }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ✅ NUEVO MODAL DE ASISTENCIA */}
      <Dialog open={attendanceDialogOpen} onClose={() => setAttendanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#4caf50", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AssignmentIcon />
            Registrar Asistencia
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedClase && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Clase:</strong> {selectedClase.especialidad}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                <strong>Horario:</strong> {selectedClase.dia} - {selectedClase.hora}
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>
                Marcar asistencia de beneficiarios:
              </Typography>

              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                {selectedClase.todosLosEstudiantes.map((estudiante) => {
                  const estudianteData = attendanceData[estudiante.id] || { asistio: false, motivo: "" }

                  return (
                    <Paper key={estudiante.id} sx={{ p: 2, mb: 2, border: "1px solid #e0e0e0" }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Checkbox
                          checked={estudianteData.asistio}
                          onChange={(e) =>
                            setAttendanceData((prev) => ({
                              ...prev,
                              [estudiante.id]: {
                                ...prev[estudiante.id],
                                asistio: e.target.checked,
                                motivo: e.target.checked ? "" : prev[estudiante.id]?.motivo || "",
                              },
                            }))
                          }
                          icon={<RadioButtonUncheckedIcon />}
                          checkedIcon={<CheckCircleIcon />}
                          sx={{
                            color: "#4caf50",
                            "&.Mui-checked": {
                              color: "#4caf50",
                            },
                          }}
                        />
                        <Box sx={{ flex: 1, ml: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {estudiante.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {estudiante.tipo} - {estudiante.codigoVenta}
                          </Typography>
                          {estudiante.tipo === "Beneficiario" && (
                            <Chip label="Beneficiario" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Box>
                        <Chip
                          label={estudianteData.asistio ? "Asistió" : "No asistió"}
                          color={estudianteData.asistio ? "success" : "error"}
                          size="small"
                        />
                      </Box>

                      {/* Campo de motivo cuando NO asiste */}
                      {!estudianteData.asistio && (
                        <TextField
                          label="Motivo de inasistencia"
                          value={estudianteData.motivo}
                          onChange={(e) =>
                            setAttendanceData((prev) => ({
                              ...prev,
                              [estudiante.id]: {
                                ...prev[estudiante.id],
                                motivo: e.target.value,
                              },
                            }))
                          }
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          placeholder="Ej: Enfermedad, viaje, etc."
                          sx={{ mt: 1 }}
                          required={!estudianteData.asistio}
                        />
                      )}
                    </Paper>
                  )
                })}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
          {canRegisterAttendance && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleConfirmAttendance}
              sx={{
                bgcolor: "#4caf50",
                "&:hover": {
                  bgcolor: "#388e3c",
                },
              }}
            >
              Guardar Asistencia
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal editar clase */}
      {/* Reemplazo el modal de edición por el ClassSchedulerModal en modo edición */}
      <ClassSchedulerModal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        editMode={true}
        claseAEditar={editingClase}
        aulas={aulas} // ✅ PASAR AULAS ACTUALIZADAS
      />

      {/* Modal cancelar clase */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#ff9800", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CancelIcon />
            Cancelar Clase
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Está seguro de cancelar esta clase?
          </Typography>
          {selectedClase && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="subtitle2">{selectedClase.especialidad}</Typography>
              <Typography variant="body2">
                {selectedClase.dia} - {selectedClase.hora}
              </Typography>
              <Typography variant="body2">Profesor: {selectedClase.profesor}</Typography>
            </Box>
          )}
          <TextField
            label="Motivo de cancelación"
            value={cancelMotivo}
            onChange={(e) => setCancelMotivo(e.target.value)}
            fullWidth
            multiline
            rows={3}
            required
            helperText="Por favor, indique el motivo de la cancelación"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)}>Cancelar</Button>
          {canCancelClase && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<CancelIcon />}
              onClick={handleConfirmCancel}
              disabled={!cancelMotivo.trim()}
            >
              Confirmar Cancelación
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: "8px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Clase"
        content={
          claseToDelete
            ? `¿Está seguro de eliminar la clase de ${claseToDelete.especialidad} programada para ${claseToDelete.dia} de ${claseToDelete.hora}?`
            : ""
        }
        confirmButtonColor="#f44336"
        confirmButtonText="Eliminar"
      />

      {/* ✅ NUEVO MODAL DE MÚLTIPLES CLASES */}
      <Dialog open={multiClaseDialogOpen} onClose={() => setMultiClaseDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#2196f3", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FilterAltIcon />
            Programaciones de {multiClasesDia} - {multiClasesHora}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {multiClases.map((clase) => (
              <Grid item xs={12} key={clase.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderLeft: `4px solid ${getClassColor(clase.especialidad)}`,
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    bgcolor: alpha(getClassColor(clase.especialidad), 0.1),
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                      {clase.especialidad}
                      {clase.estado === "cancelada" && (
                        <Chip
                          label="CANCELADA"
                          size="small"
                          color="error"
                          sx={{
                            ml: 0.5,
                            fontSize: "0.6rem",
                            height: 16,
                            "& .MuiChip-label": { px: 0.5 },
                          }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}>
                      <PersonIcon fontSize="inherit" />
                      {clase.profesor}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}>
                      <AssignmentIcon fontSize="inherit" />
                      Aula: {clase.aula}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: "0.7rem" }}>
                      <GroupIcon fontSize="inherit" />
                      <Badge
                        badgeContent={clase.totalBeneficiarios}
                        color="primary"
                        sx={{ "& .MuiBadge-badge": { fontSize: "0.55rem", height: 12, minWidth: 12 } }}
                      >
                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                          Beneficiarios
                        </Typography>
                      </Badge>
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {/* Botón de cancelar - según privilegios */}
                    {canCancelClase && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelClase(clase)
                        }}
                        disabled={clase.estado === "cancelada"}
                        sx={{
                          p: 0.3,
                          "&:hover": {
                            bgcolor: clase.estado === "cancelada" ? "transparent" : alpha("#ff9800", 0.1),
                          },
                          opacity: clase.estado === "cancelada" ? 0.3 : 1,
                        }}
                      >
                        <CancelIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                    
                    {/* Botones de edición y eliminación - según privilegios */}
                    {!isBeneficiario && (
                      <>
                        {canEditClase && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditClase(clase)
                            }}
                            disabled={clase.estado === "cancelada"}
                            sx={{
                              p: 0.3,
                              "&:hover": {
                                bgcolor: clase.estado === "cancelada" ? "transparent" : alpha("#1976d2", 0.1),
                              },
                              opacity: clase.estado === "cancelada" ? 0.3 : 1,
                            }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                        {canDeleteClase && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClase(clase)
                            }}
                            disabled={clase.estado === "cancelada"}
                            sx={{
                              p: 0.3,
                              "&:hover": {
                                bgcolor: clase.estado === "cancelada" ? "transparent" : alpha("#f44336", 0.1),
                              },
                              opacity: clase.estado === "cancelada" ? 0.3 : 1,
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMultiClaseDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal del programador de clases */}
      <ClassSchedulerModal
        isOpen={schedulerOpen}
        onClose={() => setSchedulerOpen(false)}
        onSubmit={handleSchedulerSubmit}
        aulas={aulas} // ✅ PASAR AULAS ACTUALIZADAS
      />
    </Box>
  )
}

export default ProgramacionClases;
