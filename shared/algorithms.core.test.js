const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDependencyGraph,
  findComprehensionGaps,
  calculatePerformanceVelocity,
  calculateOptimalReviewDate,
  clusterWeakSpots,
  calibrateDifficulty,
  validateQuestionCoherence,
  levenshteinDistance,
} = require('./algorithms.core');

test('orders prerequisite cards before dependent cards', () => {
  const cards = [
    { id: 'm2', title: 'The Multiplier Effect', feynman: 'Fiscal policy spending creates ripples.' },
    { id: 'm1', title: 'Fiscal Policy', feynman: 'Government spending and taxation decisions.' },
  ];

  const graph = buildDependencyGraph(cards);
  assert.equal(graph.sortedCards[0].id, 'm1');
  assert.equal(graph.sortedCards[1].id, 'm2');
  assert.deepEqual(graph.dependencies.m2, ['m1']);
});

test('finds comprehension gaps from sparse highlighting', () => {
  const result = findComprehensionGaps(
    'test',
    '<span data-hl-color="yellow">hello</span>',
    'hello world text. another untouched sentence.'
  );

  assert.ok(result.gapPercentage > 50);
  assert.equal(result.gapSeverity, 'critical');
  assert.ok(result.unhighlightedSegments.length > 0);
});

test('calculates performance velocity across recent sessions', () => {
  const velocity = calculatePerformanceVelocity([
    { correctAnswers: 1, missedAnswers: 3 },
    { correctAnswers: 2, missedAnswers: 2 },
    { correctAnswers: 3, missedAnswers: 1 },
  ]);

  assert.equal(velocity.trend, 'improving_fast');
  assert.ok(velocity.currentAccuracy > 70);
});

test('calculates review interval by performance and difficulty', () => {
  const learned = calculateOptimalReviewDate({ difficulty: 'Beginner' }, 'learned', []);
  const missed = calculateOptimalReviewDate({ difficulty: 'Advanced' }, 'missed', []);

  assert.ok(learned.interval >= missed.interval);
  assert.ok(learned.reviewDate instanceof Date);
  assert.match(learned.reasoning, /FSRS/);
});

test('clusters related missed concepts', () => {
  const cards = [
    { id: 'm1', title: 'Fiscal Policy', feynman: 'Government spending taxation policy.', analogy: 'Budget lever.' },
    { id: 'm2', title: 'Multiplier Effect', feynman: 'Government spending ripples through economy.', analogy: 'Ripple effect.' },
    { id: 'h1', title: 'Linear Perspective', feynman: 'Art depth illusion.', analogy: 'Train tracks.' },
  ];

  const clusters = clusterWeakSpots(['m1', 'm2'], cards);
  assert.ok(clusters.length >= 1);
  assert.ok(clusters[0].cardIds.includes('m1'));
});

test('calibrates difficulty from performance and velocity', () => {
  const calibration = calibrateDifficulty(
    {
      easy: { accuracy: 0.9 },
      medium: { accuracy: 0.9 },
      hard: { accuracy: 0.2 },
    },
    { trend: 'stable', currentAccuracy: 80 }
  );

  assert.equal(calibration.primaryDifficulty, 'HARD');
  assert.ok(calibration.aiPromptModifier.includes('HARD'));
});

test('validates coherent and incoherent questions', () => {
  const card = {
    id: 'test',
    title: 'Backpropagation',
    feynman: 'Backpropagation computes gradients through neural network layers.',
  };
  const goodQuestion = {
    question: 'How does backpropagation compute gradients through neural network layers?',
    options: ['Using gradients through layers', 'Randomly changing layers', 'Forward only through networks', 'No gradient learning'],
    correct: 0,
    explanation: 'Backpropagation computes error gradients backward through neural network layers.',
  };
  const badQuestion = {
    question: 'What color is the sky?',
    options: ['Blue', 'Green', 'Red', 'Yellow'],
    correct: 0,
    explanation: 'The sky appears blue.',
  };

  assert.equal(validateQuestionCoherence(card, goodQuestion).isCoherent, true);
  assert.equal(validateQuestionCoherence(card, badQuestion).isCoherent, false);
});

test('computes levenshtein distance', () => {
  assert.equal(levenshteinDistance('gradient', 'gradent'), 1);
});
