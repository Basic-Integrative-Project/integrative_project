// server.js - Node 24 con node-fetch@2 (require)
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const mysql = require("mysql2");
// const path = require("path");

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());



// firebase config
app.get('/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
  });
});

const OLLAMA_URL = "http://localhost:11434/api/generate";

const VALID_TAGS = [
  "reunion",
  "faltas_justificadas",
  "faltas_injustificadas",
  "importantes",
  "alertas",
];

function ruleBasedFallback(subject, text) {
  const s = (subject + " " + text).toLowerCase();

  if (
    /(notificación|notification|alerta|promoción|oferta|descuento|newsletter|no-reply|noreply|marketing|publicidad|facebook|instagram|twitter|linkedin|github|actualización de app)/.test(
      s,
    )
  ) {
    return "alertas";
  }

  if (
    /(reunión|reunion|meet|call|zoom|teams|agendar|calendario|llamada)/.test(s)
  ) {
    return "reunion";
  }

  const esIncapacidad =
    /(baja médica|certificado médico|incapacidad|accidente|enfermedad|médico|hospital|urgencia|duelo|matrimonio|nacimiento|paternidad|maternidad|judicial|citación)/.test(
      s,
    );
  const esFaltaSinJustificacion =
  /(me qued[eé]\s+dormid[oa]|me dorm[ií]|no vine|no fui|no asist[ií]|falte sin avisar|no avis[eé]|sin permiso|olvid[eé]|llegu[eé] tarde|no ten[ií]a ganas)/.test(
      s,
    );

  if (esIncapacidad) return "faltas_justificadas";
  if (esFaltaSinJustificacion) return "faltas_injustificadas";

  return "importantes";
}

function buildClassificationPrompt(subject, text) {
  return `
Eres un asistente de RRHH experto en clasificar correos laborales.
Analiza el contenido y clasifica en UNA de estas 5 categorías exactas:

**CATEGORÍAS:**

1. **reunion**: Coordinación de encuentros de trabajo, citas profesionales, videollamadas.
   - Ejemplos: "Reunión de equipo mañana", "Link de Zoom", "Confirmo asistencia"

2. **faltas_justificadas**: Ausencias con causa legal/médica válida.
   - Incluye: Enfermedad con certificado, baja médica, incapacidad, duelo, permiso paternidad/maternidad, matrimonio, obligaciones legales.
   - Clave: Motivo válido con documentación.

3. **faltas_injustificadas**: Ausencias sin causa válida o por negligencia.
   - Incluye: No asistir sin avisar, llegadas tarde sin causa, "me quedé dormido", "no tenía ganas de ir", "olvidé que trabajaba".
   - Clave: Sin justificación legal/médica, negligencia del empleado.

4. **importantes**: Correos laborales relevantes que no encajan en las anteriores.
   - Ejemplos: Informes, comunicados de empresa, tareas, proyectos.

5. **alertas**: Notificaciones automáticas, spam, correos no importantes que deben ocultarse.
   - Incluye: Notificaciones de apps (GitHub, Facebook), newsletters, promociones, ofertas, actualizaciones de software.
   - Clave: Generado automáticamente, no requiere atención directa.

**INSTRUCCIONES:**
- Responde SOLO con: reunion, faltas_justificadas, faltas_injustificadas, importantes, alertas
- Sin comillas, puntos, ni explicaciones
- Analiza contexto: ¿Es personal o automatizado? ¿Hay documentación médica?

CORREO:
Asunto: "${subject}"
Cuerpo: "${text.substring(0, 1000)}"

Etiqueta:`;
}

app.post("/classify-email", async (req, res) => {
  const { subject = "", text = "" } = req.body;

  if (!subject && !text) {
    return res.status(400).json({ error: "Se requiere subject o text" });
  }

  const cleanText = text.replace(/\s+/g, " ").trim();
  const prompt = buildClassificationPrompt(subject, cleanText);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 25,
        },
      }),
    });

    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

    const data = await response.json();
    let rawResponse = (data?.response || "").trim();

    let tag = rawResponse
      .toLowerCase()
      .replace(/["'\\.`]/g, "")
      .replace(/^(etiqueta|tag|categoría|clasificación|respuesta):\s*/i, "")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "")
      .split("\n")[0]
      .trim();

    const tagMappings = {
      falta_justificada: "faltas_justificadas",
      faltajustificada: "faltas_justificadas",
      justificada: "faltas_justificadas",
      falta_injustificada: "faltas_injustificadas",
      faltasinjustificada: "faltas_injustificadas",
      injustificada: "faltas_injustificadas",
      reunión: "reunion",
      meeting: "reunion",
      importante: "importantes",
      alerta: "alertas",
      spam: "alertas",
      notificación: "alertas",
      notificacion: "alertas",
    };

    if (tagMappings[tag]) tag = tagMappings[tag];

    console.log(`[LLM]: "${rawResponse}" → "${tag}"`);

    if (!VALID_TAGS.includes(tag)) {
      console.log(`[Fallback] "${tag}" inválido`);
      tag = ruleBasedFallback(subject, text);
    }

    res.json({
      tag,
      hidden: tag === "alertas",
      source: VALID_TAGS.includes(tag) ? "llm" : "fallback",
    });
  } catch (err) {
    console.error("[Error]:", err.message);
    const fallbackTag = ruleBasedFallback(subject, text);
    res.json({
      tag: fallbackTag,
      hidden: fallbackTag === "alertas",
      source: "fallback",
      error: err.message,
    });
  }
});

app.get("/test", (req, res) => {
  res.json({
    message: "Clasificador activo",
    categorias: VALID_TAGS,
    ocultables: ["alertas"],
    node_version: process.version,
  });
});

// zona coders

// Configuración del pool de conexiones a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// 1. OBTENER CODERS (CON FILTRO POR DOCUMENTO PARA EL BUSCADOR)
app.get("/api/coders", (req, res) => {
  // Capturamos el documento que viene desde main.js mediante la URL (?document=...)
  const documentoBusqueda = req.query.document;

  // Consulta base que trae a todos los coders con su promedio calculado
  let sql = `
    SELECT c.id, c.name, c.lastname, c.document, c.email, c.cel, cl.name AS clan, s.name AS shift,
    ROUND((IFNULL(g.module_1,0)+IFNULL(g.module_2,0)+IFNULL(g.module_3,0)+IFNULL(g.module_4,0))/4, 1) as grade
    FROM coders c 
    INNER JOIN clan cl ON c.clan_id = cl.id
    INNER JOIN shift s ON c.shift_id = s.id
    LEFT JOIN grades g ON c.id = g.coder_id`;

  // Si el usuario escribió algo en el buscador, agregamos la condición WHERE
  if (documentoBusqueda) {
    sql += ` WHERE c.document = ?`;
  }

  sql += ` ORDER BY c.id ASC`; // Ordenamos por ID

  // Ejecutamos la consulta. Si hay documento, lo pasamos como parámetro para evitar inyección SQL
  pool.query(sql, documentoBusqueda ? [documentoBusqueda] : [], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result); // Enviamos los resultados al frontend
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
    res.status(200).json(result[0]); // Retornamos solo el objeto del estudiante encontrado
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
    
    // Al guardar la historia, actualizamos automáticamente el estado de la cita a Atendido
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`📋 Categorías: ${VALID_TAGS.join(", ")}`);
  console.log(`⚡ Node: ${process.version}`);
});
