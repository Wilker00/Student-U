/**
 * End-to-end setup flow: class → syllabus → notes → first session → planner.
 * Pure logic — safe to unit test without DOM.
 */

const HAPPY_PATH_STEPS = [
  {
    id: 'class',
    label: 'Add your class',
    hint: 'Create one class portfolio for the course you are studying now.',
    action: 'createClass',
    button: 'Add class',
    tab: 'profile',
  },
  {
    id: 'syllabus',
    label: 'Upload syllabus',
    hint: 'StudentU reads exam dates, topics, and grading from your syllabus.',
    action: 'uploadSyllabus',
    button: 'Upload syllabus',
    tab: 'profile',
    materialType: 'Syllabus',
  },
  {
    id: 'notes',
    label: 'Add notes or photos',
    hint: 'Paste lecture notes or upload photos from your phone.',
    action: 'uploadNotes',
    button: 'Add notes',
    tab: 'profile',
    materialType: 'Lecture Notes',
  },
  {
    id: 'session',
    label: 'Complete your first guide',
    hint: 'Generate explanations and a quiz from your class materials.',
    action: 'startSession',
    button: 'Start guide',
    tab: 'workspace',
  },
  {
    id: 'planner',
    label: 'Open your study plan',
    hint: 'See spaced reviews and what to study next.',
    action: 'openPlanner',
    button: 'Open planner',
    tab: 'dashboard',
    subtab: 'planner',
  },
];

function materialIsSyllabus(material = {}) {
  return String(material.type || '').toLowerCase().includes('syllabus');
}

function buildHappyPathSnapshot(options = {}) {
  const course = options.course || null;
  const materials = course?.materials || [];
  const sessionCount = Number(options.sessionCount || 0);
  return {
    hasClass: Boolean(course?.id && !course?.demoSeed),
    hasSyllabus: materials.some(materialIsSyllabus),
    hasNotes: materials.some((material) => !materialIsSyllabus(material)),
    hasSession: sessionCount > 0,
    plannerViewed: Boolean(options.plannerViewed),
    mode: options.mode || 'landing',
  };
}

function resolveHappyPathStep(snapshot = {}) {
  if (snapshot.mode === 'demo' || snapshot.mode === 'landing') return null;
  if (!snapshot.hasClass) return 'class';
  if (!snapshot.hasSyllabus) return 'syllabus';
  if (!snapshot.hasNotes) return 'notes';
  if (!snapshot.hasSession) return 'session';
  if (!snapshot.plannerViewed) return 'planner';
  return 'complete';
}

function getHappyPathProgress(snapshot = {}) {
  const stepId = resolveHappyPathStep(snapshot);
  const steps = HAPPY_PATH_STEPS.map((step) => ({
    ...step,
    done: isHappyPathStepDone(step.id, snapshot),
  }));
  const doneCount = steps.filter((step) => step.done).length;
  const current = stepId ? steps.find((step) => step.id === stepId) || null : null;
  return {
    stepId,
    steps,
    current,
    doneCount,
    total: steps.length,
    progress: Math.round((doneCount / steps.length) * 100),
    isComplete: stepId === 'complete',
  };
}

function isHappyPathStepDone(stepId, snapshot = {}) {
  switch (stepId) {
    case 'class': return snapshot.hasClass;
    case 'syllabus': return snapshot.hasSyllabus;
    case 'notes': return snapshot.hasNotes;
    case 'session': return snapshot.hasSession;
    case 'planner': return snapshot.plannerViewed;
    default: return false;
  }
}

function shouldShowHappyPath(snapshot = {}) {
  if (snapshot.mode === 'demo' || snapshot.mode === 'landing') return false;
  return resolveHappyPathStep(snapshot) !== 'complete';
}

module.exports = {
  HAPPY_PATH_STEPS,
  buildHappyPathSnapshot,
  resolveHappyPathStep,
  getHappyPathProgress,
  isHappyPathStepDone,
  shouldShowHappyPath,
  materialIsSyllabus,
};
