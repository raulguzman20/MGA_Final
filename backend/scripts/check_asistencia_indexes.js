const mongoose = require('mongoose');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/mga_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAsistenciaIndexes() {
  try {
    console.log('🔍 Verificando índices de la colección asistencias...');
    
    const db = mongoose.connection.db;
    const indexes = await db.collection('asistencias').indexes();
    
    console.log('📊 Índices encontrados:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. Nombre: ${index.name}`);
      console.log(`   Campos:`, index.key);
      console.log(`   Único: ${index.unique || false}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error al verificar índices:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAsistenciaIndexes(); 