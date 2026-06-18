const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TIMEOUT_MS = 45000;
const MAX_PROMPT_CHARS = 24000;
const MAX_RETRIES = 2;

function getApiKey() {
  return process.env.GEMINI_API_KEY;
}

function buildRequestBody({ prompt, systemInstruction, jsonMode, imagePart }) {
  const parts = [];
  if (prompt) parts.push({ text: String(prompt) });
  if (imagePart?.data && imagePart?.mimeType) {
    parts.push({
      inline_data: {
        mime_type: imagePart.mimeType,
        data: imagePart.data,
      },
    });
  }

  const body = {
    contents: [{ role: 'user', parts }],
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }
  return body;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return parsed.error?.message || text.slice(0, 1000);
    } catch (_error) {
      return text.slice(0, 1000);
    }
  } catch (_error) {
    return '';
  }
}

function mapGeminiErrorStatus(status) {
  if (status === 401 || status === 403) return 502;
  if (status === 429) return 429;
  if (status >= 500) return 502;
  return 400;
}

function mapGeminiPublicMessage(status) {
  if (status === 401 || status === 403) return 'AI service credentials are not valid.';
  if (status === 429) return 'AI service usage limit reached. Try again later.';
  if (status >= 500) return 'AI service is temporarily unavailable.';
  return 'AI generation failed on the backend.';
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map(part => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function generateContent({ prompt, systemInstruction = '', jsonMode = false, imagePart = null }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured.');
    error.statusCode = 503;
    error.publicMessage = 'AI generation is not configured on the backend.';
    throw error;
  }

  const safePrompt = String(prompt || '').slice(0, MAX_PROMPT_CHARS);
  const safeInstruction = String(systemInstruction || '').slice(0, 8000);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody({
          prompt: safePrompt,
          systemInstruction: safeInstruction,
          jsonMode,
          imagePart,
        })),
      });

      if (!response.ok) {
        const upstreamMessage = await readErrorBody(response);
        const error = new Error(`Gemini API error: ${response.status}${upstreamMessage ? ` - ${upstreamMessage}` : ''}`);
        error.statusCode = mapGeminiErrorStatus(response.status);
        error.publicMessage = mapGeminiPublicMessage(response.status);
        error.upstreamStatus = response.status;
        error.retryable = response.status === 429 || response.status >= 500;
        console.warn('Gemini API request failed:', {
          status: response.status,
          message: upstreamMessage || 'No response body',
        });
        throw error;
      }

      const data = await response.json();
      return extractText(data);
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') {
        lastError = new Error('Gemini request timed out.');
        lastError.statusCode = 504;
        lastError.publicMessage = 'AI generation timed out. Try a shorter prompt.';
        lastError.retryable = true;
      }
      if (attempt < MAX_RETRIES && (lastError.retryable || lastError.statusCode >= 500)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

async function extractTextFromImage({ buffer, mimeType = 'image/jpeg', hint = '' }) {
  if (!buffer?.length) {
    return { text: '', method: 'none' };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return { text: '', method: 'none', error: 'not_configured' };
  }

  const safeMime = String(mimeType || 'image/jpeg').startsWith('image/')
    ? String(mimeType)
    : 'image/jpeg';
  const base64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : Buffer.from(buffer).toString('base64');
  const prompt = [
    'Transcribe all readable text from this lecture photo.',
    'Preserve headings, bullet points, numbered lists, and formulas as plain text.',
    'Do not summarize or add commentary — output the text only.',
    hint ? `Photo context: ${String(hint).slice(0, 200)}` : '',
  ].filter(Boolean).join('\n');

  try {
    const text = await generateContent({
      prompt,
      systemInstruction: 'You are an accurate OCR assistant for student lecture photos. Return plain text only.',
      imagePart: { mimeType: safeMime, data: base64 },
    });
    return { text: String(text || '').trim(), method: 'vision' };
  } catch (error) {
    console.warn('Vision extraction failed:', error.message || error);
    return { text: '', method: 'vision_failed', error: error.message || 'vision_failed' };
  }
}

module.exports = { generateContent, extractTextFromImage };
