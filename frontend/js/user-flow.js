/**
 * Flow compass + unified entry routing for demo vs real-class paths.
 */
(function () {
  const FLOW_PATH_KEY = 'studentu_flow_path';
  const EXPLORE_ACTIVE_KEY = 'studentu_explore_active';
  const LAST_VISIT_KEY = 'studentu_last_visit_at';
  const core = () => window.StudentUFlowCore;

  function getActiveTab() {
    const active = document.querySelector('.tab-pane.active');
    return active?.id?.replace('tab-', '') || 'landing';
  }

  function buildFlowOptions() {
    const mode = window.getWorkspaceMode?.() || 'landing';
    const hasAppAccess = typeof window.hasAppAccess === 'function' ? window.hasAppAccess() : mode !== 'landing';
    const happyProgress = window.StudentUHappyPath?.getProgress?.();
    let resumeSession = null;
    try {
      resumeSession = JSON.parse(localStorage.getItem('studentu_resume_session') || 'null');
    } catch (_error) {
      resumeSession = null;
    }
    const course = typeof getActiveClassPortfolio === 'function' ? getActiveClassPortfolio() : null;
    return {
      mode,
      hasAppAccess,
      activeTab: getActiveTab(),
      sessionCount: window.StudentUStore?.getCompletedSessionCount?.()
        ?? Number(localStorage.getItem('studentu_sessions_completed') || '0'),
      demoLoaded: mode === 'demo' || Boolean(course?.demoSeed),
      hasResumeSession: Boolean(resumeSession?.cards?.length),
      hasActiveSession: Boolean(window.assignActiveSession && false),
      happyPathActive: Boolean(happyProgress?.current && !happyProgress?.isComplete),
      happyPathComplete: Boolean(happyProgress?.isComplete),
      happyProgress,
    };
  }

  function isDemoWorkspace() {
    return window.getWorkspaceMode?.() === 'demo'
      || sessionStorage.getItem('studentu_guest_mode') === 'true'
      || localStorage.getItem(EXPLORE_ACTIVE_KEY) === 'true';
  }

  function showDemoHandoffModal() {
    let modal = document.getElementById('demo-handoff-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'demo-handoff-modal';
      modal.className = 'demo-handoff-modal hidden fixed inset-0 z-[9998] bg-ink-500/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'demo-handoff-title');
      modal.innerHTML = `
        <div class="demo-handoff-modal__panel su-panel w-full sm:max-w-md p-6 sm:p-8 rounded-t-2xl sm:rounded-2xl">
          <span class="su-eyebrow">Starting your real class</span>
          <h2 id="demo-handoff-title" class="su-display text-xl mt-1">Demo stays separate</h2>
          <ul class="demo-handoff-modal__list mt-4 space-y-2 text-sm text-ink-100">
            <li>Sample Neural Networks progress does <strong>not</strong> carry over.</li>
            <li>Your real class starts fresh with its own syllabus and notes.</li>
            <li>Upload your syllabus first — StudentU reads exam dates and topics from it.</li>
          </ul>
          <button type="button" data-action="dismissDemoHandoff" class="w-full btn-primary rounded-xl py-3 text-sm font-semibold mt-6">
            Got it — set up my class
          </button>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
  }

  function dismissDemoHandoffModal() {
    document.getElementById('demo-handoff-modal')?.classList.add('hidden');
  }

  function setFlowPath(path) {
    if (path) {
      sessionStorage.setItem(FLOW_PATH_KEY, path);
      localStorage.setItem(FLOW_PATH_KEY, path);
      if (path === 'explore') localStorage.setItem(EXPLORE_ACTIVE_KEY, 'true');
      if (path === 'setup' || path === 'study') localStorage.removeItem(EXPLORE_ACTIVE_KEY);
    } else {
      sessionStorage.removeItem(FLOW_PATH_KEY);
      localStorage.removeItem(FLOW_PATH_KEY);
      localStorage.removeItem(EXPLORE_ACTIVE_KEY);
    }
    refreshFlowCompass();
  }

  function enterExplorePath(courseKey = 'neuro', options = {}) {
    document.getElementById('new-user-onboarding-overlay')?.classList.add('hidden');
    localStorage.setItem('studentu_onboarding_complete', 'true');
    setFlowPath('explore');
    window.enterGuestStudyMode?.();
    if (typeof window.handleUseCaseDemo === 'function') {
      window.handleUseCaseDemo(courseKey);
    } else {
      window.handleHeroAction?.('demo');
    }
    if (options.openAI) {
      setTimeout(() => {
        window.switchTab?.('ai');
        window.StudentUChat?.usePrompt?.('Explain the main ideas from my class notes in plain English, with one recall question.');
      }, 250);
    }
  }

  function enterSetupPath(options = {}) {
    const wasDemo = isDemoWorkspace() && localStorage.getItem('studentu_real_user') !== 'true';
    document.getElementById('new-user-onboarding-overlay')?.classList.add('hidden');
    localStorage.setItem('studentu_onboarding_complete', 'true');
    setFlowPath('setup');
    window.StudentUStore?.setGuestMode?.(false) ?? sessionStorage.removeItem('studentu_guest_mode');
    localStorage.removeItem(EXPLORE_ACTIVE_KEY);
    if (wasDemo && options.showHandoff !== false) {
      showDemoHandoffModal();
    }
    if (window.StudentUHappyPath?.startHappyPath) {
      window.StudentUHappyPath.startHappyPath();
      return;
    }
    window.switchTab?.('profile');
    showNotification('Set up my class', 'Add your class, syllabus, and notes to get started.', 'info');
  }

  function runExploreAction(step) {
    if (!step) return;
    switch (step.action) {
      case 'loadDemo':
        window.switchTab?.('workspace');
        window.expandStudyGuidePanel?.();
        break;
      case 'startGuide':
        window.switchTab?.('workspace');
        window.expandStudyGuidePanel?.();
        window.loadSelectedClassPacket?.();
        setTimeout(() => window.startStudySession?.(), 150);
        break;
      case 'finishGuide':
        if (buildFlowOptions().hasResumeSession) window.continuePreviousSession?.();
        else {
          window.switchTab?.('workspace');
          window.expandStudyGuidePanel?.();
        }
        break;
      default:
        break;
    }
  }

  function runFlowCompassAction() {
    const state = core()?.getFlowCompassState?.(buildFlowOptions());
    const progress = state?.progress;
    if (!progress?.current) return;

    if (progress.path === 'explore') {
      runExploreAction(progress.current);
      return;
    }
    if (progress.path === 'setup') {
      window.StudentUHappyPath?.runHappyPathAction?.(progress.current);
      return;
    }
    if (progress.path === 'study') {
      const tabMap = { desk: 'workspace', classes: 'profile', plan: 'dashboard' };
      const tab = tabMap[progress.current.id] || 'workspace';
      window.switchTab?.(tab);
      if (tab === 'dashboard') window.switchDashboardSubTab?.('planner');
    }
  }

  function renderFlowCompass() {
    const mount = document.getElementById('flow-compass');
    if (!mount || !core()) return;

    const options = buildFlowOptions();
    const state = core().getFlowCompassState(options);
    if (!state.visible || !state.progress || state.pathKey === 'explore') {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      delete mount.dataset.flowPath;
      delete mount.dataset.testid;
      return;
    }

    const { progress } = state;
    const tabHint = core().getTabHint(options.activeTab, state.pathKey);
    const resumeLine = sessionStorage.getItem('studentu_show_resume_hint') === 'true'
      ? '<p class="flow-compass__resume">Welcome back — tap Continue to resume.</p>'
      : '';
    const stepTrack = (progress.steps || []).map((step, index) => {
      const isDone = step.done || (progress.path === 'study');
      const isCurrent = progress.current?.id === step.id;
      const klass = isDone ? 'is-done' : (isCurrent ? 'is-current' : 'is-upcoming');
      return `<span class="flow-compass__step ${klass}"><span class="flow-compass__num">${isDone ? '✓' : index + 1}</span>${step.label}</span>`;
    }).join('');

    const cta = progress.path === 'study'
      ? (progress.current?.id === 'plan' ? 'Open planner' : progress.current?.label || 'Continue')
      : (progress.current?.button || 'Continue');

    mount.classList.remove('hidden');
    mount.dataset.flowPath = state.pathKey;
    mount.dataset.testid = 'flow-compass';
    mount.innerHTML = `
      <div class="flow-compass">
        <div class="flow-compass__main">
          <div class="flow-compass__copy">
            <span class="flow-compass__path">${progress.pathLabel}</span>
            <strong class="flow-compass__title">${progress.current?.label || 'Keep going'}</strong>
            <p class="flow-compass__hint">${tabHint || progress.current?.hint || progress.pathDescription}</p>
            ${resumeLine}
          </div>
          <button type="button" data-action="flowCompassContinue" class="flow-compass__cta" data-testid="flow-compass-continue">${cta}</button>
        </div>
        ${progress.path !== 'study' ? `<div class="flow-compass__track" aria-hidden="true">${stepTrack}</div>` : ''}
      </div>`;
  }

  function refreshFlowCompass() {
    renderFlowCompass();
  }

  function restoreFlowSession() {
    const hadPreviousVisit = Boolean(localStorage.getItem(LAST_VISIT_KEY));
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));

    if (!hadPreviousVisit) return;

    const path = localStorage.getItem(FLOW_PATH_KEY);
    const isReal = localStorage.getItem('studentu_real_user') === 'true';
    const exploreActive = localStorage.getItem(EXPLORE_ACTIVE_KEY) === 'true';

    if (exploreActive && !isReal) {
      window.enterGuestStudyMode?.();
      if (typeof window.handleUseCaseDemo === 'function' && window.getWorkspaceMode?.() === 'demo') {
        window.handleUseCaseDemo('neuro');
      }
    }

    const hasAccess = typeof window.hasAppAccess === 'function' ? window.hasAppAccess() : false;
    if (!hasAccess) return;

    const options = buildFlowOptions();
    const state = core()?.getFlowCompassState?.(options);
    const progress = state?.progress;
    if (!progress || progress.isComplete) return;

    sessionStorage.setItem('studentu_show_resume_hint', 'true');
    setTimeout(() => sessionStorage.removeItem('studentu_show_resume_hint'), 8000);

    const resumeMsg = core()?.buildResumeMessage?.(progress, options);
    if (resumeMsg) {
      showNotification(resumeMsg.title, resumeMsg.body, 'info');
    }

    const activeTab = getActiveTab();
    if (activeTab !== 'landing') {
      refreshFlowCompass();
      return;
    }

    if (path === 'explore') {
      sessionStorage.setItem('studentu_flow_restored', 'true');
      window.switchTab?.('workspace');
      window.expandStudyGuidePanel?.();
    } else if (path === 'setup' && progress.current) {
      sessionStorage.setItem('studentu_flow_restored', 'true');
      const tab = progress.current.tab || 'profile';
      window.switchTab?.(tab);
      if (tab === 'dashboard' && progress.current.subtab) {
        window.switchDashboardSubTab?.(progress.current.subtab);
      }
    } else if (path === 'study') {
      sessionStorage.setItem('studentu_flow_restored', 'true');
      window.switchTab?.('workspace');
    }

    refreshFlowCompass();
  }

  window.StudentUFlow = {
    enterExplorePath,
    enterSetupPath,
    setFlowPath,
    refreshFlowCompass,
    runFlowCompassAction,
    restoreFlowSession,
    showDemoHandoffModal,
    dismissDemoHandoffModal,
  };
  window.enterExplorePath = enterExplorePath;
  window.enterSetupPath = enterSetupPath;
  window.refreshFlowCompass = refreshFlowCompass;
  window.restoreFlowSession = restoreFlowSession;

  document.addEventListener('DOMContentLoaded', refreshFlowCompass);
})();
