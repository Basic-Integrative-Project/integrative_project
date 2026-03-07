// server.js - Node 24 + OpenAI (gpt-4o-mini)

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const axios = require("axios");
const OpenAI = require("openai");

require("dotenv").config();

const app = express();
app.use(cors());

// ✅ FIX 2 — Aumentar límite de payload para evitar 413
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─────────────────────────────────────────────
// 🔹 OpenAI Config
// ─────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─────────────────────────────────────────────
// 🔹 Configuración General
// ─────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

app.get("/firebase-config", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
  });
});

const VALID_TAGS = [
  "reunion",
  "faltas_justificadas",
  "faltas_injustificadas",
  "importantes",
  "alertas",
];

// ─────────────────────────────────────────────
// 🔹 Fallback por reglas
// ─────────────────────────────────────────────

function ruleBasedFallback(subject, text) {
  const s = (subject + " " + text).toLowerCase();

  if (
    /(notificación|notification|alerta|promoción|oferta|descuento|newsletter|no-reply|noreply|marketing|publicidad|facebook|instagram|twitter|linkedin|github|actualización de app)/.test(s)
  ) return "alertas";

  if (/(reunión|reunion|meet|call|zoom|teams|agendar|calendario|llamada)/.test(s)) return "reunion";

  const esIncapacidad =
    /(baja médica|certificado médico|incapacidad|accidente|enfermedad|médico|hospital|urgencia|duelo|matrimonio|nacimiento|paternidad|maternidad|judicial|citación)/.test(s);

  const esFaltaSinJustificacion =
    /(me qued[eé]\s+dormid[oa]|me dorm[ií]|no vine|no fui|no asist[ií]|falte sin avisar|no avis[eé]|sin permiso|olvid[eé]|llegu[eé] tarde|no ten[ií]a ganas)/.test(s);

  if (esIncapacidad) return "faltas_justificadas";
  if (esFaltaSinJustificacion) return "faltas_injustificadas";
  return "importantes";
}

// ─────────────────────────────────────────────
// 🔹 Clasificación con OpenAI
// ─────────────────────────────────────────────

async function classifySingleEmail(subject = "", text = "") {
  const cleanText = text.replace(/\s+/g, " ").trim().substring(0, 500);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content: `Eres un clasificador automático de correos laborales.
Responde SOLO con una de estas etiquetas exactas:
reunion
faltas_justificadas
faltas_injustificadas
importantes
alertas
Sin explicación.`,
        },
        {
          role: "user",
          content: `Asunto: ${subject}\nCuerpo: ${cleanText}`,
        },
      ],
    });

    let tag = response.choices[0].message.content.toLowerCase().trim().replace(/["'`.]/g, "");

    if (!VALID_TAGS.includes(tag)) {
      console.log(`[Fallback LLM inválido]: "${tag}"`);
      tag = ruleBasedFallback(subject, text);
    }

    console.log(`[OpenAI]: "${tag}"`);
    return tag;
  } catch (error) {
    console.error("Error OpenAI:", error.message);
    return ruleBasedFallback(subject, text);
  }
}

// ─────────────────────────────────────────────
// 🔹 ENDPOINT INDIVIDUAL
// ─────────────────────────────────────────────

app.post("/classify-email", async (req, res) => {
  const { subject = "", text = "" } = req.body;
  if (!subject && !text) return res.status(400).json({ error: "Se requiere subject o text" });

  try {
    const tag = await classifySingleEmail(subject, text);
    res.json({ tag, hidden: tag === "alertas", source: "llm" });
  } catch (err) {
    const fallbackTag = ruleBasedFallback(subject, text);
    res.json({ tag: fallbackTag, hidden: fallbackTag === "alertas", source: "fallback", error: err.message });
  }
});

// ─────────────────────────────────────────────
// 🔹 ENDPOINT BATCH — lotes de 5 para no saturar OpenAI
// ─────────────────────────────────────────────

app.post("/classify-emails", async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: "Se requiere un array de emails" });

  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ subject = "", text = "" }) => {
        try {
          const tag = await classifySingleEmail(subject, text);
          return { tag, hidden: tag === "alertas", source: "llm" };
        } catch (err) {
          const tag = ruleBasedFallback(subject, text);
          return { tag, hidden: tag === "alertas", source: "fallback", error: err.message };
        }
      })
    );
    results.push(...batchResults);
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  res.json(results);
});

// ─────────────────────────────────────────────
// ✅ NUEVO — ENDPOINT: Sugerir respuesta con IA
// ─────────────────────────────────────────────

app.post("/suggest-reply", async (req, res) => {
  const { subject = "", text = "", from = "", tag = "" } = req.body;

  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text del correo" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `Eres un asistente que redacta respuestas profesionales y cordiales a correos laborales.
Redacta una respuesta breve (máximo 4 oraciones) al correo que te van a mostrar.
La respuesta debe ser en español, profesional, directa y lista para enviar.
No agregues asunto ni encabezados. Solo el cuerpo del mensaje.
No uses placeholders como [nombre] — escribe directamente.`,
        },
        {
          role: "user",
          content: `Correo recibido:
De: ${from}
Asunto: ${subject}
Categoría: ${tag}
Contenido: ${text.substring(0, 800)}

Redacta una respuesta apropiada.`,
        },
      ],
    });

    const suggestion = response.choices[0].message.content.trim();
    res.json({ suggestion });

  } catch (err) {
    console.error("Error OpenAI suggest-reply:", err.message);
    res.status(500).json({ error: "No se pudo generar la sugerencia", details: err.message });
  }
});

// ─────────────────────────────────────────────
// ✅ NUEVO — ENDPOINT: Extraer datos de reunión con IA para Google Calendar
// ─────────────────────────────────────────────

app.post("/extract-meeting", async (req, res) => {
  const { subject = "", text = "", from = "" } = req.body;

  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text del correo" });
  }

  try {
    const today = new Date().toISOString();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `Eres un extractor de información de reuniones a partir de correos.
Extrae los datos de la reunión y responde SOLO con un JSON válido, sin explicaciones, sin markdown, sin backticks.
El JSON debe tener exactamente esta estructura:
{
  "title": "título del evento",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "description": "descripción breve",
  "attendees": ["email1", "email2"]
}
Si no encuentras la fecha exacta, usa la fecha más próxima mencionada o deja date como null.
Si no encuentras hora, usa "09:00" como startTime y "10:00" como endTime.
La fecha de hoy es: ${today}`,
        },
        {
          role: "user",
          content: `Correo:
De: ${from}
Asunto: ${subject}
Contenido: ${text.substring(0, 1000)}`,
        },
      ],
    });

    let raw = response.choices[0].message.content.trim();

    // Limpiar posibles backticks que OpenAI agregue
    raw = raw.replace(/```json|```/g, "").trim();

    const meetingData = JSON.parse(raw);
    res.json(meetingData);

  } catch (err) {
    console.error("Error OpenAI extract-meeting:", err.message);
    res.status(500).json({ error: "No se pudo extraer la información de la reunión", details: err.message });
  }
});

// ─────────────────────────────────────────────
// 🔹 TEST
// ─────────────────────────────────────────────

app.get("/test", (req, res) => {
  res.json({
    message: "Clasificador activo con OpenAI",
    categorias: VALID_TAGS,
    ocultables: ["alertas"],
    node_version: process.version,
  });
});

// ─────────────────────────────────────────────
// 🔹 MYSQL CONFIG
// ─────────────────────────────────────────────

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ─────────────────────────────────────────────
// 🔹 CODERS API
// ─────────────────────────────────────────────

app.get("/api/coders", (req, res) => {
  const documentoBusqueda = req.query.document;
  let sql = `
    SELECT c.id, c.name, c.lastname, c.document, c.email, c.cel, cl.name AS clan, s.name AS shift,
    ROUND((IFNULL(g.module_1,0)+IFNULL(g.module_2,0)+IFNULL(g.module_3,0)+IFNULL(g.module_4,0))/4, 1) as grade
    FROM coders c 
    INNER JOIN clan cl ON c.clan_id = cl.id
    INNER JOIN shift s ON c.shift_id = s.id
    LEFT JOIN grades g ON c.id = g.coder_id`;
  if (documentoBusqueda) sql += ` WHERE c.document = ?`;
  sql += ` ORDER BY c.id ASC`;
  pool.query(sql, documentoBusqueda ? [documentoBusqueda] : [], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});

app.get("/api/coders/:id", (req, res) => {
  const sql = `
    SELECT c.*, cl.name AS clan, s.name AS shift, 
    g.module_1, g.module_2, g.module_3, g.module_4,
    ROUND((IFNULL(g.module_1,0)+IFNULL(g.module_2,0)+IFNULL(g.module_3,0)+IFNULL(g.module_4,0))/4, 1) as grade
    FROM coders c 
    INNER JOIN clan cl ON c.clan_id = cl.id
    INNER JOIN shift s ON c.shift_id = s.id
    LEFT JOIN grades g ON c.id = g.coder_id 
    WHERE c.id = ?`;
  pool.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result[0]);
  });
});

app.get("/appointment/:id_coder", (req, res) => {
  const sql = "SELECT * FROM appointment WHERE id_coder = ? ORDER BY date DESC";
  pool.query(sql, [req.params.id_coder], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});

app.post("/appointment", (req, res) => {
  const { id_coder, subject, professional, date } = req.body;
  const sql = "INSERT INTO appointment (id_coder, subject, professional, date, state) VALUES (?, ?, ?, ?, 0)";
  pool.query(sql, [id_coder, subject, professional, date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, ...req.body, state: 0 });
  });
});

app.post("/history_coder", (req, res) => {
  const { id_appointment, objetive, tracking, goals } = req.body;
  const sqlH = "INSERT INTO history_coder (id_appointment, objetive, tracking, goals) VALUES (?, ?, ?, ?)";
  pool.query(sqlH, [id_appointment, objetive, tracking, goals], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const sqlU = "UPDATE appointment SET state = 1 WHERE id = ?";
    pool.query(sqlU, [id_appointment], (errU) => {
      if (errU) return res.status(500).json({ error: errU.message });
      res.status(201).json({ message: "Éxito" });
    });
  });
});

app.get("/history_coder/:id_app", (req, res) => {
  const sql = "SELECT * FROM history_coder WHERE id_appointment = ?";
  pool.query(sql, [req.params.id_app], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result[0]);
  });
});

// ─────────────────────────────────────────────
// 🔹 N8N WEBHOOKS
// ─────────────────────────────────────────────

app.post("/send-by-id", async (req, res) => {
  try {
    const response = await axios.post("https://n8n.andrescortes.dev/webhook/send-by-id", req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
});

app.post("/read-email", async (req, res) => {
  try {
    const response = await axios.post("https://n8n.andrescortes.dev/webhook/read-email", req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
});

app.post("/send-by-From", async (req, res) => {
  try {
    const response = await axios.post("https://n8n.andrescortes.dev/webhook/send-by-From", req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// ─────────────────────────────────────────────
// 🔹 START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`📋 Categorías: ${VALID_TAGS.join(", ")}`);
  console.log(`⚡ Node: ${process.version}`);
});