const { extractTextFromImage } = require('./gemini.service');
const { cleanNoteText, computeOcrConfidence } = require('./silent-algorithms.service');
const { extractTextWithTesseract, isTesseractResultUsable } = require('./ocr.service');

const VISION_CONFIDENCE_THRESHOLD = Number(process.env.VISION_OCR_MIN_CONFIDENCE || 0.35);

function resolveImageProcessingStatus(extractedText, confidence) {
  if (!extractedText || extractedText.length < 20) return 'saved_for_image_review';
  if (confidence < 0.45) return 'needs_review';
  return 'ready';
}

async function extractTextFromImageBuffer(buffer, mimeType, options = {}) {
  if (!buffer?.length || !String(mimeType || '').startsWith('image/')) {
    return { text: '', confidence: 0, method: 'skipped', processingStatus: 'saved_for_image_review' };
  }

  let method = 'none';
  let ocrError = null;

  const tesseract = await extractTextWithTesseract(buffer);
  if (isTesseractResultUsable(tesseract)) {
    const cleaned = cleanNoteText(tesseract.text, { maxLength: 12000 });
    const confidence = Math.max(computeOcrConfidence(cleaned), tesseract.confidence);
    return {
      text: cleaned,
      confidence,
      method: 'tesseract',
      processingStatus: resolveImageProcessingStatus(cleaned, confidence),
      error: null,
    };
  }

  if (tesseract.text?.length >= 10) {
    method = 'tesseract_low_confidence';
    ocrError = `tesseract_confidence_${tesseract.confidence}`;
  }

  const vision = await extractTextFromImage({
    buffer,
    mimeType,
    hint: options.hint || '',
  });

  const cleaned = cleanNoteText(vision.text || tesseract.text || '', { maxLength: 12000 });
  const confidence = computeOcrConfidence(cleaned);
  const usedVision = Boolean(vision.text && vision.text.length >= 10);

  return {
    text: cleaned,
    confidence,
    method: usedVision ? 'vision' : (method || tesseract.method || 'vision'),
    processingStatus: resolveImageProcessingStatus(cleaned, Math.max(confidence, VISION_CONFIDENCE_THRESHOLD)),
    error: vision.error || ocrError || null,
  };
}

module.exports = {
  extractTextFromImageBuffer,
  resolveImageProcessingStatus,
};
