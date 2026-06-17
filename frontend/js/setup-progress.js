/**
 * Onboarding checklist, next-action card, global mode banner, dashboard live stats.
 */
(function () {
  function getSessionCount() {
    return window.StudentUStore?.getCompletedSessionCount?.()
      ?? Number(localStorage.getItem('studentu_sessions_completed') || '0');
  }

  function hasAppAccess() {
    const flowPath = localStorage.getItem('studentu_flow_path') || '';
    return typeof window.hasAppAccess === 'function'
      ? window.hasAppAccess()
      : Boolean(
        localStorage.getItem('studentu_real_user') === 'true'
        || localStorage.getItem('studentu_explore_active') === 'true'
        || sessionStorage.getItem('studentu_guest_mode') === 'true'
        || flowPath === 'explore' || flowPath === 'setup' || flowPath === 'study'
      );
  }

  function isGuestMode() {
    return Boolean(window.StudentUStore?.isGuestMode?.() ?? sessionStorage.getItem('studentu_guest_mode') === 'true');
  }

  function getActiveCourse() {
    if (typeof window.getActiveStoredClass === 'function') {
      const stored = window.getActiveStoredClass();
      if (stored) return stored;
    }
    if (typeof getActiveClassPortfolio === 'function') return getActiveClassPortfolio();
    return null;
  }

  function getSetupState(course) {
    if (!course) return { hasSyllabus: false, hasNotes: false };
    if (typeof getClassSetupState === 'function') return getClassSetupState(course);
    const materials = course.materials || [];
    return {
      hasSyllabus: materials.some(item => String(item.type || '').toLowerCase().includes('syllabus')),
      hasNotes: materials.some(item => !String(item.type || '').toLowerCase().includes('syllabus')),
    };
  }

  function buildSetupChecklistSteps(course) {
    const active = course || getActiveCourse();
    const setup = getSetupState(active);
    const hasSession = getSessionCount() > 0;
    const mode = window.getWorkspaceMode?.() || 'landing';
    const hasClass = window.hasRealClassPortfolios?.() ?? false;
    const guest = mode === 'demo';

    const exploreStep = guest
      ? {
        label: 'Try sample class',
        hint: 'Explore Neural Networks or other demo notes — no setup required.',
        done: hasSession || guest,
        dataAction: 'heroAction',
        heroType: 'demo',
        button: 'Load sample',
        icon: 'start.svg',
      }
      : {
        label: 'Add your class',
        hint: 'Create a class portfolio for your real syllabus and notes.',
        done: hasClass,
        dataAction: 'switchTab',
        tab: 'profile',
        button: 'Add class',
        icon: 'start.svg',
      };

    return [
      exploreStep,
      {
        label: 'Upload syllabus',
        hint: 'StudentU uses your syllabus to prioritize topics and exam prep.',
        done: setup.hasSyllabus,
        dataAction: 'focusClassMaterial',
        materialType: 'Syllabus',
        button: 'Upload syllabus',
        needsClass: true,
        icon: 'upload.svg',
      },
      {
        label: 'Add notes or photos',
        hint: 'Paste lecture notes or add photos from My Classes.',
        done: setup.hasNotes,
        dataAction: 'focusClassMaterial',
        materialType: 'Lecture Notes',
        button: 'Add notes',
        needsClass: true,
        icon: 'add_image.svg',
      },
      {
        label: 'Complete first study session',
        hint: 'Generate a study guide — explanations, quizzes, and recall checks.',
        done: hasSession,
        dataAction: 'focusStudyInput',
        button: 'Start guide',
        icon: 'light_at_the_end_of_tunnel.svg',
      },
      {
        label: 'Unlock Progress & Planner',
        hint: 'Track retention, schedule reviews, and see your weekly plan.',
        done: hasSession,
        dataAction: 'switchTab',
        tab: 'dashboard',
        subtab: 'planner',
        button: hasSession ? 'Open planner' : 'Finish session first',
        lockedUntilSession: true,
        icon: 'calendar.svg',
      },
    ];
  }

  function isStepBlocked(step) {
    return step.needsClass && !(window.hasRealClassPortfolios?.() ?? false);
  }

  function getCurrentStepIndex(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      if (!steps[i].done && !isStepBlocked(steps[i])) return i;
    }
    return -1;
  }

  function renderChecklistStep(step, index, steps) {
    const blocked = isStepBlocked(step);
    const currentIndex = getCurrentStepIndex(steps);
    const isCurrent = !step.done && index === currentIndex;
    const attrs = [`data-action="${step.dataAction}"`];
    if (step.materialType) attrs.push(`data-material-type="${step.materialType}"`);
    if (step.tab) attrs.push(`data-tab-target="${step.tab}"`);
    if (step.subtab) attrs.push(`data-subtab-target="${step.subtab}"`);
    if (step.heroType) attrs.push(`data-hero-type="${step.heroType}"`);

    const actionLabel = step.done
      ? ''
      : (blocked ? 'Add a class first' : (step.lockedUntilSession && !step.done ? 'Finish session first' : step.button));

    const statusClass = step.done ? 'is-done' : (blocked ? 'is-blocked' : (isCurrent ? 'is-current' : 'is-upcoming'));
    const isLast = index === steps.length - 1;
    const markerContent = step.done ? '✓' : (isCurrent ? '→' : index + 1);

    const actionHtml = !step.done && actionLabel
      ? `<button type="button" ${attrs.join(' ')} class="setup-checklist__action${isCurrent ? ' setup-checklist__action--primary' : ''}" ${blocked ? 'disabled' : ''}>${actionLabel}</button>`
      : (step.done ? '<span class="setup-checklist__status setup-checklist__status--done">Complete</span>' : '');

    return `
      <li class="setup-checklist__step ${statusClass}">
        <div class="setup-checklist__track${isLast ? ' setup-checklist__track--last' : ''}">
          <span class="setup-checklist__marker" aria-hidden="true">${markerContent}</span>
          ${isLast ? '' : '<span class="setup-checklist__line" aria-hidden="true"></span>'}
        </div>
        <div class="setup-checklist__content">
          <div class="setup-checklist__row">
            ${step.icon ? `<span class="setup-checklist__icon"><img src="assets/icons/${step.icon}" alt="" class="asset-icon w-4 h-4"></span>` : ''}
            <div class="setup-checklist__copy">
              <span class="setup-checklist__label">${step.label}</span>
              ${step.hint && !step.done ? `<p class="setup-checklist__hint">${step.hint}</p>` : ''}
            </div>
          </div>
          ${actionHtml}
        </div>
      </li>`;
  }

  function renderPersistentSetupChecklist(course) {
    const steps = buildSetupChecklistSteps(course);
    if (steps.every(step => step.done)) return '';

    const doneCount = steps.filter(step => step.done).length;
    const progress = Math.round((doneCount / steps.length) * 100);
    const currentIndex = getCurrentStepIndex(steps);
    const currentLabel = currentIndex >= 0 ? steps[currentIndex].label : 'All set';

    return `
      <div class="setup-checklist su-panel">
        <div class="setup-checklist__header">
          <div class="setup-checklist__intro">
            <span class="su-eyebrow">Setup progress</span>
            <h2 class="setup-checklist__title">Get StudentU ready for your class</h2>
            <p class="setup-checklist__lead">${doneCount} of ${steps.length} complete — finish these to unlock your full study plan.</p>
          </div>
          <div class="setup-checklist__progress-wrap" aria-label="${progress}% complete">
            <div class="setup-checklist__progress-ring" style="--setup-progress:${progress}">
              <span class="setup-checklist__progress-value">${progress}%</span>
            </div>
          </div>
        </div>
        ${currentIndex >= 0 ? `<p class="setup-checklist__next"><strong>Up next:</strong> ${currentLabel}</p>` : ''}
        <ol class="setup-checklist__list">${steps.map((step, index) => renderChecklistStep(step, index, steps)).join('')}</ol>
      </div>`;
  }

  function renderFlowNextAction() {
    const el = document.getElementById('flow-next-action');
    if (!el) return;

    const compass = document.getElementById('flow-compass');
    if (compass && !compass.classList.contains('hidden')) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }

    const happyCore = window.StudentUHappyPathCore;
    const happyProgress = window.StudentUHappyPath?.getProgress?.();
    if (happyCore && happyProgress?.current && !happyProgress.isComplete) {
      const current = happyProgress.current;
      el.innerHTML = `
        <div class="flow-next-action">
          <div class="flow-next-action__copy">
            <span class="su-eyebrow">Your next step · ${happyProgress.doneCount} of ${happyProgress.total}</span>
            <h2 class="flow-next-action__title">${current.label}</h2>
            <p class="flow-next-action__body">${current.hint}</p>
          </div>
          <div class="flow-next-action__actions">
            <button type="button" data-action="happyPathContinue" class="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold">${current.button}</button>
          </div>
        </div>`;
      el.classList.remove('hidden');
      return;
    }

    const course = getActiveCourse();
    let snapshot = null;
    try {
      snapshot = JSON.parse(localStorage.getItem('studentu_resume_session') || 'null');
    } catch (_error) {
      snapshot = null;
    }

    let title = 'Start your next study guide';
    let body = 'Paste notes or load your class packet to generate explanations and quizzes.';
    let primaryAction = 'focusStudyInput';
    let primaryLabel = 'Start New Guide';
    let secondaryAction = '';
    let secondaryLabel = '';

    if (snapshot?.cards?.length) {
      title = 'Continue where you left off';
      body = `${snapshot.courseName || 'Study session'} — card ${(snapshot.currentCardIndex || 0) + 1} of ${snapshot.cards.length}`;
      primaryAction = 'continuePreviousSession';
      primaryLabel = 'Continue Session';
      secondaryAction = 'focusStudyInput';
      secondaryLabel = 'Start fresh';
    } else if (course?.weakTopics?.length) {
      title = `Review ${course.weakTopics.length} due topic${course.weakTopics.length > 1 ? 's' : ''}`;
      body = `Start with ${course.weakTopics[0]} before your next guide.`;
      primaryAction = 'startReviewQueue';
      primaryLabel = 'Review Due Items';
      secondaryAction = 'focusStudyInput';
      secondaryLabel = 'New guide';
    } else if (!course && !hasAppAccess()) {
      title = 'Try StudentU with sample notes';
      body = 'Run the demo in under two minutes — no class setup required.';
      primaryAction = 'heroAction';
      primaryLabel = 'Try Demo';
      el.dataset.heroType = 'demo';
    } else if (!course || !(window.hasRealClassPortfolios?.() ?? false)) {
      const mode = window.getWorkspaceMode?.() || 'landing';
      title = mode === 'demo' ? 'Set up your real class' : 'Add your first class';
      body = mode === 'demo'
        ? 'You are exploring sample notes. Add a class to save syllabus, notes, and progress.'
        : 'Create a class portfolio, then upload a syllabus or notes.';
      primaryAction = 'switchTab';
      primaryLabel = 'Add Class';
      el.dataset.tabTarget = 'profile';
    } else {
      const setup = getSetupState(course);
      if (!setup.hasSyllabus && !setup.hasNotes) {
        title = 'Add syllabus or notes';
        body = 'StudentU generates smarter guides when it can see your class materials.';
        primaryAction = 'switchTab';
        primaryLabel = 'Add Materials';
        el.dataset.tabTarget = 'profile';
      }
    }

    const primaryAttrs = [`data-action="${primaryAction}"`];
    if (primaryAction === 'heroAction') primaryAttrs.push('data-hero-type="demo"');
    if (primaryAction === 'switchTab') primaryAttrs.push(`data-tab-target="${el.dataset.tabTarget || 'profile'}"`);
    delete el.dataset.tabTarget;
    delete el.dataset.heroType;

    const secondaryHtml = secondaryAction
      ? `<button type="button" data-action="${secondaryAction}" class="btn-outline px-4 py-2.5 rounded-xl text-xs font-semibold">${secondaryLabel}</button>`
      : '';

    el.innerHTML = `
      <div class="flow-next-action">
        <div class="flow-next-action__copy">
          <span class="su-eyebrow">Your next step</span>
          <h2 class="flow-next-action__title">${title}</h2>
          <p class="flow-next-action__body">${body}</p>
        </div>
        <div class="flow-next-action__actions">
          <button type="button" ${primaryAttrs.join(' ')} class="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold">${primaryLabel}</button>
          ${secondaryHtml}
        </div>
      </div>`;
    el.classList.remove('hidden');
  }

  function updateGlobalModeBanner() {
    window.refreshWorkspaceModeUI?.();
  }

  function updateDashboardLiveStats() {
    window.refreshDashboard?.();
  }

  function renderStudyDeskChecklist(course) {
    const el = document.getElementById('study-desk-checklist');
    if (!el) return;
    const happyActive = window.StudentUHappyPath?.getProgress?.()?.current
      && !window.StudentUHappyPath.getProgress().isComplete;
    if (happyActive) {
      el.innerHTML = '';
      el.classList.add('hidden');
      return;
    }
    const html = renderPersistentSetupChecklist(course);
    el.innerHTML = html;
    el.classList.toggle('hidden', !html);
  }

  function updateSetupProgressUI() {
    const course = getActiveCourse();
    renderStudyDeskChecklist(course);
    renderFlowNextAction();
    updateGlobalModeBanner();
    window.syncStudyAiModeBanner?.();
    window.refreshHappyPathUI?.();
    window.refreshFlowCompass?.();
    updateDashboardLiveStats();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLandingMockLoop();
    updateSetupProgressUI();
    window.loadGamificationState?.();
    window.refreshDashboard?.();
  });

  function initLandingMockLoop() {
    const mock = document.querySelector('.landing-mock');
    if (!mock) return;

    const tasks = mock.querySelectorAll('.landing-mock__task');
    const headline = mock.querySelector('.landing-mock__headline');
    const recallStrong = mock.querySelector('.landing-mock__recall strong');
    const recallText = mock.querySelector('.landing-mock__recall p');
    const gridCells = mock.querySelectorAll('.landing-mock__grid > div');
    const chips = mock.querySelectorAll('.landing-mock__chip');

    const states = [
      {
        task: 0,
        headline: 'Backpropagation, step by step',
        recallTitle: 'Recall first',
        recall: 'Can you explain the chain rule before looking at the layers?',
        grid: [
          ['Key idea', 'Gradients flow backward through each layer.'],
          ['Example', 'Loss → weights update via partial derivatives.'],
          ['Next step', 'Quiz yourself on matrix shapes.'],
        ],
        chips: ['Explain chain rule', 'Quiz me'],
      },
      {
        task: 1,
        headline: 'Quick quiz: chain rule',
        recallTitle: 'Question',
        recall: 'What shape must the gradient have relative to each weight matrix?',
        grid: [
          ['Hint', 'Think partial derivatives layer by layer.'],
          ['Topic', 'Matrix multiplication rules'],
          ['Score', '2 of 3 correct so far'],
        ],
        chips: ['Show hint', 'Next question'],
      },
      {
        task: 2,
        headline: 'Your week — Neural Networks',
        recallTitle: 'Due today',
        recall: 'Review backpropagation and activation functions before Thursday lab.',
        grid: [
          ['Mon', 'Explain lecture 4 notes'],
          ['Wed', 'Quiz on chain rule'],
          ['Thu', 'Review weak topics'],
        ],
        chips: ['Open planner', 'Adjust dates'],
      },
      {
        task: 0,
        headline: 'Spaced review: activation functions',
        recallTitle: 'Remember',
        recall: 'Revisit ReLU vs sigmoid — you missed this twice last week.',
        grid: [
          ['Review', 'Due in 2 days'],
          ['Retention', '71% on this topic'],
          ['Action', '5-minute recall drill'],
        ],
        chips: ['Start review', 'Explain again'],
      },
    ];

    const applyState = (index) => {
      const state = states[index] || states[0];
      tasks.forEach((task, i) => task.classList.toggle('is-active', i === state.task));
      if (headline) headline.textContent = state.headline;
      if (recallStrong) recallStrong.textContent = state.recallTitle;
      if (recallText) recallText.textContent = state.recall;
      gridCells.forEach((cell, i) => {
        const small = cell.querySelector('small');
        const p = cell.querySelector('p');
        if (small) small.textContent = state.grid[i]?.[0] || '';
        if (p) p.textContent = state.grid[i]?.[1] || '';
      });
      chips.forEach((chip, i) => {
        if (state.chips[i]) chip.textContent = state.chips[i];
      });
    };

    document.addEventListener('studentu:landing-loop-step', (event) => {
      applyState(Number(event.detail?.index) || 0);
    });

    applyState(0);
  }

  window.buildSetupChecklistSteps = buildSetupChecklistSteps;
  window.renderPersistentSetupChecklist = renderPersistentSetupChecklist;
  window.updateSetupProgressUI = updateSetupProgressUI;
  window.updateGlobalModeBanner = updateGlobalModeBanner;
  window.renderFlowNextAction = renderFlowNextAction;
  window.updateDashboardLiveStats = updateDashboardLiveStats;
  window.initLandingMockLoop = initLandingMockLoop;
})();
