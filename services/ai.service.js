const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Devuelve true si el mensaje contiene información de contacto personal*/

async function containsContactInfo(text) {
    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content:
                    "Eres un moderador de mensajes para una plataforma de venta de autos. " +
                    "Tu única tarea es determinar si el mensaje del usuario contiene información de contacto personal: " +
                    "números de teléfono, correos electrónicos, usuarios de redes sociales (WhatsApp, Instagram, Telegram, etc.), " +
                    "direcciones físicas o cualquier otro dato que permita contacto fuera de la plataforma. " +
                    "Responde ÚNICAMENTE con la palabra YES si contiene información de contacto, o NO si no la contiene.",
            },
            {
                role: "user",
                content: text,
            },
        ],
        max_tokens: 5,
        temperature: 0,
    });

    const answer = response.choices[0].message.content.trim().toUpperCase();
    return answer === "YES";
}

module.exports = { containsContactInfo };
