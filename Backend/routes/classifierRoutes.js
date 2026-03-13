// Defines routes for single and batch email classification endpoints.
const express = require("express");
const router = express.Router();
const { classifyOne, classifyMany } = require("../controllers/classifierController");

router.post("/classify-email", classifyOne);
router.post("/classify-emails", classifyMany);

module.exports = router;
