"use client"


import { useState, useEffect } from "react"
import {
  Dialog,
  Checkbox,
  FormControlLabel,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
  Avatar,
  Divider,
  Autocomplete,
  CircularProgress,
} from "@mui/material"
import { green } from "@mui/material/colors"
import {
  Person as PersonIcon,
  School as SchoolIcon,
  EventNote as EventNoteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  AttachMoney as AttachMoneyIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material"


export const VentaMatriculasForm = ({
  open,
  onClose,
  onSubmit,
  isEditing,
  clientes,
  beneficiarios,
  matriculas,
  cursosDisponibles,
  setClientes,
  setBeneficiarios,
  initialData = null,
  ventasOriginales = [],
}) => {
  const [clienteEsBeneficiario, setClienteEsBeneficiario] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [transition, setTransition] = useState("slideLeft")
  const [alertMessage, setAlertMessage] = useState({ show: false, message: "", severity: "info" })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedBeneficiario, setSelectedBeneficiario] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)


  // Definir los pasos del formulario - Matrícula siempre primero
  const getSteps = () => {
    if (showCreateForm) {
      return ["Datos de la Matrícula", "Datos del Cliente", "Datos del Beneficiario", "Datos del Curso"]
    } else {
      return ["Datos de la Matrícula", "Datos del Curso"]
    }
  }


  const steps = getSteps()


  // Estados para los datos del formulario
  const [clienteData, setClienteData] = useState({
    id: null,
    nombre: "",
    apellido: "",
    tipoDocumento: "",
    numeroDocumento: "",
    fechaNacimiento: "",
    age: "",
    direccion: "",
    telefono: "",
    estado: true,
  })


  const [beneficiarioData, setBeneficiarioData] = useState({
    id: null,
    nombre: "",
    apellido: "",
    tipoDocumento: "",
    numeroDocumento: "",
    fechaNacimiento: "",
    age: "",
    direccion: "",
    telefono: "",
    correo: "",
    estado: true,
    password: "",
    confirmPassword: "",
  })


  const [matriculaData, setMatriculaData] = useState({
    id: null,
    cliente: "",
    beneficiario: "",
    fechaInicio: "",
    fechaFin: "",
    matriculaId: "",
    valor: "0",
    descuento: "0",
    valorFinal: "0",
    observaciones: "",
    estado: "vigente",
  })


  const [cursoData, setCursoData] = useState({
    id: null,
    curso: "",
    clases: "4",
    valorCurso: "",
    valorTotal: "",
    debe: "",
    estado: "debe",
    ciclo: "",
  })


  const [pagoData, setPagoData] = useState({
    fechaPago: "",
    metodoPago: "Efectivo",
    valor_total: "0",
    numeroTransaccion: "",
  })


  // Estados para búsqueda y filtrado
  const [clienteSearchTerm, setClienteSearchTerm] = useState("")
  const [beneficiarioSearchTerm, setBeneficiarioSearchTerm] = useState("")
  const [filteredClientes, setFilteredClientes] = useState([])
  const [filteredBeneficiarios, setFilteredBeneficiarios] = useState([])
  const [clienteLoading, setClienteLoading] = useState(false)
  const [beneficiarioLoading, setBeneficiarioLoading] = useState(false)
  const [clienteNotFound, setClienteNotFound] = useState(false)
  const [beneficiarioNotFound, setBeneficiarioNotFound] = useState(false)
  const [clienteCreated, setClienteCreated] = useState(false)
  const [beneficiarioCreated, setBeneficiarioCreated] = useState(false)
  const [showClienteResults, setShowClienteResults] = useState(false)
  const [showBeneficiarioResults, setShowBeneficiarioResults] = useState(false)


  const tiposDocumento = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "TI", label: "Tarjeta de Identidad (TI)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PA", label: "Pasaporte (PA)" },
    { value: "RC", label: "Registro Civil (RC)" },
    { value: "NIT", label: "NIT" },
  ]


  // Utilidades de validación y sanitización
  const toDigits10 = (v) => (v ?? "").toString().replace(/\D/g, "").slice(0, 10)
  const isTenDigits = (v) => (v ?? "").toString().length === 10
  const isValidEmail = (email) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((email ?? "").toString())
  const isValidBirthDate = (value) => {
    if (!value) return true
    const date = new Date(value)
    const currentYear = new Date().getFullYear()
    return date.getFullYear() < currentYear
  }
  const passwordChecks = (value) => ({
    length: (value ?? "").length >= 8,
    upper: /[A-Z]/.test(value ?? ""),
    lower: /[a-z]/.test(value ?? ""),
    number: /[0-9]/.test(value ?? ""),
  })


  // Helper: verificar si un beneficiario tiene una matrícula vigente
  const hasActiveMatricula = (beneficiarioId) => {
    const today = new Date()
    return (ventasOriginales || []).some((venta) => {
      const original = venta?._original || venta
      const tipo = String(original?.tipo || "").toLowerCase()
      const estado = String(original?.estado || "").toLowerCase()
      const fechaFin = original?.fechaFin ? new Date(original.fechaFin) : null
      const vigentePorFecha = fechaFin ? fechaFin >= today : true
      const beneficiarioOrigen = original?.beneficiarioId
      const originalBeneficiarioId =
        beneficiarioOrigen && typeof beneficiarioOrigen === "object"
          ? String(beneficiarioOrigen._id)
          : String(beneficiarioOrigen)
      return (
        tipo === "matricula" &&
        estado === "vigente" &&
        vigentePorFecha &&
        originalBeneficiarioId === String(beneficiarioId)
      )
    })
  }


  // Filtrar beneficiarios disponibles (sin "cliente" en clienteId y sin matrícula activa)
  const getBeneficiariosDisponibles = () => {
    return beneficiarios.filter((beneficiario) => {
      // Excluir los que tienen "cliente" en clienteId (son solo clientes)
      const clienteIdStr = String(beneficiario.clienteId || "").toLowerCase()
      if (clienteIdStr.includes("cliente")) {
        return false
      }


      // Excluir los que ya tienen matrícula activa (vigente por estado y fecha)
      return !hasActiveMatricula(beneficiario._id)
    })
  }


  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (string) => {
    if (!string) return ""
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
  }


  // Función para formatear fechas
  const formatDateInput = (date) => {
    if (!date) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    try {
      return new Date(date).toISOString().split("T")[0]
    } catch {
      return ""
    }
  }


  // Función para calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return ""
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()


    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }


  // Función para cargar datos del beneficiario seleccionado
  const handleBeneficiarioSelection = (beneficiario) => {
    if (!beneficiario) {
      setSelectedBeneficiario(null)
      return
    }


    setSelectedBeneficiario(beneficiario)


    // Cargar datos del beneficiario
    setBeneficiarioData({
      id: beneficiario._id,
      nombre: beneficiario.nombre || "",
      apellido: beneficiario.apellido || "",
      tipoDocumento: beneficiario.tipo_de_documento || "TI",
      numeroDocumento: beneficiario.numero_de_documento || "",
      fechaNacimiento: formatDateInput(beneficiario.fechaDeNacimiento),
      age: calculateAge(beneficiario.fechaDeNacimiento),
      direccion: beneficiario.direccion || "",
      telefono: beneficiario.telefono || "",
      correo: beneficiario.correo || "",
      estado: beneficiario.estado !== undefined ? beneficiario.estado : true,
      password: "",
      confirmPassword: "",
    })


    // Determinar si es cliente-beneficiario o buscar el cliente
    const clienteIdStr = String(beneficiario.clienteId || "")
    const beneficiarioIdStr = String(beneficiario._id)


    if (clienteIdStr === beneficiarioIdStr) {
      // Es cliente-beneficiario (su propio cliente)
      setClienteEsBeneficiario(true)
      setClienteData({
        id: beneficiario._id,
        nombre: beneficiario.nombre || "",
        apellido: beneficiario.apellido || "",
        tipoDocumento: beneficiario.tipo_de_documento || "CC",
        numeroDocumento: beneficiario.numero_de_documento || "",
        fechaNacimiento: formatDateInput(beneficiario.fechaDeNacimiento),
        age: calculateAge(beneficiario.fechaDeNacimiento),
        direccion: beneficiario.direccion || "",
        telefono: beneficiario.telefono || "",
        estado: beneficiario.estado !== undefined ? beneficiario.estado : true,
      })
    } else {
      // Buscar el cliente real
      setClienteEsBeneficiario(false)
      const clienteReal = beneficiarios.find((b) => String(b._id) === clienteIdStr)
      if (clienteReal) {
        setClienteData({
          id: clienteReal._id,
          nombre: clienteReal.nombre || "",
          apellido: clienteReal.apellido || "",
          tipoDocumento: clienteReal.tipo_de_documento || "",
          numeroDocumento: clienteReal.numero_de_documento || "",
          fechaNacimiento: formatDateInput(clienteReal.fechaDeNacimiento),
          age: calculateAge(clienteReal.fechaDeNacimiento),
          direccion: clienteReal.direccion || "",
          telefono: clienteReal.telefono || "",
          estado: clienteReal.estado !== undefined ? clienteReal.estado : true,
        })
      }
    }


    // Al final de la función handleBeneficiarioSelection, después de todo el código existente, agregar:
    // Actualizar datos de matrícula con los nombres
    const clienteReal = beneficiarios.find((b) => String(b._id) === clienteIdStr)
    setMatriculaData((prev) => ({
      ...prev,
      cliente: clienteEsBeneficiario
        ? `${beneficiario.nombre} ${beneficiario.apellido}`
        : clienteReal
          ? `${clienteReal.nombre} ${clienteReal.apellido}`
          : `${beneficiario.nombre} ${beneficiario.apellido}`,
      beneficiario: `${beneficiario.nombre} ${beneficiario.apellido}`,
    }))
  }


  // CORREGIR: Efecto para manejar el checkbox de cliente es beneficiario
  useEffect(() => {
    if (clienteEsBeneficiario && showCreateForm && clienteData.nombre) {
      // Solo copiar datos del cliente al beneficiario si estamos en modo creación Y hay datos del cliente
      setBeneficiarioData((prev) => ({
        ...clienteData,
        id: null,
        tipoDocumento: clienteData.tipoDocumento || "TI",
        correo: prev.correo || "",
        password: prev.password || "",
        confirmPassword: prev.confirmPassword || "",
      }))
    }
    // NO resetear beneficiarioData cuando clienteEsBeneficiario es false
    // Esto permite mantener la información del beneficiario cuando son personas diferentes
  }, [clienteEsBeneficiario, clienteData, showCreateForm])


  // Inicializar datos si estamos editando
  useEffect(() => {
    if (open) {
      console.log("Modal abierto, isEditing:", isEditing, "initialData:", initialData)


      // SIEMPRE reiniciar primero cuando se abre el modal
      resetFormData()


      // Solo cargar datos si estamos editando Y tenemos initialData
      if (isEditing && initialData) {
        console.log("Cargando datos para edición:", initialData)


        // Verificar que tenemos los datos necesarios para edición
        if (!initialData || (!initialData.beneficiarioObj && !initialData._original)) {
          console.warn("No se encontraron datos del beneficiario para editar")
          return
        }


        // Mapear datos del beneficiario
        let beneficiario = initialData.beneficiarioObj
        if (!beneficiario && initialData._original) {
          // Buscar beneficiario usando el beneficiarioId de la venta original
          beneficiario = beneficiarios.find((b) => String(b._id) === String(initialData._original.beneficiarioId))
          console.log("Beneficiario encontrado por ID:", beneficiario)
        }


        if (beneficiario) {
          // En modo edición, saltar el paso de selección
          setActiveStep(1)
          handleBeneficiarioSelection(beneficiario)


          // Mapear datos de la matrícula
          if (initialData && initialData._original) {
            const ventaOriginal = initialData._original
            const matriculaDataToSet = {
              id: ventaOriginal._id,
              cliente: initialData.cliente || "",
              beneficiario: initialData.beneficiario || "",
              fechaInicio: formatDateInput(ventaOriginal.fechaInicio),
              fechaFin: formatDateInput(ventaOriginal.fechaFin),
              matriculaId: ventaOriginal.matriculaId || "",
              valor: String(ventaOriginal.valor_total || 0),
              descuento: String(ventaOriginal.descuento || 0),
              valorFinal: String((ventaOriginal.valor_total || 0) - (ventaOriginal.descuento || 0)),
              observaciones: ventaOriginal.observaciones || "",
              estado: ventaOriginal.estado || "vigente",
            }
            console.log("Datos de la matrícula a cargar:", matriculaDataToSet)
            setMatriculaData(matriculaDataToSet)
          }
        } else {
          console.error("No se pudo encontrar el beneficiario para editar")
        }


        console.log("Datos cargados completamente para edición")
      } else {
        console.log("Modo creación - formulario reiniciado")
      }
    }
  }, [open, isEditing, initialData, beneficiarios])


  // Resetear formulario
  const resetFormData = () => {
    setClienteData({
      id: null,
      nombre: "",
      apellido: "",
      tipoDocumento: "",
      numeroDocumento: "",
      fechaNacimiento: "",
      age: "",
      direccion: "",
      telefono: "",
      estado: true,
    })


    setBeneficiarioData({
      id: null,
      nombre: "",
      apellido: "",
      tipoDocumento: "",
      numeroDocumento: "",
      fechaNacimiento: "",
      age: "",
      direccion: "",
      telefono: "",
      correo: "",
      estado: true,
      password: "",
      confirmPassword: "",
    })


    setMatriculaData({
      id: null,
      cliente: "",
      beneficiario: "",
      fechaInicio: "",
      fechaFin: "",
      matriculaId: "",
      valor: "0",
      descuento: "0",
      valorFinal: "0",
      observaciones: "",
      estado: "vigente",
    })


    setCursoData({
      id: null,
      curso: "",
      clases: "4",
      valorCurso: "",
      valorTotal: "",
      debe: "",
      estado: "debe",
    })


    setPagoData({
      fechaPago: "",
      metodoPago: "Efectivo",
      valor_total: "0",
      numeroTransaccion: "",
    })


    setClienteSearchTerm("")
    setBeneficiarioSearchTerm("")
    setFilteredClientes([])
    setFilteredBeneficiarios([])
    setClienteNotFound(false)
    setBeneficiarioNotFound(false)
    setClienteCreated(false)
    setBeneficiarioCreated(false)
    setShowClienteResults(false)
    setShowBeneficiarioResults(false)
    setAlertMessage({ show: false, message: "", severity: "info" })
    setActiveStep(0)
    setClienteEsBeneficiario(false)
    setShowCreateForm(false)
    setSelectedBeneficiario(null)
  }


  const handleNext = () => {
    let isValid = true


    // Determinar qué estamos validando basado en showCreateForm y activeStep
    if (showCreateForm) {
      switch (activeStep) {
        case 0: // Matrícula
          if (!matriculaData.fechaInicio || !matriculaData.fechaFin || !matriculaData.matriculaId) {
            setAlertMessage({
              show: true,
              message: "Por favor complete todos los campos obligatorios de la matrícula",
              severity: "error",
            })
            isValid = false
          }
          break
        case 1: // Cliente
          if (!clienteData.nombre || !clienteData.tipoDocumento || !clienteData.numeroDocumento) {
            setAlertMessage({
              show: true,
              message: "Por favor complete todos los campos obligatorios del cliente",
              severity: "error",
            })
            isValid = false
          }
          // Validación estricta: documento y teléfono 10 dígitos
          if (isValid) {
            const doc = toDigits10(clienteData.numeroDocumento)
            const tel = toDigits10(clienteData.telefono)
            if (!isTenDigits(doc)) {
              setAlertMessage({ show: true, message: "El N° de documento del cliente debe tener exactamente 10 dígitos", severity: "error" })
              isValid = false
            } else if (tel && !isTenDigits(tel)) {
              setAlertMessage({ show: true, message: "El teléfono del cliente debe tener exactamente 10 dígitos", severity: "error" })
              isValid = false
            } else if (!isValidBirthDate(clienteData.fechaNacimiento)) {
              setAlertMessage({ show: true, message: "La fecha de nacimiento del cliente no puede ser del año actual o futuro", severity: "error" })
              isValid = false
            }
          }
          break
        case 2: // Beneficiario
          if (!beneficiarioData.nombre || !beneficiarioData.tipoDocumento || !beneficiarioData.numeroDocumento) {
            setAlertMessage({
              show: true,
              message: "Por favor complete todos los campos obligatorios del beneficiario",
              severity: "error",
            })
            isValid = false
          }
          if (!isEditing && !beneficiarioData.correo) {
            setAlertMessage({
              show: true,
              message: "Por favor ingrese un correo electrónico para el beneficiario",
              severity: "error",
            })
            isValid = false
          }
          if (!isEditing && !beneficiarioData.password) {
            setAlertMessage({
              show: true,
              message: "Por favor ingrese una contraseña para el beneficiario",
              severity: "error",
            })
            isValid = false
          }
          if (!isEditing && beneficiarioData.password !== beneficiarioData.confirmPassword) {
            setAlertMessage({
              show: true,
              message: "Las contraseñas no coinciden",
              severity: "error",
            })
            isValid = false
          }
          // Validaciones adicionales (mismas que Beneficiarios/Clientes)
          if (isValid) {
            const bdoc = toDigits10(beneficiarioData.numeroDocumento)
            const btel = toDigits10(beneficiarioData.telefono)
            if (!isTenDigits(bdoc)) {
              setAlertMessage({ show: true, message: "El N° de documento del beneficiario debe tener exactamente 10 dígitos", severity: "error" })
              isValid = false
            } else if (btel && !isTenDigits(btel)) {
              setAlertMessage({ show: true, message: "El teléfono del beneficiario debe tener exactamente 10 dígitos", severity: "error" })
              isValid = false
            } else if (!isValidBirthDate(beneficiarioData.fechaNacimiento)) {
              setAlertMessage({ show: true, message: "La fecha de nacimiento del beneficiario no puede ser del año actual o futuro", severity: "error" })
              isValid = false
            } else if (!isEditing && !isValidEmail(beneficiarioData.correo)) {
              setAlertMessage({ show: true, message: "Debe ingresar un correo electrónico válido", severity: "error" })
              isValid = false
            } else if (!isEditing) {
              const checks = passwordChecks(beneficiarioData.password)
              if (!checks.length || !checks.upper || !checks.lower || !checks.number) {
                setAlertMessage({ show: true, message: "La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula y número", severity: "error" })
                isValid = false
              }
            }
          }
          break
      }
    } else {
      switch (activeStep) {
        case 0: // Matrícula (cuando no se está creando)
          if (!selectedBeneficiario) {
            setAlertMessage({
              show: true,
              message: "Por favor seleccione un beneficiario",
              severity: "error",
            })
            isValid = false
          }
          if (!matriculaData.fechaInicio || !matriculaData.fechaFin || !matriculaData.matriculaId) {
            setAlertMessage({
              show: true,
              message: "Por favor complete todos los campos obligatorios de la matrícula",
              severity: "error",
            })
            isValid = false
          }
          break
      }
    }


    if (isValid) {
      setActiveStep((prevStep) => prevStep + 1)
      setTransition("slideLeft")
      setAlertMessage({ show: false, message: "", severity: "info" })
    }


    // Actualizar datos de matrícula cuando sea necesario
    if (isValid && ((showCreateForm && activeStep === 1) || (!showCreateForm && activeStep === 0))) {
      setMatriculaData((prev) => ({
        ...prev,
        cliente: `${clienteData.nombre} ${clienteData.apellido}`,
        beneficiario: `${beneficiarioData.nombre} ${beneficiarioData.apellido}`,
      }))
    }
  }


  const handleBack = () => {
    setTransition("slideRight")
    setActiveStep((prev) => prev - 1)
  }


  // Filtrar clientes mientras se escribe
  const handleClienteSearch = (searchTerm) => {
    setClienteSearchTerm(searchTerm)
    setClienteCreated(false)
    setClienteLoading(true)


    if (searchTerm.trim() === "") {
      setFilteredClientes([])
      setClienteNotFound(false)
      setShowClienteResults(false)
      setClienteLoading(false)
      return
    }


    setTimeout(() => {
      const searchTermLower = searchTerm.toLowerCase()


      // Filtrar clientes que coincidan con la búsqueda
      let matches = clientes.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(searchTermLower) ||
          cliente.apellido.toLowerCase().includes(searchTermLower) ||
          cliente.numero_de_documento.includes(searchTerm),
      )


      // Filtrar clientes que NO tengan matrícula activa
      matches = matches.filter((cliente) => {
        const tieneMatriculaActiva = ventasOriginales.some((venta) => {
          if (venta._original.tipo !== "matricula" || venta._original.estado !== "vigente") {
            return false
          }


          const beneficiarioVenta = beneficiarios.find((b) => String(b._id) === String(venta._original.beneficiarioId))
          if (!beneficiarioVenta) return false


          const clienteIdStr = String(beneficiarioVenta.clienteId)
          const clienteIdActual = String(cliente._id)
          const beneficiarioIdStr = String(beneficiarioVenta._id)


          // Cliente es beneficiario (clienteId === _id del beneficiario)
          if (clienteIdStr === beneficiarioIdStr && clienteIdActual === beneficiarioIdStr) {
            return true
          }


          // Cliente es diferente del beneficiario
          if (clienteIdStr !== beneficiarioIdStr && clienteIdStr === clienteIdActual) {
            return true
          }


          return false
        })


        return !tieneMatriculaActiva
      })


      setFilteredClientes(matches)
      setClienteNotFound(matches.length === 0)
      setShowClienteResults(true)
      setClienteLoading(false)
    }, 300)
  }


  // Filtrar beneficiarios mientras se escribe
  const handleBeneficiarioSearch = (searchTerm) => {
    setBeneficiarioSearchTerm(searchTerm)
    setBeneficiarioCreated(false)
    setBeneficiarioLoading(true)


    if (searchTerm.trim() === "") {
      setFilteredBeneficiarios([])
      setBeneficiarioNotFound(false)
      setShowBeneficiarioResults(false)
      setBeneficiarioLoading(false)
      return
    }


    setTimeout(() => {
      const searchTermLower = searchTerm.toLowerCase()


      // Filtrar beneficiarios que coincidan con la búsqueda
      let matches = beneficiarios.filter(
        (beneficiario) =>
          beneficiario.nombre.toLowerCase().includes(searchTermLower) ||
          beneficiario.apellido.toLowerCase().includes(searchTermLower) ||
          beneficiario.numero_de_documento.includes(searchTerm),
      )


      // Filtrar beneficiarios que NO tengan matrícula activa
      matches = matches.filter((beneficiario) => !hasActiveMatricula(beneficiario._id))


      setFilteredBeneficiarios(matches)
      setBeneficiarioNotFound(matches.length === 0)
      setShowBeneficiarioResults(true)
      setBeneficiarioLoading(false)
    }, 300)
  }


  // Seleccionar cliente de la lista
  const handleSelectCliente = (cliente) => {
    setClienteData({
      id: cliente._id || cliente.id || null,
      nombre: cliente.nombre || "",
      apellido: cliente.apellido || "",
      tipoDocumento: cliente.tipoDocumento || cliente.tipo_de_documento || "",
      numeroDocumento: cliente.numeroDocumento || cliente.numero_de_documento || "",
      fechaNacimiento: formatDateInput(
        cliente.fechaNacimiento || cliente.fecha_de_nacimiento || cliente.fechaDeNacimiento,
      ),
      age: calculateAge(cliente.fechaNacimiento || cliente.fecha_de_nacimiento || cliente.fechaDeNacimiento),
      direccion: cliente.direccion || "",
      telefono: cliente.telefono || "",
      estado: cliente.estado !== undefined ? cliente.estado : true,
    })
    setShowClienteResults(false)
    setClienteSearchTerm(`${cliente.nombre} ${cliente.apellido}`)
    setClienteCreated(true)
  }


  // Seleccionar beneficiario de la lista
  const handleSelectBeneficiario = (beneficiario) => {
    setBeneficiarioData({
      id: beneficiario._id || beneficiario.id || null,
      nombre: beneficiario.nombre || "",
      apellido: beneficiario.apellido || "",
      tipoDocumento: beneficiario.tipoDocumento || beneficiario.tipo_de_documento || "",
      numeroDocumento: beneficiario.numeroDocumento || beneficiario.numero_de_documento || "",
      fechaNacimiento: formatDateInput(
        beneficiario.fechaNacimiento || beneficiario.fecha_de_nacimiento || beneficiario.fechaDeNacimiento,
      ),
      age: calculateAge(
        beneficiario.fechaNacimiento || beneficiario.fecha_de_nacimiento || beneficiario.fechaDeNacimiento,
      ),
      direccion: beneficiario.direccion || "",
      telefono: beneficiario.telefono || "",
      correo: beneficiario.correo || beneficiario.email || "",
      estado: beneficiario.estado !== undefined ? beneficiario.estado : true,
      password: beneficiarioData.password,
      confirmPassword: beneficiarioData.confirmPassword,
    })
    setShowBeneficiarioResults(false)
    setBeneficiarioSearchTerm(`${beneficiario.nombre} ${beneficiario.apellido}`)
    setBeneficiarioCreated(true)
  }


  // Solo cursos activos
  const cursosActivos = cursosDisponibles.filter((c) => c.estado)


  // Calcular valor final con descuento
  useEffect(() => {
    if (matriculaData.valor) {
      const valor = Number.parseFloat(matriculaData.valor)
      const descuento = Number.parseFloat(matriculaData.descuento || 0)
      const valorFinal = valor - descuento
      setMatriculaData((prev) => ({
        ...prev,
        valorFinal: valorFinal >= 0 ? valorFinal.toString() : "0",
      }))


      // Actualizar valor del pago
      setPagoData((prev) => ({
        ...prev,
        valor_total: valorFinal >= 0 ? valorFinal.toString() : "0",
      }))
    }
  }, [matriculaData.valor, matriculaData.descuento])


  // Actualizar edad al cambiar fecha de nacimiento
  useEffect(() => {
    if (clienteData.fechaNacimiento && clienteData.fechaNacimiento.trim() !== "") {
      const edad = calculateAge(clienteData.fechaNacimiento)
      setClienteData((prev) => ({ ...prev, age: edad }))
    }
  }, [clienteData.fechaNacimiento])


  useEffect(() => {
    if (beneficiarioData.fechaNacimiento && beneficiarioData.fechaNacimiento.trim() !== "") {
      const edad = calculateAge(beneficiarioData.fechaNacimiento)
      setBeneficiarioData((prev) => ({ ...prev, age: edad }))
    }
  }, [beneficiarioData.fechaNacimiento])


  // Agregar después de la línea donde se define showCreateForm
  useEffect(() => {
    if (showCreateForm) {
      setActiveStep(0) // Reiniciar al primer paso cuando se activa el modo creación
    }
  }, [showCreateForm])


  // Reemplazar el useEffect que establece las fechas por defecto:
  // Establecer fechas por defecto cuando se llega al paso de matrícula
  useEffect(() => {
    // Establecer fechas automáticamente cuando:
    // 1. Estamos en el paso de matrícula (activeStep === 0)
    // 2. No hay fechas ya establecidas
    // 3. No estamos en modo edición
    if (activeStep === 0 && !matriculaData.fechaInicio && !isEditing) {
      const hoy = new Date()
      const fechaInicio = hoy.toISOString().split("T")[0]
      const fechaFin = new Date(hoy.setFullYear(hoy.getFullYear() + 1)).toISOString().split("T")[0]
      setMatriculaData((prev) => ({
        ...prev,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
      }))


      // También establecer fecha de pago como hoy
      setPagoData((prev) => ({
        ...prev,
        fechaPago: new Date().toISOString().split("T")[0],
      }))
    }
  }, [activeStep, isEditing, matriculaData.fechaInicio])


  // Manejar envío del formulario
const handleSubmit = () => {
  if (isSubmitting) {
    console.log("Formulario ya está siendo enviado, ignorando...")
    return
  }
  
  const formSubmitId = Math.random().toString(36).substr(2, 9); // ID único para este submit del formulario
  console.log(`=== INICIANDO VALIDACIÓN DEL FORMULARIO [${formSubmitId}] ===`)
  console.log("Timestamp:", new Date().toISOString())
  console.log("ClienteData:", clienteData)
  console.log("BeneficiarioData:", beneficiarioData)
  console.log("MatriculaData:", matriculaData)
  console.log("PagoData:", pagoData)
  console.log("ShowCreateForm:", showCreateForm)
  console.log("IsEditing:", isEditing)
  
  setIsSubmitting(true)
  console.log(`[${formSubmitId}] isSubmitting set to:`, true)

  try {
    // Validar datos básicos de matrícula
    if (!matriculaData.fechaInicio || !matriculaData.fechaFin || !matriculaData.matriculaId) {
      setAlertMessage({
        show: true,
        message: "Por favor complete todos los campos obligatorios de la matrícula (fechas y tipo de matrícula)",
        severity: "error",
      })
      return
    }

    // Validar datos de pago
    if (!pagoData.fechaPago || !pagoData.metodoPago) {
      setAlertMessage({
        show: true,
        message: "Por favor complete todos los campos obligatorios del pago (fecha y método de pago)",
        severity: "error",
      })
      return
    }

    // Si estamos en modo creación (showCreateForm = true)
    if (showCreateForm) {
      // Validar datos del cliente
      if (!clienteData.nombre || !clienteData.apellido || !clienteData.tipoDocumento || !clienteData.numeroDocumento) {
        setAlertMessage({
          show: true,
          message:
            "Por favor complete todos los campos obligatorios del cliente (nombre, apellido, tipo y número de documento)",
          severity: "error",
        })
        return
      }

      // Validaciones estrictas cliente
      const cDoc = toDigits10(clienteData.numeroDocumento)
      const cTel = toDigits10(clienteData.telefono)
      if (!isTenDigits(cDoc)) {
        setAlertMessage({ show: true, message: "El N° de documento del cliente debe tener exactamente 10 dígitos", severity: "error" })
        return
      }
      if (cTel && !isTenDigits(cTel)) {
        setAlertMessage({ show: true, message: "El teléfono del cliente debe tener exactamente 10 dígitos", severity: "error" })
        return
      }
      if (!isValidBirthDate(clienteData.fechaNacimiento)) {
        setAlertMessage({ show: true, message: "La fecha de nacimiento del cliente no puede ser del año actual o futuro", severity: "error" })
        return
      }

      // Validar datos del beneficiario
      if (
        !beneficiarioData.nombre ||
        !beneficiarioData.apellido ||
        !beneficiarioData.tipoDocumento ||
        !beneficiarioData.numeroDocumento
      ) {
        setAlertMessage({
          show: true,
          message:
            "Por favor complete todos los campos obligatorios del beneficiario (nombre, apellido, tipo y número de documento)",
          severity: "error",
        })
        return
      }

      // Validaciones estrictas beneficiario
      const bDoc = toDigits10(beneficiarioData.numeroDocumento)
      const bTel = toDigits10(beneficiarioData.telefono)
      if (!isTenDigits(bDoc)) {
        setAlertMessage({ show: true, message: "El N° de documento del beneficiario debe tener exactamente 10 dígitos", severity: "error" })
        return
      }
      if (bTel && !isTenDigits(bTel)) {
        setAlertMessage({ show: true, message: "El teléfono del beneficiario debe tener exactamente 10 dígitos", severity: "error" })
        return
      }
      if (!isValidBirthDate(beneficiarioData.fechaNacimiento)) {
        setAlertMessage({ show: true, message: "La fecha de nacimiento del beneficiario no puede ser del año actual o futuro", severity: "error" })
        return
      }

      // Validar correo y contraseña SOLO si no estamos editando
      if (!isEditing) {
        if (!beneficiarioData.correo || !isValidEmail(beneficiarioData.correo)) {
          setAlertMessage({
            show: true,
            message: "Por favor ingrese un correo electrónico válido para el beneficiario",
            severity: "error",
          })
          return
        }

        const checks = passwordChecks(beneficiarioData.password)
        if (!beneficiarioData.password || !checks.length || !checks.upper || !checks.lower || !checks.number) {
          setAlertMessage({
            show: true,
            message: "La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula y número",
            severity: "error",
          })
          return
        }

        if (beneficiarioData.password !== beneficiarioData.confirmPassword) {
          setAlertMessage({
            show: true,
            message: "Las contraseñas no coinciden",
            severity: "error",
          })
          return
        }
      }
    } else {
      // Si NO estamos en modo creación, debe haber un beneficiario seleccionado
      if (!selectedBeneficiario) {
        setAlertMessage({
          show: true,
          message: "Por favor seleccione un beneficiario existente",
          severity: "error",
        })
        return
      }
    }

    // Validar que el beneficiario no tenga una matrícula vigente
    const beneficiarioIdParaValidar = (selectedBeneficiario?._id || beneficiarioData.id || "").toString()
    if (beneficiarioIdParaValidar) {
      if (hasActiveMatricula(beneficiarioIdParaValidar)) {
        setAlertMessage({
          show: true,
          message: "El beneficiario ya tiene una matrícula vigente. No es posible crear otra.",
          severity: "warning",
        })
        return
      }
    }

    console.log(`[${formSubmitId}] === VALIDACIÓN EXITOSA - PROCEDIENDO CON EL ENVÍO ===`)

    // Usuario para beneficiario
    const usuarioBeneficiario = {
      nombre: beneficiarioData.nombre,
      apellido: beneficiarioData.apellido,
      email: beneficiarioData.correo,
      contrasena: beneficiarioData.password,
      documento: beneficiarioData.numeroDocumento,
      estado: true,
    }

    // Beneficiario
    const beneficiario = {
      id: beneficiarioData.id,
      nombre: beneficiarioData.nombre,
      apellido: beneficiarioData.apellido,
      tipoDocumento: beneficiarioData.tipoDocumento,
      numeroDocumento: beneficiarioData.numeroDocumento,
      telefono: beneficiarioData.telefono,
      direccion: beneficiarioData.direccion,
      fechaNacimiento: beneficiarioData.fechaNacimiento,
      correo: beneficiarioData.correo,
      estado: true,
      clienteId: clienteEsBeneficiario ? null : "cliente",
    }

    // Cliente
    const cliente = clienteEsBeneficiario
      ? null
      : {
          id: clienteData.id,
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          tipoDocumento: clienteData.tipoDocumento,
          numeroDocumento: clienteData.numeroDocumento,
          telefono: clienteData.telefono,
          direccion: clienteData.direccion,
          fechaNacimiento: clienteData.fechaNacimiento,
          estado: true,
          clienteId: "cliente",
        }

    // Datos de matrícula
    const matricula = {
      id: matriculaData.id,
      cliente: showCreateForm ? `${clienteData.nombre} ${clienteData.apellido}` : matriculaData.cliente,
      beneficiario: showCreateForm
        ? `${beneficiarioData.nombre} ${beneficiarioData.apellido}`
        : matriculaData.beneficiario,
      fechaInicio: matriculaData.fechaInicio,
      fechaFin: matriculaData.fechaFin,
      matriculaId: matriculaData.matriculaId,
      valor: Number.parseFloat(matriculaData.valor),
      descuento: Number.parseFloat(matriculaData.descuento || 0),
      valorFinal: Number.parseFloat(matriculaData.valorFinal),
      observaciones: matriculaData.observaciones,
      estado: matriculaData.estado,
    }

    // Curso (opcional)
    const curso =
      !isEditing && cursoData.curso
        ? {
            curso: cursoData.curso,
            clases: Number.parseInt(cursoData.clases),
            ciclo: cursoData.ciclo || null,
            valorCurso: Number.parseFloat(cursoData.valorCurso || 0),
            valorTotal: Number.parseFloat(cursoData.valorTotal || 0),
          }
        : null

    // Pago
    const pago = {
      fechaPago: pagoData.fechaPago,
      metodoPago: pagoData.metodoPago,
      valor_total: Number.parseFloat(pagoData.valor_total || matriculaData.valorFinal),
      numeroTransaccion: pagoData.numeroTransaccion,
    }

    // Enviar todo al padre
    onSubmit({
      matricula,
      beneficiario,
      usuarioBeneficiario,
      cliente,
      clienteEsBeneficiario,
      curso,
      pago,
      isEditing,
    })
    console.log(`[${formSubmitId}] onSubmit del padre llamado exitosamente`)
  } catch (error) {
    console.error(`[${formSubmitId}] Error en validación del formulario:`, error)
  } finally {
    // ✅ CORREGIDO: ahora usa setIsSubmitting
    setIsSubmitting(false)
    console.log(`[${formSubmitId}] isSubmitting reset to:`, false)
  }
}

  const renderStepContent = () => {
    const slideClass = transition === "slideLeft" ? "slide-left" : "slide-right"


    // Determinar qué paso estamos mostrando basado en si estamos creando o no
    let currentStepType = ""
    if (showCreateForm) {
      switch (activeStep) {
        case 0:
          currentStepType = "matricula"
          break
        case 1:
          currentStepType = "cliente"
          break
        case 2:
          currentStepType = "beneficiario"
          break
        case 3:
          currentStepType = "curso"
          break
      }
    } else {
      switch (activeStep) {
        case 0:
          currentStepType = "matricula"
          break
        case 1:
          currentStepType = "curso"
          break
      }
    }


    switch (currentStepType) {
      case "matricula":
        return (
          <Box className={slideClass} sx={{ animation: `${slideClass} 0.3s forwards` }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#0455a2", fontWeight: 500 }}>
              Datos de la Matrícula
            </Typography>


            {/* Selector de beneficiario al inicio */}
            {!isEditing && !showCreateForm && (
              <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #e0e0e0", borderRadius: "8px" }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: "#0455a2", fontWeight: 500 }}>
                  Seleccionar Beneficiario
                </Typography>
                <Autocomplete
                  options={getBeneficiariosDisponibles()}
                  getOptionLabel={(option) => `${option.nombre} ${option.apellido} - ${option.numero_de_documento}`}
                  value={selectedBeneficiario}
                  onChange={(event, newValue) => {
                    handleBeneficiarioSelection(newValue)
                    if (newValue) {
                      // Determinar cliente después de la selección
                      const clienteIdStr = String(newValue.clienteId || "")
                      const beneficiarioIdStr = String(newValue._id)
                      const esClienteBeneficiario = clienteIdStr === beneficiarioIdStr
                      const clienteReal = beneficiarios.find((b) => String(b._id) === clienteIdStr)


                      // Actualizar inmediatamente los datos de matrícula
                      setTimeout(() => {
                        setMatriculaData((prev) => ({
                          ...prev,
                          cliente: esClienteBeneficiario
                            ? `${newValue.nombre} ${newValue.apellido}`
                            : clienteReal
                              ? `${clienteReal.nombre} ${clienteReal.apellido}`
                              : `${newValue.nombre} ${newValue.apellido}`,
                          beneficiario: `${newValue.nombre} ${newValue.apellido}`,
                        }))
                      }, 100)
                    } else {
                      setMatriculaData((prev) => ({
                        ...prev,
                        cliente: "",
                        beneficiario: "",
                      }))
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar beneficiario"
                      placeholder="Seleccione un beneficiario existente"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ bgcolor: "#0455a2", mr: 2 }}>
                        <SchoolIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          {option.nombre} {option.apellido}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.tipo_de_documento}: {option.numero_de_documento}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  noOptionsText="No hay beneficiarios disponibles"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      // Limpiar beneficiario seleccionado y sus datos SIN TRIGGEAR useEffects
                      setSelectedBeneficiario(null)


                      // Resetear datos sin triggear los useEffects de edad
                      const emptyBeneficiarioData = {
                        id: null,
                        nombre: "",
                        apellido: "",
                        tipoDocumento: "",
                        numeroDocumento: "",
                        fechaNacimiento: "",
                        age: "",
                        direccion: "",
                        telefono: "",
                        correo: "",
                        estado: true,
                        password: "",
                        confirmPassword: "",
                      }


                      const emptyClienteData = {
                        id: null,
                        nombre: "",
                        apellido: "",
                        tipoDocumento: "",
                        numeroDocumento: "",
                        fechaNacimiento: "",
                        age: "",
                        direccion: "",
                        telefono: "",
                        estado: true,
                      }


                      // Establecer datos vacíos
                      setBeneficiarioData(emptyBeneficiarioData)
                      setClienteData(emptyClienteData)
                      setClienteEsBeneficiario(false)


                      // Activar modo creación
                      setShowCreateForm(true)


                      // Establecer fechas automáticamente
                      const hoy = new Date()
                      const fechaInicio = hoy.toISOString().split("T")[0]
                      const fechaFin = new Date(hoy.setFullYear(hoy.getFullYear() + 1)).toISOString().split("T")[0]


                      setMatriculaData((prev) => ({
                        ...prev,
                        fechaInicio: fechaInicio,
                        fechaFin: fechaFin,
                        cliente: "Por crear",
                        beneficiario: "Por crear",
                      }))


                      // También establecer fecha de pago como hoy
                      setPagoData((prev) => ({
                        ...prev,
                        fechaPago: new Date().toISOString().split("T")[0],
                      }))
                    }}
                    sx={{
                      textTransform: "none",
                      borderColor: "#0455a2",
                      color: "#0455a2",
                      "&:hover": {
                        borderColor: "#033b70",
                        bgcolor: "rgba(4, 85, 162, 0.04)",
                      },
                    }}
                  >
                    Crear nuevo cliente y beneficiario
                  </Button>
                </Box>
                {showCreateForm && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Se habilitarán los formularios para crear cliente y beneficiario.
                  </Alert>
                )}
              </Paper>
            )}


            {/* Resto del formulario de matrícula */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #e0e0e0", borderRadius: "8px" }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: "#0455a2" }}>
                    Cliente
                  </Typography>
                  <Typography>{showCreateForm ? "Por crear" : matriculaData.cliente || "Por seleccionar"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: "#0455a2" }}>
                    Beneficiario
                  </Typography>
                  <Typography>
                    {showCreateForm ? "Por crear" : matriculaData.beneficiario || "Por seleccionar"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>


            {/* Campos de matrícula */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Fecha de Inicio"
                  type="date"
                  value={matriculaData.fechaInicio}
                  onChange={(e) => setMatriculaData({ ...matriculaData, fechaInicio: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Fecha de Fin"
                  type="date"
                  value={matriculaData.fechaFin}
                  onChange={(e) => setMatriculaData({ ...matriculaData, fechaFin: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>


              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>Selección de Matrícula</Divider>
              </Grid>


              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Tipo de Matrícula</InputLabel>
                  <Select
                    value={matriculaData.matriculaId || ""}
                    onChange={(e) => {
                      const matriculaSeleccionada = matriculas.find((m) => m._id === e.target.value)
                      if (matriculaSeleccionada) {
                        const valorBase = matriculaSeleccionada.valorMatricula
                        const descuento = Number.parseFloat(matriculaData.descuento || 0)
                        const valorFinal = valorBase - descuento


                        setMatriculaData({
                          ...matriculaData,
                          matriculaId: e.target.value,
                          valor: valorBase.toString(),
                          valorFinal: valorFinal >= 0 ? valorFinal.toString() : "0",
                        })
                      }
                    }}
                    label="Tipo de Matrícula"
                  >
                    {matriculas
                      .filter((m) => m.estado)
                      .map((matricula) => (
                        <MenuItem key={matricula._id} value={matricula._id}>
                          {matricula.nombre} - ${matricula.valorMatricula?.toLocaleString() || 0}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>


              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observaciones"
                  value={matriculaData.observaciones}
                  onChange={(e) => setMatriculaData({ ...matriculaData, observaciones: e.target.value })}
                  margin="normal"
                  multiline
                  minRows={2}
                />
              </Grid>


              {/* Sección consolidada de Información de Pago */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>Información de Pago</Divider>
              </Grid>


              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Base de la Matrícula"
                  type="number"
                  value={matriculaData.valor}
                  margin="normal"
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                  disabled
                />
              </Grid>


              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Monto de Descuento"
                  type="number"
                  value={matriculaData.descuento}
                  onChange={(e) => {
                    const descuento = Number.parseFloat(e.target.value || 0)
                    const valorBase = Number.parseFloat(matriculaData.valor || 0)
                    const valorFinal = valorBase - descuento


                    setMatriculaData({
                      ...matriculaData,
                      descuento: e.target.value,
                      valorFinal: valorFinal >= 0 ? valorFinal.toString() : "0",
                    })
                  }}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0, max: matriculaData.valor },
                  }}
                />
              </Grid>


              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total a Pagar"
                  type="number"
                  value={matriculaData.valorFinal}
                  margin="normal"
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-input": {
                      fontWeight: 600,
                      fontSize: "1.1rem",
                    },
                  }}
                />
              </Grid>


              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Fecha de Pago"
                  type="date"
                  value={pagoData.fechaPago}
                  onChange={(e) => setPagoData({ ...pagoData, fechaPago: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>


              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Método de Pago</InputLabel>
                  <Select
                    value={pagoData.metodoPago}
                    onChange={(e) => setPagoData({ ...pagoData, metodoPago: e.target.value })}
                    label="Método de Pago"
                  >
                    <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                    <MenuItem value="Transferencia">Transferencia</MenuItem>
                    <MenuItem value="Efectivo">Efectivo</MenuItem>
                    <MenuItem value="PSE">PSE</MenuItem>
                    <MenuItem value="Nequi">Nequi</MenuItem>
                    <MenuItem value="Daviplata">Daviplata</MenuItem>
                  </Select>
                </FormControl>
              </Grid>


              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Número de Transacción"
                  value={pagoData.numeroTransaccion}
                  onChange={(e) => setPagoData({ ...pagoData, numeroTransaccion: e.target.value })}
                  margin="normal"
                  placeholder="Número de transacción (opcional)"
                />
              </Grid>
            </Grid>
          </Box>
        )


      case "cliente":
        return (
          <Box className={slideClass} sx={{ animation: `${slideClass} 0.3s forwards` }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#0455a2", fontWeight: 500 }}>
              Datos del Cliente
            </Typography>


            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nombre"
                  value={clienteData.nombre}
                  onChange={(e) => setClienteData({ ...clienteData, nombre: capitalizeFirstLetter(e.target.value) })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Apellido"
                  value={clienteData.apellido}
                  onChange={(e) => setClienteData({ ...clienteData, apellido: capitalizeFirstLetter(e.target.value) })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Tipo Documento</InputLabel>
                  <Select
                    value={clienteData.tipoDocumento}
                    onChange={(e) => setClienteData({ ...clienteData, tipoDocumento: e.target.value })}
                    label="Tipo Documento"
                  >
                    {tiposDocumento.map((tipo) => (
                      <MenuItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Número de Documento"
                  value={clienteData.numeroDocumento}
                  onChange={(e) =>
                    setClienteData({ ...clienteData, numeroDocumento: toDigits10(e.target.value) })
                  }
                  margin="normal"
                  error={
                    !!clienteData.numeroDocumento && !isTenDigits(clienteData.numeroDocumento)
                  }
                  helperText={
                    !!clienteData.numeroDocumento && !isTenDigits(clienteData.numeroDocumento)
                      ? "Debe contener exactamente 10 dígitos"
                      : ""
                  }
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Nacimiento"
                  value={clienteData.fechaNacimiento}
                  onChange={(e) => setClienteData({ ...clienteData, fechaNacimiento: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Edad"
                  value={clienteData.age}
                  InputProps={{ readOnly: true }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={clienteData.direccion}
                  onChange={(e) => setClienteData({ ...clienteData, direccion: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={clienteData.telefono}
                  onChange={(e) => setClienteData({ ...clienteData, telefono: toDigits10(e.target.value) })}
                  margin="normal"
                  error={!!clienteData.telefono && !isTenDigits(clienteData.telefono)}
                  helperText={
                    !!clienteData.telefono && !isTenDigits(clienteData.telefono)
                      ? "Debe contener exactamente 10 dígitos"
                      : ""
                  }
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                />
              </Grid>
              {/* Checkbox para cliente es beneficiario - MOVER AQUÍ */}
              {!isEditing && (
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={clienteEsBeneficiario}
                        onChange={(e) => {
                          const isChecked = e.target.checked
                          setClienteEsBeneficiario(isChecked)


                          if (isChecked) {
                            // Copiar datos del cliente al beneficiario
                            setBeneficiarioData((prev) => ({
                              ...clienteData,
                              id: null,
                              tipoDocumento: clienteData.tipoDocumento || "TI",
                              correo: prev.correo || "",
                              password: prev.password || "",
                              confirmPassword: prev.confirmPassword || "",
                            }))
                            // Avanzar automáticamente al siguiente paso
                            handleNext()
                          }
                          // NO limpiar datos del beneficiario cuando se desmarca
                        }}
                        sx={{
                          color: "#0455a2",
                          "&.Mui-checked": {
                            color: "#0455a2",
                          },
                        }}
                      />
                    }
                    label="Cliente es beneficiario"
                    sx={{
                      "& .MuiFormControlLabel-label": {
                        fontWeight: 500,
                        color: "#0455a2",
                      },
                    }}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        )


      case "beneficiario":
        return (
          <Box className={slideClass} sx={{ animation: `${slideClass} 0.3s forwards` }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#0455a2", fontWeight: 500 }}>
              Datos del Beneficiario
            </Typography>


            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nombre"
                  value={beneficiarioData.nombre}
                  onChange={(e) =>
                    setBeneficiarioData({ ...beneficiarioData, nombre: capitalizeFirstLetter(e.target.value) })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Apellido"
                  value={beneficiarioData.apellido}
                  onChange={(e) =>
                    setBeneficiarioData({ ...beneficiarioData, apellido: capitalizeFirstLetter(e.target.value) })
                  }
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Tipo Documento</InputLabel>
                  <Select
                    value={beneficiarioData.tipoDocumento}
                    onChange={(e) => setBeneficiarioData({ ...beneficiarioData, tipoDocumento: e.target.value })}
                    label="Tipo Documento"
                  >
                    {tiposDocumento.map((tipo) => (
                      <MenuItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Número de Documento"
                  value={beneficiarioData.numeroDocumento}
                  onChange={(e) =>
                    setBeneficiarioData({ ...beneficiarioData, numeroDocumento: toDigits10(e.target.value) })
                  }
                  margin="normal"
                  error={
                    !!beneficiarioData.numeroDocumento && !isTenDigits(beneficiarioData.numeroDocumento)
                  }
                  helperText={
                    !!beneficiarioData.numeroDocumento && !isTenDigits(beneficiarioData.numeroDocumento)
                      ? "Debe contener exactamente 10 dígitos"
                      : ""
                  }
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Nacimiento"
                  value={beneficiarioData.fechaNacimiento}
                  onChange={(e) => setBeneficiarioData({ ...beneficiarioData, fechaNacimiento: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Edad"
                  value={beneficiarioData.age}
                  InputProps={{ readOnly: true }}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={beneficiarioData.direccion}
                  onChange={(e) => setBeneficiarioData({ ...beneficiarioData, direccion: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={beneficiarioData.telefono}
                  onChange={(e) =>
                    setBeneficiarioData({ ...beneficiarioData, telefono: toDigits10(e.target.value) })
                  }
                  margin="normal"
                  error={!!beneficiarioData.telefono && !isTenDigits(beneficiarioData.telefono)}
                  helperText={
                    !!beneficiarioData.telefono && !isTenDigits(beneficiarioData.telefono)
                      ? "Debe contener exactamente 10 dígitos"
                      : ""
                  }
                  inputProps={{ maxLength: 10, inputMode: "numeric" }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required={!isEditing}
                  label="Correo Electrónico"
                  type="email"
                  value={beneficiarioData.correo}
                  onChange={(e) => setBeneficiarioData({ ...beneficiarioData, correo: e.target.value })}
                  margin="normal"
                  error={!!beneficiarioData.correo && !isValidEmail(beneficiarioData.correo)}
                  helperText={
                    !!beneficiarioData.correo && !isValidEmail(beneficiarioData.correo)
                      ? "Debe ser un correo electrónico válido"
                      : ""
                  }
                />
              </Grid>


              {!isEditing && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="password"
                      label="Contraseña"
                      value={beneficiarioData.password}
                      onChange={(e) =>
                        setBeneficiarioData({ ...beneficiarioData, password: e.target.value })
                      }
                      margin="normal"
                      error={
                        !!beneficiarioData.password &&
                        !Object.values(passwordChecks(beneficiarioData.password)).every(Boolean)
                      }
                      helperText={
                        beneficiarioData.password
                          ? (
                              <span>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  <li style={{ color: passwordChecks(beneficiarioData.password).length ? 'green' : undefined }}>
                                    {passwordChecks(beneficiarioData.password).length ? '✓' : '•'} Mínimo 8 caracteres
                                  </li>
                                  <li style={{ color: passwordChecks(beneficiarioData.password).upper ? 'green' : undefined }}>
                                    {passwordChecks(beneficiarioData.password).upper ? '✓' : '•'} Al menos una mayúscula
                                  </li>
                                  <li style={{ color: passwordChecks(beneficiarioData.password).lower ? 'green' : undefined }}>
                                    {passwordChecks(beneficiarioData.password).lower ? '✓' : '•'} Al menos una minúscula
                                  </li>
                                  <li style={{ color: passwordChecks(beneficiarioData.password).number ? 'green' : undefined }}>
                                    {passwordChecks(beneficiarioData.password).number ? '✓' : '•'} Al menos un número
                                  </li>
                                </ul>
                              </span>
                            )
                          : ""
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="password"
                      label="Confirmar Contraseña"
                      value={beneficiarioData.confirmPassword}
                      onChange={(e) => setBeneficiarioData({ ...beneficiarioData, confirmPassword: e.target.value })}
                      margin="normal"
                      error={
                        !!beneficiarioData.confirmPassword &&
                        beneficiarioData.password !== beneficiarioData.confirmPassword
                      }
                      helperText={
                        beneficiarioData.confirmPassword
                          ? beneficiarioData.password === beneficiarioData.confirmPassword
                            ? <span style={{ color: 'green' }}>✓ Las contraseñas coinciden</span>
                            : "Las contraseñas no coinciden"
                          : ""
                      }
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        )


      case "curso":
        // Solo mostrar si no estamos editando
        if (isEditing) return null


        return (
          <Box className={slideClass} sx={{ animation: `${slideClass} 0.3s forwards` }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#0455a2", fontWeight: 500 }}>
              Información del Curso (Opcional)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="curso-label">Curso</InputLabel>
                  <Select
                    labelId="curso-label"
                    value={cursoData.curso}
                    label="Curso"
                    onChange={(e) => {
                      const curso = cursosActivos.find((c) => c.nombre === e.target.value)
                      setCursoData((prev) => ({
                        ...prev,
                        curso: e.target.value,
                        clases: "4",
                        valorCurso: curso ? curso.valor_por_hora : "",
                        valorTotal: curso ? Number(curso.valor_por_hora) * 4 : "",
                      }))
                    }}
                  >
                    <MenuItem value="">Sin curso</MenuItem>
                    {cursosActivos.map((curso) => (
                      <MenuItem key={curso._id} value={curso.nombre}>
                        {curso.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>


              {cursoData.curso && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Número de Clases"
                      type="number"
                      value={cursoData.clases}
                      margin="normal"
                      InputProps={{
                        inputProps: { min: 1 },
                      }}
                      onChange={(e) => {
                        const cursoSeleccionado = cursosActivos.find((c) => c.nombre === cursoData.curso)
                        const valorHora = cursoSeleccionado ? cursoSeleccionado.valor_por_hora : 0
                        const numClases = Number(e.target.value)
                        setCursoData((prev) => ({
                          ...prev,
                          clases: e.target.value,
                          valorTotal: valorHora * numClases,
                        }))
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ciclo"
                      value={cursoData.ciclo}
                      onChange={(e) => setCursoData((prev) => ({ ...prev, ciclo: e.target.value }))}
                      margin="normal"
                      placeholder="Ej: 2025-1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Valor por Hora"
                      type="number"
                      value={cursosActivos.find((c) => c.nombre === cursoData.curso)?.valor_por_hora || ""}
                      margin="normal"
                      InputProps={{
                        readOnly: true,
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Valor Total del Curso"
                      type="number"
                      value={cursoData.valorTotal}
                      margin="normal"
                      InputProps={{
                        readOnly: true,
                        startAdornment: (
                          <InputAdornment position="start">
                            <AttachMoneyIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        )


      default:
        return null
    }
  }


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "#0455a2",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
        }}
      >
        {isEditing ? "Editar Matrícula" : "Nueva Matrícula"}
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>


      <DialogContent sx={{ pt: 3, pb: 1, mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          <Step>
            <StepLabel
              icon={<EventNoteIcon color={activeStep >= 0 ? "primary" : "disabled"} />}
              StepIconProps={{
                completed: activeStep > 0,
                active: activeStep === 0,
              }}
            >
              Matrícula
            </StepLabel>
          </Step>
          {showCreateForm && (
            <>
              <Step>
                <StepLabel
                  icon={<PersonIcon color={activeStep >= 1 ? "primary" : "disabled"} />}
                  StepIconProps={{
                    completed: activeStep > 1,
                    active: activeStep === 1,
                  }}
                >
                  Cliente
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  icon={<SchoolIcon color={activeStep >= 2 ? "primary" : "disabled"} />}
                  StepIconProps={{
                    completed: activeStep > 2,
                    active: activeStep === 2,
                  }}
                >
                  Beneficiario
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  icon={<EventNoteIcon color={activeStep >= 3 ? "primary" : "disabled"} />}
                  StepIconProps={{
                    completed: activeStep > 3,
                    active: activeStep === 3,
                  }}
                >
                  Curso
                </StepLabel>
              </Step>
            </>
          )}
          {!showCreateForm && !isEditing && (
            <Step>
              <StepLabel
                icon={<EventNoteIcon color={activeStep >= 1 ? "primary" : "disabled"} />}
                StepIconProps={{
                  completed: activeStep > 1,
                  active: activeStep === 1,
                }}
              >
                Curso
              </StepLabel>
            </Step>
          )}
        </Stepper>


        {alertMessage.show && (
          <Alert
            severity={alertMessage.severity}
            sx={{ mb: 2 }}
            onClose={() => setAlertMessage({ show: false, message: "", severity: "info" })}
          >
            {alertMessage.message}
          </Alert>
        )}


        <Box sx={{ flexGrow: 1, overflow: "auto" }}>{renderStepContent()}</Box>
      </DialogContent>


      <DialogActions
        sx={{
          p: 2,
          bgcolor: "#f8f9fa",
          borderTop: "1px solid #e9ecef",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, ml: "auto" }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: "rgba(0, 0, 0, 0.12)",
              color: "text.secondary",
              "&:hover": {
                borderColor: "rgba(0, 0, 0, 0.24)",
              },
            }}
          >
            Cancelar
          </Button>
          {activeStep > 0 && (
            <Button
              onClick={handleBack}
              variant="outlined"
              sx={{
                textTransform: "none",
                borderColor: "#0455a2",
                color: "#0455a2",
                "&:hover": {
                  borderColor: "#033b70",
                },
              }}
            >
              Anterior
            </Button>
          )}
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <Button
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              variant="contained"
              disabled={isSubmitting}
              sx={{
                textTransform: "none",
                bgcolor: "#0455a2",
                "&:hover": {
                  bgcolor: "#033b70",
                },
              }}
            >
              {activeStep === steps.length - 1 ? "Guardar" : "Siguiente"}
            </Button>
            {activeStep === steps.length - 1 && isSubmitting && (
              <CircularProgress
                size={24}
                sx={{
                  color: green[500],
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: "-12px",
                  marginLeft: "-12px",
                }}
              />
            )}
          </Box>
        </Box>
      </DialogActions>


      <style jsx global>{`
        @keyframes slide-left {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slide-right {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Dialog>
  )
}


export default VentaMatriculasForm