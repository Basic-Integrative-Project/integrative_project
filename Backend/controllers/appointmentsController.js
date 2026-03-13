// Handles HTTP requests for appointments and clinical history records linked to coders.
const pool = require("../config/db");

// Returns all appointments for a given coder ID, ordered by most recent date.
function getAppointments(req, res) {
  const sql = "SELECT * FROM appointment WHERE id_coder = ? ORDER BY date DESC";
  pool.query(sql, [req.params.id_coder], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
}

// Creates a new appointment record with state 0 (pending) for the specified coder.
function createAppointment(req, res) {
  const { id_coder, subject, professional, date } = req.body;
  const sql = "INSERT INTO appointment (id_coder, subject, professional, date, state) VALUES (?, ?, ?, ?, 0)";
  pool.query(sql, [id_coder, subject, professional, date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, ...req.body, state: 0 });
  });
}

// Saves a clinical history entry and marks the related appointment as completed (state = 1).
function createHistory(req, res) {
  const { id_appointment, objetive, tracking, goals } = req.body;
  const sqlH = "INSERT INTO history_coder (id_appointment, objetive, tracking, goals) VALUES (?, ?, ?, ?)";
  pool.query(sqlH, [id_appointment, objetive, tracking, goals], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    const sqlU = "UPDATE appointment SET state = 1 WHERE id = ?";
    pool.query(sqlU, [id_appointment], (errU) => {
      if (errU) return res.status(500).json({ error: errU.message });
      res.status(201).json({ message: "Exito" });
    });
  });
}

// Returns the clinical history record associated with a specific appointment ID.
function getHistoryByAppointment(req, res) {
  const sql = "SELECT * FROM history_coder WHERE id_appointment = ?";
  pool.query(sql, [req.params.id_app], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result[0]);
  });
}

module.exports = { getAppointments, createAppointment, createHistory, getHistoryByAppointment };
