// server.js - Node 24 con node-fetch@2 (require)
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`📋 Categorías: ${VALID_TAGS.join(", ")}`);
  console.log(`⚡ Node: ${process.version}`);
});
