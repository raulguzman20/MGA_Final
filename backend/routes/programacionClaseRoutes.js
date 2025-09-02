const express = require("express")
const router = express.Router()

// ✅ IMPORTAR CORRECTAMENTE LAS FUNCIONES
const {
  createProgramacion,
  getProgramaciones,
  updateProgramacion,
  updateEstado,
  deleteProgramacion,
} = require("../controllers/programacionClaseController")

// ✅ RUTAS CON FUNCIONES CORRECTAS
router.post("/", createProgramacion)
router.get("/", getProgramaciones)
router.put("/:id", updateProgramacion)
router.patch("/:id/estado", updateEstado) // NUEVA RUTA PARA SOLO CAMBIAR ESTADO
router.delete("/:id", deleteProgramacion)

module.exports = router
