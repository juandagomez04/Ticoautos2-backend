const nodemailer = require("nodemailer");

// Configuración del transporter (compatible con Gmail, Outlook, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",   // true para puerto 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía el correo de verificación de cuenta.
 * @param {string} toEmail  Correo del destinatario
 * @param {string} toName   Nombre del usuario
 * @param {string} token    Token de verificación
 */
async function sendVerificationEmail(toEmail, toName, token) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyLink = `${frontendUrl}/pages/auth/verify.html?token=${token}`;
  const fromAddress = `"TicoAutos" <${process.env.EMAIL_USER}>`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu cuenta</title>
    </head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
                  style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
                  <h1 style="margin:0;font-size:28px;font-weight:800;color:#22c55e;letter-spacing:-0.5px;">TicoAutos</h1>
                  <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">Plataforma de compra y venta de vehículos</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Verificación de cuenta</p>
                  <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f8fafc;">
                    ¡Hola, ${toName}!
                  </h2>
                  <p style="margin:0 0 24px;color:#cbd5e1;line-height:1.7;font-size:15px;">
                    Gracias por registrarte en <strong style="color:#f8fafc;">TicoAutos</strong>.
                    Para activar tu cuenta y comenzar a publicar o explorar vehículos,
                    confirmá tu dirección de correo haciendo clic en el botón de abajo.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                    <tr>
                      <td align="center" style="background:#22c55e;border-radius:12px;">
                        <a href="${verifyLink}"
                          style="display:inline-block;padding:14px 32px;color:#052e16;font-weight:700;font-size:15px;text-decoration:none;">
                          Verificar mi cuenta
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
                    Si el botón no funciona, copiá este enlace en tu navegador:
                  </p>
                  <p style="margin:0 0 24px;word-break:break-all;">
                    <a href="${verifyLink}" style="color:#22c55e;font-size:13px;">${verifyLink}</a>
                  </p>

                  <!-- Warning box -->
                  <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px;">
                    <p style="margin:0;color:#fcd34d;font-size:13px;line-height:1.6;">
                      ⚠️ Este enlace es válido por <strong>24 horas</strong>.
                      Si no creaste esta cuenta, podés ignorar este correo.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
                  <p style="margin:0;color:#475569;font-size:12px;">
                    TicoAutos © ${new Date().getFullYear()} — Plataforma de compra y venta de vehículos en Costa Rica
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: "Verificá tu cuenta en TicoAutos",
    html,
  });
}

module.exports = { sendVerificationEmail };
