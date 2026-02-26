// server.js - Node 24
const express = require("express"); // Framework para el servidor
const cors = require("cors"); // Permite peticiones desde el frontend
const fetch = require("node-fetch"); // Peticiones HTTP (para Ollama)
const mysql = require("mysql2"); // Conector para la base de datos MySQL
const axios = require("axios"); // Alternativa para peticiones HTTP
const multer = require("multer"); // Gestión de subida de imágenes
const path = require("path"); // Manejo de rutas de archivos
require('dotenv').config(); // Carga las variables del .env

const app = express(); // Inicializa Express

// Configuración de CORS para permitir peticiones desde Live Server (Puerto 5500)
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST']
}));

app.use(express.json()); // Habilita lectura de JSON en el body

// Permite que el navegador acceda a las carpetas de estilos y scripts
app.use('/Frontend', express.static(path.join(__dirname, '..', 'Frontend')));

// --- CONFIGURACIÓN DE ALMACENAMIENTO (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Carpeta física de destino (debes crearla)
    },
    filename: (req, file, cb) => {
        // Nombre único: Marca de tiempo + nombre original
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });
// --- CONEXIÓN A LA BASE DE DATOS ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
});

// --- ENDPOINT PARA CONFIGURACIÓN DE FIREBASE ---
app.get("/firebase-config", (req, res) => {
    res.json({
        apiKey: process.env.apiKey,
        authDomain: process.env.authDomain,
        projectId: process.env.projectId,
        storageBucket: process.env.storageBucket,
        messagingSenderId: process.env.messagingSenderId,
        appId: process.env.appId
    });
});

// --- ENDPOINT: FORMULARIO DE EXCUSAS (GET) ---
app.get("/forms/:id", (req, res) => {
    // CORRECCIÓN DE RUTA: Entra a windows/form
    const filePath = path.join(__dirname, "..", "Frontend", "windows", "form", "excuses.html");
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: "No se encontro el archivo HTML", path: filePath });
        }
    });
});
// --- ENDPOINT: OBTENER CAUSAS PARA EL SELECT (GET) ---
app.get("/api/causes", (req, res) => {
    const sql = "SELECT id, name, description FROM causes";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- ENDPOINT: REGISTRAR EXCUSA CON IMAGEN (POST) ---
app.post("/api/excuses", upload.single("support_image"), (req, res) => {
    const { document, email, cause_id } = req.body;
    const fileName = req.file ? req.file.filename : null;

    // 1. Validar existencia del Coder por documento y correo
    const sqlCheck = "SELECT id FROM coders WHERE document = ? AND email = ?";
    db.query(sqlCheck, [document, email], (err, results) => {
        if (err) return res.status(500).json({ message: "Error en DB" });
        if (results.length === 0) {
            return res.status(404).json({ message: "Los datos no coinciden con ningún Coder" });
        }

        const coder_id = results[0].id;
        // 2. Insertar registro en la tabla 'excuses'
        const sqlInsert = "INSERT INTO excuses (cause_id, coder_id, description) VALUES (?, ?, ?)";
        const supportInfo = `Imagen: ${fileName}`;
        db.query(sqlInsert, [cause_id, coder_id, supportInfo], (err, result) => {
            if (err) return res.status(500).json({ message: "Error al guardar la excusa" });
            res.json({ message: "Excusa registrada con éxito" });
        });
    });
});
// --- ENDPOINT: OBTENER CODERS ---
app.get("/api/coders", (req, res) => {
    const { document } = req.query;
    let sql = "SELECT * FROM coders";
    const params = [];

    if (document) {
        sql += " WHERE document = ?";
        params.push(document);
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- ENDPOINT: REGISTRAR CITA ---
app.post("/appointment", (req, res) => {
    const { id_coder, subject, professional, date, state } = req.body;
    const sql = "INSERT INTO appointment (id_coder, subject, professional, date, state) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [id_coder, subject, professional, date, state], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Cita registrada", id: result.insertId });
    });
});

// --- ENDPOINT: HISTORIA CLÍNICA ---
app.post("/history_coder", (req, res) => {
    const { objective, tracking, goals, id_appointment } = req.body;
    const sqlHistory = "INSERT INTO history_coder (objetive, tracking, goals, id_appointment) VALUES (?, ?, ?, ?)";
    
    db.query(sqlHistory, [objective, tracking, goals, id_appointment], (err) => {
        if (err) return res.status(500).json(err);
        
        const sqlUpdateApp = "UPDATE appointment SET state = 'atendido' WHERE id = ?";
        db.query(sqlUpdateApp, [id_appointment], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Historia guardada y cita actualizada" });
        });
    });
});

// --- LÓGICA DE IA (OLLAMA) ---
app.post("/api/classify", async (req, res) => {
    const { subject, body } = req.body;
    const prompt = `Clasifica este correo en una de estas categorías: reunion, faltas_justificadas, faltas_injustificadas, importantes, alertas. Responde SOLO la categoría. Asunto: ${subject} Contenido: ${body}`;

    try {
        const response = await axios.post("http://localhost:11434/api/generate", {
            model: "llama3.1",
            prompt: prompt,
            stream: false
        });
        const category = response.data.response.trim().toLowerCase();
        res.json({ category });
    } catch (error) {
        let fallback = "importantes";
        if (subject.toLowerCase().includes("cita")) fallback = "faltas_justificadas";
        if (subject.toLowerCase().includes("urgente")) fallback = "alertas";
        res.json({ category: fallback });
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`📝 Formulario disponible en: http://localhost:${PORT}/forms/1`);
});