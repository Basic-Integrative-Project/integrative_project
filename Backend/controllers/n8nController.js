// Proxies requests from the frontend to the n8n automation platform webhooks.
const axios = require("axios");

const N8N_BASE = "https://n8n.andrescortes.dev/webhook";

// Forwards a send-by-id request to the n8n webhook for sending an email response by Gmail message ID.
async function sendById(req, res) {
  try {
    const response = await axios.post(`${N8N_BASE}/send-by-id`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
}

// Forwards a read-email request to the n8n webhook to mark an email as read in Gmail.
async function readEmail(req, res) {
  try {
    const response = await axios.post(`${N8N_BASE}/read-email`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
}

// Forwards a send-by-From request to the n8n webhook for composing and sending a reply.
async function sendByFrom(req, res) {
  try {
    const response = await axios.post(`${N8N_BASE}/send-by-From`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
}

module.exports = { sendById, readEmail, sendByFrom };
