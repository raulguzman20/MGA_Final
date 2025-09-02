const mongoose = require('mongoose');
const Asistencia = require('../models/Asistencia');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/mga_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupDuplicateAsistencias() {
  try {
    console.log('🔍 Buscando registros de asistencia duplicados...');
    
    // Agrupar por ventaId y programacionClaseId
    const duplicates = await Asistencia.aggregate([
      {
        $group: {
          _id: { ventaId: '$ventaId', programacionClaseId: '$programacionClaseId' },
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📊 Encontrados ${duplicates.length} grupos de duplicados`);

    for (const duplicate of duplicates) {
      console.log(`🗑️ Limpiando duplicados para ventaId: ${duplicate._id.ventaId}, programacionClaseId: ${duplicate._id.programacionClaseId}`);
      
      // Mantener solo el primer registro, eliminar los demás
      const [keepId, ...deleteIds] = duplicate.docs;
      
      if (deleteIds.length > 0) {
        const result = await Asistencia.deleteMany({ _id: { $in: deleteIds } });
        console.log(`✅ Eliminados ${result.deletedCount} registros duplicados`);
      }
    }

    console.log('✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupDuplicateAsistencias(); 