const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'controllers', 'ventaController.js');

try {
  const content = fs.readFileSync(controllerPath, 'utf8');
  const lines = content.split('\n');
  
  // Buscar el método anularVenta
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('exports.anularVenta')) {
      startLine = i;
      break;
    }
  }
  
  if (startLine !== -1) {
    // Buscar el final del método (próxima función o fin del archivo)
    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].includes('exports.') && i > startLine) {
        endLine = i - 1;
        break;
      }
    }
    
    if (endLine === -1) {
      endLine = lines.length - 1;
    }
    
    console.log('=== MÉTODO ANULARVENTA ===');
    for (let i = startLine; i <= endLine; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    console.log('==========================');
  } else {
    console.log('No se encontró el método anularVenta');
  }
  
} catch (error) {
  console.error('Error al leer el archivo:', error);
} 