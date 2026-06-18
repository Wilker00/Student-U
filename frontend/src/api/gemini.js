export async function generateWithGemini({ prompt, systemInstruction = '', jsonMode = false }) {
  const response = await window.studentUFetch?.('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction, jsonMode }),
  });
  if (!response?.ok) throw new Error('Study generation is unavailable.');
  return response.json();
}

export async function getGeminiStatus() {
  const response = await fetch('/api/gemini/status');
  if (!response.ok) throw new Error('Study generation status is unavailable.');
  return response.json();
}
