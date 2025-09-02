const mongoose = require('mongoose');
const Asistencia = require('../models/Asistencia');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://raul321pass123luster0.xjeaj.mongodb.net/MGA;

async function checkAsistencias() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔄 Verificando datos de asistencia...');
    
    // Contar total de asistencias
    const totalAsistencias = await Asistencia.countDocuments();
    console.log(`📊 Total de asistencias: ${totalAsistencias}`);

    if (totalAsistencias === 0) {
      console.log('⚠️ No hay registros de asistencia en la base de datos');
      console.log('💡 Esto explica por qué la página de Asistencia no muestra datos');
      console.log('💡 Los registros de asistencia se crean cuando se registra la asistencia de una clase');
    } else {
      // Mostrar algunas asistencias de ejemplo
      const asistencias = await Asistencia.find()
        .populate({
          path: 'ventaId',
          populate: [
            {
              path: 'beneficiarioId',
              select: 'nombre apellido'
            }
          ]
        })
        .populate({
          path: 'programacionClaseId',
          populate: [
            {
              path: 'programacionProfesor',
              populate: [
                {
                  path: 'profesor',
                  select: 'nombres apellidos'
                }
              ]
            }
          ]
        })
        .limit(5);
      console.log('📋 Muestra de asistencias:');
      asistencias.forEach((asistencia, index) => {
        console.log(`  ${index + 1}. ID: ${asistencia._id}`);
        console.log(`     Venta ID: ${asistencia.ventaId?._id || 'Sin venta'}`);
        console.log(`     Beneficiario: ${asistencia.ventaId?.beneficiarioId ? 
          `${asistencia.ventaId.beneficiarioId.nombre} ${asistencia.ventaId.beneficiarioId.apellido}` : 
          'Sin beneficiario'}`);
        console.log(`     Clase ID: ${asistencia.programacionClaseId?._id || 'Sin clase'}`);
        console.log(`     Especialidad: ${asistencia.programacionClaseId?.especialidad || 'Sin especialidad'}`);
        console.log(`     Estado: ${asistencia.estado}`);
        console.log(`     Motivo: ${asistencia.motivo || 'Sin motivo'}`);
        console.log(
      });
    }

    // Verificar si hay clases programadas
    const ProgramacionClase = require('../models/ProgramacionClase');
    const totalClases = await ProgramacionClase.countDocuments();
    console.log(`📊 Total de clases programadas: ${totalClases}`);

    if (totalClases > 0) {
      const clasesConBeneficiarios = await ProgramacionClase.countDocuments({
        beneficiarios: { $exists: true }
      });
      console.log(`📊 Clases con beneficiarios: ${clasesConBeneficiarios}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

checkAsistencias(); 