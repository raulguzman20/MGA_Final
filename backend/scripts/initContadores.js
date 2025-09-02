const mongoose = require('mongoose');
const Contador = require('../models/Contador');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://raul321:pass123@cluster0.xjeaj.mongodb.net/MGA';

async function initContadores() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Contadores a crear
    const contadores = [
      { _id: 'matricula', seq: 0 },
      { _id: 'curso', seq: 0 }
    ];

    for (const contador of contadores) {
      try {
        // Verificar si ya existe
        const existente = await Contador.findById(contador._id);
        if (existente) {
          console.log(`Contador ${contador._id} ya existe con valor: ${existente.seq}`);
        } else {
          // Crear nuevo contador
          const nuevoContador = new Contador(contador);
          await nuevoContador.save();
          console.log(`Contador ${contador._id} creado con valor inicial: ${contador.seq}`);
        }
      } catch (error) {
        console.error(`Error al procesar contador ${contador._id}:`, error.message);
      }
    }

    // Mostrar todos los contadores
    const todosContadores = await Contador.find();
    console.log('\nContadores en la base de datos:');
    todosContadores.forEach(c => {
      console.log(`- ${c._id}: ${c.seq}`);
    });

    console.log('\n✅ Inicialización de contadores completada');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initContadores();
}

module.exports = initContadores; 