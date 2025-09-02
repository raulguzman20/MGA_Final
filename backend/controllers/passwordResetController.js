const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Usuario = require('../models/usuario');
const PasswordReset = require('../models/PasswordReset');
const bcryptjs = require('bcryptjs');

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'raulguz327@gmail.com',
    pass: 'ursz cytv qlzs yywa'
  }
});

// POST /forgot-password - Solicitar recuperación de contraseña
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validar que se proporcione el email
    if (!email) {
      return res.status(400).json({
        error: 'El correo electrónico es requerido'
      });
    }

    // 2. Consultar la colección Usuarios para ver si existe un usuario con ese correo
    const usuario = await Usuario.findOne({ correo: email.toLowerCase() });
    
    if (!usuario) {
      return res.status(404).json({
        error: 'No existe una cuenta asociada a este correo electrónico.'
      });
    }

    // 3. Generar un token único de recuperación
    const token = crypto.randomBytes(32).toString('hex');
    
    // Eliminar tokens anteriores del usuario
    await PasswordReset.deleteMany({ userId: usuario._id });
    
    // Guardar el nuevo token en la base de datos
    const passwordReset = new PasswordReset({
      userId: usuario._id,
      token: token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
    });
    
    await passwordReset.save();

    // 4. Enviar un correo con un link que incluya el token
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    
    const mailOptions = {
      from: 'raulguz327@gmail.com',
      to: email,
      subject: 'MGA RESTABLECER CONTRASEÑA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Recuperación de Contraseña</h2>
          <p>Hola ${usuario.nombre},</p>
          <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a>
          </div>
          <p>Este enlace expirará en 1 hora por motivos de seguridad.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // 5. Devolver mensaje de éxito al frontend
    res.status(200).json({
      message: 'Hemos enviado un correo con instrucciones para restablecer tu contraseña.'
    });

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// POST /reset-password - Restablecer contraseña con token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token y nueva contraseña son requeridos'
      });
    }

    // Buscar el token en la base de datos
    const passwordReset = await PasswordReset.findOne({ 
      token: token,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    // Verificar que el usuario exista
    const usuario = await Usuario.findById(passwordReset.userId);
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Encriptar la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(newPassword, saltRounds);

    // ⚡ Actualizar solo la contraseña sin validar campos requeridos
    await Usuario.findByIdAndUpdate(
      usuario._id,
      { contrasena: hashedPassword },
      { new: true }
    );

    // Eliminar el token usado
    await PasswordReset.deleteOne({ _id: passwordReset._id });

    res.status(200).json({
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// GET /verify-token/:token - Verificar si un token es válido
const verifyToken = async (req, res) => {
  try {
    const { token } = req.params;

    const passwordReset = await PasswordReset.findOne({ 
      token: token,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return res.status(400).json({
        valid: false,
        error: 'Token inválido o expirado'
      });
    }

    res.status(200).json({
      valid: true,
      message: 'Token válido'
    });

  } catch (error) {
    console.error('Error en verifyToken:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  verifyToken
};