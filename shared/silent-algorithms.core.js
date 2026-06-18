/**
 * Silent algorithms — local heuristics that improve study quality without AI calls.
 * Shared by backend services and frontend (via Vite import on window.StudentUSilent).
 */

function cleanNoteText(text = '', options = {}) {
  const maxLength = options.maxLength || 12000;
  let cleaned = String(text)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  cleaned = cleaned.replace(/(\w)-\n(\w)/g, '$1$2');
  cleaned = cleaned.replace(/(\d+)\s*\n\s*\/\s*\n\s*(\d+)/g, '$1/$2');

  const lines = cleaned.split('\n');
  const filtered = [];
  let repeatStreak = 0;
  let lastLine = '';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      filtered.push('');
      repeatStreak = 0;
      lastLine = '';
      return;
    }
    if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) return;
    if (/^\d+\s*$/.test(trimmed) && trimmed.length <= 3) return;
    if (trimmed === lastLine) {
      repeatStreak += 1;
      if (repeatStreak > 1) return;
    } else {
      repeatStreak = 0;
    }
    filtered.push(trimmed);
    lastLine = trimmed;
  });

  cleaned = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  cleaned = cleaned
    .replace(/\b([O0])\b(?=\s*[0-9])/g, '0')
    .replace(/\b([Il1])\b(?=\s*[a-z])/gi, '1');

  return cleaned.slice(0, maxLength);
}

function detectMaterialType(text = '', fileName = '') {
  const sample = `${fileName}\n${String(text).slice(0, 4000)}`.toLowerCase();
  const syllabusSignals = [
    /syllabus/,
    /grading\s+(policy|breakdown|scale)/,
    /office\s+hours/,
    /course\s+schedule/,
    /learning\s+outcomes/,
  ];
  const assignmentSignals = [
    /due\s+(date|by|on)/,
    /submit\s+(via|to|on)/,
    /homework\s+#?\d/,
    /assignment\s+#?\d/,
    /points?\s*:\s*\d+/,
  ];
  const professorSignals = [
    /professor\s+(said|noted|emphasized|mentioned)/,
    /in\s+lecture,?\s+(prof|dr\.)/,
    /professor\s+comment/,
  ];
  const lectureSignals = [
    /chapter\s+\d+/,
    /lecture\s+\d+/,
    /week\s+\d+/,
    /slide\s+\d+/,
    /unit\s+\d+/,
  ];

  const score = (patterns) => patterns.reduce((sum, pattern) => sum + (pattern.test(sample) ? 1 : 0), 0);
  const scores = [
    { type: 'Syllabus', value: score(syllabusSignals) + (/syllabus/i.test(fileName) ? 2 : 0) },
    { type: 'Assignment', value: score(assignmentSignals) },
    { type: 'Professor Comment', value: score(professorSignals) },
    { type: 'Lecture Notes', value: score(lectureSignals) + (/notes|lecture|chapter/i.test(fileName) ? 1 : 0) },
  ].sort((a, b) => b.value - a.value);

  if (scores[0].value >= 2) return scores[0].type;
  if (/\.(png|jpe?g|webp)$/i.test(fileName)) return 'Lecture Notes';
  return 'Lecture Notes';
}

function buildGlossaryFromText(text = '') {
  const glossary = {};
  const patterns = [
    /\b([A-Z]{2,8})\s*[\(\[]\s*([^)\]]{2,80})\s*[\)\]]/g,
    /\b([A-Za-z][A-Za-z0-9\- ]{1,40})\s*=\s*([^;\n]{2,120})/g,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      if (key.length >= 2 && value.length >= 2 && !glossary[key]) {
        glossary[key] = value;
      }
      match = pattern.exec(text);
    }
  });

  return glossary;
}

function expandGlossaryInText(text = '', glossary = {}) {
  let expanded = String(text);
  Object.entries(glossary).forEach(([abbrev, meaning]) => {
    if (abbrev.length < 2) return;
    const pattern = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (!expanded.toLowerCase().includes(meaning.toLowerCase().slice(0, 12))) {
      expanded = expanded.replace(pattern, `${abbrev} (${meaning})`);
    }
  });
  return expanded;
}

function normalizeForMatch(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(a = '', b = '') {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left) return right.length;
  if (!right) return left.length;

  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[left.length][right.length];
}

function fuzzyMatchTopic(a = '', b = '') {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;
  const collapsedLeft = left.replace(/\s+/g, '');
  const collapsedRight = right.replace(/\s+/g, '');
  if (collapsedLeft.length >= 4 && collapsedRight.length >= 4) {
    if (collapsedLeft.includes(collapsedRight) || collapsedRight.includes(collapsedLeft)) return 0.88;
  }

  const leftTokens = new Set(left.split(' ').filter(token => token.length > 2));
  const rightTokens = new Set(right.split(' ').filter(token => token.length > 2));
  if (!leftTokens.size || !rightTokens.size) {
    const maxLen = Math.max(left.length, right.length);
    return maxLen ? 1 - levenshteinDistance(left, right) / maxLen : 0;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });
  const tokenScore = overlap / Math.max(leftTokens.size, rightTokens.size);
  const distanceScore = 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);
  return Math.max(tokenScore, distanceScore);
}

function resolveTopicTitle(title = '', candidates = [], threshold = 0.82) {
  const input = String(title).trim();
  if (!input) return input;
  let best = input;
  let bestScore = 0;
  candidates.forEach((candidate) => {
    const score = fuzzyMatchTopic(input, candidate);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

function paragraphShingles(text = '', size = 5) {
  const words = normalizeForMatch(text).split(' ').filter(Boolean);
  const shingles = new Set();
  for (let i = 0; i <= words.length - size; i += 1) {
    shingles.add(words.slice(i, i + size).join(' '));
  }
  return shingles;
}

function jaccardSimilarity(a = '', b = '') {
  const left = paragraphShingles(a);
  const right = paragraphShingles(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((item) => {
    if (right.has(item)) intersection += 1;
  });
  return intersection / (left.size + right.size - intersection);
}

function getMaterialBody(material = {}) {
  return cleanNoteText([material.title, material.notes, material.extractedText].filter(Boolean).join('\n'));
}

function isNearDuplicateMaterial(newText = '', existingMaterials = [], threshold = 0.72) {
  const cleaned = cleanNoteText(newText);
  if (!cleaned || cleaned.length < 80) return false;
  return existingMaterials.some((item) => jaccardSimilarity(cleaned, getMaterialBody(item)) >= threshold);
}

function dedupeMaterials(materials = []) {
  const kept = [];
  materials.forEach((item) => {
    const body = getMaterialBody(item);
    if (!body || body.length < 80) {
      kept.push(item);
      return;
    }
    const duplicate = kept.some(existing => jaccardSimilarity(body, getMaterialBody(existing)) >= 0.72);
    if (!duplicate) kept.push(item);
  });
  return kept;
}

function parseExamDate(value = '') {
  const raw = String(value || '').trim();
  if (!raw || /add date/i.test(raw)) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function scoreExamUrgency(examDate) {
  const date = examDate instanceof Date ? examDate : parseExamDate(examDate);
  if (!date) return 0.35;
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
  if (days <= 3) return 1;
  if (days <= 7) return 0.9;
  if (days <= 14) return 0.75;
  if (days <= 30) return 0.55;
  return 0.35;
}

function scoreMaterialRelevance(material = {}, course = {}, options = {}) {
  const body = getMaterialBody(material);
  if (!body) return 0;
  const focusTerms = [
    course.currentChapter,
    ...(course.weakTopics || []),
    ...(course.chapters || []).filter(ch => Number(ch.progress) < 60).map(ch => ch.title),
  ].filter(Boolean);
  const focus = focusTerms.join(' ').toLowerCase();
  const lowerBody = body.toLowerCase();
  let focusScore = 0.2;
  focusTerms.forEach((term) => {
    if (term && lowerBody.includes(String(term).toLowerCase())) focusScore += 0.18;
  });
  if (focus && lowerBody.includes(focus.toLowerCase().slice(0, 24))) focusScore += 0.1;

  const ageMs = Date.now() - Date.parse(material.addedAt || 0);
  const recencyScore = Number.isFinite(ageMs) ? Math.max(0.15, 1 - ageMs / (1000 * 60 * 60 * 24 * 45)) : 0.5;
  const syllabusBoost = String(material.type || '').toLowerCase().includes('syllabus') ? 0.25 : 0;
  const professorBoost = String(material.type || '').toLowerCase().includes('professor') ? 0.15 : 0;
  const lengthScore = Math.min(0.25, body.length / 5000);
  const examBoost = scoreExamUrgency(course.examDate) * 0.15;

  return Math.min(1, focusScore + recencyScore * 0.25 + syllabusBoost + professorBoost + lengthScore + examBoost);
}

const { rankMaterialsForCourse } = require('./material-search.core');

function selectContextMaterials(materials = [], course = {}, limit = 3) {
  if (!materials.length) return [];
  const ranked = rankMaterialsForCourse(materials, course, limit, scoreMaterialRelevance);
  if (ranked.length) return ranked;

  return [...materials]
    .map(item => ({ item, score: scoreMaterialRelevance(item, course) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.item);
}

function buildFocusedClassContext(course = {}, helpers = {}) {
  const getText = helpers.getMaterialContextText || getMaterialBody;
  if (!course) return '';

  const materials = course.materials || [];
  const syllabus = materials.find(item => String(item.type).toLowerCase().includes('syllabus'));
  const selected = selectContextMaterials(
    materials.filter(item => item !== syllabus),
    course,
    helpers.materialLimit || 3,
  );
  const glossary = course.classMemory?.glossary || buildGlossaryFromText(getText(syllabus || {}));

  const chapters = (course.chapters || [])
    .map(item => `${item.title} (${item.status}, ${item.progress}% complete)`)
    .join('; ');

  const chunks = [
    `Class: ${course.title} (${course.code})`,
    `Professor: ${course.professor}`,
    `Current chapter: ${course.currentChapter}`,
    `Exam date: ${course.examDate}`,
    `Exam urgency: ${Math.round(scoreExamUrgency(course.examDate) * 100)}%`,
    `Chapter progress: ${chapters}`,
    `Weak topics: ${(course.weakTopics || []).join(', ') || 'None recorded yet'}`,
    syllabus ? `Syllabus summary: ${expandGlossaryInText(getText(syllabus), glossary)}` : 'Syllabus summary: No syllabus uploaded yet.',
    course.classMemory?.syllabus?.examDates?.length ? `Important dates:\n${course.classMemory.syllabus.examDates.join('\n')}` : '',
    course.classMemory?.syllabus?.gradingWeights?.length ? `Grade focus:\n${course.classMemory.syllabus.gradingWeights.join('\n')}` : '',
    course.classMemory?.concepts?.length ? `Mapped concepts:\n${course.classMemory.concepts.join('\n')}` : '',
  ];

  selected.forEach((item) => {
    chunks.push(`${item.type} - ${item.title}: ${expandGlossaryInText(getText(item), glossary)}`);
  });

  return chunks.filter(Boolean).join('\n').slice(0, helpers.maxLength || 8000);
}

function sortTopicsByExamProximity(topics = [], course = {}) {
  const urgency = scoreExamUrgency(course.examDate);
  return [...topics].sort((a, b) => {
    const aWeak = (course.weakTopics || []).some(item => fuzzyMatchTopic(item, a) >= 0.82) ? 1 : 0;
    const bWeak = (course.weakTopics || []).some(item => fuzzyMatchTopic(item, b) >= 0.82) ? 1 : 0;
    if (aWeak !== bWeak) return bWeak - aWeak;
    const aChapter = (course.chapters || []).find(item => fuzzyMatchTopic(item.title, a) >= 0.82);
    const bChapter = (course.chapters || []).find(item => fuzzyMatchTopic(item.title, b) >= 0.82);
    const aLow = aChapter && Number(aChapter.progress) < 60 ? 1 : 0;
    const bLow = bChapter && Number(bChapter.progress) < 60 ? 1 : 0;
    if (aLow !== bLow) return bLow - aLow;
    return urgency >= 0.75 ? String(a).localeCompare(String(b)) : 0;
  });
}

function scoreCardGrounding(card = {}, sourceTexts = []) {
  const corpus = sourceTexts.map(item => normalizeForMatch(item)).join(' ');
  if (!corpus) return 0.55;

  const terms = normalizeForMatch(`${card.title || ''} ${card.feynman || ''} ${card.analogy || ''}`)
    .split(' ')
    .filter(token => token.length > 3);
  if (!terms.length) return 0.4;

  let hits = 0;
  terms.forEach((term) => {
    if (corpus.includes(term)) hits += 1;
  });
  return hits / terms.length;
}

function filterGroundedCards(cards = [], sourceTexts = [], minScore = 0.22) {
  return cards.filter(card => scoreCardGrounding(card, sourceTexts) >= minScore);
}

function dedupeSimilarCards(cards = [], threshold = 0.78) {
  const kept = [];
  cards.forEach((card) => {
    const body = `${card.title || ''}\n${card.feynman || ''}`;
    const duplicate = kept.some(existing => jaccardSimilarity(body, `${existing.title || ''}\n${existing.feynman || ''}`) >= threshold);
    if (!duplicate) kept.push(card);
  });
  return kept;
}

function assessSessionFatigue(cardStates = [], options = {}) {
  const windowSize = options.windowSize || 8;
  const recent = cardStates.slice(-windowSize);
  if (recent.length < 4) {
    return { fatigued: false, missRate: 0, recommendation: 'continue' };
  }
  const misses = recent.filter(state => state === 'missed').length;
  const reviews = recent.filter(state => state === 'review').length;
  const missRate = misses / recent.length;
  const fatigued = missRate >= 0.5 || (misses >= 3 && reviews >= 2);
  let recommendation = 'continue';
  if (fatigued) recommendation = missRate >= 0.65 ? 'break' : 'ease';
  return { fatigued, missRate, recommendation };
}

function computeOcrConfidence(text = '') {
  const raw = String(text);
  if (!raw.trim()) return 0;
  const letters = (raw.match(/[A-Za-z]/g) || []).length;
  const digits = (raw.match(/\d/g) || []).length;
  const symbols = (raw.match(/[^A-Za-z0-9\s.,;:'"\-()]/g) || []).length;
  const words = raw.split(/\s+/).filter(Boolean);
  const shortWords = words.filter(word => word.length <= 2).length;
  const letterRatio = letters / Math.max(raw.length, 1);
  const symbolPenalty = symbols / Math.max(raw.length, 1);
  const shortWordPenalty = words.length ? shortWords / words.length : 0;
  const score = letterRatio * 0.55 + (1 - symbolPenalty) * 0.25 + (1 - shortWordPenalty) * 0.2;
  return Math.max(0, Math.min(1, score));
}

function combineLecturePhotoText(materials = []) {
  const photoMaterials = (materials || [])
    .filter(item => {
      const type = String(item.type || '').toLowerCase();
      const isPhoto = type.includes('photo') || String(item.fileType || '').startsWith('image/');
      const text = [item.extractedText, item.notes].filter(Boolean).join('\n').trim();
      return isPhoto && text.length > 20;
    })
    .sort((a, b) => {
      if (a.lectureSetId !== b.lectureSetId) return String(a.lectureSetId || '').localeCompare(String(b.lectureSetId || ''));
      return (Number(a.pageIndex) || 0) - (Number(b.pageIndex) || 0)
        || Date.parse(a.addedAt || 0) - Date.parse(b.addedAt || 0);
    });

  if (!photoMaterials.length) return '';

  return photoMaterials
    .map((item, index) => {
      const body = cleanNoteText([item.extractedText, item.notes].filter(Boolean).join('\n'));
      const label = item.title || item.source || `Photo ${index + 1}`;
      return `--- ${label} ---\n${body}`;
    })
    .join('\n\n')
    .slice(0, 12000);
}

function prepareMaterialFields(material = {}, existingMaterials = []) {
  const notes = cleanNoteText(material.notes || '');
  const extractedText = cleanNoteText(material.extractedText || '');
  const combined = [notes, extractedText].filter(Boolean).join('\n');
  const type = material.type && material.type !== 'Lecture Notes'
    ? material.type
    : detectMaterialType(combined, material.fileName || material.source || material.title || '');
  const duplicate = isNearDuplicateMaterial(combined, existingMaterials);
  const glossary = type === 'Syllabus' ? buildGlossaryFromText(combined) : {};

  return {
    notes,
    extractedText,
    type,
    duplicate,
    ocrConfidence: computeOcrConfidence(extractedText || notes),
    glossary,
  };
}

module.exports = {
  cleanNoteText,
  detectMaterialType,
  buildGlossaryFromText,
  expandGlossaryInText,
  fuzzyMatchTopic,
  resolveTopicTitle,
  jaccardSimilarity,
  isNearDuplicateMaterial,
  dedupeMaterials,
  scoreExamUrgency,
  scoreMaterialRelevance,
  selectContextMaterials,
  buildFocusedClassContext,
  sortTopicsByExamProximity,
  scoreCardGrounding,
  filterGroundedCards,
  dedupeSimilarCards,
  assessSessionFatigue,
  computeOcrConfidence,
  combineLecturePhotoText,
  prepareMaterialFields,
};
