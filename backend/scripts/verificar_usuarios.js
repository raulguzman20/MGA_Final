require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/usuario');

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://raul321:pass123@cluster0.xjeaj.mongodb.net/MGA';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });

async function verificarUsuarios() {
  try {
    // Obtener todos los usuarios
    const usuarios = await Usuario.find().select('_id nombre apellido correo contrasena');
    
    if (usuarios.length === 0) {
      console.log('No hay usuarios en la base de datos.');
      return;
    }
    
    console.log(`Se encontraron ${usuarios.length} usuarios:`);
    
    // Mostrar información de cada usuario
    usuarios.forEach((usuario, index) => {
      console.log(`\nUsuario ${index + 1}:`);
      console.log(`ID: ${usuario._id}`);
      console.log(`Nombre: ${usuario.nombre} ${usuario.apellido}`);
      console.log(`Correo: ${usuario.correo}`);
      console.log(`Contraseña (hash): ${usuario.contrasena ? usuario.contrasena.substring(0, 20) + '...' : 'No tiene contraseña'}`);
      console.log(`La contraseña está hasheada: ${usuario.contrasena && usuario.contrasena.startsWith('$2') ? 'Sí' : 'No'}`);
    });
    
    console.log('\nVerificación completada.');
  } catch (error) {
    console.error('Error al verificar usuarios:', error);
  } finally {
    // Cerrar conexión
    mongoose.connection.close();
  }
}

verificarUsuarios();