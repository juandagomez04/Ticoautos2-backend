const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSmsCode(toPhone, code) {
  await client.messages.create({
    body: `Tu código de verificación TicoAutos es: ${code}. Válido por 5 minutos.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: toPhone,
  });
}

module.exports = { sendSmsCode };
