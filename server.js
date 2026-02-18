// Importa el framework Express para la gestión de rutas y middleware.
const express = require("express");
// Importa el módulo mysql2 para interactuar con la base de datos MySQL.
const mysql = require("mysql2");
// Importa el módulo path para trabajar con rutas de archivos.
const path = require("path");
// Carga las variables de entorno del archivo .env.
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de archivos estáticos para la carpeta public.
app.use(express.static(path.join(__dirname, "public")));

// Configuración del pool de conexiones a la base de datos.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

// Ruta API para obtener coders (permite filtrar por documento si se envía en la URL).
app.get("/api/coders", (req, res) => {
    // Obtenemos el documento de la consulta (query string) si existe.
    const documento = req.query.document;

    // Base de la consulta SQL.
    let sql = `
        SELECT
            c.id,
            c.name,
            c.lastname,
            c.document,
            c.email,
            c.cel,
            cl.name AS clan,
            s.name AS shift,
            ROUND((g.module_1 + g.module_2 + g.module_3 + g.module_4) / 4, 1) AS grade
        FROM coders c
        INNER JOIN clan cl ON c.clan_id = cl.id
        INNER JOIN shift s ON c.shift_id = s.id
        LEFT JOIN grades g ON c.id = g.coder_id
    `;

    // Si el usuario envió un documento, agregamos el filtro WHERE.
    if (documento) {
        sql += ` WHERE c.document = ?`;
    }

    // Agregamos el orden final.
    sql += ` ORDER BY c.id ASC`;

    // Ejecutamos la consulta pasando el documento si existe.
    pool.query(sql, documento ? [documento] : [], (err, result) => {
        if (err) {
            console.error("Detalle del error SQL:", err.message);
            return res.status(500).json({ error: "Error al consultar los datos." });
        }
        // Enviamos los resultados encontrados.
        res.status(200).json(result);
    });
});

// Ruta para obtener el perfil de un solo coder por su ID.
app.get("/api/coders/:id", (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT
            c.id, c.name, c.lastname, c.document, c.email, c.cel,
            cl.name AS clan, s.name AS shift,
            g.module_1, g.module_2, g.module_3, g.module_4,
            ROUND((g.module_1 + g.module_2 + g.module_3 + g.module_4) / 4, 1) AS grade
        FROM coders c
        INNER JOIN clan cl ON c.clan_id = cl.id
        INNER JOIN shift s ON c.shift_id = s.id
        LEFT JOIN grades g ON c.id = g.coder_id
        WHERE c.id = ?
    `;
    pool.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(result[0]);
    });
});

// Inicio del servidor.
app.listen(PORT, () => {
    console.log(`Servidor operativo en http://localhost:${PORT}`);
});