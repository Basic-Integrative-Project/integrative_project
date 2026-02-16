// server.js (ES Module)
import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // Node 18+ ya tiene fetch nativo

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate"; // Ollama local

// Función fallback basada en palabras clave
function ruleBasedTag(subject, text) {
    const s = (subject + " " + text).toLowerCase();
    if (/(reunión|reunion|call|meeting)/.test(s)) return "reunion";
    if (/(enfermedad|licencia|incapacidad|sick)/.test(s)) return "incapacidades";
    return "importantes";
}

app.post("/classify-email", async (req, res) => {
    const { subject = "", text = "" } = req.body;
    const cleanText = text.replace(/\s+/g, " ").trim();

    const prompt = `
Eres un clasificador de correos electrónicos.
Devuelve solo una de estas etiquetas EXACTAS: "reunion", "incapacidades", "importantes".
No agregues nada más, ni explicaciones, ni comillas.
Asunto: "${subject}"
Cuerpo: "${cleanText}"
Respuesta:
`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.1:8b",
                prompt,
                max_tokens: 20
            })
        });

        const data = await response.json();
        let tag = (data?.text || "").toLowerCase().replace(/[^a-z]/g, "");

        // Fallback si Llama no responde correctamente
        if (!["reunion", "incapacidades", "importantes"].includes(tag)) {
            tag = ruleBasedTag(subject, text);
        }

        res.json({ tag });
    } catch (err) {
        console.error("Error clasificando correo:", err);
        const fallbackTag = ruleBasedTag(subject, text);
        res.status(500).json({ tag: fallbackTag, error: err.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
