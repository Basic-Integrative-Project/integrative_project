// Provides AI-powered features: generating email reply suggestions and extracting meeting data from email content.
const openai = require("../config/openai");

// Calls OpenAI to generate a professional reply suggestion based on the email content and category.
async function suggestReply({ subject, text, from, tag }) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `Eres un asistente que redacta respuestas profesionales y cordiales a correos laborales.\nRedacta una respuesta breve (máximo 4 oraciones) al correo que te van a mostrar.\nLa respuesta debe ser en español, profesional, directa y lista para enviar.\nNo agregues asunto ni encabezados. Solo el cuerpo del mensaje.\nNo uses placeholders como [nombre] — escribe directamente.`,
      },
      {
        role: "user",
        content: `Correo recibido:\nDe: ${from}\nAsunto: ${subject}\nCategoría: ${tag}\nContenido: ${text.substring(0, 800)}\n\nRedacta una respuesta apropiada.`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// Calls OpenAI to extract structured meeting data (title, date, time, attendees) from an email body.
async function extractMeeting({ subject, text, from }) {
  const today = new Date().toISOString();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `Eres un extractor de información de reuniones a partir de correos.\nExtrae los datos de la reunión y responde SOLO con un JSON válido, sin explicaciones, sin markdown, sin backticks.\nEl JSON debe tener exactamente esta estructura:\n{\n  "title": "título del evento",\n  "date": "YYYY-MM-DD",\n  "startTime": "HH:MM",\n  "endTime": "HH:MM",\n  "description": "descripción breve",\n  "attendees": ["email1", "email2"]\n}\nSi no encuentras la fecha exacta, usa la fecha más próxima mencionada o deja date como null.\nSi no encuentras hora, usa "09:00" como startTime y "10:00" como endTime.\nLa fecha de hoy es: ${today}`,
      },
      {
        role: "user",
        content: `Correo:\nDe: ${from}\nAsunto: ${subject}\nContenido: ${text.substring(0, 1000)}`,
      },
    ],
  });

  let raw = response.choices[0].message.content.trim();
  raw = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

module.exports = { suggestReply, extractMeeting };
