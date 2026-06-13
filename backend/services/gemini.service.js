const DEFAULT_MODEL = 'gemini-2.0-flash';

function getApiKey() {
  return process.env.GEMINI_API_KEY;
}

function buildRequestBody({ prompt, systemInstruction, jsonMode }) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }

  return body;
}

async function generateContent({ prompt, systemInstruction = '', jsonMode = false }) {
  const apiKey = getApiKey();

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured.');
    error.statusCode = 503;
    error.publicMessage = 'AI generation is not configured on the backend.';
    throw error;
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody({ prompt, systemInstruction, jsonMode })),
  });

  if (!response.ok) {
    const error = new Error(`Gemini API error: ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    error.publicMessage = 'AI generation failed on the backend.';
    throw error;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { generateContent };
