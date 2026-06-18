const mammoth = require('mammoth');
const { cleanNoteText } = require('./silent-algorithms.service');

async function extractDocxText(buffer) {
  if (!buffer?.length) return '';
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanNoteText(String(result.value || ''), { maxLength: 12000 });
  } catch (error) {
    console.warn('Mammoth DOCX extraction failed:', error.message || error);
    return '';
  }
}

module.exports = {
  extractDocxText,
};
