// Defines proxy routes that forward frontend requests to the n8n automation webhooks.
const express = require("express");
const router = express.Router();
const { sendById, readEmail, sendByFrom } = require("../controllers/n8nController");

router.post("/send-by-id", sendById);
router.post("/read-email", readEmail);
router.post("/send-by-From", sendByFrom);

module.exports = router;
