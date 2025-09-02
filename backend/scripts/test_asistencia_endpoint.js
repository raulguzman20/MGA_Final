const axios = require('axios');

async function testAsistenciaEndpoint() {
  try {
    console.log('🔄 Probando endpoint de asistencia...');
    
    // Datos de prueba
    const testData = {
      programacionClaseId: 68782a58798252598,
      asistencias: [
        {
          ventaId: 685a6c32111,
          estado: 'asistio',
          motivo: null
        }
      ]
    };
    
    console.log('📋 Datos de prueba:', testData);
    
    const url = `http://localhost:300pi/asistencias/programacion/${testData.programacionClaseId}/bulk`;
    console.log('🌐 URL:', url);
    
    const response = await axios.put(url, { asistencias: testData.asistencias });
    
    console.log('✅ Respuesta exitosa:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('📋 Status:', error.response?.status);
    console.error('📋 URL:', error.config?.url);
  }
}

testAsistenciaEndpoint(); 