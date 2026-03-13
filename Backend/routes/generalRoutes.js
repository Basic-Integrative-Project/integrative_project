// Defines general utility routes: health check, test info, and Firebase config delivery.
const express = require("express");
const router = express.Router();
const { VALID_TAGS } = require("../services/classifierService");

// Returns a simple confirmation that the server is running.
router.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

// Returns server metadata including active categories and Node.js version.
router.get("/test", (req, res) => {
  res.json({
    message: "Clasificador activo con OpenAI",
    categorias: VALID_TAGS,
    ocultables: ["alertas"],
    node_version: process.version,
  });
});

// Delivers Firebase configuration values from environment variables to the frontend at runtime.
router.get("/firebase-config", (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
  });
});

module.exports = router;
