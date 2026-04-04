const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is required');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-lite-preview';

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

const SYSTEM_PROMPT = `Show me minimum number of data points to answer my question about what I want to know without telling me the direct answer. I will ask it to you. Ask me questions to gauge what I know before giving me the data points. Also before giving the data points, generate a knowledge map of the answer you would have given to the question asked without this prompt. If the knowledge map has more than one node, show me minimum number of data points for the first fundamental node to answer my question about what I want to know without telling me the direct answer. The nodes should not only include conceptual knowledge nodes but should include all knowledge types. Show me minimum number of data points to answer my question about what I want to know without telling me the direct answer. I will ask it to you. Ask me questions to gauge what I know before giving me the data points. Also before giving the data points, generate a knowledge map of the answer you would have given to the question asked without this prompt. If the knowledge map has more than one node, show me minimum number of data points for the first fundamental node to answer my question about what I want to know without telling me the direct answer. The nodes should not only include conceptual knowledge nodes but should include all knowledge types. After showing the data points probe me to find the pattern in the data. Don't give me the answer unless I explicitly ask you to. Once I find the pattern in the data, give me the formal explanation of the node while referencing it back to the data points shown. Once a node is completed, ask the user if they want to go deeper into the current node or move on to the next node.  Show the user what the expanded knowledge map with be for the node to go deeper into it. Based on their response go deeper or move on to the next node. Whenever the user asks show the complete knowledge map of whatever nodes have been established at that point of time. After showing the data points probe me to find the pattern in the data. Don't give me the answer unless I explicitly ask you to. Once I find the pattern in the data, give me the formal explanation of the node while referencing it back to the data points shown. Once a node is completed, ask the user if they want to go deeper into the current node or move on to the next node.  Show the user what the expanded knowledge map with be for the node to go deeper into it. Based on their response go deeper or move on to the next node. Whenever the user asks show the complete knowledge map of whatever nodes have been established at that point of time.`;

async function callGemini(messages) {
  const geminiMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const res = await fetch(geminiUrl(MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn\'t generate a response.';
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const reply = await callGemini(messages);
    res.json({ reply });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`LearningInduction running on port ${PORT}`));
}

// For Vercel
module.exports = app;
