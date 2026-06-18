const test = require('node:test');
const assert = require('node:assert/strict');

const { searchMaterials, rankMaterialsForCourse } = require('./material-search.core');

const materials = [
  {
    id: 'm1',
    type: 'Syllabus',
    title: 'Course syllabus',
    notes: 'Exam on April 12. Chapters include neural networks and backpropagation.',
  },
  {
    id: 'm2',
    type: 'Photo Notes',
    title: 'Lecture 4 photo',
    extractedText: 'Backpropagation uses the chain rule to compute gradients through layers.',
  },
  {
    id: 'm3',
    type: 'Lecture Notes',
    title: 'Renaissance art',
    notes: 'Linear perspective and humanism in Italian painting.',
  },
];

test('finds materials relevant to weak topic query', () => {
  const hits = searchMaterials(materials, 'backpropagation chain rule', 2);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].id, 'm2');
});

test('ranks weak-topic materials ahead of unrelated notes', () => {
  const course = {
    currentChapter: 'Neural Networks',
    weakTopics: ['Backpropagation'],
    chapters: [{ title: 'Backpropagation', progress: 35 }],
    examDate: '2026-04-12',
  };

  const ranked = rankMaterialsForCourse(materials, course, 2, () => 0.1);
  assert.ok(ranked.length >= 1);
  assert.notEqual(ranked[0].id, 'm3');
});
