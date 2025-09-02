const Pago = require('../models/Pago');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');
const Beneficiario = require('../models/Beneficiario');
const UsuarioHasRol = require('../models/UsuarioHasRol');
const Usuario = require('../models/usuario');

const pagoController = {
  async getPagos(req, res) {
    try {
      // Verificar si se está filtrando por cliente
      const { clienteId, documento } = req.query;
      // Reemplazar estrategia de filtro: filtrar por rol cuando aplica
      const role = (req.user?.rolNombre || '').toLowerCase();

      let pagos = [];

      // Helper: obtener beneficiario del usuario actual por usuario_has_rol o documento
      const getBeneficiarioByUsuario = async (usuarioId) => {
        try {
          // Usar la relación usuario-rol actual si existe
          if (req.user?.rolId) {
            const relacion = await UsuarioHasRol.findOne({ usuarioId, rolId: req.user.rolId, estado: true });
            if (relacion) {
              const b = await Beneficiario.findOne({ usuario_has_rolId: relacion._id });
              if (b) return b;
            }
          }
          // Fallback por documento del usuario
          const usuario = await Usuario.findById(usuarioId).select('documento');
          if (usuario?.documento) {
            const b = await Beneficiario.findOne({ numero_de_documento: usuario.documento });
            if (b) return b;
          }
        } catch (e) {
          console.warn('No se pudo resolver beneficiario por usuario:', e.message);
        }
        return null;
      };

      // Helper: cargar pagos por ventas ids
      const loadPagosByVentaIds = async (ventaIds) => {
        return await Pago.find({ ventas: { $in: ventaIds } })
          .populate({
            path: 'ventas',
            populate: [{
              path: 'beneficiarioId',
              model: 'Beneficiario'
            }]
          })
          .sort({ createdAt: -1 });
      };

      if (role === 'beneficiario') {
        // Filtrar SOLO los pagos del propio beneficiario
        const b = await getBeneficiarioByUsuario(req.user.id);
        if (!b) {
          return res.json({ success: true, data: [], total: 0 });
        }
        const ventas = await Venta.find({ beneficiarioId: b._id }).select('_id');
        const ventaIds = ventas.map(v => v._id);
        pagos = await loadPagosByVentaIds(ventaIds);
      } else if (role === 'cliente') {
        // Filtrar pagos del cliente: sus propios pagos (si es cliente-beneficiario) y de sus beneficiarios asociados
        const clienteBeneficiario = await getBeneficiarioByUsuario(req.user.id);
        if (!clienteBeneficiario) {
          return res.json({ success: true, data: [], total: 0 });
        }
        // Beneficiarios asociados a este cliente (incluyéndolo si aplica)
        const asociados = await Beneficiario.find({
          $or: [
            { _id: clienteBeneficiario._id },
            { clienteId: String(clienteBeneficiario._id) },
            // Compatibilidad: algunos clientes se marcan como 'cliente'
            ...(clienteBeneficiario.clienteId === 'cliente' ? [{ _id: clienteBeneficiario._id }] : [])
          ]
        }).select('_id');
        const beneficiarioIds = asociados.map(b => b._id);
        const ventas = await Venta.find({ beneficiarioId: { $in: beneficiarioIds } }).select('_id');
        const ventaIds = ventas.map(v => v._id);
        pagos = await loadPagosByVentaIds(ventaIds);
      } else {
        // Roles administrativos u otros: permitir filtros explícitos cuando existan
        if (clienteId) {
          // Buscar beneficiarios cuyo clienteId coincida o que sean el propio cliente
          const beneficiarios = await Beneficiario.find({
            $or: [
              { clienteId: String(clienteId) },
              { _id: clienteId }
            ]
          }).select('_id');
          const beneficiarioIds = beneficiarios.map(b => b._id);
          const ventas = await Venta.find({ beneficiarioId: { $in: beneficiarioIds } }).select('_id');
          const ventaIds = ventas.map(v => v._id);
          pagos = await loadPagosByVentaIds(ventaIds);
        } else if (documento) {
          // Intentar resolver por documento (cliente o beneficiario)
          let beneficiarioPrincipal = await Beneficiario.findOne({ numero_de_documento: documento });
          if (!beneficiarioPrincipal) {
            // Compatibilidad con colección Cliente
            const cliente = await Cliente.findOne({ numeroDocumento: documento });
            if (cliente) {
              // Buscar beneficiario cuyo clienteId sea este cliente (si existiera relación por ID)
              beneficiarioPrincipal = await Beneficiario.findOne({ clienteId: String(cliente._id) });
            }
          }
          if (!beneficiarioPrincipal) {
            return res.json({ success: true, data: [], total: 0, message: 'No se encontraron pagos para el documento indicado' });
          }
          const asociados = await Beneficiario.find({
            $or: [
              { _id: beneficiarioPrincipal._id },
              { clienteId: String(beneficiarioPrincipal._id) }
            ]
          }).select('_id');
          const beneficiarioIds = asociados.map(b => b._id);
          const ventas = await Venta.find({ beneficiarioId: { $in: beneficiarioIds } }).select('_id');
          const ventaIds = ventas.map(v => v._id);
          pagos = await loadPagosByVentaIds(ventaIds);
        } else {
          // Sin filtros: retornar todos
          pagos = await Pago.find()
            .populate({
              path: 'ventas',
              populate: [{
                path: 'beneficiarioId',
                model: 'Beneficiario'
              }]
            })
            .sort({ createdAt: -1 });
        }
      }

      const pagosFormateados = await Promise.all(pagos.map(async (pago) => {
        const pagoObj = pago.toObject();
        
        // Buscar información del cliente si existe clienteId
        let clienteInfo = null;
        if (pagoObj.ventas?.beneficiarioId?.clienteId) {
          const beneficiario = pagoObj.ventas.beneficiarioId;
          
          // Si el clienteId es igual al _id del beneficiario, duplicar la información
          if (beneficiario.clienteId === beneficiario._id.toString()) {
            clienteInfo = {
              _id: beneficiario._id,
              nombre: beneficiario.nombre,
              apellido: beneficiario.apellido,
              tipoDocumento: beneficiario.tipo_de_documento,
              numeroDocumento: beneficiario.numero_de_documento,
              telefono: beneficiario.telefono,
              correo: beneficiario.email || beneficiario.correo || '',
              direccion: beneficiario.direccion,
              fechaNacimiento: beneficiario.fechaDeNacimiento,
              estado: true
            };
          } else {
            // Si son diferentes, buscar la información real del cliente
            try {
              // Primero intentar buscar en la colección de clientes
              const cliente = await Cliente.findById(beneficiario.clienteId);
              if (cliente) {
                clienteInfo = {
                  _id: cliente._id,
                  nombre: cliente.nombre,
                  apellido: cliente.apellido,
                  tipoDocumento: cliente.tipoDocumento,
                  numeroDocumento: cliente.numeroDocumento,
                  telefono: cliente.telefono,
                  estado: cliente.estado
                };
              } else {
                // Si no se encuentra en clientes, buscar en beneficiarios
                const Beneficiario = require('../models/Beneficiario');
                const clienteBeneficiario = await Beneficiario.findById(beneficiario.clienteId);
                if (clienteBeneficiario) {
                  clienteInfo = {
                    _id: clienteBeneficiario._id,
                    nombre: clienteBeneficiario.nombre,
                    apellido: clienteBeneficiario.apellido,
                    tipoDocumento: clienteBeneficiario.tipo_de_documento,
                    numeroDocumento: clienteBeneficiario.numero_de_documento,
                    telefono: clienteBeneficiario.telefono,
                    estado: true
                  };
                } else {
                  console.log('Cliente no encontrado en ninguna colección con ID:', beneficiario.clienteId);
                }
              }
            } catch (error) {
              console.log('Error buscando cliente:', error.message);
            }
          }
        }

        return {
          _id: pagoObj._id,
          metodoPago: pagoObj.metodoPago,
          fechaPago: pagoObj.fechaPago,
          valor_total: pagoObj.valor_total,
          descripcion: pagoObj.descripcion,
          numeroTransaccion: pagoObj.numeroTransaccion,
          estado: pagoObj.estado,
          createdAt: pagoObj.createdAt,
          updatedAt: pagoObj.updatedAt,
          ventas: pagoObj.ventas ? {
            _id: pagoObj.ventas._id,
            valor_total: pagoObj.ventas.valor_total || 0,
            codigoVenta: pagoObj.ventas.codigoVenta,
            tipo: pagoObj.ventas.tipo,
            estado: pagoObj.ventas.estado,
            fechaInicio: pagoObj.ventas.fechaInicio,
            fechaFin: pagoObj.ventas.fechaFin,
            numero_de_clases: pagoObj.ventas.numero_de_clases,
            ciclo: pagoObj.ventas.ciclo,
            beneficiario: pagoObj.ventas.beneficiarioId ? {
              _id: pagoObj.ventas.beneficiarioId._id,
              nombre: pagoObj.ventas.beneficiarioId.nombre,
              apellido: pagoObj.ventas.beneficiarioId.apellido,
              tipo_de_documento: pagoObj.ventas.beneficiarioId.tipo_de_documento,
              numero_de_documento: pagoObj.ventas.beneficiarioId.numero_de_documento,
              telefono: pagoObj.ventas.beneficiarioId.telefono,
              direccion: pagoObj.ventas.beneficiarioId.direccion,
              fechaDeNacimiento: pagoObj.ventas.beneficiarioId.fechaDeNacimiento,
              clienteId: pagoObj.ventas.beneficiarioId.clienteId,
              cliente: clienteInfo
            } : null
          } : null
        };
      }));

      res.json({
        success: true,
        data: pagosFormateados,
        total: pagosFormateados.length
      });
    } catch (error) {
      console.error('Error en getPagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los pagos',
        error: error.message
      });
    }
  },

  async getPagoById(req, res) {
    try {
      const pago = await Pago.findById(req.params.id)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      const pagoObj = pago.toObject();
      
      // Buscar información del cliente si existe clienteId
      let clienteInfo = null;
      if (pagoObj.ventas?.beneficiarioId?.clienteId) {
        const beneficiario = pagoObj.ventas.beneficiarioId;
        
        // Si el clienteId es igual al _id del beneficiario, duplicar la información
        if (beneficiario.clienteId === beneficiario._id.toString()) {
          clienteInfo = {
            _id: beneficiario._id,
            nombre: beneficiario.nombre,
            apellido: beneficiario.apellido,
            tipoDocumento: beneficiario.tipo_de_documento,
            numeroDocumento: beneficiario.numero_de_documento,
            telefono: beneficiario.telefono,
            correo: beneficiario.email || beneficiario.correo || '',
            direccion: beneficiario.direccion,
            fechaNacimiento: beneficiario.fechaDeNacimiento,
            estado: true
          };
                 } else {
           // Si son diferentes, buscar la información real del cliente
           try {
             // Primero intentar buscar en la colección de clientes
             const cliente = await Cliente.findById(beneficiario.clienteId);
             if (cliente) {
               clienteInfo = {
                 _id: cliente._id,
                 nombre: cliente.nombre,
                 apellido: cliente.apellido,
                 tipoDocumento: cliente.tipoDocumento,
                 numeroDocumento: cliente.numeroDocumento,
                 telefono: cliente.telefono,
                 estado: cliente.estado
               };
             } else {
               // Si no se encuentra en clientes, buscar en beneficiarios
               const Beneficiario = require('../models/Beneficiario');
               const clienteBeneficiario = await Beneficiario.findById(beneficiario.clienteId);
               if (clienteBeneficiario) {
                 clienteInfo = {
                   _id: clienteBeneficiario._id,
                   nombre: clienteBeneficiario.nombre,
                   apellido: clienteBeneficiario.apellido,
                   tipoDocumento: clienteBeneficiario.tipo_de_documento,
                   numeroDocumento: clienteBeneficiario.numero_de_documento,
                   telefono: clienteBeneficiario.telefono,
                   estado: true
                 };
               } else {
                 console.log('Cliente no encontrado en ninguna colección con ID:', beneficiario.clienteId);
               }
             }
           } catch (error) {
             console.log('Error buscando cliente:', error.message);
           }
         }
      }

      res.json({
        success: true,
        data: {
          ...pagoObj,
          ventas: pagoObj.ventas ? {
            ...pagoObj.ventas,
            beneficiario: pagoObj.ventas.beneficiarioId ? {
              ...pagoObj.ventas.beneficiarioId,
              cliente: clienteInfo
            } : null
          } : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el pago',
        error: error.message
      });
    }
  },

  async createPago(req, res) {
    try {
      // Validar que solo se incluyan los campos permitidos
      const { metodoPago, ventas, fechaPago, estado, valor_total, descripcion, numeroTransaccion } = req.body;
      const nuevoPago = new Pago({ 
        metodoPago, 
        ventas,
        fechaPago: fechaPago || new Date(),
        estado: estado || 'completado',
        valor_total,
        descripcion,
        numeroTransaccion
      });
      
      await nuevoPago.save();
      
      const pagoCompleto = await Pago.findById(nuevoPago._id)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      res.status(201).json({
        success: true,
        data: pagoCompleto
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al crear el pago',
        error: error.message
      });
    }
  },

  async updatePago(req, res) {
    try {
      // Filtrar solo los campos permitidos para actualización
      const { metodoPago, ventas, fechaPago, estado, valor_total, descripcion, numeroTransaccion } = req.body;
      const updateData = {};
      
      if (metodoPago !== undefined) updateData.metodoPago = metodoPago;
      if (ventas !== undefined) updateData.ventas = ventas;
      if (fechaPago !== undefined) updateData.fechaPago = fechaPago;
      if (estado !== undefined) updateData.estado = estado;
      if (valor_total !== undefined) updateData.valor_total = valor_total;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (numeroTransaccion !== undefined) updateData.numeroTransaccion = numeroTransaccion;

      const pago = await Pago.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      res.json({
        success: true,
        data: pago
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el pago',
        error: error.message
      });
    }
  },

  async deletePago(req, res) {
    try {
      const pago = await Pago.findByIdAndDelete(req.params.id);

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Pago eliminado correctamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el pago',
        error: error.message
      });
    }
  },

  async debugPagos(req, res) {
    try {
      console.log('=== DEBUG PAGOS ===');
      const pagos = await Pago.find().limit(1)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      res.json({
        success: true,
        data: pagos
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en debug de pagos',
        error: error.message
      });
    }
  },

  async debugCliente(req, res) {
    try {
      console.log('=== DEBUG CLIENTE ===');
      const { clienteId } = req.params;
      
      console.log('Buscando cliente con ID:', clienteId);
      
      // Verificar si el ID es válido
      const mongoose = require('mongoose');
      const isValidId = mongoose.Types.ObjectId.isValid(clienteId);
      console.log('¿Es un ObjectId válido?:', isValidId);
      
      // Intentar buscar el cliente
      const cliente = await Cliente.findById(clienteId);
      
      if (cliente) {
        console.log('Cliente encontrado:', cliente);
        res.json({
          success: true,
          data: cliente
        });
      } else {
        console.log('Cliente no encontrado');
        
        // Intentar buscar por otros campos
        const clientePorDocumento = await Cliente.findOne({ numeroDocumento: clienteId });
        const clientePorNombre = await Cliente.findOne({ nombre: clienteId });
        
        // Obtener todos los clientes para ver qué hay en la base de datos
        const todosLosClientes = await Cliente.find().limit(5);
        
        // Buscar en beneficiarios para ver si el clienteId corresponde a un beneficiario
        const Beneficiario = require('../models/Beneficiario');
        const beneficiarioConClienteId = await Beneficiario.findOne({ _id: clienteId });
        const beneficiarioPorClienteId = await Beneficiario.findOne({ clienteId: clienteId });
        
        res.json({
          success: false,
          message: 'Cliente no encontrado',
          debug: {
            clienteId,
            isValidObjectId: isValidId,
            clientePorDocumento: clientePorDocumento ? 'Encontrado por documento' : 'No encontrado',
            clientePorNombre: clientePorNombre ? 'Encontrado por nombre' : 'No encontrado',
            totalClientes: await Cliente.countDocuments(),
            primerosClientes: todosLosClientes.map(c => ({
              _id: c._id,
              nombre: c.nombre,
              apellido: c.apellido,
              numeroDocumento: c.numeroDocumento
            })),
            beneficiarioConClienteId: beneficiarioConClienteId ? {
              _id: beneficiarioConClienteId._id,
              nombre: beneficiarioConClienteId.nombre,
              apellido: beneficiarioConClienteId.apellido,
              numero_de_documento: beneficiarioConClienteId.numero_de_documento,
              clienteId: beneficiarioConClienteId.clienteId
            } : 'No encontrado',
            beneficiarioPorClienteId: beneficiarioPorClienteId ? {
              _id: beneficiarioPorClienteId._id,
              nombre: beneficiarioPorClienteId.nombre,
              apellido: beneficiarioPorClienteId.apellido,
              numero_de_documento: beneficiarioPorClienteId.numero_de_documento,
              clienteId: beneficiarioPorClienteId.clienteId
            } : 'No encontrado'
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en debug de cliente',
        error: error.message
      });
    }
  }
};

module.exports = pagoController;