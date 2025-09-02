"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  alpha,
  useMediaQuery,
  useTheme,
  TextField,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Skeleton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Remove as RemoveIcon,
  School as SchoolIcon,
} from "@mui/icons-material"
import axios from "axios"
import DeleteIcon from "@mui/icons-material/Delete";
import { useContext } from "react";
import { ThemeContext } from "../../../shared/contexts/ThemeContext";

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

// Estilos mejorados para scroll
const scrollbarStyles = {
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f3f4",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#0455a2",
    borderRadius: "4px",
    "&:hover": {
      background: "#034589",
    },
  },
  scrollbarWidth: "thin",
  scrollbarColor: "#0455a2 #f1f3f4",
}

export const ClassSchedulerModal = ({ isOpen, onClose, onSubmit, editMode = false, claseAEditar = null, aulas: aulasProp = null }) => {
  const [profesores, setProfesores] = useState([])
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("")
  const [programacionProfesor, setProgramacionProfesor] = useState(null)
  const [horariosDisponibles, setHorariosDisponibles] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [beneficiarios, setBeneficiarios] = useState([])
  const [beneficiariosSeleccionados, setBeneficiariosSeleccionados] = useState([])
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [clasesExistentes, setClasesExistentes] = useState([])
  const [aulas, setAulas] = useState([])
  const [aulaSeleccionada, setAulaSeleccionada] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const theme = useTheme()
  const { darkMode } = useContext(ThemeContext);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  // Actualizar estilos del scrollbar
  const scrollbarStyles = {
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::-webkit-scrollbar-track": {
      background: darkMode ? alpha(theme.palette.background.paper, 0.15) : theme.palette.grey[100],
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: theme.palette.primary.main,
      borderRadius: "4px",
      "&:hover": {
        background: theme.palette.primary.dark,
      },
    },
    scrollbarWidth: "thin",
    scrollbarColor: `${theme.palette.primary.main} ${darkMode ? alpha(theme.palette.background.paper, 0.15) : theme.palette.grey[100]}`,
  };

  // ✅ ACTUALIZADO: Usar aulas de prop si están disponibles, sino cargarlas
  useEffect(() => {
    if (aulasProp) {
      // Usar aulas pasadas como prop
      setAulas(aulasProp)
    } else {
      // Cargar aulas si no se pasan como prop
      const fetchAulas = async () => {
        try {
          const response = await axios.get("http://localhost:3000/api/aulas")
          // ✅ ACTUALIZADO: Incluir aulas activas y disponibles
          setAulas(response.data.filter((a) => a.estado === "Activo" || a.estado === "Disponible"))
        } catch (error) {
          console.error("Error al cargar aulas:", error)
        }
      }
      if (isOpen) fetchAulas()
    }
  }, [isOpen, aulasProp])

  // Cargar profesores con programación activa
  useEffect(() => {
    const fetchProfesores = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/programacion_de_profesores")
        const profesoresActivos = response.data
          .filter((prog) => prog.estado === "activo" && prog.horariosPorDia && prog.horariosPorDia.length > 0)
          .map((prog) => ({
            id: prog.profesor?._id || prog.profesor,
            nombre: prog.profesor?.nombres 
              ? `${prog.profesor.nombres} ${prog.profesor.apellidos}` 
              : typeof prog.profesor === 'string' ? prog.profesor : 'Profesor sin nombre',
            especialidades: prog.profesor?.especialidades || [],
            color: prog.profesor?.color || "#0455a2",
            programacionId: prog._id,
            horariosPorDia: prog.horariosPorDia || [],
          }))

        console.log("✅ Profesores con horarios por día cargados:", profesoresActivos)
        setProfesores(profesoresActivos)
      } catch (error) {
        console.error("❌ Error al cargar profesores:", error)
      }
    }

    if (isOpen) {
      fetchProfesores()
    }
  }, [isOpen])

  // Cargar beneficiarios SOLO de ventas tipo "curso"
  useEffect(() => {
    const fetchBeneficiarios = async () => {
      try {
        console.log("🔄 Iniciando carga de beneficiarios...");
        const response = await axios.get("http://localhost:3000/api/ventas?populate=true");
        console.log("📦 Datos recibidos:", response.data);
        
        const beneficiariosActivos = response.data
          .filter((venta) => {
            const isValid = venta.tipo === "curso" && venta.beneficiarioId;
            if (!isValid) {
              console.log("❌ Venta descartada - no es curso o sin beneficiario:", venta.codigoVenta);
              return false;
            }
            return true;
          })
          .map((venta) => ({
            _id: venta._id,
            beneficiarioId: {
              _id: venta.beneficiarioId._id,
              nombre: venta.beneficiarioId.nombre || 'Sin nombre',
              apellido: venta.beneficiarioId.apellido || 'Sin apellido',
            },
            codigoVenta: venta.codigoVenta,
            tipo: venta.tipo,
            numero_de_clases: venta.numero_de_clases,
            ciclo: venta.ciclo,
            cursoId: venta.cursoId,
            estado: venta.estado
          }));

        console.log("✅ Beneficiarios procesados:", beneficiariosActivos.length);
        console.log("📋 Detalle beneficiarios:", beneficiariosActivos);
        setBeneficiarios(beneficiariosActivos);
      } catch (error) {
        console.error("❌ Error al cargar beneficiarios:", error);
        setBeneficiarios([]);
      }
    };

    if (isOpen) {
      fetchBeneficiarios();
    }
  }, [isOpen]);

  // Cargar todas las clases existentes
  useEffect(() => {
    const fetchClasesExistentes = async () => {
      if (!isOpen) return

      try {
        console.log("📚 Cargando clases existentes...")
        const response = await axios.get("http://localhost:3000/api/programacion_de_clases")
        console.log("✅ Clases existentes cargadas:", response.data.length)
        setClasesExistentes(response.data)
      } catch (error) {
        console.error("❌ Error al cargar clases existentes:", error)
        setClasesExistentes([])
      }
    }

    fetchClasesExistentes()
  }, [isOpen])

  // En modo edición, inicializar datos
  useEffect(() => {
    if (editMode && claseAEditar && beneficiarios.length && profesores.length) {
      // Buscar el profesor y la programación
      const profId = claseAEditar.original?.programacionProfesor?.profesor?._id || claseAEditar.original?.programacionProfesor?.profesor;
      setProfesorSeleccionado(profId);

      // Buscar la programación del profesor
      const prog = profesores.find(p => p.id === profId);
      setProgramacionProfesor(prog);

      setEspecialidadSeleccionada(claseAEditar.especialidad);

      // Mapear los beneficiarios a objetos completos de venta (aceptar tanto IDs como objetos)
      const beneficiariosCompletos = (claseAEditar.original?.beneficiarios || []).map(benef => {
        if (benef && typeof benef === 'object' && benef._id) return benef;
        return beneficiarios.find(v => v._id === benef) || null;
      }).filter(Boolean);

      setBeneficiariosSeleccionados(beneficiariosCompletos);

      setObservaciones(claseAEditar.observaciones || "");
      setSelectedSlot({
        dia: claseAEditar.diaCodigo,
        horaInicio: claseAEditar.horaInicio,
        horaFin: claseAEditar.horaFin,
      });
      setAulaSeleccionada(claseAEditar.original?.aula?._id || "");
    } else if (!isOpen) {
      setEspecialidadSeleccionada("");
      setBeneficiariosSeleccionados([]);
      setObservaciones("");
      setSelectedSlot(null);
      setAulaSeleccionada("");
      setProfesorSeleccionado("");
      setProgramacionProfesor(null);
    }
  }, [editMode, claseAEditar, isOpen, beneficiarios, profesores]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfesorSeleccionado("")
      setProgramacionProfesor(null)
      setHorariosDisponibles([])
      setSelectedSlot(null)
      setBeneficiariosSeleccionados([])
      setEspecialidadSeleccionada("")
      setObservaciones("")
      setAulaSeleccionada("")
    }
  }, [isOpen])

  // Actualizar especialidad al cambiar profesor
  useEffect(() => {
    if (!editMode && profesorSeleccionado) {
      // No precargar especialidad, solo limpiar
      setEspecialidadSeleccionada("");
      setBeneficiariosSeleccionados([]);
      setObservaciones("");
      setAulaSeleccionada("");
      setSelectedSlot(null);
    }
  }, [profesorSeleccionado, editMode, profesores]);

  // ✅ NUEVA FUNCIÓN: Generar horarios disponibles usando horariosPorDia
  const generarHorariosDisponiblesPorDia = (horariosPorDia, profesorId) => {
    console.log("🔧 === GENERANDO HORARIOS POR DÍA ===")
    console.log("📊 horariosPorDia recibidos:", horariosPorDia)
    console.log("👨‍🏫 Profesor ID:", profesorId)

    const horarios = []

    const convertirAMinutos = (hora) => {
      const [h, m] = hora.split(":").map(Number)
      return h * 60 + m
    }

    const convertirAHora = (minutos) => {
      const h = Math.floor(minutos / 60)
      const m = minutos % 60
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    }

    // ✅ ACTUALIZADO: Analizar TODAS las clases existentes, pero solo marcar como ocupadas las que no están ejecutadas
    const todasLasClases = clasesExistentes.filter(
      (clase) => clase.estado !== undefined && clase.estado !== "reprogramada"
    )

    // Obtener ids de profesores y aulas ocupados en cada slot
    const ocupacionPorSlot = {}
    todasLasClases.forEach((clase) => {
      const key = `${clase.dia}-${clase.horaInicio}-${clase.horaFin}`
      if (!ocupacionPorSlot[key]) ocupacionPorSlot[key] = { profesores: new Set(), aulas: new Set() }
      // ✅ ACTUALIZADO: Solo marcar como ocupado si la clase está programada o cancelada (NO ejecutada)
      if (clase.estado === "programada" || clase.estado === "cancelada") {
        if (clase.programacionProfesor && clase.programacionProfesor.profesor) {
          const profId = typeof clase.programacionProfesor.profesor === "object" ? clase.programacionProfesor.profesor._id : clase.programacionProfesor.profesor
          ocupacionPorSlot[key].profesores.add(String(profId))
        }
        if (clase.aula) {
          ocupacionPorSlot[key].aulas.add(String(clase.aula._id || clase.aula))
        }
      }
      // ✅ NUEVO: Las clases con estado "ejecutada" NO marcan el aula como ocupada
      // Esto permite que el aula esté disponible para nuevas programaciones
    })

    // PROCESAR CADA DÍA CON SU HORARIO ESPECÍFICO
    horariosPorDia.forEach((horarioDia) => {
      const { dia, horaInicio, horaFin } = horarioDia
      const diaNombre = codigoDias[dia]
      const inicioMinutos = convertirAMinutos(horaInicio)
      const finMinutos = convertirAMinutos(horaFin)
      for (let minutos = inicioMinutos; minutos < finMinutos; minutos += 60) {
        const horaInicioSlot = convertirAHora(minutos)
        const horaFinSlot = convertirAHora(minutos + 60)
        if (minutos + 60 <= finMinutos) {
          const key = `${dia}-${horaInicioSlot}-${horaFinSlot}`
          const ocupacion = ocupacionPorSlot[key] || { profesores: new Set(), aulas: new Set() }
          // Buscar si el profesor tiene clase cancelada en este slot
          const claseCancelada = todasLasClases.find(
            (clase) =>
              clase.dia === dia &&
              clase.horaInicio === horaInicioSlot &&
              clase.horaFin === horaFinSlot &&
              clase.estado === "cancelada" &&
              clase.programacionProfesor &&
              ((typeof clase.programacionProfesor.profesor === "object"
                ? clase.programacionProfesor.profesor._id
                : clase.programacionProfesor.profesor) === String(profesorId))
          )
          // Solo desactivar si el profesor actual ya tiene clase activa en ese slot
          const profesorOcupado = ocupacion.profesores.has(String(profesorId))
          // Si hay profesores y aulas disponibles, el slot está disponible
          const hayAulasDisponibles = aulas.some(aula => !ocupacion.aulas.has(String(aula._id)))
          const hayProfesoresDisponibles = profesores.some(p => !ocupacion.profesores.has(String(p.id)))
          let disponible = !profesorOcupado && hayAulasDisponibles && hayProfesoresDisponibles
          let tipoOcupacion = disponible ? "disponible" : "ocupado"
          let ocupadoPor = profesorOcupado ? "Profesor ya asignado en este horario" : (!hayAulasDisponibles ? "Sin aulas disponibles" : (!hayProfesoresDisponibles ? "Sin profesores disponibles" : null))
          let esReprogramable = false
          let claseId = null
          if (claseCancelada) {
            disponible = true
            tipoOcupacion = "reprogramable"
            ocupadoPor = `Clase cancelada: ${claseCancelada.cursoId?.nombre || "Sin especialidad"}`
            esReprogramable = true
            claseId = claseCancelada._id
          }
          horarios.push({
            dia: dia,
            diaNombre: diaNombre,
            horaInicio: horaInicioSlot,
            horaFin: horaFinSlot,
            disponible,
            tipoOcupacion,
            ocupadoPor,
            esReprogramable,
            claseId,
          })
        }
      }
    })

    console.log("🎯 === RESUMEN FINAL ===")
    console.log(`📈 Total horarios generados: ${horarios.length}`)
    console.log(`✅ Horarios disponibles: ${horarios.filter((h) => h.disponible).length}`)
    console.log(`❌ Horarios ocupados: ${horarios.filter((h) => !h.disponible).length}`)

    return horarios
  }

  // ✅ NUEVA FUNCIÓN: Manejar reprogramación de clase cancelada
  const handleReprogramarClase = async (claseId, dia, horaInicio, horaFin) => {
    try {
      console.log("🔄 Reprogramando clase:", claseId)

      // Cambiar el estado de la clase a "reprogramada" en lugar de eliminar
      await axios.patch(`http://localhost:3000/api/programacion_de_clases/${claseId}/estado`, {
        estado: "reprogramada",
      })

      // Recargar las clases existentes para actualizar la vista
      const response = await axios.get("http://localhost:3000/api/programacion_de_clases")
      setClasesExistentes(response.data)

      // Automáticamente seleccionar el slot liberado
      setSelectedSlot({ dia, horaInicio, horaFin })

      console.log("✅ Clase marcada como reprogramada y slot seleccionado automáticamente")
    } catch (error) {
      console.error("❌ Error al reprogramar clase:", error)
    }
  }

  // ✅ ACTUALIZAR: Cargar horarios disponibles del profesor seleccionado
  useEffect(() => {
    const fetchHorariosDisponibles = async () => {
      if (!profesorSeleccionado) {
        setHorariosDisponibles([])
        setProgramacionProfesor(null)
        return
      }

      setLoadingHorarios(true)

      try {
        console.log("🔍 Generando horarios para profesor:", profesorSeleccionado)

        // Buscar el profesor seleccionado
        const profesorData = profesores.find((p) => p.id === profesorSeleccionado)
        if (!profesorData) {
          console.warn("⚠️ No se encontró data del profesor")
          setLoadingHorarios(false)
          return
        }

        console.log("👨‍🏫 Datos del profesor encontrado:", profesorData)

        // Crear objeto de programación del profesor con validaciones
        const programacionProfesorData = {
          _id: profesorData.programacionId,
          profesor: {
            _id: profesorData.id,
            nombres: profesorData.nombre.split(" ")[0] || '',
            apellidos: profesorData.nombre.split(" ").slice(1).join(" ") || '',
            especialidades: profesorData.especialidades || [],
            color: profesorData.color || "#0455a2",
          },
          horariosPorDia: profesorData.horariosPorDia || [], 
        }

        console.log("📋 Programación del profesor:", programacionProfesorData)

        // ✅ USAR LA NUEVA FUNCIÓN con validación
        const horarios = profesorData.horariosPorDia 
          ? generarHorariosDisponiblesPorDia(profesorData.horariosPorDia, profesorSeleccionado)
          : []

        setProgramacionProfesor(programacionProfesorData)
        setHorariosDisponibles(horarios)

        console.log("✅ Horarios generados exitosamente:", horarios.length)
      } catch (error) {
        console.error("❌ Error al procesar horarios:", error)
        setProgramacionProfesor(null)
        setHorariosDisponibles([])
      } finally {
        setLoadingHorarios(false)
      }
    }

    fetchHorariosDisponibles()
  }, [profesorSeleccionado, profesores, clasesExistentes])

  // Organizar horarios en una grilla - ACTUALIZADO
  const { horariosGrid, timeSlots } = useMemo(() => {
    const grid = {}
    const slotsSet = new Set()

    // Recopilar todos los slots únicos de los horarios disponibles
    horariosDisponibles.forEach((horario) => {
      const slotKey = `${horario.horaInicio}-${horario.horaFin}`
      slotsSet.add(slotKey)
    })

    const slots = Array.from(slotsSet).sort()

    // Inicializar la grilla
    slots.forEach((slotKey) => {
      grid[slotKey] = {}
    })

    // Llenar la grilla con los horarios disponibles
    horariosDisponibles.forEach((horario) => {
      const key = `${horario.horaInicio}-${horario.horaFin}`
      if (!grid[key]) {
        grid[key] = {}
      }
      grid[key][horario.dia] = horario
    })

    return { horariosGrid: grid, timeSlots: slots }
  }, [horariosDisponibles])

  const handleSlotClick = (dia, horaInicio, horaFin, disponible) => {
    if (!disponible) return
    setSelectedSlot({ dia, horaInicio, horaFin })
  }

  const isSlotSelected = (dia, horaInicio, horaFin) => {
    return (
      selectedSlot?.dia === diasCodigo[dia] &&
      selectedSlot?.horaInicio === horaInicio &&
      selectedSlot?.horaFin === horaFin
    )
  }

  const handleRemoveBeneficiario = (beneficiarioId) => {
    setBeneficiariosSeleccionados(prev => prev.filter(b => b._id !== beneficiarioId));
  }

  const canSubmit = useMemo(() => {
    return (
      selectedSlot && 
      selectedSlot.dia && 
      selectedSlot.horaInicio && 
      selectedSlot.horaFin &&
      beneficiariosSeleccionados.length > 0 && 
      especialidadSeleccionada &&
      aulaSeleccionada &&
      programacionProfesor?._id
    )
  }, [selectedSlot, beneficiariosSeleccionados, especialidadSeleccionada, aulaSeleccionada, programacionProfesor])

  const handleSubmit = () => {
    if (!canSubmit) return

    const nuevaClase = {
      programacionProfesor: programacionProfesor._id,
      aula: aulaSeleccionada,
      dia: selectedSlot.dia,
      horaInicio: selectedSlot.horaInicio,
      horaFin: selectedSlot.horaFin,
      especialidad: especialidadSeleccionada,
      beneficiarios: beneficiariosSeleccionados.map(b => b._id),
      observaciones: observaciones || null,
      estado: "programada",
    }

    console.log("📤 Enviando nueva clase:", nuevaClase)
    onSubmit(nuevaClase)
    onClose()
  }

  // 1. Filtrar beneficiarios por ventas tipo 'curso' y especialidad:
  const beneficiariosFiltrados = useMemo(() => {
    if (!especialidadSeleccionada) return [];
    return beneficiarios.filter((venta) => {
      const nombreCurso = (venta.cursoId && typeof venta.cursoId === 'object') ? (venta.cursoId.nombre || '').trim().toLowerCase() : '';
      const especialidadBuscada = especialidadSeleccionada.trim().toLowerCase();
      const estado = (venta.estado || '').toLowerCase();
      const tipo = venta.tipo;
      const yaSeleccionado = beneficiariosSeleccionados.some(b => (b._id || b) === venta._id);
      // Reglas: solo ventas tipo 'curso', estado 'vigente', curso EXACTAMENTE igual a la especialidad seleccionada
      if (tipo !== 'curso') return false;
      if (!venta.cursoId || typeof venta.cursoId !== 'object') return false;
      if (estado !== 'vigente') return false;
      if (!nombreCurso || nombreCurso !== especialidadBuscada) return false;
      if (yaSeleccionado) return false;
      return true;
    });
  }, [beneficiarios, especialidadSeleccionada, beneficiariosSeleccionados]);

  // Calcular capacidad máxima del aula seleccionada
  const capacidadAula = useMemo(() => {
    if (!aulaSeleccionada) return null;
    const aula = aulas.find((a) => a._id === aulaSeleccionada);
    return aula ? aula.capacidad : null;
  }, [aulaSeleccionada, aulas]);

  // Calcular total de beneficiarios
  const totalBeneficiarios = beneficiariosSeleccionados.length;

  // Validar capacidad
  const superaCapacidad = capacidadAula !== null && totalBeneficiarios > capacidadAula;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          height: "95vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          overflow: "hidden",
          mt: 3,
          bgcolor: theme.palette.background.paper,
          border: darkMode ? `1px solid ${alpha(theme.palette.common.white, 0.1)}` : 'none',
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          bgcolor: theme.palette.primary.main, 
          color: theme.palette.primary.contrastText, 
          fontWeight: 600, 
          display: "flex", 
          alignItems: "center", 
          gap: 1,
          borderBottom: `1px solid ${darkMode ? alpha(theme.palette.common.white, 0.1) : theme.palette.divider}`
        }}
      >
        <ScheduleIcon sx={{ mr: 1 }} />
        {editMode ? "Editar Clase" : "Programar nueva clase"}
        <IconButton 
          onClick={onClose} 
          sx={{ 
            position: 'absolute', 
            right: 8, 
            top: 8,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              bgcolor: darkMode ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.1)
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 3,
          pt: 3,
          pb: 0,
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          mt: 3,
          maxHeight: "calc(95vh - 120px)",
          bgcolor: theme.palette.background.default,
        }}
      >
        <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
          {/* Selección de profesor y horarios */}
          <Grid item xs={12} lg={8} sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Seleccionar Profesor</InputLabel>
                <Select
                  value={profesorSeleccionado}
                  onChange={(e) => setProfesorSeleccionado(e.target.value)}
                  label="Seleccionar Profesor"
                  disabled={editMode}
                  sx={{
                    bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.1) : theme.palette.background.paper,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: darkMode ? alpha(theme.palette.common.white, 0.2) : theme.palette.divider,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    }
                  }}
                >
                  {profesores.map((profesor) => (
                    <MenuItem key={profesor.id} value={profesor.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: profesor.color,
                          }}
                        />
                        <PersonIcon sx={{ color: profesor.color, fontSize: 18 }} />
                        <span>{profesor.nombre}</span>
                        <Chip
                          label={profesor.especialidades.join(", ")}
                          size="small"
                          sx={{ ml: 1, bgcolor: alpha(profesor.color, 0.1), color: profesor.color }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {programacionProfesor && (
                <Chip
                  label={`${programacionProfesor.horariosPorDia?.length || 0} días configurados`}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Grilla de horarios */}
            <Paper
              elevation={1}
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {loadingHorarios && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 4,
                    backdropFilter: "blur(3px)",
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <CircularProgress size={50} sx={{ mb: 2, color: "#0455a2" }} />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Cargando horarios disponibles...
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  maxHeight: "550px",
                  ...scrollbarStyles,
                }}
              >
                {timeSlots.length > 0 ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `140px repeat(7, minmax(120px, 1fr))`,
                      minWidth: "1000px",
                      minHeight: `${timeSlots.length * 70 + 60}px`,
                      "& > *": {
                        borderColor: theme.palette.divider,
                      },
                    }}
                  >
                    {/* Header Row */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRight: `2px solid ${theme.palette.primary.main}`,
                        borderBottom: `3px solid ${theme.palette.primary.main}`,
                        fontWeight: "bold",
                        textAlign: "center",
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        position: "sticky",
                        top: 0,
                        left: 0,
                        zIndex: 3,
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      <ScheduleIcon sx={{ mb: 0.5, fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                        Horario
                      </Typography>
                    </Box>
                    {diasSemana.map((dia) => (
                      <Box
                        key={dia}
                        sx={{
                          p: 1.5,
                          borderRight: "1px solid #e0e0e0",
                          borderBottom: "3px solid #0455a2",
                          fontWeight: "bold",
                          textAlign: "center",
                          bgcolor: "#f8f9fa",
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: "#0455a2",
                            fontSize: "0.8rem",
                          }}
                        >
                          {dia}
                        </Typography>
                      </Box>
                    ))}

                    {/* Data Rows */}
                    {timeSlots.map((horarioKey, index) => {
                      const [horaInicio, horaFin] = horarioKey.split("-")
                      const isEvenRow = index % 2 === 0
                      return (
                        <React.Fragment key={horarioKey}>
                          {/* Columna de hora */}
                          <Box
                            sx={{
                              p: 1.5,
                              borderRight: "2px solid #0455a2",
                              borderBottom: "1px solid #e0e0e0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: isEvenRow ? "#f8f9fa" : "#ffffff",
                              position: "sticky",
                              left: 0,
                              zIndex: 1,
                              boxShadow: "1px 0 3px rgba(0,0,0,0.05)",
                              minHeight: 70,
                            }}
                          >
                            <Box sx={{ textAlign: "center" }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: "#0455a2", fontSize: "0.8rem" }}
                              >
                                {horaInicio}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500, fontSize: "0.7rem" }}
                              >
                                {horaFin}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Celdas de días */}
                          {diasSemana.map((dia) => {
                            const horario = horariosGrid[horarioKey]?.[diasCodigo[dia]]
                            const disponible = horario?.disponible || false
                            const esReprogramable = horario?.esReprogramable || false
                            const tipoOcupacion = horario?.tipoOcupacion || "disponible"
                            const selected = disponible && isSlotSelected(dia, horaInicio, horaFin)

                            let cellContent
                            const cellSx = {
                              p: 1,
                              minHeight: 70,
                              borderRight: "1px solid #e0e0e0",
                              borderBottom: "1px solid #e0e0e0",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                              transition: "all 0.2s ease",
                              position: "relative",
                              cursor: "pointer",
                            }

                            if (!profesorSeleccionado) {
                              cellContent = <Skeleton variant="rectangular" width="90%" height={40} />
                              cellSx.bgcolor = isEvenRow ? "#fafbfc" : "#ffffff"
                              cellSx.cursor = "not-allowed"
                            } else if (horario) {
                              if (tipoOcupacion === "disponible") {
                                cellContent = (
                                  <Box sx={{ textAlign: "center", width: "100%" }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: selected ? "#1976d2" : "#4caf50",
                                        fontWeight: "bold",
                                        display: "block",
                                        mb: 0.5,
                                        fontSize: "0.7rem",
                                      }}
                                    >
                                      {selected ? "✓ Seleccionado" : "✓ Disponible"}
                                    </Typography>
                                  </Box>
                                )
                                cellSx.cursor = "pointer"
                                cellSx.bgcolor = selected ? alpha("#1976d2", 0.2) : alpha("#4caf50", 0.1)
                                cellSx["&:hover"] = {
                                  bgcolor: selected ? alpha("#1976d2", 0.3) : alpha("#4caf50", 0.2),
                                  transform: "scale(1.02)",
                                }
                                if (selected) {
                                  cellSx.border = "2px solid #1976d2"
                                }
                              } else if (tipoOcupacion === "reprogramable") {
                                cellContent = (
                                  <Box sx={{ textAlign: "center", width: "100%", gap: 0.5 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#ff9800",
                                        fontWeight: "bold",
                                        display: "block",
                                        mb: 0.5,
                                        fontSize: "0.65rem",
                                      }}
                                    >
                                      ⚠️ Cancelada
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{
                                        fontSize: "0.6rem",
                                        py: 0.2,
                                        px: 0.5,
                                        minWidth: "auto",
                                        bgcolor: "#ff9800",
                                        "&:hover": { bgcolor: "#f57c00" },
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReprogramarClase(horario.claseId, diasCodigo[dia], horaInicio, horaFin)
                                      }}
                                    >
                                      Reprogramar
                                    </Button>
                                  </Box>
                                )
                                cellSx.cursor = "default"
                                cellSx.bgcolor = alpha("#ff9800", 0.1)
                                cellSx["&:hover"] = {
                                  bgcolor: alpha("#ff9800", 0.15),
                                }
                              } else {
                                // ocupado
                                cellContent = (
                                  <Box sx={{ textAlign: "center", width: "100%" }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#f44336",
                                        fontWeight: "bold",
                                        display: "block",
                                        mb: 0.5,
                                        fontSize: "0.7rem",
                                      }}
                                    >
                                      ✗ Ocupado
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#f44336", fontSize: "0.6rem" }}>
                                      {horario.ocupadoPor}
                                    </Typography>
                                  </Box>
                                )
                                cellSx.cursor = "not-allowed"
                                cellSx.bgcolor = alpha("#f44336", 0.1)
                                cellSx["&:hover"] = {
                                  bgcolor: alpha("#f44336", 0.15),
                                }
                              }
                            } else {
                              cellContent = (
                                <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.7rem" }}>
                                  No programado
                                </Typography>
                              )
                              cellSx.bgcolor = isEvenRow ? alpha("#bdbdbd", 0.05) : alpha("#bdbdbd", 0.02)
                              cellSx.cursor = "not-allowed"
                            }

                            return (
                              <Box
                                key={`${horarioKey}-${dia}`}
                                onClick={() => {
                                  if (editMode) return // Desactivar selección de horario en modo edición
                                  profesorSeleccionado &&
                                    horario &&
                                    disponible &&
                                    handleSlotClick(diasCodigo[dia], horaInicio, horaFin, disponible)
                                }}
                                sx={{
                                  p: 1,
                                  minHeight: 70,
                                  borderRight: `1px solid ${theme.palette.divider}`,
                                  borderBottom: `1px solid ${theme.palette.divider}`,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  textAlign: "center",
                                  transition: "all 0.2s ease",
                                  position: "relative",
                                  cursor: disponible ? "pointer" : "not-allowed",
                                  bgcolor: selected 
                                    ? alpha(theme.palette.primary.main, darkMode ? 0.3 : 0.2)
                                    : isEvenRow 
                                      ? alpha(theme.palette.background.default, darkMode ? 0.2 : 0.5) 
                                      : theme.palette.background.paper,
                                  "&:hover": disponible && {
                                    bgcolor: selected 
                                      ? alpha(theme.palette.primary.main, darkMode ? 0.4 : 0.3)
                                      : alpha(theme.palette.primary.main, darkMode ? 0.2 : 0.1),
                                    transform: "scale(1.02)",
                                  },
                                  ...(selected && {
                                    border: `2px solid ${theme.palette.primary.main}`,
                                  }),
                                }}
                              >
                                {cellContent}
                              </Box>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </Box>
                ) : (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary">
                      {profesorSeleccionado
                        ? "No hay horarios disponibles para este profesor"
                        : "Seleccione un profesor para ver los horarios disponibles"}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Panel de detalles */}
          <Grid item xs={12} lg={4} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <InfoIcon color="primary" />
              Detalles de la clase
            </Typography>

            {selectedSlot ? (
              <Card
                elevation={1}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  minHeight: 0,
                  maxHeight: "calc(95vh - 200px)",
                }}
              >
                <CardContent
                  sx={{
                    flex: 1,
                    overflow: "auto",
                    ...scrollbarStyles,
                    p: 2,
                  }}
                >
                  {/* Horario seleccionado */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      📅 Horario seleccionado
                    </Typography>
                    <Chip
                      label={`${codigoDias[selectedSlot.dia]} ${selectedSlot.horaInicio} - ${selectedSlot.horaFin}`}
                      color="primary"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Selección de especialidad */}
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Especialidad</InputLabel>
                    <Select
                      value={especialidadSeleccionada}
                      onChange={(e) => {
                        setEspecialidadSeleccionada(e.target.value);
                        // Limpiar beneficiarios seleccionados al cambiar la especialidad
                        if (!editMode) {
                          setBeneficiariosSeleccionados([]);
                        }
                      }}
                      label="Especialidad"
                      disabled={editMode} // Desactivar en modo edición
                    >
                      {programacionProfesor?.profesor?.especialidades?.map((esp) => (
                        <MenuItem key={esp} value={esp}>
                          {esp}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Divider sx={{ my: 2 }} />

                  {/* Select de Aula */}
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Aula</InputLabel>
                    <Select
                      value={aulaSeleccionada}
                      onChange={(e) => setAulaSeleccionada(e.target.value)}
                      label="Aula"
                      disabled={editMode}
                      startAdornment={<SchoolIcon sx={{ mr: 1 }} />}
                    >
                      {/* Mostrar el aula asignada aunque no esté activa */}
                      {editMode && claseAEditar?.original?.aula && !aulas.some(a => a._id === claseAEditar.original.aula._id) && (
                        <MenuItem key={claseAEditar.original.aula._id} value={claseAEditar.original.aula._id}>
                          Aula {claseAEditar.original.aula.numeroAula} (Capacidad: {claseAEditar.original.aula.capacidad})
                          {" - (Inactiva)"}
                        </MenuItem>
                      )}
                      {aulas.map((aula) => {
                        // Deshabilitar si el aula está ocupada en el horario seleccionado
                        // ✅ ACTUALIZADO: Excluir también clases "ejecutada" para permitir reutilización del aula
                        const ocupada = clasesExistentes.some(
                          (clase) =>
                            clase.aula &&
                            clase.aula._id === aula._id &&
                            clase.dia === selectedSlot?.dia &&
                            clase.horaInicio === selectedSlot?.horaInicio &&
                            clase.horaFin === selectedSlot?.horaFin &&
                            clase.estado !== "reprogramada" &&
                            clase.estado !== "cancelada" &&
                            clase.estado !== "ejecutada" && // ✅ NUEVO: Excluir clases ejecutadas
                            (!editMode || clase._id !== claseAEditar?.id)
                        )
                        return (
                          <MenuItem key={aula._id} value={aula._id} disabled={ocupada}>
                            Aula {aula.numeroAula} (Capacidad: {aula.capacidad})
                            {ocupada && " - Ocupada"}
                          </MenuItem>
                        )
                      })}
                    </Select>
                  </FormControl>

                  <Divider sx={{ my: 2 }} />

                  {/* Selección de beneficiarios */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      👥 Beneficiarios
                    </Typography>
                    <Autocomplete
                      multiple
                      options={beneficiariosFiltrados}
                      value={beneficiariosSeleccionados}
                      isOptionEqualToValue={(option, value) => (option._id || option) === (value._id || value)}
                      onChange={(event, newValue) => setBeneficiariosSeleccionados(newValue)}
                      getOptionLabel={(option) => 
                        `${option.beneficiarioId?.nombre || ''} ${option.beneficiarioId?.apellido || ''} - ${option.codigoVenta || ''}`
                      }
                      filterOptions={(options, { inputValue }) => {
                        const searchTerms = inputValue.toLowerCase().split(' ');
                        return options.filter(option => {
                          const fullName = `${option.beneficiarioId?.nombre || ''} ${option.beneficiarioId?.apellido || ''}`.toLowerCase();
                          const codigo = option.codigoVenta?.toLowerCase() || '';
                          return searchTerms.every(term => 
                            fullName.includes(term) || codigo.includes(term)
                          );
                        });
                      }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Buscar beneficiarios por nombre o código"
                          size="small" 
                          fullWidth 
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.1) : theme.palette.background.paper,
                              '& fieldset': {
                                borderColor: darkMode ? alpha(theme.palette.common.white, 0.2) : theme.palette.divider,
                              },
                              '&:hover fieldset': {
                                borderColor: theme.palette.primary.main,
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: theme.palette.primary.main,
                              }
                            }
                          }}
                          helperText={
                            !especialidadSeleccionada 
                              ? "Selecciona una especialidad primero"
                              : beneficiariosFiltrados.length === 0
                                ? `No hay beneficiarios disponibles para ${especialidadSeleccionada}`
                                : `${beneficiariosFiltrados.length} beneficiario(s) disponible(s) para ${especialidadSeleccionada}`
                          }
                        />
                      )}
                      disabled={!especialidadSeleccionada}
                      renderOption={(props, option) => (
                        <Box 
                          component="li" 
                          {...props} 
                          sx={{ 
                            '&:hover': { bgcolor: 'action.hover' },
                            cursor: 'pointer',
                            py: 1
                          }}
                        >
                          <PersonIcon sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                              {`${option.beneficiarioId?.nombre || 'Sin nombre'} ${option.beneficiarioId?.apellido || 'Sin apellido'}`}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              Código: {option.codigoVenta} | Curso: {(option.cursoId && typeof option.cursoId === "object") ? (option.cursoId.nombre || 'Sin curso') : 'Sin curso'}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      noOptionsText={
                        !especialidadSeleccionada 
                          ? "Selecciona una especialidad primero"
                          : "No se encontraron beneficiarios"
                      }
                    />

                    {/* Mejorar la lista de beneficiarios seleccionados */}
                    <List dense sx={{ mt: 2 }}>
                      {beneficiariosSeleccionados.map((b, idx) => (
                        b && b.beneficiarioId ? (
                          <ListItem 
                            key={b._id || idx} 
                            sx={{ 
                              py: 1,
                              bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.1) : theme.palette.background.paper,
                              borderRadius: 1,
                              mb: 0.5,
                              border: '1px solid',
                              borderColor: darkMode ? alpha(theme.palette.common.white, 0.1) : theme.palette.divider,
                              '&:hover': {
                                bgcolor: darkMode ? alpha(theme.palette.action.hover, 0.2) : theme.palette.action.hover,
                                borderColor: theme.palette.primary.main,
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <PersonIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                  {`${b.beneficiarioId.nombre || 'Sin nombre'} ${b.beneficiarioId.apellido || 'Sin apellido'}`}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {`${b.codigoVenta} | ${(b.cursoId && typeof b.cursoId === "object") ? (b.cursoId.nombre || 'Sin curso') : 'Sin curso'} | ${b.numero_de_clases || 0} clases`}
                                </Typography>
                              }
                            />
                            <IconButton 
                              edge="end" 
                              aria-label="delete" 
                              onClick={() => handleRemoveBeneficiario(b._id)}
                              size="small"
                              sx={{ 
                                color: 'error.main',
                                '&:hover': {
                                  bgcolor: 'error.light',
                                  color: 'error.dark',
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItem>
                        ) : null
                      ))}
                      {beneficiariosSeleccionados.length === 0 && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            textAlign: 'center', 
                            color: 'text.secondary',
                            py: 2,
                            bgcolor: 'action.hover',
                            borderRadius: 1
                          }}
                        >
                          No hay beneficiarios seleccionados
                        </Typography>
                      )}
                    </List>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Observaciones */}
                  <TextField
                    label="Observaciones (Opcional)"
                    multiline
                    rows={3}
                    fullWidth
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    sx={{ 
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.1) : theme.palette.background.paper,
                        '& fieldset': {
                          borderColor: darkMode ? alpha(theme.palette.common.white, 0.2) : theme.palette.divider,
                        },
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: theme.palette.primary.main,
                        }
                      }
                    }}
                  />

                  {/* Info del profesor */}
                  {programacionProfesor?.profesor && (
                    <Box sx={{ mt: 2, p: 2, 
                      bgcolor: darkMode 
                        ? alpha(theme.palette.primary.main, 0.15) 
                        : alpha("#0455a2", 0.05), 
                      borderRadius: 1,
                      border: darkMode ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                    }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <InfoIcon fontSize="small" color="info" />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Información del profesor
                        </Typography>
                      </Box>
                      <Typography variant="caption" display="block">
                        👨‍🏫 {programacionProfesor.profesor?.nombres || ''} {programacionProfesor.profesor?.apellidos || ''}
                      </Typography>
                      <Typography variant="caption" display="block">
                        🎯 Especialidades: {programacionProfesor.profesor?.especialidades?.join(", ") || 'No especificadas'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        📅 Horarios configurados: {programacionProfesor.horariosPorDia?.length || 0} días
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ mt: 2 }}>
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <ScheduleIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {profesorSeleccionado
                      ? "Seleccione un horario disponible en la cuadrícula"
                      : "Seleccione un profesor para ver los horarios disponibles"}
                  </Typography>
                  {profesorSeleccionado && (
                    <Typography variant="caption" color="text.secondary">
                      Nota: Solo se muestran beneficiarios de ventas tipo "curso"
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${darkMode ? alpha(theme.palette.common.white, 0.1) : theme.palette.divider}`,
          flexShrink: 0,
          gap: 2,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Button
          onClick={onClose}
          color="secondary"
          sx={{
            textTransform: "none",
            px: 3,
            py: 1,
          }}
        >
          Cancelar
        </Button>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Button
            onClick={async () => {
              if (isSubmitting) return;
              setIsSubmitting(true);
              try {
                await handleSubmit();
              } finally {
                setIsSubmitting(false);
              }
            }}
            variant="contained"
            disabled={!canSubmit || superaCapacidad || isSubmitting}
            sx={{
              bgcolor: "#0455a2",
              "&:hover": {
                bgcolor: "#034589",
              },
              textTransform: "none",
              px: 3,
              py: 1,
              fontWeight: 600,
            }}
          >
            {editMode ? "Guardar Cambios" : "Programar Clase"}
          </Button>
          {isSubmitting && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>
      </DialogActions>
      {/* Advertencia de capacidad */}
      {superaCapacidad && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
            La cantidad de beneficiarios supera la capacidad máxima del aula seleccionada ({capacidadAula}).
          </Typography>
        </Box>
      )}
    </Dialog>
  )
}
