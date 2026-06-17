const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildHappyPathSnapshot,
  resolveHappyPathStep,
  getHappyPathProgress,
  shouldShowHappyPath,
} = require('./happy-path.core.js');

test('resolveHappyPathStep walks class → syllabus → notes → session → planner', () => {
  let snapshot = buildHappyPathSnapshot({ mode: 'my_class' });
  assert.equal(resolveHappyPathStep(snapshot), 'class');

  snapshot = buildHappyPathSnapshot({
    mode: 'my_class',
    course: { id: 'bio101', materials: [] },
  });
  assert.equal(resolveHappyPathStep(snapshot), 'syllabus');

  snapshot = buildHappyPathSnapshot({
    mode: 'my_class',
    course: { id: 'bio101', materials: [{ type: 'Syllabus', title: 'Syllabus' }] },
  });
  assert.equal(resolveHappyPathStep(snapshot), 'notes');

  snapshot = buildHappyPathSnapshot({
    mode: 'my_class',
    course: {
      id: 'bio101',
      materials: [
        { type: 'Syllabus', title: 'Syllabus' },
        { type: 'Lecture Notes', title: 'Week 1' },
      ],
    },
  });
  assert.equal(resolveHappyPathStep(snapshot), 'session');

  snapshot = buildHappyPathSnapshot({
    mode: 'my_class',
    course: {
      id: 'bio101',
      materials: [
        { type: 'Syllabus', title: 'Syllabus' },
        { type: 'Photo Notes', title: 'Lecture photo' },
      ],
    },
    sessionCount: 1,
  });
  assert.equal(resolveHappyPathStep(snapshot), 'planner');

  snapshot = buildHappyPathSnapshot({
    mode: 'synced',
    course: { id: 'bio101', materials: [{ type: 'Syllabus' }, { type: 'Lecture Notes' }] },
    sessionCount: 2,
    plannerViewed: true,
  });
  assert.equal(resolveHappyPathStep(snapshot), 'complete');
});

test('demo mode skips happy path', () => {
  const snapshot = buildHappyPathSnapshot({
    mode: 'demo',
    course: { id: 'neuro', demoSeed: true, materials: [] },
  });
  assert.equal(resolveHappyPathStep(snapshot), null);
  assert.equal(shouldShowHappyPath(snapshot), false);
});

test('getHappyPathProgress counts completed steps', () => {
  const progress = getHappyPathProgress(buildHappyPathSnapshot({
    mode: 'my_class',
    course: {
      id: 'hist',
      materials: [{ type: 'Syllabus' }],
    },
  }));
  assert.equal(progress.doneCount, 2);
  assert.equal(progress.current?.id, 'notes');
  assert.equal(progress.progress, 40);
});
