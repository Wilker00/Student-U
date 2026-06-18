const Tesseract = require('tesseract.js');

const TESSERACT_ENABLED = process.env.TESSERACT_OCR !== 'false';
const TESSERACT_MIN_CONFIDENCE = Number(process.env.TESSERACT_MIN_CONFIDENCE || 0.42);
const TESSERACT_MIN_CHARS = Number(process.env.TESSERACT_MIN_CHARS || 20);

async function extractTextWithTesseract(buffer) {
  if (!TESSERACT_ENABLED || !buffer?.length) {
    return { text: '', confidence: 0, method: 'tesseract_disabled' };
  }

  try {
    const { data } = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {},
    });
    const text = String(data.text || '').trim();
    const confidence = Number(data.confidence || 0) / 100;
    return {
      text,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      method: 'tesseract',
    };
  } catch (error) {
    console.warn('Tesseract OCR failed:', error.message || error);
    return { text: '', confidence: 0, method: 'tesseract_failed', error: error.message };
  }
}

function isTesseractResultUsable(result = {}) {
  return Boolean(
    result.text
    && result.text.length >= TESSERACT_MIN_CHARS
    && result.confidence >= TESSERACT_MIN_CONFIDENCE,
  );
}

module.exports = {
  extractTextWithTesseract,
  isTesseractResultUsable,
  TESSERACT_MIN_CONFIDENCE,
  TESSERACT_MIN_CHARS,
};
