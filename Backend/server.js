// Entry point of the Express server. Loads middleware, registers all route modules, and starts listening.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const generalRoutes = require("./routes/generalRoutes");
const classifierRoutes = require("./routes/classifierRoutes");
const aiRoutes = require("./routes/aiRoutes");
const codersRoutes = require("./routes/codersRoutes");
const n8nRoutes = require("./routes/n8nRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(generalRoutes);
app.use(classifierRoutes);
app.use(aiRoutes);
app.use(codersRoutes);
app.use(n8nRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const { VALID_TAGS } = require("./services/classifierService");
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Categories: ${VALID_TAGS.join(", ")}`);
  console.log(`Node: ${process.version}`);
});
