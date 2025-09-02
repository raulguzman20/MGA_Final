const Venta = require("../models/Venta")
const Pago = require("../models/Pago")
const mongoose = require("mongoose")
const Contador = require("../models/Contador")

// GET - Obtener todas las ventas
exports.getVentas = async (req, res) => {
  try {
    const ventas = await Venta.find()
      .sort({ createdAt: -1 })
      .populate("beneficiarioId")
      .populate("matriculaId")
      .populate("cursoId")
    res.json(ventas)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET - Obtener una venta por ID
exports.getVentaById = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate("beneficiarioId")
      .populate("matriculaId")
      .populate("cursoId")
    if (venta) {
      res.json(venta)
    } else {
      res.status(404).json({ message: "Venta no encontrada" })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST - Crear una nueva venta CON MIDDLEWARE INTELIGENTE
exports.createVenta = async (req, res) => {
  try {
    // ✅ LOGS DETALLADOS PARA DEBUGGING
    console.log("=== DATOS RECIBIDOS PARA CREAR VENTA ===")
    console.log("Body completo:", JSON.stringify(req.body, null, 2))
    console.log("Headers relevantes:")
    console.log("  - x-skip-auto-payment:", req.headers["x-skip-auto-payment"])
    console.log("  - x-skip-auto-counter:", req.headers["x-skip-auto-counter"])
    console.log("  - x-source-module:", req.headers["x-source-module"])
    console.log("Tipo de venta:", req.body.tipo)
    console.log("BeneficiarioId:", req.body.beneficiarioId)
    console.log("MatriculaId:", req.body.matriculaId)
    console.log("CursoId:", req.body.cursoId)
    console.log("FechaInicio:", req.body.fechaInicio)
    console.log("FechaFin:", req.body.fechaFin)
    console.log("ValorTotal:", req.body.valor_total)
    console.log("Consecutivo:", req.body.consecutivo)
    console.log("CodigoVenta:", req.body.codigoVenta)
    console.log("MetodoPago:", req.body.metodoPago)
    console.log("NumeroTransaccion:", req.body.numeroTransaccion)

    // ✅ VERIFICAR FLAGS VIA HEADERS
    const skipAutoPayment = req.headers["x-skip-auto-payment"] === "true"
    const skipAutoCounter = req.headers["x-skip-auto-counter"] === "true"
    const sourceModule = req.headers["x-source-module"]

    console.log("🚫 FLAGS PROCESADOS:")
    console.log("  - skipAutoPayment:", skipAutoPayment)
    console.log("  - skipAutoCounter:", skipAutoCounter)
    console.log("  - sourceModule:", sourceModule)
    console.log("========================================")

    // Validar campos requeridos antes de crear la venta
    if (!req.body.beneficiarioId || !req.body.fechaInicio || !req.body.valor_total) {
      return res.status(400).json({ message: "Faltan campos requeridos en la solicitud", data: req.body })
    }

    // Validar campos específicos según el tipo de venta
    if (req.body.tipo === "curso" && !req.body.cursoId) {
      return res
        .status(400)
        .json({ message: "El campo cursoId es requerido para ventas de tipo curso", data: req.body })
    }

    if (req.body.tipo === "matricula" && !req.body.matriculaId) {
      return res
        .status(400)
        .json({ message: "El campo matriculaId es requerido para ventas de tipo matricula", data: req.body })
    }

    // Verificar si el código de venta ya existe
    const ventaExistente = await Venta.findOne({ codigoVenta: req.body.codigoVenta })
    if (ventaExistente) {
      return res.status(400).json({
        message: `El código de venta ${req.body.codigoVenta} ya existe en la base de datos`,
        data: req.body,
      })
    }

    // Crear objeto venta solo con los campos que pertenecen al modelo Venta
    const ventaData = {
      beneficiarioId: req.body.beneficiarioId ? new mongoose.Types.ObjectId(req.body.beneficiarioId) : undefined,
      matriculaId: req.body.matriculaId ? new mongoose.Types.ObjectId(req.body.matriculaId) : null,
      cursoId: req.body.cursoId ? new mongoose.Types.ObjectId(req.body.cursoId) : null,
      numero_de_clases: req.body.numero_de_clases ? Number.parseInt(req.body.numero_de_clases, 10) : null,
      ciclo: req.body.ciclo ? Number.parseInt(req.body.ciclo, 10) : null,
      tipo: req.body.tipo,
      fechaInicio: req.body.fechaInicio ? new Date(req.body.fechaInicio) : undefined,
      fechaFin: req.body.fechaFin ? new Date(req.body.fechaFin) : undefined,
      estado: req.body.estado,
      valor_total: req.body.valor_total,
      observaciones: req.body.observaciones || null,
      descuento: req.body.descuento || 0,
      consecutivo: req.body.consecutivo ? Number.parseInt(req.body.consecutivo, 10) : Date.now(),
      codigoVenta: req.body.codigoVenta,
    }

    // Forzar conversión a Date y loguear tipos
    ventaData.fechaInicio = ventaData.fechaInicio ? new Date(ventaData.fechaInicio) : undefined
    ventaData.fechaFin = ventaData.fechaFin ? new Date(ventaData.fechaFin) : undefined
    console.log("VENTA DATA ANTES DE GUARDAR:", ventaData)

    const venta = new Venta(ventaData)
    const nuevaVenta = await venta.save()
    console.log("✅ Venta creada exitosamente:", nuevaVenta._id)

    // ✅ MIDDLEWARE INTELIGENTE - INCREMENTAR CONTADOR SEGÚN TIPO DE VENTA
    if (!skipAutoCounter) {
      try {
        console.log("⚡ EJECUTANDO incremento automático de contador...")

        // ✅ INCREMENTAR EL CONTADOR CORRECTO SEGÚN EL TIPO
        const tipoContador = req.body.tipo === "matricula" ? "matricula" : "curso"
        console.log(`📊 Incrementando contador de tipo: ${tipoContador}`)

        await Contador.findByIdAndUpdate(tipoContador, { $inc: { seq: 1 } }, { new: true, upsert: true })
        console.log(`✅ Contador de ${tipoContador} incrementado automáticamente`)
      } catch (contadorError) {
        console.error(`❌ Error al incrementar contador de ${req.body.tipo}:`, contadorError)
      }
    } else {
      console.log("🚫 Incremento automático de contador OMITIDO por header x-skip-auto-counter=true")
    }

    // ✅ MIDDLEWARE INTELIGENTE - CREAR PAGO CON DATOS COMPLETOS
    if (!skipAutoPayment) {
      try {
        console.log("⚡ EJECUTANDO creación automática de pago...")
        console.log("💳 Datos de pago recibidos:")
        console.log("  - metodoPago:", req.body.metodoPago)
        console.log("  - numeroTransaccion:", req.body.numeroTransaccion)
        console.log("  - fechaPago:", req.body.fechaPago)

        const pago = new Pago({
          metodoPago: req.body.metodoPago || "Efectivo",
          ventas: nuevaVenta._id,
          fechaPago: req.body.fechaPago ? new Date(req.body.fechaPago) : new Date(),
          estado: "completado",
          valor_total: req.body.valor_total,
          descripcion:
            req.body.observaciones ||
            `Pago por ${req.body.tipo === "curso" ? "curso" : "matrícula"} ${req.body.codigoVenta}`,
          numeroTransaccion: req.body.metodoPago === "Efectivo" ? null : req.body.numeroTransaccion,
        })

        const nuevoPago = await pago.save()
        console.log("✅ Pago creado automáticamente:", nuevoPago._id)
        console.log("💰 Detalles del pago creado:")
        console.log("  - ID:", nuevoPago._id)
        console.log("  - Método:", nuevoPago.metodoPago)
        console.log("  - Valor:", nuevoPago.valor_total)
        console.log("  - Transacción:", nuevoPago.numeroTransaccion)
      } catch (pagoError) {
        console.error("❌ Error al crear pago automático:", pagoError)
      }
    } else {
      console.log("🚫 Creación automática de pago OMITIDA por header x-skip-auto-payment=true")
    }

    res.status(201).json(nuevaVenta)
  } catch (error) {
    console.error("❌ Error al crear venta:", error)
    console.error("Error details:", error.message)
    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors)
    }
    res.status(400).json({
      message: error.message,
      details: error.errors || error.stack,
    })
  }
}

// PUT - Actualizar una venta
exports.updateVenta = async (req, res) => {
  try {
    console.log("=== ACTUALIZANDO VENTA ===")
    console.log("ID:", req.params.id)
    console.log("Body:", JSON.stringify(req.body, null, 2))

    // Actualizar campos permitidos
    const camposPermitidos = [
      "beneficiarioId",
      "matriculaId",
      "cursoId",
      "numero_de_clases",
      "ciclo",
      "fechaInicio",
      "fechaFin",
      "estado",
      "valor_total",
      "observaciones",
      "descuento",
      "motivoAnulacion",
    ]

    const updateData = {}
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        updateData[campo] = req.body[campo]
      }
    })

    // Agregar updatedAt
    updateData.updatedAt = new Date()

    console.log("Datos a actualizar:", updateData)

    const ventaActualizada = await Venta.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: false,
    })

    if (!ventaActualizada) {
      return res.status(404).json({ message: "Venta no encontrada" })
    }

    console.log("Venta actualizada exitosamente:", ventaActualizada._id)
    res.json(ventaActualizada)
  } catch (error) {
    console.error("Error al actualizar venta:", error)
    console.error("Error details:", error.message)
    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors)
    }
    res.status(400).json({
      message: error.message,
      details: error.errors || error.stack,
    })
  }
}

// DELETE - Eliminar una venta
exports.deleteVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" })
    }

    await venta.deleteOne()
    res.json({ message: "Venta eliminada" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH - Anular una venta con motivo
exports.anularVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" })
    }
    if (!req.body.motivoAnulacion) {
      return res.status(400).json({ message: "Debe proporcionar un motivo de anulación" })
    }

    venta.estado = "anulada"
    venta.motivoAnulacion = req.body.motivoAnulacion
    venta.updatedAt = new Date()

    await venta.save()
    res.json({ message: "Venta anulada correctamente", venta })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET - Obtener el siguiente consecutivo disponible
exports.getNextConsecutivo = async (req, res) => {
  try {
    let contador = await Contador.findById("curso")

    if (!contador) {
      contador = new Contador({
        _id: "curso",
        seq: 0,
      })
      await contador.save()
    }

    const nextConsecutivo = contador.seq + 1
    res.json({ nextConsecutivo })
  } catch (error) {
    console.error("Error al obtener siguiente consecutivo:", error)
    res.status(500).json({ message: error.message })
  }
}
