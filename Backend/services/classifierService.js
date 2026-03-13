// Contains the core email classification logic: OpenAI-based classification and regex fallback rules.
const openai = require("../config/openai");

const VALID_TAGS = [
  "reunion",
  "faltas_justificadas",
  "faltas_injustificadas",
  "importantes",
  "alertas",
];

// Applies regex-based rules to classify an email when OpenAI is unavailable or returns an invalid tag.
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

// Sends a single email subject and body to OpenAI for classification, falling back to rules on failure.
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
          content: `Eres un clasificador automático de correos laborales.\nResponde SOLO con una de estas etiquetas exactas:\nreunion\nfaltas_justificadas\nfaltas_injustificadas\nimportantes\nalertas\nSin explicación.`,
        },
        {
          role: "user",
          content: `Asunto: ${subject}\nCuerpo: ${cleanText}`,
        },
      ],
    });

    let tag = response.choices[0].message.content.toLowerCase().trim().replace(/["'`.]/g, "");

    if (!VALID_TAGS.includes(tag)) {
      console.log(`[Fallback LLM invalido]: "${tag}"`);
      tag = ruleBasedFallback(subject, text);
    }

    console.log(`[OpenAI]: "${tag}"`);
    return tag;
  } catch (error) {
    console.error("Error OpenAI:", error.message);
    return ruleBasedFallback(subject, text);
  }
}

// Processes an array of emails in batches of 5 to avoid saturating the OpenAI API rate limits.
async function classifyBatch(emails) {
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

  return results;
}

module.exports = { classifySingleEmail, classifyBatch, ruleBasedFallback, VALID_TAGS };
