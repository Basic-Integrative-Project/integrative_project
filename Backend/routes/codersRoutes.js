// Defines routes for the Coders resource and the appointments and history sub-resources.
const express = require("express");
const router = express.Router();
const { getAllCoders, getCoderById } = require("../controllers/codersController");
const {
  getAppointments,
  createAppointment,
  createHistory,
  getHistoryByAppointment,
} = require("../controllers/appointmentsController");

router.get("/api/coders", getAllCoders);
router.get("/api/coders/:id", getCoderById);
router.get("/appointment/:id_coder", getAppointments);
router.post("/appointment", createAppointment);
router.post("/history_coder", createHistory);
router.get("/history_coder/:id_app", getHistoryByAppointment);

module.exports = router;
