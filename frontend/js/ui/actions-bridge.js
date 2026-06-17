/**
 * Legacy action delegation (loaded with script tags; mirrors src/ui/actions.js).
 */
(function () {
  function call(name, ...args) {
    const fn = window[name];
    if (typeof fn === 'function') fn(...args);
  }

  function callMethod(target, method, ...args) {
    const obj = window[target];
    if (obj && typeof obj[method] === 'function') obj[method](...args);
  }

  function readDataset(element) {
    return {
      tab: element.dataset.tabTarget,
      subtab: element.dataset.subtabTarget,
      classView: element.dataset.classView,
      prompt: element.dataset.prompt,
      type: element.dataset.heroType,
      demoCourse: element.dataset.demoCourse,
      openAi: element.dataset.openAi,
      course: element.dataset.course,
      courseId: element.dataset.courseId,
      materialId: element.dataset.materialId,
      status: element.dataset.status,
      color: element.dataset.color,
      materialType: element.dataset.materialType,
      day: element.dataset.day,
      recallIndex: element.dataset.recallIndex,
      quizIndex: element.dataset.quizIndex,
      task: element.dataset.task,
      followUp: element.dataset.followUp,
      topic: element.dataset.topic,
      messageIndex: element.dataset.messageIndex,
    };
  }

  const actionHandlers = {
    routeHome: () => call('routeToStudyHome'),
    openSetupGuide: () => call('openSetupGuide'),
    switchTab: ({ tab, subtab, classView }) => {
      call('switchTab', tab);
      if (subtab) call('switchDashboardSubTab', subtab);
      if (classView) call('switchClassesSubView', classView);
    },
    switchDashboardSubTab: ({ subtab }) => call('switchDashboardSubTab', subtab),
    switchClassesSubView: ({ classView }) => call('switchClassesSubView', classView),
    switchDayTab: (_data, el) => {
      if (el?.dataset?.day) call('switchDayTab', el, el.dataset.day);
    },
    openAI: ({ prompt }) => call('openContextualAI', prompt),
    signIn: () => call('signInWithGoogle'),
    signOut: () => call('signOut'),
    verifyStudent: () => call('openVerificationModal'),
    closeVerificationModal: () => call('closeVerificationModal'),
    submitVerification: () => call('submitAcademicVerification'),
    heroAction: ({ type }) => call('handleHeroAction', type),
    enterExplorePath: ({ demoCourse, openAi }) => {
      window.StudentUFlow?.enterExplorePath?.(demoCourse || 'neuro', { openAI: openAi === true || openAi === 'true' });
    },
    enterSetupPath: () => window.StudentUFlow?.enterSetupPath?.(),
    dismissDemoHandoff: () => window.StudentUFlow?.dismissDemoHandoffModal?.(),
    flowCompassContinue: () => window.StudentUFlow?.runFlowCompassAction?.(),
    loadUseCaseDemo: ({ demoCourse }) => call('handleUseCaseDemo', demoCourse),
    startStudySession: () => call('startStudySession'),
    generateAdaptiveQuiz: () => call('generateAdaptiveQuiz'),
    closeQuiz: () => call('closeQuiz'),
    advanceQuiz: () => call('advanceQuiz'),
    continuePreviousSession: () => call('continuePreviousSession'),
    focusStudyInput: () => call('focusStudyInput'),
    startSetupFlow: () => call('startSetupFlow'),
    dismissOnboardingGate: () => call('dismissOnboardingGate'),
    loadSelectedClassPacket: () => call('loadSelectedClassPacket'),
    loadPacketAndWorkspace: () => {
      if (typeof window.loadPacketAndWorkspace === 'function') {
        window.loadPacketAndWorkspace();
        return;
      }
      call('loadSelectedClassPacket');
      call('switchTab', 'workspace');
    },
    planNextReview: () => {
      call('switchTab', 'dashboard');
      call('switchDashboardSubTab', 'planner');
    },
    createClassPortfolio: () => call('createClassPortfolio'),
    addClassMaterial: () => call('addClassMaterial'),
    openPhotoReview: ({ courseId, materialId }) => call('openPhotoReviewModal', courseId, materialId),
    closePhotoReviewModal: () => call('closePhotoReviewModal'),
    savePhotoReview: () => call('savePhotoReview'),
    loadLecturePhotos: ({ courseId }) => call('loadLecturePhotosToStudyDesk', courseId),
    exportActiveClassData: () => call('exportActiveClassData'),
    clearActiveClassMaterials: () => call('clearActiveClassMaterials'),
    clearAllClassStudyData: () => call('clearAllClassStudyData'),
    saveClassSetupDetails: () => call('saveClassSetupDetails'),
    selectClassPortfolio: ({ courseId }) => call('selectClassPortfolio', courseId),
    startSpecificPlannedSession: ({ course }) => call('startSpecificPlannedSession', course),
    drillWeakSpots: () => call('drillWeakSpots'),
    rescheduleReminders: () => call('rescheduleReminders'),
    openUpgradeModal: () => call('openUpgradeModal'),
    closeUpgradeModal: () => call('closeUpgradeModal'),
    simulateStripeCheckout: () => call('simulateStripeCheckout'),
    startStripeCheckout: () => call('startStripeCheckout'),
    toggleSessionTimer: () => call('toggleSessionTimer'),
    takeBreak: () => call('takeBreak'),
    endSession: () => call('endActiveStudySessionAndShowSummary'),
    returnToSetupPane: () => call('returnToSetupPane'),
    prevCard: () => call('prevCard'),
    nextCard: () => call('nextCard'),
    markCard: ({ status }) => call('markCard', status),
    applyHighlight: ({ color }) => call('applyHighlight', color),
    hideHighlightToolbar: () => call('hideHighlightToolbar'),
    dismissRecallCheckpoint: () => call('dismissRecallCheckpoint'),
    skipBreak: () => call('skipBreak'),
    startReviewQueue: () => call('startReviewQueue'),
    startPracticeFromActiveClass: () => call('startPracticeFromActiveClass'),
    focusClassMaterial: ({ materialType }) => call('focusClassMaterial', materialType),
    generateStudyPlan: () => call('generateStudyPlanForActiveClass'),
    openCourseDetail: () => call('openActiveCourseDetail'),
    copyClassContext: () => call('copyClassContextPacket'),
    startClassContextSession: ({ courseId }) => call('startClassContextSession', courseId),
    addChapterToActiveClass: () => call('addChapterToActiveClass'),
    addWeakTopicToActiveClass: () => call('addWeakTopicToActiveClass'),
    selectAndReview: ({ courseId }) => {
      call('selectClassPortfolio', courseId);
      call('startReviewQueue');
    },
    selectAndPlan: ({ courseId }) => {
      call('selectClassPortfolio', courseId);
      call('switchTab', 'dashboard');
      call('switchDashboardSubTab', 'planner');
    },
    startPlannedSession: ({ courseId }) => {
      call('selectClassPortfolio', courseId);
      call('startClassContextSession', courseId);
    },
    completeNewUserOnboarding: () => call('completeNewUserOnboarding'),
    happyPathContinue: () => {
      const progress = window.StudentUHappyPath?.getProgress?.();
      window.StudentUHappyPath?.runHappyPathAction?.(progress?.current);
    },
    submitRecallAnswer: ({ recallIndex }) => call('submitRecallAnswer', Number(recallIndex)),
    submitQuizAnswer: ({ quizIndex }) => call('submitQuizAnswer', Number(quizIndex)),
    chatSend: () => callMethod('StudentUChat', 'send', 'freeform'),
    chatPrompt: ({ prompt }) => callMethod('StudentUChat', 'usePrompt', prompt, 'freeform'),
    chatTask: (_data, el) => callMethod('StudentUChat', 'runTask', el?.dataset?.task),
    chatApplyDesk: (_data, el) => callMethod('StudentUChat', 'applyToStudyDesk', el?.dataset?.messageIndex),
    chatFollowUp: (_data, el) => callMethod('StudentUChat', 'followUp', el?.dataset?.followUp, el?.dataset?.messageIndex),
    chatMarkWeak: (_data, el) => callMethod('StudentUChat', 'markWeakTopic', el?.dataset?.topic),
    chatToggleThread: () => callMethod('StudentUChat', 'toggleThread'),
    hideAlert: () => document.getElementById('alert-box')?.classList.add('hidden'),
  };

  window.StudentU = window.StudentU || {};
  window.StudentU.actions = window.StudentU.actions || {};
  Object.assign(window.StudentU.actions, actionHandlers);

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const handler = window.StudentU.actions[target.dataset.action];
    if (!handler) return;
    event.preventDefault();
    handler(readDataset(target), target, event);
  });
})();
