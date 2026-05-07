const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Devuelve true si el mensaje contiene información de contacto personal
 */
async function containsContactInfo(text) {
    const response = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 5,
        messages: [
            {
                role: "system",
                content:
                    "Eres un moderador de mensajes para una plataforma de venta de autos en Costa Rica. " +
                    "Tu única tarea es determinar si el mensaje contiene información que permita contacto fuera de la plataforma. " +
                    "Debes detectar: números de teléfono (incluyendo números solos de 8 dígitos que empiecen con 6, 7 u 8, típicos de Costa Rica), " +
                    "correos electrónicos, usuarios de redes sociales (WhatsApp, Instagram, Telegram, etc.), " +
                    "direcciones físicas, o cualquier otro dato de contacto personal. " +
                    "Si el mensaje contiene SOLO dígitos agrupados de 8 cifras, trátalo como número de teléfono. " +
                    "Ante la duda, responde YES. " +
                    "Responde ÚNICAMENTE con la palabra YES si contiene información de contacto, o NO si no la contiene.",
            },
            {
                role: "user",
                content: text,
            },
        ],
    });

    const answer = response.choices[0].message.content.trim().toUpperCase();
    return answer.startsWith("YES");
}

module.exports = { containsContactInfo };
