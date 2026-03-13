// Handles HTTP requests for single and batch email classification endpoints.
const { classifySingleEmail, classifyBatch, ruleBasedFallback } = require("../services/classifierService");

// Classifies a single email using OpenAI or the rule-based fallback and returns a tag.
async function classifyOne(req, res) {
  const { subject = "", text = "" } = req.body;
  if (!subject && !text) return res.status(400).json({ error: "Se requiere subject o text" });

  try {
    const tag = await classifySingleEmail(subject, text);
    res.json({ tag, hidden: tag === "alertas", source: "llm" });
  } catch (err) {
    const fallbackTag = ruleBasedFallback(subject, text);
    res.json({ tag: fallbackTag, hidden: fallbackTag === "alertas", source: "fallback", error: err.message });
  }
}

// Classifies an array of emails in batches and returns a result array with tags and sources.
async function classifyMany(req, res) {
  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: "Se requiere un array de emails" });

  try {
    const results = await classifyBatch(emails);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { classifyOne, classifyMany };
