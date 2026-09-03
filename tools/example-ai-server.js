// Simple example AI endpoint for local testing.
// Run: `node tools/example-ai-server.js` and set VITE_AI_ENDPOINT=http://localhost:3333/ai
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/ai', (req, res) => {
  const msg = (req.body && req.body.message) || '';
  // Very simple echo + canned suggestions
  const reply = `I heard: "${msg}"\n\nSuggestions:\n- Summarize your weekly goals.\n- Ask for ways to improve task prioritization.`;
  res.json({ reply });
});

app.listen(3333, () => console.log('Example AI server running on http://localhost:3333'));
