// Initializes and exports the OpenAI client using the API key from environment variables.
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = openai;
