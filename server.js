const express = require("express"); // Importa el framework Express para el servidor
const mysql = require("mysql2"); // Importa el conector para MySQL
const path = require("path"); // Utilidad para manejar rutas de carpetas
require("dotenv").config(); // Carga las credenciales desde el archivo .env

const app = express(); // Inicializa la aplicación Express
const PORT = process.env.PORT || 3000; // Define el puerto de escucha

app.use(express.json()); // Permite que el servidor procese datos en formato JSON
app.use(express.static(path.join(__dirname, "public"))); // Sirve los archivos de la carpeta public (HTML, JS, CSS)

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

// Arranca el servidor
app.listen(PORT, () => console.log(`Servidor ejecutándose en puerto ${PORT}`));