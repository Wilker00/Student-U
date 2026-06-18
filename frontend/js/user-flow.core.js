/**
 * User flow paths — two canonical journeys plus post-setup study loop.
 */
(function () {
  const EXPLORE_STEPS = [
    {
      id: 'sample',
      label: 'Load sample class',
      hint: 'Neural Networks demo notes are ready on Study Desk.',
      tab: 'workspace',
      action: 'loadDemo',
      button: 'Open Study Desk',
    },
    {
      id: 'guide',
      label: 'Generate a study guide',
      hint: 'Turn sample notes into explanations and a quiz.',
      tab: 'workspace',
      action: 'startGuide',
      button: 'Start guide',
    },
    {
      id: 'plan',
      label: 'Unlock your plan',
      hint: 'Finish the guide to open Progress & Planner.',
      tab: 'workspace',
      action: 'finishGuide',
      button: 'Continue guide',
    },
  ];

  const STUDY_LOOP = [
    { id: 'desk', label: 'Study Desk', hint: 'Generate guides from your materials.' },
    { id: 'classes', label: 'My Classes', hint: 'Upload syllabus, notes, and photos.' },
    { id: 'plan', label: 'Planner', hint: 'See what to review and when.' },
  ];

  function getFlowPathKey(options = {}) {
    const mode = options.mode || 'landing';
    if (mode === 'landing' || !options.hasAppAccess) return null;
    if (mode === 'demo') return 'explore';
    if (options.happyPathComplete) return 'study';
    if (options.happyPathActive) return 'setup';
    if (mode === 'signed_in' || mode === 'setup' || mode === 'my_class') return 'setup';
    return null;
  }

  function resolveExploreStep(options = {}) {
    if (options.sessionCount > 0) return 'complete';
    if (options.hasResumeSession || options.hasActiveSession) return 'plan';
    if (options.demoLoaded) return 'guide';
    return 'sample';
  }

  function getExploreProgress(options = {}) {
    const stepId = resolveExploreStep(options);
    const steps = EXPLORE_STEPS.map((step) => ({
      ...step,
      done: isExploreStepDone(step.id, options),
    }));
    const current = stepId === 'complete'
      ? null
      : steps.find((step) => step.id === stepId) || steps[0];
    const doneCount = stepId === 'complete' ? steps.length : steps.findIndex((step) => step.id === stepId);
    return {
      path: 'explore',
      pathLabel: 'Explore sample',
      pathDescription: 'Sample data only — switch to My Classes when you are ready for your real course.',
      stepId,
      steps,
      current,
      doneCount: Math.max(0, doneCount),
      total: steps.length,
      isComplete: stepId === 'complete',
    };
  }

  function isExploreStepDone(stepId, options = {}) {
    switch (stepId) {
      case 'sample': return Boolean(options.demoLoaded);
      case 'guide': return Boolean(options.hasResumeSession || options.hasActiveSession || options.sessionCount > 0);
      case 'plan': return options.sessionCount > 0;
      default: return false;
    }
  }

  function getSetupProgress(options = {}) {
    const happy = options.happyProgress;
    if (!happy) return null;
    return {
      path: 'setup',
      pathLabel: 'Set up my class',
      pathDescription: 'Your real syllabus, notes, and progress live here.',
      stepId: happy.stepId,
      steps: happy.steps,
      current: happy.current,
      doneCount: happy.doneCount,
      total: happy.total,
      isComplete: happy.isComplete,
    };
  }

  function getStudyLoopProgress(options = {}) {
    const tab = options.activeTab || 'workspace';
    const current = STUDY_LOOP.find((item) => {
      if (tab === 'workspace') return item.id === 'desk';
      if (tab === 'profile') return item.id === 'classes';
      if (tab === 'dashboard') return item.id === 'plan';
      return false;
    }) || STUDY_LOOP[0];
    return {
      path: 'study',
      pathLabel: 'Your class',
      pathDescription: 'Study Desk for guides · My Classes for uploads · Planner for reviews.',
      stepId: current.id,
      steps: STUDY_LOOP,
      current,
      doneCount: STUDY_LOOP.length,
      total: STUDY_LOOP.length,
      isComplete: true,
    };
  }

  function getFlowCompassState(options = {}) {
    const pathKey = getFlowPathKey(options);
    if (!pathKey) {
      return { visible: false, pathKey: null, progress: null };
    }

    let progress = null;
    if (pathKey === 'explore') progress = getExploreProgress(options);
    else if (pathKey === 'setup') progress = getSetupProgress(options);
    else progress = getStudyLoopProgress(options);

    const visible = Boolean(progress && (pathKey === 'study' || !progress.isComplete));
    return { visible, pathKey, progress };
  }

  function buildResumeMessage(progress, options = {}) {
    if (!progress || progress.isComplete) return null;
    const step = progress.current?.label || 'Continue';
    if (progress.path === 'explore') {
      return {
        title: 'Welcome back',
        body: `Resume explore: ${step}. Demo progress stays separate from your real class.`,
      };
    }
    if (progress.path === 'setup') {
      return {
        title: 'Welcome back',
        body: `Pick up where you left off: ${step}.`,
      };
    }
    return {
      title: 'Welcome back',
      body: 'Your class is ready — use Study Desk, My Classes, or Planner.',
    };
  }

  function getTabHint(activeTab, pathKey) {
    if (pathKey === 'explore') {
      if (activeTab === 'workspace') return 'Sample notes · generate a guide to try StudentU';
      if (activeTab === 'profile') return 'Demo only — add your real class here when ready';
      if (activeTab === 'ai') return 'Study AI uses sample context in explore mode';
      if (activeTab === 'dashboard') return 'Complete a demo guide first to unlock your plan';
    }
    if (pathKey === 'setup') {
      if (activeTab === 'workspace') return 'Study Desk opens after you add syllabus or notes';
      if (activeTab === 'profile') return 'Upload syllabus and lecture materials here';
      if (activeTab === 'ai') return 'Study AI works best once materials are uploaded';
      if (activeTab === 'dashboard') return 'Planner unlocks after your first study guide';
    }
    if (pathKey === 'study') {
      if (activeTab === 'workspace') return 'Generate guides and quizzes from your class packet';
      if (activeTab === 'profile') return 'Manage syllabus, notes, photos, and weak topics';
      if (activeTab === 'ai') return 'Ask about your selected class and current materials';
      if (activeTab === 'dashboard') return 'Track retention and spaced review schedule';
    }
    return '';
  }

  window.StudentUFlowCore = {
    EXPLORE_STEPS,
    STUDY_LOOP,
    getFlowPathKey,
    getFlowCompassState,
    buildResumeMessage,
    getTabHint,
    getExploreProgress,
  };
})();
