// server.js - Node 24 + OpenAI (gpt-4o-mini)

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const axios = require("axios");
const OpenAI = require("openai");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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
    /(notificación|notification|alerta|promoción|oferta|descuento|newsletter|no-reply|noreply|marketing|publicidad|facebook|instagram|twitter|linkedin|github|actualización de app)/.test(
      s
    )
  ) {
    return "alertas";
  }

  if (/(reunión|reunion|meet|call|zoom|teams|agendar|calendario|llamada)/.test(s)) {
    return "reunion";
  }

  const esIncapacidad =
    /(baja médica|certificado médico|incapacidad|accidente|enfermedad|médico|hospital|urgencia|duelo|matrimonio|nacimiento|paternidad|maternidad|judicial|citación)/.test(
      s
    );

  const esFaltaSinJustificacion =
    /(me qued[eé]\s+dormid[oa]|me dorm[ií]|no vine|no fui|no asist[ií]|falte sin avisar|no avis[eé]|sin permiso|olvid[eé]|llegu[eé] tarde|no ten[ií]a ganas)/.test(
      s
    );

  if (esIncapacidad) return "faltas_justificadas";
  if (esFaltaSinJustificacion) return "faltas_injustificadas";

  return "importantes";
}

// ─────────────────────────────────────────────
// 🔹 Clasificación con OpenAI
// ─────────────────────────────────────────────

async function classifySingleEmail(subject = "", text = "") {
  const cleanText = text.replace(/\s+/g, " ").trim();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content: `
Eres un clasificador automático de correos laborales.
Responde SOLO con una de estas etiquetas exactas:
reunion
faltas_justificadas
faltas_injustificadas
importantes
alertas
Sin explicación.
`,
        },
        {
          role: "user",
          content: `
Asunto: ${subject}
Cuerpo: ${cleanText.substring(0, 1000)}
`,
        },
      ],
    });

    let tag = response.choices[0].message.content
      .toLowerCase()
      .trim()
      .replace(/["'`.]/g, "");

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

  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text" });
  }

  try {
    const tag = await classifySingleEmail(subject, text);
    res.json({
      tag,
      hidden: tag === "alertas",
      source: "llm",
    });
  } catch (err) {
    const fallbackTag = ruleBasedFallback(subject, text);
    res.json({
      tag: fallbackTag,
      hidden: fallbackTag === "alertas",
      source: "fallback",
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────
// 🔹 ENDPOINT BATCH
// ─────────────────────────────────────────────

app.post("/classify-emails", async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "Se requiere un array de emails" });
  }

  const results = await Promise.all(
    emails.map(async ({ subject = "", text = "" }) => {
      try {
        const tag = await classifySingleEmail(subject, text);
        return { tag, hidden: tag === "alertas", source: "llm" };
      } catch (err) {
        const tag = ruleBasedFallback(subject, text);
        return {
          tag,
          hidden: tag === "alertas",
          source: "fallback",
          error: err.message,
        };
      }
    })
  );

  res.json(results);
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
// 1. OBTENER CODERS (CON FILTRO POR DOCUMENTO PARA EL BUSCADOR)
app.get("/api/coders", (req, res) => {
  const documentoBusqueda = req.query.document;

  let sql = `
    SELECT c.id, c.name, c.lastname, c.document, c.email, c.cel, cl.name AS clan, s.name AS shift,
    ROUND((IFNULL(g.module_1,0)+IFNULL(g.module_2,0)+IFNULL(g.module_3,0)+IFNULL(g.module_4,0))/4, 1) as grade
    FROM coders c 
    INNER JOIN clan cl ON c.clan_id = cl.id
    INNER JOIN shift s ON c.shift_id = s.id
    LEFT JOIN grades g ON c.id = g.coder_id`;

  if (documentoBusqueda) {
    sql += ` WHERE c.document = ?`;
  }

  sql += ` ORDER BY c.id ASC`;

  pool.query(sql, documentoBusqueda ? [documentoBusqueda] : [], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});

// 2. OBTENER PERFIL DE UN CODER ESPECÍFICO POR ID
app.get("/api/coders/:id", (req, res) => {
  const sql = `
    SELECT c.*, 
    cl.name AS clan, 
    s.name AS shift, 
    g.module_1, g.module_2, 
    g.module_3, g.module_4,
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

// 3. OBTENER LISTA DE CITAS DE UN ESTUDIANTE
app.get("/appointment/:id_coder", (req, res) => {
  const sql = "SELECT * FROM appointment WHERE id_coder = ? ORDER BY date DESC";
  pool.query(sql, [req.params.id_coder], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
});

// 4. GUARDAR UNA NUEVA CITA (DESDE EL MODAL ASIGNAR CITA)
app.post("/appointment", (req, res) => {
  const { id_coder, subject, professional, date } = req.body;
  const sql = "INSERT INTO appointment (id_coder, subject, professional, date, state) VALUES (?, ?, ?, ?, 0)";
  
  pool.query(sql, [id_coder, subject, professional, date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, ...req.body, state: 0 });
  });
});

// 5. GUARDAR HISTORIA Y FINALIZAR CITA (CAMBIA ESTADO A 1)
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

// 6. OBTENER DETALLE DE UNA HISTORIA POR ID DE CITA
app.get("/history_coder/:id_app", (req, res) => {
  const sql = "SELECT * FROM history_coder WHERE id_appointment = ?";
  pool.query(sql, [req.params.id_app], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result[0]);
  });
});

// ─────────────────────────────────────────────
// 🔹 N8N WEBHOOK
// ─────────────────────────────────────────────

app.post("/send-by-id", async (req, res) => {
  try {
    const response = await axios.post(
      "https://n8n.andrescortes.dev/webhook/send-by-id",
      req.body
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
});

app.post("/read-email", async (req, res) => {
  try {
    const response = await axios.post(
      "https://n8n.andrescortes.dev/webhook/read-email",
      req.body
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error enviando a n8n" });
  }
});

app.post("/send-by-From", async (req, res) => {
  try {
    const response = await axios.post(
      "https://n8n.andrescortes.dev/webhook/send-by-From",
      req.body
    );

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