const nodemailer = require('nodemailer');

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'raulguz327@gmail.com',
    pass: 'ursz cytv qlzs yywa'
  }
});

const emailController = {
  // Función para enviar correo de recuperación de contraseña
  sendPasswordRecoveryEmail: async (email, token) => {
    try {
      const mailOptions = {
        from: 'raulguz327@gmail.com',
        to: email,
        subject: 'Recuperación de Contraseña - Te Acuerdas',
        html: `
          <h1>Recuperación de Contraseña</h1>
          <p>Has solicitado restablecer tu contraseña.</p>
          <p>Utiliza el siguiente token para completar el proceso: ${token}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de recuperación:', error);
      return false;
    }
  },

  // Función para enviar correo de bienvenida
  sendWelcomeEmail: async (email, nombre, apellido, username, password) => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://app.teacuerdas.test';
      const mailOptions = {
        from: 'raulguz327@gmail.com',
        to: email,
        subject: '¡Bienvenido a la Academia Té Acuerdas!',
        html: `
          <!-- Preheader (visible in some inbox previews) -->
          <span style="display:none;max-height:0px;overflow:hidden;">Tu cuenta en Te Acuerdas está lista. Aquí tienes tus credenciales de acceso.</span>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f6f8;padding:24px 0;font-family:Arial, Helvetica, sans-serif;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="padding:20px 24px;background:#0b5ed7;color:#ffffff;text-align:left;">
                      <h1 style="margin:0;font-size:20px;font-weight:700;">¡Bienvenido a la Academia Té Acuerdas!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 24px;color:#333333;font-size:14px;line-height:1.5;">
                      <p style="margin:0 0 12px 0;">Hola ${nombre || ''} ${apellido || ''},</p>
                      <p style="margin:0 0 12px 0;">Gracias por unirte a nuestra plataforma. Aquí abajo encontrarás las credenciales que puedes usar para iniciar sesión.</p>

                      <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:16px 0;background:#f8fafc;border:1px solid #e6eef8;border-radius:6px;">
                        <tr>
                          <td style="padding:12px 16px;color:#111827;font-size:13px;">
                            <strong>Correo electrónico:</strong> ${email}<br>
                            <strong>Usuario:</strong> ${username || email}<br>
                            <strong>Contraseña:</strong> ${password}
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 18px 0;">Por seguridad, te recomendamos cambiar tu contraseña la primera vez que inicies sesión.</p>

                      <p style="margin:0 0 18px 0;text-align:center;">
                        <a href="${frontendUrl}/login" style="display:inline-block;padding:10px 18px;background:#0b5ed7;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Iniciar sesión</a>
                      </p>

                      <p style="margin:0 0 6px 0;color:#6b7280;font-size:13px;">Si no reconoces esta cuenta o crees que hubo un error, contáctanos respondiendo este correo.</p>
                      <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px;">¡Te deseamos una excelente experiencia!<br>El equipo de la Academia Té Acuerdas</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 24px;background:#f1f5f9;color:#9aa4b2;font-size:12px;text-align:center;">
                      <div>© ${new Date().getFullYear()} Academia Té Acuerdas. Todos los derechos reservados.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `
      };
      
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de bienvenida:', error);
      return false;
    }
  }
};

module.exports = emailController;
