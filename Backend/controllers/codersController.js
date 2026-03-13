// Handles HTTP requests for the Coders resource: listing, searching by document, and fetching by ID.
const pool = require("../config/db");

// Returns all coders with their clan, shift, and average grade. Supports optional filtering by document number.
function getAllCoders(req, res) {
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
}

// Returns a single coder's full profile including individual module grades and average.
function getCoderById(req, res) {
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
}

module.exports = { getAllCoders, getCoderById };
