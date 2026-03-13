// Handles HTTP requests for AI-powered features: reply suggestions and meeting data extraction.
const { suggestReply, extractMeeting } = require("../services/aiService");

// Validates the request and returns an AI-generated reply suggestion for the given email.
async function suggestReplyHandler(req, res) {
  const { subject = "", text = "", from = "", tag = "" } = req.body;
  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text del correo" });
  }

  try {
    const suggestion = await suggestReply({ subject, text, from, tag });
    res.json({ suggestion });
  } catch (err) {
    console.error("Error OpenAI suggest-reply:", err.message);
    res.status(500).json({ error: "No se pudo generar la sugerencia", details: err.message });
  }
}

// Validates the request and returns structured meeting data extracted by AI from the email content.
async function extractMeetingHandler(req, res) {
  const { subject = "", text = "", from = "" } = req.body;
  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text del correo" });
  }

  try {
    const meetingData = await extractMeeting({ subject, text, from });
    res.json(meetingData);
  } catch (err) {
    console.error("Error OpenAI extract-meeting:", err.message);
    res.status(500).json({ error: "No se pudo extraer la información de la reunión", details: err.message });
  }
}

module.exports = { suggestReplyHandler, extractMeetingHandler };
