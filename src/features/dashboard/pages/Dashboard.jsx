"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import { alpha } from "@mui/material"
import { Badge } from "@mui/material"
import { useAuth } from "../../../features/auth/context/AuthContext"
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Event as EventIcon,
  MusicNote as MusicNoteIcon,
  AccessTime as AccessTimeIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import axios from "axios"
import { API_CONFIG } from '../../../shared/config/api.config'

// Utilidades
const API_BASE = API_CONFIG.BASE_URL
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const dayToLetter = (dayIndex) => {
  return ["D", "L", "M", "X", "J", "V", "S"][dayIndex]
}

const letterToDayName = (letter) => {
  const map = { D: "Domingo", L: "Lunes", M: "Martes", X: "Miércoles", J: "Jueves", V: "Viernes", S: "Sábado" }
  return map[letter] || letter
}

// Color por especialidad (paleta compañía)
const getClassColor = (especialidad) => {
  const colors = [
    "#0455a2", // primary
    "#6c8221",
    "#5c6bc0",
    "#26a69a",
    "#ec407a",
    "#0288d1",
    "#7cb342",
  ]
  if (!especialidad) return colors[0]
  let hash = 0
  for (let i = 0; i < especialidad.length; i++) {
    hash = especialidad.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % colors.length
  return colors[idx]
}

// Colores para los gráficos
const COLORS = ["#0455a2", "#6c8221", "#5c6bc0", "#26a69a", "#ec407a"]

const Dashboard = () => {
  const theme = useTheme()
  const { user } = useAuth?.() || { user: null }
  const [loading, setLoading] = useState(true)
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState("all")
  
  // Datos crudos
  const [pagos, setPagos] = useState([])
  const [ventas, setVentas] = useState([])
  const [programaciones, setProgramaciones] = useState([])
  const [programacionesProfesores, setProgramacionesProfesores] = useState([])

  // Carga paralela de datos necesarios
  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token') || user?.token
        const authConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        const [pagosRes, ventasRes, progsRes, progsProfRes] = await Promise.all([
          axios.get(`${API_BASE}/pagos`, authConfig).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/ventas`, authConfig).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/programacion_de_clases`, authConfig).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/programacion_de_profesores`, authConfig).catch(() => ({ data: [] })),
        ])

        if (cancelled) return

        const pagosData = pagosRes?.data?.data || pagosRes?.data || []
        setPagos(Array.isArray(pagosData) ? pagosData : [])
        setVentas(Array.isArray(ventasRes?.data) ? ventasRes.data : [])
        setProgramaciones(Array.isArray(progsRes?.data) ? progsRes.data : [])
        setProgramacionesProfesores(Array.isArray(progsProfRes?.data) ? progsProfRes.data : [])
      } catch (e) {
        setPagos([])
        setVentas([])
        setProgramaciones([])
        setProgramacionesProfesores([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])
  
  // Años disponibles a partir de pagos y ventas
  const availableYears = useMemo(() => {
    const years = new Set()
    // Derivados de datos
    pagos.forEach((p) => {
      const d = p.fechaPago ? new Date(p.fechaPago) : (p.createdAt ? new Date(p.createdAt) : null)
      if (d) years.add(d.getFullYear())
    })
    ventas.forEach((v) => {
      const d = v.fechaInicio ? new Date(v.fechaInicio) : (v.createdAt ? new Date(v.createdAt) : null)
      if (d) years.add(d.getFullYear())
    })
    programaciones.forEach((pr) => {
      const d = pr.createdAt ? new Date(pr.createdAt) : null
      if (d) years.add(d.getFullYear())
    })
    // Asegurar al menos los últimos 5 años
    for (let y = currentYear; y >= currentYear - 4; y -= 1) {
      years.add(y)
    }
    const list = Array.from(years)
    return list.sort((a, b) => b - a)
  }, [pagos, ventas, programaciones, currentYear])
  
  const availableMonths = useMemo(() => {
    return [{ value: "all", label: "Todos los meses" }, ...MONTHS.map((m) => ({ value: m, label: m }))]
  }, [])
  
  // Profesores con más estudiantes (conteo de beneficiarios en programaciones)
  const profesoresRanking = useMemo(() => {
    const byProfesor = new Map()
    for (const prog of programaciones) {
      // Filtrar por año/mes usando createdAt
      const d = prog.createdAt ? new Date(prog.createdAt) : null
      if (!d || d.getFullYear() !== selectedYear) continue
      if (selectedMonth !== "all") {
        const monthName = MONTHS[d.getMonth()]
        if (monthName !== selectedMonth) continue
      }
      // Considerar solo programaciones activas
      if (prog.estado && prog.estado !== "programada") continue
      const prof = prog?.programacionProfesor?.profesor
      if (!prof) continue
      const profesorId = prof._id
      const profesorNombre = [prof.nombres, prof.apellidos].filter(Boolean).join(" ") || "Profesor"
      const especialidad = Array.isArray(prof.especialidades) && prof.especialidades.length > 0 ? prof.especialidades[0] : "General"
      const beneficiariosCount = Array.isArray(prog?.beneficiarios) ? prog.beneficiarios.length : 0
      const prev = byProfesor.get(profesorId) || { id: profesorId, nombre: profesorNombre, especialidad, estudiantes: 0 }
      prev.estudiantes += beneficiariosCount
      byProfesor.set(profesorId, prev)
    }
    const list = Array.from(byProfesor.values()).sort((a, b) => b.estudiantes - a.estudiantes)
    return list.map((p, idx) => ({ id: idx + 1, ...p }))
  }, [programaciones, selectedYear, selectedMonth])

  // Top cursos e ingresos por curso (a partir de ventas)
  const cursosAggreg = useMemo(() => {
    const byCurso = new Map()
    for (const v of ventas) {
      if (v?.tipo !== "curso") continue
      if (v?.estado === "anulada") continue
      const d = v.fechaInicio ? new Date(v.fechaInicio) : (v.createdAt ? new Date(v.createdAt) : null)
      if (!d) continue
      if (d.getFullYear() !== selectedYear) continue
    if (selectedMonth !== "all") {
        const monthName = MONTHS[d.getMonth()]
        if (monthName !== selectedMonth) continue
      }
      const nombreCurso = typeof v.cursoId === "object" && v.cursoId?.nombre ? v.cursoId.nombre : "Curso"
      const key = v.cursoId?._id || nombreCurso
      const prev = byCurso.get(key) || { id: key, nombre: nombreCurso, estudiantes: 0, ingresos: 0 }
      prev.estudiantes += 1
      prev.ingresos += Number(v.valor_total || 0)
      byCurso.set(key, prev)
    }
    const list = Array.from(byCurso.values()).sort((a, b) => b.estudiantes - a.estudiantes).slice(0, 5)
    return list.map((c, idx) => ({ id: idx + 1, ...c }))
  }, [ventas, selectedYear, selectedMonth])

  // Desertores por mes: usar ventas anuladas como proxy
  const desertoresPorMes = useMemo(() => {
    const counts = Array(12).fill(0)
    for (const v of ventas) {
      if (v?.estado !== "anulada") continue
      const d = v.fechaInicio ? new Date(v.fechaInicio) : (v.createdAt ? new Date(v.createdAt) : null)
      if (!d) continue
      if (d.getFullYear() !== selectedYear) continue
      counts[d.getMonth()] += 1
    }
    const data = counts.map((cantidad, idx) => ({ mes: MONTHS[idx], cantidad, year: selectedYear }))
    return data
  }, [ventas, selectedYear])

  // Ingresos por mes desde ventas de cursos
  const ingresosPorMes = useMemo(() => {
    const sums = Array(12).fill(0)
    for (const v of ventas) {
      // Solo considerar ventas de tipo curso y que no estén anuladas
      if (v?.tipo !== "curso") continue
      if (v?.estado === "anulada") continue
      
      // Determinar la fecha a usar para el filtro
      const d = v.fechaInicio ? new Date(v.fechaInicio) : (v.createdAt ? new Date(v.createdAt) : null)
      if (!d) continue
      if (d.getFullYear() !== selectedYear) continue
      
      // Sumar el valor total al mes correspondiente
      sums[d.getMonth()] += Number(v.valor_total || 0)
    }
    const data = sums.map((ingresos, idx) => ({ mes: MONTHS[idx], ingresos, year: selectedYear }))
    return data
  }, [ventas, selectedYear])

  // Clases activas del día (mismo criterio que ProgramacionClases)
  const clasesActivas = useMemo(() => {
    const todayLetter = dayToLetter(new Date().getDay())
    const list = programaciones
      .filter((p) => {
        // Solo programadas del día actual
        if (p.estado && p.estado !== "programada") return false
        if (p.dia && p.dia !== todayLetter) return false
        // Evitar entradas incompletas
        if (!p.especialidad || !p.horaInicio || !p.horaFin) return false
        // Requerir profesor poblado como en ProgramacionClases
        if (!p?.programacionProfesor?.profesor) return false
        // Requerir al menos un beneficiario
        if (!Array.isArray(p?.beneficiarios) || p.beneficiarios.length === 0) return false
        // Filtro de seguridad por rol, igual a ProgramacionClases
        if (user?.role === 'profesor') {
          const prof = p?.programacionProfesor?.profesor
          const profesorEmail = prof?.email || prof?.correo
          if (profesorEmail && user?.email && profesorEmail !== user.email) return false
        }
        return true
      })
      .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
      .map((p, idx) => {
        // Profesor está poblado (requerido por filtro)
        const prof = p?.programacionProfesor?.profesor
        const profesorNombre = [prof?.nombres, prof?.apellidos].filter(Boolean).join(" ") || "Profesor"
        const cursoNombre = Array.isArray(p?.beneficiarios) && p.beneficiarios[0]?.cursoId?.nombre
          ? p.beneficiarios[0].cursoId.nombre
          : p.especialidad || "Curso"
        const aulaNombre = p?.aula?.numeroAula || p?.aula?._id || "-"
        return {
          id: p._id || idx,
          horaInicio: p.horaInicio || "",
          horaFin: p.horaFin || "",
          curso: cursoNombre,
          profesor: profesorNombre,
          aula: aulaNombre,
          dia: p.dia || null,
          estudiantes: Array.isArray(p?.beneficiarios) ? p.beneficiarios.length : 0,
          especialidad: p.especialidad || null,
        }
      })
    return list
  }, [programaciones, user])

  // Filtros y totales
  const filteredDesertores = useMemo(() => {
    if (selectedMonth === "all") return desertoresPorMes
    return desertoresPorMes.filter((d) => d.mes === selectedMonth)
  }, [desertoresPorMes, selectedMonth])

  const filteredIngresos = useMemo(() => {
    if (selectedMonth === "all") return ingresosPorMes
    return ingresosPorMes.filter((d) => d.mes === selectedMonth)
  }, [ingresosPorMes, selectedMonth])

  const totalDesertores = filteredDesertores.reduce((sum, item) => sum + (item.cantidad || 0), 0)
  const totalIngresos = filteredIngresos.reduce((sum, item) => sum + (item.ingresos || 0), 0)

  return (
    <Box sx={{ p: 3 }}>
      {/* Update header to include month filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Mes</InputLabel>
            <Select
              value={selectedMonth}
              label="Mes"
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(month => (
                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear}
              label="Año"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Profesores con más estudiantes */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Profesores con más estudiantes {selectedMonth !== "all" ? `(${selectedMonth} ${selectedYear})` : `(${selectedYear})`}
              </Typography>
            </Box>
            <List sx={{ flexGrow: 1 }}>
              {profesoresRanking.map((profesor) => (
                <ListItem
                  key={profesor.id}
                  sx={{
                    px: 0,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getClassColor(profesor.especialidad) }}>
                      {profesor.imagen ? (
                        <img src={profesor.imagen || "/placeholder.svg"} alt={profesor.nombre} />
                      ) : (
                        profesor.nombre.charAt(0)
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={profesor.nombre}
                    secondary={profesor.especialidad}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                  <Chip
                    label={`${profesor.estudiantes} estudiantes`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(4, 85, 162, 0.1)",
                      color: "#0455a2",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top 5 cursos más solicitados */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Top 5 cursos más solicitados {selectedMonth !== "all" ? `(${selectedMonth} ${selectedYear})` : `(${selectedYear})`}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              <TableContainer sx={{ flexGrow: 1 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Curso</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        Estudiantes
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Ingresos
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cursosAggreg.map((curso) => (
                      <TableRow key={curso.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <MusicNoteIcon sx={{ mr: 1, color: COLORS[curso.id % COLORS.length] }} />
                            {curso.nombre}
                          </Box>
                        </TableCell>
                        <TableCell align="center">{curso.estudiantes}</TableCell>
                        <TableCell align="right">${curso.ingresos.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 3, height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cursosAggreg} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      tick={{ fontSize: 10 }} 
                      label={{ value: 'Cursos', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Número de Estudiantes', angle: -90, position: 'insideLeft', offset: -5 }}
                    />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="estudiantes" name="Estudiantes" fill="#0455a2" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Reporte de estudiantes desertores */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Estudiantes desertores
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Avatar sx={{ bgcolor: "#ef5350", width: 56, height: 56, mr: 2 }}>
                <TrendingDownIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {totalDesertores}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de desertores en {selectedYear}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredDesertores} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="mes" 
                    label={{ value: 'Mes', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', offset: -5 }}
                  />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="cantidad" name="Desertores" stroke="#ef5350" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Ingresos de cursos por mes */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Ingresos de cursos por mes {selectedMonth !== "all" ? `(${selectedMonth} ${selectedYear})` : `(${selectedYear})`}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Avatar sx={{ bgcolor: "#6c8221", width: 56, height: 56, mr: 2 }}>
                <TrendingUpIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  ${totalIngresos.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ingresos totales en {selectedYear}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredIngresos} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="mes" 
                    label={{ value: 'Mes', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Ingresos ($)', angle: -90, position: 'insideLeft', offset: -5 }}
                  />
                  <RechartsTooltip formatter={(value) => [`$${value.toLocaleString()}`, "Ingresos"]} />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#6c8221" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Clases activas */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Clases activas
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <EventIcon sx={{ mr: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date().toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>
              </Box>
            </Box>
            <List sx={{ p: 0 }}>
              {clasesActivas.map((clase) => (
                <ListItem key={clase.id} sx={{ px: 0, py: 1.2, borderBottom: "1px solid rgba(0,0,0,0.06)", alignItems: "stretch" }}>
                  <Box sx={{ display: "flex", alignItems: "stretch", width: "100%", gap: 2 }}>
                        <Chip
                      icon={<AccessTimeIcon />}
                      label={`${clase.horaInicio || ""}${clase.horaFin ? ` - ${clase.horaFin}` : ""}`}
                          size="small"
                      sx={{ minWidth: 130, bgcolor: alpha("#0455a2", 0.08), color: "#0455a2", alignSelf: "center" }}
                    />
                    <Paper
                      elevation={0}
                      sx={{
                        flexGrow: 1,
                        p: 1.2,
                        bgcolor: alpha(getClassColor(clase.especialidad), 0.08),
                        borderLeft: `4px solid ${getClassColor(clase.especialidad)}`,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
                        {clase.curso}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <PersonIcon fontSize="inherit" />
                          {clase.profesor}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <AssignmentIcon fontSize="inherit" />
                          Aula: {clase.aula}
                        </Typography>
                        {clase.dia && (
                          <Typography variant="caption">{letterToDayName(clase.dia)}</Typography>
                        )}
                        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <GroupIcon fontSize="inherit" />
                          <Badge
                            badgeContent={clase.estudiantes}
                            color="primary"
                            sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}
                          >
                            <span style={{ fontSize: "0.75rem" }}>Estudiantes</span>
                          </Badge>
                        </Typography>
                      </Box>
                    </Paper>
                    <Chip label="Activa" size="small" color="primary" variant="outlined" sx={{ alignSelf: "center" }} />
                  </Box>
                </ListItem>
              ))}
              {clasesActivas.length === 0 && (
                <Typography variant="body2" color="text.secondary">No hay clases activas en el periodo seleccionado.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard

