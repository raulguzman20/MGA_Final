const mongoose = require('mongoose');

const matriculaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  valorMatricula: {
    type: Number,
    required: true
  },
  estado: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Matricula', matriculaSchema);