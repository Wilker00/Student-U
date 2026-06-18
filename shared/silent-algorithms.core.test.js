const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanNoteText,
  detectMaterialType,
  buildGlossaryFromText,
  fuzzyMatchTopic,
  resolveTopicTitle,
  isNearDuplicateMaterial,
  scoreExamUrgency,
  scoreCardGrounding,
  filterGroundedCards,
  assessSessionFatigue,
  prepareMaterialFields,
  sortTopicsByExamProximity,
} = require('./silent-algorithms.core');

test('cleans hyphenated line breaks and page numbers', () => {
  const input = 'algo-\nritm\nPage 2\n\n\nhello world';
  const cleaned = cleanNoteText(input);
  assert.match(cleaned, /algorithm/);
  assert.doesNotMatch(cleaned, /Page 2/);
});

test('detects syllabus material from structure', () => {
  const type = detectMaterialType('Course syllabus\nGrading policy: exams 60%\nOffice hours: Tue 2pm', 'fall_syllabus.txt');
  assert.equal(type, 'Syllabus');
});

test('builds glossary abbreviations', () => {
  const glossary = buildGlossaryFromText('GDP (Gross Domestic Product) and CPI [Consumer Price Index]');
  assert.equal(glossary.gdp, 'Gross Domestic Product');
  assert.equal(glossary.cpi, 'Consumer Price Index');
});

test('fuzzy topic matching links shorthand to canonical title', () => {
  assert.ok(fuzzyMatchTopic('back prop', 'Backpropagation') >= 0.82);
  assert.equal(resolveTopicTitle('back prop', ['Backpropagation', 'Chain Rule']), 'Backpropagation');
});

test('flags near duplicate materials', () => {
  const existing = [{ notes: 'Neural networks use layers of neurons to learn patterns from data in supervised settings.' }];
  const duplicate = isNearDuplicateMaterial(
    'Neural networks use layers of neurons to learn patterns from data in supervised learning settings.',
    existing,
  );
  assert.equal(duplicate, true);
});

test('scores higher exam urgency closer to exam date', () => {
  const soon = scoreExamUrgency(new Date(Date.now() + 2 * 86400000).toISOString());
  const later = scoreExamUrgency(new Date(Date.now() + 40 * 86400000).toISOString());
  assert.ok(soon > later);
});

test('filters cards that are not grounded in source text', () => {
  const cards = [
    { title: 'Photosynthesis', feynman: 'Plants convert light into chemical energy.' },
    { title: 'Quantum tunneling', feynman: 'Particles pass through barriers impossibly.' },
  ];
  const grounded = filterGroundedCards(cards, ['Photosynthesis converts light energy in chloroplasts.']);
  assert.equal(grounded.length, 1);
  assert.equal(grounded[0].title, 'Photosynthesis');
  assert.ok(scoreCardGrounding(grounded[0], ['Photosynthesis converts light energy in chloroplasts.']) >= 0.22);
});

test('detects session fatigue from recent misses', () => {
  const fatigue = assessSessionFatigue(['learned', 'missed', 'missed', 'missed', 'missed']);
  assert.equal(fatigue.fatigued, true);
  assert.equal(fatigue.recommendation, 'break');
});

test('prepareMaterialFields cleans and detects type', () => {
  const prepared = prepareMaterialFields({
    notes: 'Week 3\nChapter 4 notes\nLecture on neural nets',
    type: 'Lecture Notes',
    fileName: 'week3.txt',
  }, []);
  assert.equal(prepared.type, 'Lecture Notes');
  assert.equal(prepared.duplicate, false);
  assert.ok(prepared.notes.includes('Chapter 4'));
});

test('prioritizes weak topics in planner ordering', () => {
  const course = {
    examDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    weakTopics: ['Chain Rule'],
    chapters: [{ title: 'Derivatives', progress: 40 }],
  };
  const sorted = sortTopicsByExamProximity(['Derivatives', 'Chain Rule', 'Integrals'], course);
  assert.equal(sorted[0], 'Chain Rule');
});
