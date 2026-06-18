/**
 * Happy path UI — guided setup from class → planner.
 */
(function () {
  function bootHappyPath() {
  const core = window.StudentUHappyPathCore;
  if (!core) return;

  const PLANNER_VIEWED_KEY = 'studentu_happy_path_planner_viewed';
  const STARTED_KEY = 'studentu_happy_path_started';

  function getSessionCount() {
    return window.StudentUStore?.getCompletedSessionCount?.()
      ?? Number(localStorage.getItem('studentu_sessions_completed') || '0');
  }

  function getActiveCourse() {
    if (typeof window.getActiveStoredClass === 'function') {
      const stored = window.getActiveStoredClass();
      if (stored) return stored;
    }
    if (typeof getActiveClassPortfolio === 'function') return getActiveClassPortfolio();
    return null;
  }

  function buildSnapshot() {
    const mode = window.getWorkspaceMode?.() || 'landing';
    return core.buildHappyPathSnapshot({
      mode,
      course: getActiveCourse(),
      sessionCount: getSessionCount(),
      plannerViewed: localStorage.getItem(PLANNER_VIEWED_KEY) === 'true',
    });
  }

  function getProgress() {
    return core.getHappyPathProgress(buildSnapshot());
  }

  function markPlannerViewed() {
    localStorage.setItem(PLANNER_VIEWED_KEY, 'true');
    refreshHappyPathUI();
  }

  function startHappyPath(options = {}) {
    localStorage.setItem(STARTED_KEY, 'true');
    if (options.fromOnboarding) {
      localStorage.setItem('studentu_onboarding_complete', 'true');
      document.getElementById('new-user-onboarding-overlay')?.classList.add('hidden');
    }
    refreshHappyPathUI();
    const progress = getProgress();
    if (progress.current?.id === 'class') {
      window.switchTab?.('profile');
      showNotification(
        'Let\'s set up your class',
        'Step 1 of 5 — add your class, then upload your syllabus and notes.',
        'info',
      );
      return;
    }
    runHappyPathAction(progress.current);
  }

  function runHappyPathAction(step) {
    if (!step) return;
    switch (step.action) {
      case 'createClass':
        window.switchTab?.('profile');
        if (typeof createClassPortfolio === 'function') {
          createClassPortfolio();
        }
        break;
      case 'uploadSyllabus':
      case 'uploadNotes':
        window.switchTab?.('profile');
        if (typeof switchClassesSubView === 'function') switchClassesSubView('materials');
        setTimeout(() => {
          window.focusClassMaterial?.(step.materialType || 'Lecture Notes');
        }, 120);
        break;
      case 'startSession':
        window.switchTab?.('workspace');
        setTimeout(() => {
          window.expandStudyGuidePanel?.();
          window.loadSelectedClassPacket?.();
          window.focusStudyInput?.();
        }, 120);
        break;
      case 'openPlanner':
        window.switchTab?.('dashboard');
        window.switchDashboardSubTab?.('planner');
        markPlannerViewed();
        break;
      default:
        break;
    }
  }

  function onSessionComplete() {
    const before = getProgress();
    window.updateSetupProgressUI?.();
    const after = getProgress();
    if (before.stepId === 'session' && after.stepId === 'planner') {
      showNotification(
        'First guide complete',
        'Progress & Planner unlocked — open your personalized study plan next.',
        'success',
      );
      setTimeout(() => {
        if (window.confirm?.('Open your study plan now?')) {
          runHappyPathAction(after.current);
        }
      }, 600);
    }
    if (after.isComplete) {
      window.StudentUFlow?.setFlowPath?.('study');
    }
    refreshHappyPathUI();
    window.refreshFlowCompass?.();
  }

  function onClassCreated(fromDemo = false) {
    if (fromDemo) {
      showNotification(
        'Real class created',
        'Add your syllabus next — demo session history stays separate.',
        'success',
      );
    }
    refreshHappyPathUI();
    const progress = getProgress();
    if (progress.current?.id === 'syllabus') {
      setTimeout(() => runHappyPathAction(progress.current), 400);
    }
  }

  function onMaterialSaved(materialType = '') {
    refreshHappyPathUI();
    const progress = getProgress();
    const type = String(materialType || '').toLowerCase();
    if (type.includes('syllabus') && progress.current?.id === 'notes') {
      showNotification('Syllabus saved', 'Next: add lecture notes or photos from class.', 'success');
    } else if (progress.current?.id === 'session') {
      showNotification('Materials ready', 'Start your first study guide on Study Desk.', 'success');
    }
  }

  function renderHappyPathStrip() {
    const mount = document.getElementById('happy-path-strip');
    if (!mount) return;

    const compass = document.getElementById('flow-compass');
    if (compass && !compass.classList.contains('hidden')) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const snapshot = buildSnapshot();
    if (!core.shouldShowHappyPath(snapshot)) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const progress = core.getHappyPathProgress(snapshot);
    const current = progress.current;
    if (!current) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }

    const stepLabels = progress.steps.map((step, index) => {
      const state = step.done ? 'is-done' : (step.id === current.id ? 'is-current' : 'is-upcoming');
      return `<span class="happy-path-strip__step ${state}"><span class="happy-path-strip__num">${step.done ? '✓' : index + 1}</span>${step.label}</span>`;
    }).join('');

    mount.classList.remove('hidden');
    mount.innerHTML = `
      <div class="happy-path-strip su-panel">
        <div class="happy-path-strip__head">
          <div>
            <span class="su-eyebrow">Setup path · ${progress.doneCount} of ${progress.total}</span>
            <h2 class="happy-path-strip__title">${current.label}</h2>
            <p class="happy-path-strip__hint">${current.hint}</p>
          </div>
          <button type="button" data-action="happyPathContinue" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0">${current.button}</button>
        </div>
        <div class="happy-path-strip__track" aria-hidden="true">${stepLabels}</div>
      </div>`;
  }

  function refreshHappyPathUI() {
    renderHappyPathStrip();
    window.renderFlowNextAction?.();
  }

  window.StudentUHappyPath = {
    getProgress,
    startHappyPath,
    runHappyPathAction,
    onSessionComplete,
    onClassCreated,
    onMaterialSaved,
    markPlannerViewed,
    refreshHappyPathUI,
  };
  window.startHappyPath = startHappyPath;
  window.refreshHappyPathUI = refreshHappyPathUI;
  }

  if (window.StudentUHappyPathCore) bootHappyPath();
  else window.addEventListener('studentu:happy-path-ready', bootHappyPath, { once: true });
})();
