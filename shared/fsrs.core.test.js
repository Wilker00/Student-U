const test = require('node:test');
const assert = require('node:assert/strict');

const { scheduleFsrsReview, mapPerformanceToRating } = require('./fsrs.core');

test('maps study performance to FSRS ratings', () => {
  assert.equal(mapPerformanceToRating('missed'), 1);
  assert.equal(mapPerformanceToRating('review'), 2);
  assert.equal(mapPerformanceToRating('learned', []), 3);
  assert.equal(mapPerformanceToRating('learned', [{ status: 'learned' }, { status: 'learned' }]), 4);
});

test('schedules longer intervals for learned cards than missed cards', () => {
  const learned = scheduleFsrsReview({ id: 'a', difficulty: 'Beginner' }, 'learned', []);
  const missed = scheduleFsrsReview({ id: 'b', difficulty: 'Advanced' }, 'missed', []);

  assert.ok(learned.interval >= missed.interval);
  assert.ok(learned.reviewDate instanceof Date);
  assert.match(learned.reasoning, /FSRS/);
  assert.equal(learned.algorithm, 'fsrs');
});

test('FSRS stability grows with successful repetitions', () => {
  const first = scheduleFsrsReview({ id: 'c' }, 'learned', []);
  const second = scheduleFsrsReview(
    { id: 'c', fsrs: first.fsrs },
    'learned',
    [{ status: 'learned', correct: true }],
  );

  assert.ok(second.interval >= first.interval);
});
