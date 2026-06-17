// Profile flow page renderers and actions

function renderFlowPages() {
  renderOnboardingPage();
  renderCourseDetailPage();
  renderPracticeCenterPage();
  renderReviewQueuePage();
  renderSessionHistoryPage();
  renderRemindersPage();
  renderSettingsPage();
  renderHelpPage();
  renderBillingPage();
}

function renderOnboardingPage() {
  const flow = document.getElementById('onboarding-flow-panel');
  const snapshot = document.getElementById('onboarding-class-snapshot');
  if (!flow || !snapshot) return;
  const course = getActiveClassPortfolio();
  if (!course) {
    flow.innerHTML = renderFirstRunChecklist(null);
    snapshot.innerHTML = '<p class="text-xs text-ink-50 leading-relaxed">No class has been added yet.</p>';
    return;
  }
  const setup = getClassSetupState(course);
  const steps = [
    { label: 'Create or select a class', done: Boolean(course), dataAction: 'switchTab', tab: 'profile', button: 'Open Classes' },
    { label: 'Add the syllabus', done: setup.hasSyllabus, dataAction: 'focusClassMaterial', materialType: 'Syllabus', button: 'Add Syllabus' },
    { label: 'Add notes or photos', done: setup.hasNotes, dataAction: 'focusClassMaterial', materialType: 'Lecture Notes', button: 'Add Notes' },
    { label: 'Generate the first study plan', done: setup.hasPlan && setup.hasChapters, dataAction: 'switchTab', tab: 'dashboard', subtab: 'planner', button: 'Open Plan' },
  ];
  flow.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-ink-400 mt-1">${escapeHtml(course.title)}</h2>
      </div>
      <button data-action="openCourseDetail" class="btn-outline rounded-xl px-4 py-2.5 text-xs font-semibold">View Class</button>
    </div>
    <div class="space-y-3">
      ${steps.map((step, index) => `
        <div class="border ${step.done ? 'border-emerald-200 bg-emerald-50' : 'border-surface-300 bg-white'} rounded-xl p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl ${step.done ? 'bg-emerald-600 text-white' : 'bg-surface-100 text-ink-100 border border-surface-300'} flex items-center justify-center text-xs font-bold">${step.done ? 'OK' : index + 1}</span>
            <span class="text-sm font-bold text-ink-300">${step.label}</span>
          </div>
          ${renderActionButton(step, `text-xs font-semibold ${step.done ? 'text-emerald-700' : 'text-accent-blue hover:text-accent-teal'}`)}
        </div>
      `).join('')}
    </div>
  `;
  snapshot.innerHTML = `
    <div class="space-y-3">
      <div class="flex justify-between text-xs"><span class="text-ink-50">Class</span><span class="font-semibold text-ink-300 text-right">${escapeHtml(course.title)}</span></div>
      <div class="flex justify-between text-xs"><span class="text-ink-50">Exam</span><span class="font-semibold text-ink-300">${escapeHtml(course.examDate)}</span></div>
      <div class="flex justify-between text-xs"><span class="text-ink-50">Materials</span><span class="font-semibold text-ink-300">${course.materials.length}</span></div>
      <div class="flex justify-between text-xs"><span class="text-ink-50">Weak topics</span><span class="font-semibold text-accent-warm text-right">${escapeHtml(course.weakTopics.join(', ') || 'None yet')}</span></div>
    </div>
  `;
}

function renderCourseDetailPage() {
  const root = document.getElementById('course-detail-page');
  if (!root) return;
  const course = getActiveClassPortfolio();
  if (!course) {
    root.innerHTML = `
      <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h1 class="text-2xl font-extrabold text-ink-400">Add your first class</h1>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Course details appear after you create a class portfolio.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Open Classes</button>
      </div>
    `;
    return;
  }
  const health = getClassHealth(course);
  root.innerHTML = `
    <div class="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-ink-400 tracking-tight mt-1">${escapeHtml(course.title)}</h1>
        <p class="text-sm text-ink-50 mt-1">${escapeHtml(course.code)} &middot; ${escapeHtml(course.professor)} &middot; Exam: ${escapeHtml(course.examDate)}</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button data-action="startClassContextSession" data-course-id="${course.id}" class="btn-primary rounded-xl px-4 py-2.5 text-xs font-semibold">Study This Class</button>
        <button data-action="switchTab" data-tab-target="materials" class="btn-outline rounded-xl px-4 py-2.5 text-xs font-semibold">Open Materials</button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-8 space-y-5">
        ${renderCourseReadinessPanel(course)}
        <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-ink-400">Chapter Map</h2>
            <span class="text-[10px] ${health.tone} ${health.bg} border rounded-md px-2 py-1 font-semibold">${health.label}</span>
          </div>
          <div class="space-y-4">
            ${course.chapters.map(chapter => `
              <div>
                <div class="flex justify-between text-xs mb-1"><span class="font-semibold text-ink-300">${escapeHtml(chapter.title)}</span><span class="text-ink-50">${escapeHtml(chapter.status)}</span></div>
                <div class="progress-track"><div class="progress-fill bg-accent-teal" style="width:${chapter.progress}%"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
          <h2 class="text-base font-bold text-ink-400 mb-4">Weak Topics</h2>
          <div class="flex flex-wrap gap-2">${course.weakTopics.length ? course.weakTopics.map(topic => `<button data-action="switchTab" data-tab-target="practice" class="bg-accent-warm/10 border border-accent-warm/20 text-accent-muted rounded-lg px-3 py-2 text-xs font-semibold">${escapeHtml(topic)}</button>`).join('') : '<p class="text-xs text-ink-50">No weak topics yet.</p>'}</div>
        </div>
      </div>
      <div class="lg:col-span-4 space-y-4">
        <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
          <h2 class="text-sm font-bold text-ink-400 mb-3">Class Snapshot</h2>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-ink-50">Retention</span><span class="font-bold text-ink-300">${course.retention}%</span></div>
            <div class="flex justify-between"><span class="text-ink-50">Materials</span><span class="font-bold text-ink-300">${course.materials.length}</span></div>
            <div class="flex justify-between"><span class="text-ink-50">Sessions</span><span class="font-bold text-ink-300">${course.sessions}</span></div>
          </div>
        </div>
        <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
          <h2 class="text-sm font-bold text-ink-400 mb-3">Next Actions</h2>
          <div class="space-y-2">
            <button data-action="switchTab" data-tab-target="review-queue" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold">Review Due Topics</button>
            <button data-action="switchTab" data-tab-target="practice" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold">Practice Weak Topics</button>
            <button data-action="switchTab" data-tab-target="planner" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold">Plan Next Session</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPracticeCenterPage() {
  const root = document.getElementById('practice-center-page');
  if (!root) return;
  const course = getActiveClassPortfolio();
  if (!course) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">No class selected</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Add a class portfolio to start focused practice drills.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Add a Class</button>
      </div>`;
    return;
  }
  const weakTopics = course.weakTopics?.length
    ? course.weakTopics
    : (course.chapters || []).slice(0, 3).map(chapter => chapter.title);
  if (!weakTopics.length) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">${escapeHtml(course.title)}</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Add chapters or weak topics in My Classes to unlock practice drills.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-outline rounded-xl px-5 py-2.5 text-xs font-semibold">Open My Classes</button>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="lg:col-span-8 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-4">${escapeHtml(course.title)} Practice</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${weakTopics.map((topic, index) => `
          <div class="border border-surface-300/60 bg-white rounded-xl p-4">
            <span class="text-xs font-semibold text-ink-100">Drill ${index + 1}</span>
            <h3 class="text-sm font-bold text-ink-300 mt-1">${escapeHtml(topic)}</h3>
            <p class="text-xs text-ink-50 leading-relaxed mt-2">Use active recall questions from the class packet.</p>
            <button data-action="startPracticeFromActiveClass" class="mt-4 btn-primary rounded-xl px-4 py-2 text-xs font-semibold">Start Drill</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="lg:col-span-4 space-y-4">
      <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
        <h2 class="text-sm font-bold text-ink-400 mb-3">Practice Modes</h2>
        <div class="space-y-2 text-xs text-ink-100">
          <p>Drills use your active class packet and adaptive quiz generation.</p>
          <p>Mark weak topics in My Classes to prioritize them here.</p>
        </div>
      </div>
      <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
        <h2 class="text-sm font-bold text-ink-400 mb-3">Source</h2>
        <p class="text-xs text-ink-50 leading-relaxed">Questions use the selected class packet, including syllabus topics and saved notes.</p>
      </div>
    </div>
  `;
}

function renderReviewQueuePage() {
  const root = document.getElementById('review-queue-page');
  if (!root) return;
  if (!classPortfolios.length) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">Review queue is empty</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Add a class and complete a study guide to see due topics here.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Add a Class</button>
      </div>`;
    return;
  }
  const due = classPortfolios.flatMap(course => course.chapters.map(chapter => ({ course, chapter }))).filter(item => item.chapter.progress < 80);
  if (!due.length) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">All caught up</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">No chapters are below 80% retention right now.</p>
        <button data-action="focusStudyInput" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Start New Guide</button>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="lg:col-span-8 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-4">Due Today</h2>
      <div class="space-y-3">
        ${due.slice(0, 8).map(item => `
          <div class="border border-surface-300/60 bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-ink-300">${escapeHtml(item.chapter.title)}</h3>
              <p class="text-xs text-ink-50 mt-1">${escapeHtml(item.course.title)} &middot; ${item.chapter.progress}% retained</p>
            </div>
            <button data-action="selectAndReview" data-course-id="${escapeHtml(item.course.id)}" class="btn-primary rounded-xl px-4 py-2 text-xs font-semibold">Review</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="lg:col-span-4 bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
      <h2 class="text-sm font-bold text-ink-400 mb-3">Queue Summary</h2>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between"><span class="text-ink-50">Due topics</span><span class="font-bold text-ink-300">${due.length}</span></div>
        <div class="flex justify-between"><span class="text-ink-50">Classes tracked</span><span class="font-bold text-ink-300">${classPortfolios.length}</span></div>
        <div class="flex justify-between"><span class="text-ink-50">Best next move</span><span class="font-bold text-accent-warm">Start weak topics</span></div>
      </div>
    </div>
  `;
}

function renderSessionHistoryPage() {
  const root = document.getElementById('session-history-page');
  if (!root) return;
  const stored = window.getStoredSessionHistory?.() || [];
  const portfolios = window.getDashboardPortfolios?.() || classPortfolios;

  function formatSessionDate(iso) {
    const age = Date.now() - new Date(iso || 0).getTime();
    if (age < 86400000) return 'Today';
    if (age < 172800000) return 'Yesterday';
    return `${Math.max(1, Math.floor(age / 86400000))} days ago`;
  }

  function scoreFromSession(session) {
    const results = session.quizResults || [];
    if (!results.length) return '—';
    const correct = results.filter(item => item.correct).length;
    return `${Math.round((correct / results.length) * 100)}%`;
  }

  if (!stored.length) {
    root.innerHTML = `
      <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">No sessions yet</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Completed study guides appear here with scores and dates.</p>
        <button data-action="focusStudyInput" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Start First Guide</button>
      </div>`;
    return;
  }

  const sessions = stored.slice(0, 12).map(session => ({
    title: session.quizResults?.length ? 'Study guide session' : 'Practice session',
    courseTitle: portfolios.find(item => item.id === session.courseKey)?.title || session.courseKey || 'Study session',
    date: formatSessionDate(session.createdAt || session.savedAt),
    score: scoreFromSession(session),
  }));

  root.innerHTML = `
    <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <div class="space-y-3">
        ${sessions.map(session => `
          <div class="border border-surface-300/60 bg-white rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-ink-300">${escapeHtml(session.title)}</h2>
              <p class="text-xs text-ink-50 mt-1">${escapeHtml(session.courseTitle)} &middot; ${session.date}</p>
            </div>
            <div class="text-sm font-extrabold text-ink-400">${session.score === '—' ? session.score : `${session.score}`}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getReminderPrefs() {
  try {
    return JSON.parse(localStorage.getItem('studentu_reminder_prefs') || '{}');
  } catch (_error) {
    return {};
  }
}

function saveReminderPrefs(prefs) {
  localStorage.setItem('studentu_reminder_prefs', JSON.stringify(prefs));
  window.StudentUCloudSync?.schedulePush?.();
}

function renderRemindersPage() {
  const root = document.getElementById('reminders-page');
  if (!root) return;
  const prefs = getReminderPrefs();
  const reviewDue = prefs.reviewDue !== false;
  const examWeek = prefs.examWeek !== false;
  const setupNudge = prefs.setupNudge !== false;

  if (!classPortfolios.length) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">No reminders yet</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Add a class with an exam date to schedule review reminders.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Add a Class</button>
      </div>`;
    return;
  }

  const reminderItems = classPortfolios.flatMap(course => {
    const items = [];
    const setup = getClassSetupState(course);
    if (setupNudge && (!setup.hasSyllabus || !setup.hasNotes)) {
      items.push({
        course,
        title: course.title,
        body: !setup.hasSyllabus && !setup.hasNotes
          ? 'Finish class setup — add a syllabus and notes.'
          : (!setup.hasSyllabus ? 'Upload a syllabus for smarter guides.' : 'Add notes or photos to complete setup.'),
        action: 'setup',
      });
    }
    if (reviewDue && (course.weakTopics || []).length) {
      (course.weakTopics || []).slice(0, 2).forEach(topic => {
        items.push({ course, title: topic, body: `${course.title} — review due`, action: 'review' });
      });
    }
    if (examWeek && course.examDate && !String(course.examDate).toLowerCase().includes('add')) {
      items.push({ course, title: course.title, body: `Exam: ${course.examDate}`, action: 'plan' });
    }
    return items;
  });

  if (!reminderItems.length) {
    root.innerHTML = `
      <div class="lg:col-span-12 bg-surface-50 border border-surface-300/60 rounded-2xl p-8 shadow-sm text-center">
        <h2 class="text-xl font-extrabold text-ink-400">No active reminders</h2>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">Enable reminder types below or add weak topics to your classes.</p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="lg:col-span-8 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-4">Upcoming Reminders</h2>
      <div class="space-y-3">
        ${reminderItems.slice(0, 8).map(item => `
          <div class="border border-surface-300/60 bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-ink-300">${escapeHtml(item.title)}</h3>
              <p class="text-xs text-ink-50 mt-1">${escapeHtml(item.body)}</p>
            </div>
            <button data-action="${item.action === 'plan' ? 'selectAndPlan' : item.action === 'review' ? 'selectAndReview' : 'switchTab'}" ${item.action === 'plan' || item.action === 'review' ? `data-course-id="${escapeHtml(item.course.id)}"` : 'data-tab-target="profile"'} class="btn-outline rounded-xl px-4 py-2 text-xs font-semibold">${item.action === 'plan' ? 'Plan' : item.action === 'review' ? 'Review' : 'Set up'}</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="lg:col-span-4 bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
      <h2 class="text-sm font-bold text-ink-400 mb-3">Reminder Preferences</h2>
      <div class="space-y-3 text-xs text-ink-100">
        <label class="flex items-center justify-between gap-4">Review due topics <input type="checkbox" data-reminder-pref="reviewDue" ${reviewDue ? 'checked' : ''}></label>
        <label class="flex items-center justify-between gap-4">Exam week priority <input type="checkbox" data-reminder-pref="examWeek" ${examWeek ? 'checked' : ''}></label>
        <label class="flex items-center justify-between gap-4">Unfinished class setup <input type="checkbox" data-reminder-pref="setupNudge" ${setupNudge ? 'checked' : ''}></label>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-reminder-pref]').forEach(input => {
    input.addEventListener('change', () => {
      const next = getReminderPrefs();
      next[input.dataset.reminderPref] = input.checked;
      saveReminderPrefs(next);
      renderRemindersPage();
    });
  });
}

function getStudySettings() {
  try {
    return JSON.parse(localStorage.getItem('studentu_study_settings') || '{}');
  } catch (_error) {
    return {};
  }
}

function saveStudySettings(settings) {
  localStorage.setItem('studentu_study_settings', JSON.stringify(settings));
  window.StudentUCloudSync?.schedulePush?.();
}

window.getStudySettings = getStudySettings;
window.saveStudySettings = saveStudySettings;

function renderSettingsPage() {
  const root = document.getElementById('settings-page');
  if (!root) return;
  const settings = getStudySettings();
  const sessionLength = settings.sessionLength ?? 25;
  const difficulty = settings.difficulty ?? 'Adaptive';
  const explanation = settings.explanation ?? 'Feynman first';
  root.innerHTML = `
    <div class="lg:col-span-7 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm space-y-5">
      <h2 class="text-base font-bold text-ink-400">Study Preferences</h2>
      <label class="block text-xs text-ink-50">Default session length (${sessionLength} min)<input id="settings-session-length" type="range" min="10" max="60" value="${sessionLength}" class="w-full mt-2"></label>
      <label class="block text-xs text-ink-50">Practice difficulty<select id="settings-difficulty" class="w-full mt-2 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2.5 text-xs text-ink-300">
        <option ${difficulty === 'Adaptive' ? 'selected' : ''}>Adaptive</option>
        <option ${difficulty === 'Gentle' ? 'selected' : ''}>Gentle</option>
        <option ${difficulty === 'Exam style' ? 'selected' : ''}>Exam style</option>
      </select></label>
      <label class="block text-xs text-ink-50">Explanation style<select id="settings-explanation" class="w-full mt-2 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2.5 text-xs text-ink-300">
        <option ${explanation === 'Feynman first' ? 'selected' : ''}>Feynman first</option>
        <option ${explanation === 'Analogy first' ? 'selected' : ''}>Analogy first</option>
        <option ${explanation === 'Step-by-step' ? 'selected' : ''}>Step-by-step</option>
      </select></label>
    </div>
    <div class="lg:col-span-5 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-3">Data Controls</h2>
      <div class="space-y-2">
        <button data-action="exportActiveClassData" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold">Export Current Class</button>
        <button data-action="switchTab" data-tab-target="account" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold">Account & Privacy</button>
      </div>
    </div>
  `;

  const lengthInput = root.querySelector('#settings-session-length');
  const lengthLabel = lengthInput?.closest('label');
  lengthInput?.addEventListener('input', () => {
    if (lengthLabel) lengthLabel.firstChild.textContent = `Default session length (${lengthInput.value} min)`;
    saveStudySettings({ ...getStudySettings(), sessionLength: Number(lengthInput.value) });
  });
  root.querySelector('#settings-difficulty')?.addEventListener('change', (event) => {
    saveStudySettings({ ...getStudySettings(), difficulty: event.target.value });
  });
  root.querySelector('#settings-explanation')?.addEventListener('change', (event) => {
    saveStudySettings({ ...getStudySettings(), explanation: event.target.value });
  });
}

function renderHelpPage() {
  const root = document.getElementById('help-page');
  if (!root) return;
  const topics = [
    ['How the study flow works', 'Add a class, upload a syllabus, add notes, then use Study Desk and Review Queue.'],
    ['What to upload', 'Syllabi, lecture notes, professor comments, assignments, and your own study notes.'],
    ['Academic integrity', "Use StudentU to understand and practice. Do not upload another student's private work."],
    ['Privacy controls', 'Export or remove class materials from Account & Privacy at any time.'],
  ];
  root.innerHTML = `
    <div class="lg:col-span-8 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <div class="space-y-3">${topics.map(([title, body]) => `<div class="border border-surface-300/60 bg-white rounded-xl p-4"><h2 class="text-sm font-bold text-ink-300">${title}</h2><p class="text-xs text-ink-50 leading-relaxed mt-2">${body}</p></div>`).join('')}</div>
    </div>
    <div class="lg:col-span-4 bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
      <h2 class="text-sm font-bold text-ink-400 mb-3">Need a fast start?</h2>
      <button data-action="openSetupGuide" class="w-full btn-primary rounded-xl py-2.5 text-xs font-semibold">Open Setup Guide</button>
    </div>
  `;
}

function renderBillingPage() {
  const root = document.getElementById('billing-page');
  if (!root) return;
  const tier = typeof getUserTier === 'function' ? getUserTier() : 'free';
  const billingSource = localStorage.getItem('studentu_billing_source');
  const tierLabel = tier === 'premium'
    ? (billingSource === 'stripe' ? 'Premium' : 'Premium (preview)')
    : tier === 'edu' ? 'Verified Student' : 'Free';
  const tierBody = tier === 'premium'
    ? (billingSource === 'stripe' ? 'Your Stripe subscription is active.' : 'Premium limits are enabled on this device.')
    : tier === 'edu'
      ? 'Verified .edu access with higher daily limits.'
      : 'Good for testing setup, class packets, and the study workflow.';
  root.innerHTML = `
    <div class="lg:col-span-7 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-4">Current Plan</h2>
      <div class="border border-surface-300/60 bg-white rounded-xl p-5">
        <h3 class="text-2xl font-extrabold text-ink-400 mt-1">${tierLabel}</h3>
        <p class="text-xs text-ink-50 leading-relaxed mt-2">${tierBody}</p>
      </div>
    </div>
    <div class="lg:col-span-5 bg-surface-50 border border-surface-300/60 rounded-2xl p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink-400 mb-3">Upgrade</h2>
      <p class="text-xs text-ink-50 leading-relaxed mb-4">Unlock higher generation limits, deeper history, and advanced analytics when billing is connected.</p>
      <button data-action="openUpgradeModal" class="w-full btn-primary rounded-xl py-2.5 text-xs font-semibold">View Upgrade</button>
    </div>
  `;
}

function openActiveCourseDetail() {
  renderCourseDetailPage();
  switchTab('course-detail');
}

function startPracticeFromActiveClass() {
  const course = getActiveClassPortfolio();
  if (!course) {
    showNotification('Class Needed', 'Add a class before starting practice.', 'info');
    return;
  }
  startClassContextSession(course.id);
  setTimeout(() => generateAdaptiveQuiz?.(), 300);
}

function startReviewQueue() {
  const course = getActiveClassPortfolio();
  if (!course) {
    // FIX: Soften backend-dependent empty states - guide new students to a useful first action instead of a locked review area.
    showNotification('No Reviews Yet', 'Add a class or generate a sample guide before starting reviews.', 'info');
    focusStudyInput?.();
    return;
  }
  startClassContextSession(course.id);
  showNotification('Review Started', 'Reviewing the highest-priority topics first.', 'info');
}

function focusClassMaterial(type = 'Lecture Notes') {
  const profileTab = document.getElementById('tab-profile');
  if (!profileTab || profileTab.classList.contains('hidden')) {
    switchTab('profile');
    setTimeout(() => focusClassMaterial(type), 80);
    return;
  }

  const typeEl = document.getElementById('class-material-type');
  const titleEl = document.getElementById('class-material-title');
  const fileEl = document.getElementById('class-material-file');
  if (typeEl) typeEl.value = type;
  if (titleEl && !titleEl.value.trim()) titleEl.value = type === 'Syllabus' ? 'Course syllabus' : 'Class notes';
  fileEl?.click();
}

function handleClassMaterialFileSelected(event) {
  const sourceEl = event?.target || document.getElementById('class-material-file');
  const fileEl = document.getElementById('class-material-file');
  if (sourceEl && fileEl && sourceEl !== fileEl && sourceEl.files?.length) {
    const dt = new DataTransfer();
    Array.from(fileEl.files || []).forEach((file) => dt.items.add(file));
    Array.from(sourceEl.files).forEach((file) => dt.items.add(file));
    fileEl.files = dt.files;
    sourceEl.value = '';
  }
  const label = document.getElementById('class-material-file-name');
  const typeEl = document.getElementById('class-material-type');
  const files = fileEl?.files ? Array.from(fileEl.files) : [];
  if (!label) return;
  if (files.length) {
    const names = files.map(file => file.name).slice(0, 3).join(', ');
    const suffix = files.length > 3 ? ` +${files.length - 3} more` : '';
    label.textContent = files.length > 1
      ? `Selected ${files.length} photos: ${names}${suffix}`
      : `Selected: ${files[0].name}`;
    label.classList.remove('hidden');
    if (typeEl && files.every(file => String(file.type || '').startsWith('image/'))) {
      typeEl.value = 'Photo Notes';
    }
  } else {
    label.textContent = '';
    label.classList.add('hidden');
  }
}

function loadSelectedClassPacket() {
  const selector = document.getElementById('course-selector');
  const courseId = selector?.value || activeClassPortfolioId;
  const course = classPortfolios.find(item => item.id === courseId) || getActiveClassPortfolio();
  const material = document.getElementById('study-material');
  if (!course || !material) return;

  const photoText = window.StudentUPhotoNotes?.getCombinedLecturePhotoText?.(course) || '';
  material.value = photoText || buildClassContext(course.id);
  showNotification(
    'Class Packet Loaded',
    photoText ? `${course.title} lecture photos are ready in Study Desk.` : `${course.title} study context is ready.`,
    'success',
  );
}

function generateStudyPlanForActiveClass() {
  const course = getActiveClassPortfolio();
  if (!course) {
    showNotification('Class Needed', 'Add a class and upload notes to generate your plan.', 'info');
    return;
  }
  // FIX: Generate Study Plan does nothing - render the local planner instead of starting a study session.
  switchTab('planner');
  window.renderFirstStudyPlan?.();
}

async function clearActiveClassMaterials() {
  const course = getActiveClassPortfolio();
  if (!course) return;
  course.materials = [];
  course.classMemory = null;
  course.syllabusStatus = 'Syllabus Needed';
  saveClassPortfolios();
  renderClassPortfolios();
  try {
    await studentUFetch(`/api/courses/${course.id}/materials`, { method: 'DELETE' });
  } catch (error) {
    // The page state is cleared even if the study service is not running.
  }
  showNotification('Materials Removed', `${course.title} materials were removed from this study space.`, 'success');
}

async function clearAllClassStudyData() {
  const previousIds = classPortfolios.map(course => course.id);
  classPortfolios = [];
  activeClassPortfolioId = '';
  localStorage.removeItem('studentu_real_user');
  saveClassPortfolios();
  updateCourseSelectorFromPortfolios();
  renderClassPortfolios();


  try {
    await Promise.all(previousIds.map(courseId => studentUFetch(`/api/courses/${courseId}/materials`, { method: 'DELETE' })));
  } catch (error) {
    // The page state is reset even if the study service is not running.
  }
  showNotification('Class Portfolios Reset', 'Your class portfolios were cleared.', 'success');
  window.refreshDashboard?.();
}

async function exportActiveClassData() {
  const course = getActiveClassPortfolio();
  if (!course) return;
  const localExport = {
    course,
    classStudyPacket: buildClassContext(course.id),
    exportedAt: new Date().toISOString(),
  };

  try {
    const response = await studentUFetch(`/api/courses/${course.id}/export`);
    if (response.ok) {
      const savedExport = await response.json();
      downloadJson(`${course.id}-studentu-export.json`, { ...localExport, savedMaterials: savedExport });
      showNotification('Export Ready', 'Your class export downloaded.', 'success');
      return;
    }
  } catch (error) {
    // Fall back to the saved page state.
  }

  downloadJson(`${course.id}-studentu-export.json`, localExport);
  showNotification('Export Ready', 'Your class export downloaded.', 'success');
}

function startClassContextSession(courseId) {
  const course = classPortfolios.find(item => item.id === courseId);
  if (!course) return;
  switchTab('workspace');
  const selector = document.getElementById('course-selector');
  const material = document.getElementById('study-material');
  if (selector && Array.from(selector.options).some(option => option.value === course.id)) {
    selector.value = course.id;
  }
  if (material) {
    material.value = buildClassContext(course.id);
  }
  showNotification('Class Loaded', `${course.title} is ready in Study Desk.`, 'success');
}

function copyClassContextPacket() {
  const output = document.getElementById('class-context-output');
  const text = output?.innerText || buildClassContext(activeClassPortfolioId);
  if (!text) return;
  navigator.clipboard?.writeText(text);
  showNotification('Study Notes Copied', 'Class study notes copied.', 'success');
}

function updateCourseSelectorFromPortfolios() {
  const selector = document.getElementById('course-selector');
  if (!selector) return;

  const realCourses = (classPortfolios || []).filter(course => !course.demoSeed);
  if (realCourses.length) {
    selector.innerHTML = realCourses.map(course => `<option value="${course.id}">${escapeHtml(course.title)}</option>`).join('');
    if (activeClassPortfolioId && Array.from(selector.options).some(option => option.value === activeClassPortfolioId)) {
      selector.value = activeClassPortfolioId;
    }
    return;
  }

  const demoInMemory = (classPortfolios || []).filter(course => course.demoSeed);
  const demoCourses = demoInMemory.length
    ? demoInMemory
    : (window.StudentUDemoData?.classPortfolios || []);
  const demoMaterials = window.StudentUDemoData?.materials || {};
  if (demoCourses.length) {
    selector.innerHTML = demoCourses.map(course => `<option value="${course.id}">${escapeHtml(course.title)} (sample)</option>`).join('');
  } else {
    selector.innerHTML = Object.keys(demoMaterials).map(key => `<option value="${key}">${escapeHtml(key)} (sample)</option>`).join('');
  }
  if (selector.options.length && !selector.value) {
    selector.value = selector.options[0].value;
  }
}
