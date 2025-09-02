const mongoose = require('mongoose');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/mga_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixAsistenciaIndexes() {
  try {
    console.log('🔧 Arreglando índices de la colección asistencias...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('asistencias');
    
    // 1. Verificar índices existentes
    const indexes = await collection.indexes();
    console.log('📊 Índices actuales:', indexes.map(idx => idx.name));
    
    // 2. Eliminar índices problemáticos
    const problematicIndexes = ['beneficiarioId_1_programacionClasesId_1'];
    
    for (const indexName of problematicIndexes) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Eliminado índice problemático: ${indexName}`);
      } catch (error) {
        console.log(`ℹ️ Índice ${indexName} no existe o ya fue eliminado`);
      }
    }
    
    // 3. Eliminar registros con campos null (que causan problemas)
    const result = await collection.deleteMany({
      $or: [
        { beneficiarioId: null },
        { programacionClasesId: null },
        { ventaId: null },
        { programacionClaseId: null }
      ]
    });
    console.log(`🗑️ Eliminados ${result.deletedCount} registros con campos null`);
    
    // 4. Crear el índice correcto
    try {
      await collection.createIndex(
        { ventaId: 1, programacionClaseId: 1 }, 
        { unique: true, name: 'ventaId_1_programacionClaseId_1' }
      );
      console.log('✅ Creado índice correcto: ventaId_1_programacionClaseId_1');
    } catch (error) {
      console.log('ℹ️ Índice correcto ya existe');
    }
    
    // 5. Verificar índices finales
    const finalIndexes = await collection.indexes();
    console.log('📊 Índices finales:', finalIndexes.map(idx => idx.name));
    
    console.log('✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error al arreglar índices:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixAsistenciaIndexes(); 