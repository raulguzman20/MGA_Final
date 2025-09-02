"use client"

import { useState, useEffect, useMemo } from "react"
import { Box, Paper, Alert, Snackbar, Chip } from "@mui/material"
import { GenericList } from "../../../shared/components/GenericList"
import { DetailModal } from "../../../shared/components/DetailModal"
import { StatusButton } from "../../../shared/components/StatusButton"
import axios from "axios"
import moment from "moment"
import "moment/locale/es"

moment.locale("es")

const ESTADOS_VALIDOS = {
  asistio: { label: "Asistió", color: "success" },
  no_asistio: { label: "No Asistió", color: "error" }
}

const Asistencia = () => {
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAsistencia, setSelectedAsistencia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [asistencias, setAsistencias] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const asistenciasResponse = await axios.get("http://localhost:3000/api/asistencias")
        setAsistencias(asistenciasResponse.data)
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error al cargar los datos",
          severity: "error"
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Agrupar asistencias por curso, profesor, beneficiario y horario
  const asistenciasAgrupadas = useMemo(() => {
    const grupos = {}
    asistencias.forEach(asistencia => {
      if (!asistencia.ventaId || !asistencia.programacionClaseId) return
      const ventaId = asistencia.ventaId._id
      const beneficiarioId = asistencia.ventaId.beneficiarioId?._id
      const cursoId = asistencia.ventaId.cursoId?._id || asistencia.ventaId.cursoId
      const profesorId = asistencia.programacionClaseId.programacionProfesor?.profesor?._id
      const horaInicio = asistencia.programacionClaseId.horaInicio
      const horaFin = asistencia.programacionClaseId.horaFin
      // Crear clave única para agrupar
      const clave = `${ventaId}-${beneficiarioId}-${cursoId}-${profesorId}-${horaInicio}-${horaFin}`
      if (!grupos[clave]) {
        grupos[clave] = {
          ventaId: asistencia.ventaId,
          beneficiario: asistencia.ventaId.beneficiarioId,
          curso: asistencia.ventaId.cursoId,
          profesor: asistencia.programacionClaseId.programacionProfesor?.profesor,
          horaInicio,
          horaFin,
          especialidad: asistencia.programacionClaseId.especialidad,
          asistencias: []
        }
      }
      grupos[clave].asistencias.push(asistencia)
    })
    return Object.values(grupos)
  }, [asistencias])

  const renderEstado = (value) => {
    const estado = ESTADOS_VALIDOS[value]
    return estado ? <StatusButton status={value} label={estado.label} color={estado.color} /> : value
  }

  const columns = [
    {
      id: "beneficiario",
      label: "Beneficiario",
      render: (value, row) => {
        if (!row.beneficiario) return "Sin beneficiario"
        return `${row.beneficiario.nombre || ''} ${row.beneficiario.apellido || ''}`.trim() || "Sin nombre"
      }
    },
    {
      id: "curso",
      label: "Curso",
      render: (value, row) => {
        if (!row.curso) return "-"
        return typeof row.curso === 'object' ? row.curso.nombre : row.curso
      }
    },
    {
      id: "profesor",
      label: "Profesor",
      render: (value, row) => {
        if (!row.profesor) return "Sin profesor"
        return `${row.profesor.nombres || ''} ${row.profesor.apellidos || ''}`.trim() || "Sin nombre"
      }
    },
    {
      id: "horario",
      label: "Horario",
      render: (value, row) => `${row.horaInicio} - ${row.horaFin}`
    },
    {
      id: "asistidas",
      label: "Asistidas",
      render: (value, row) => {
        const asistidas = row.asistencias.filter(a => a.estado === 'asistio').length
        return <Chip label={asistidas} color="success" size="small" />
      }
    },
    {
      id: "faltas",
      label: "Faltas",
      render: (value, row) => {
        const faltas = row.asistencias.filter(a => a.estado === 'no_asistio').length
        return <Chip label={faltas} color="error" size="small" />
      }
    }
  ]

  const detailFields = [
    {
      id: "beneficiario",
      label: "Beneficiario",
      render: (value, row) => {
        if (!row.beneficiario) return "Sin beneficiario"
        return `${row.beneficiario.nombre || ''} ${row.beneficiario.apellido || ''}`.trim() || "Sin nombre"
      }
    },
    {
      id: "codigoVenta",
      label: "Código Venta",
      render: (value, row) => row.ventaId?.codigoVenta || "-"
    },
    {
      id: "curso",
      label: "Curso",
      render: (value, row) => {
        if (!row.curso) return "-"
        return typeof row.curso === 'object' ? row.curso.nombre : row.curso
      }
    },
    {
      id: "profesor",
      label: "Profesor",
      render: (value, row) => {
        if (!row.profesor) return "Sin profesor"
        return `${row.profesor.nombres || ''} ${row.profesor.apellidos || ''}`.trim() || "Sin nombre"
      }
    },
    {
      id: "horario",
      label: "Horario",
      render: (value, row) => `${row.horaInicio} - ${row.horaFin}`
    },
    {
      id: "especialidad",
      label: "Especialidad",
      render: (value, row) => row.especialidad || "-"
    },
    {
      id: "historial",
      label: "Historial de Asistencias",
      render: (value, row) => {
        if (row.asistencias.length === 0) return "Sin registros"
        const asistenciasOrdenadas = row.asistencias
          .sort((a, b) => new Date(b.programacionClaseId?.fecha || b.createdAt) - new Date(a.programacionClaseId?.fecha || a.createdAt))
        return (
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {asistenciasOrdenadas.map((asistencia, index) => {
              const fecha = asistencia.programacionClaseId?.fecha || asistencia.createdAt
              return (
                <Box key={index} sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  mb: 0.5,
                  border: 1,
                  borderRadius: 1,
                  bgcolor: asistencia.estado === 'asistio' ? '#f1f8e9' : '#ffebee'
                }}>
                  <span>{fecha ? moment(fecha).format("DD/MM/YYYY") : "-"}</span>
                  {renderEstado(asistencia.estado)}
                  {asistencia.motivo && (
                    <span style={{ fontSize: 12, color: '#888' }}>Motivo: {asistencia.motivo}</span>
                  )}
                </Box>
              )
            })}
          </Box>
        )
      }
    }
  ]

  const handleViewAsistencia = (grupo) => {
    setSelectedAsistencia(grupo)
    setDetailModalOpen(true)
  }

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <GenericList
          data={asistenciasAgrupadas}
          columns={columns}
          onView={handleViewAsistencia}
          title="Asistencias Agrupadas"
          showActions={false}
          showViewButton={true}
        />
      </Paper>

      <DetailModal
        title="Detalle de Asistencia"
        data={selectedAsistencia}
        fields={detailFields}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Asistencia
