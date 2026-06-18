function plannerEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEMO_COURSE_IDS = ['neuro', 'calc', 'hist', 'macro'];

function isDemoCourseKey(courseId) {
  return DEMO_COURSE_IDS.includes(courseId);
}

function loadDemoPortfolioOverrides() {
  try {
    return JSON.parse(localStorage.getItem('studentu_demo_portfolio_overrides') || '{}');
  } catch (_error) {
    return {};
  }
}

function saveDemoPortfolioOverride(courseId, courseState) {
  const overrides = loadDemoPortfolioOverrides();
  overrides[courseId] = {
    retention: courseState.retention,
    sessions: courseState.sessions,
    chapters: courseState.chapters,
    weakTopics: courseState.weakTopics,
  };
  localStorage.setItem('studentu_demo_portfolio_overrides', JSON.stringify(overrides));
}

function getDemoPortfoliosWithOverrides() {
  const base = JSON.parse(JSON.stringify(window.StudentUDemoData?.classPortfolios || []));
  const overrides = loadDemoPortfolioOverrides();
  return base.map((course) => {
    const patch = overrides[course.id];
    if (!patch) return course;
    return {
      ...course,
      ...patch,
      chapters: patch.chapters || course.chapters,
      weakTopics: patch.weakTopics || course.weakTopics,
    };
  });
}

function hasRealClassPortfolios() {
  if (typeof window.hasRealClassPortfolios === 'function' && window.StudentUWorkspaceMode) {
    return window.hasRealClassPortfolios();
  }
  if (typeof classPortfolios !== 'undefined' && classPortfolios.length) {
    const real = classPortfolios.filter(course => !course.demoSeed);
    if (real.length) return true;
  }
  try {
    const stored = JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
    return stored.length > 0 && localStorage.getItem('studentu_real_user') === 'true';
  } catch (_error) {
    return false;
  }
}

function isShowingDemoPortfolios() {
  if (hasRealClassPortfolios()) return false;
  const sessions = window.StudentUStore?.getCompletedSessionCount?.()
    ?? Number(localStorage.getItem('studentu_sessions_completed') || '0');
  const guest = sessionStorage.getItem('studentu_guest_mode') === 'true';
  return (sessions > 0 || guest) && Boolean(window.StudentUDemoData?.classPortfolios?.length);
}

function getDashboardPortfolios() {
  if (typeof classPortfolios !== 'undefined' && classPortfolios.length) {
    const real = classPortfolios.filter(course => !course.demoSeed);
    if (real.length) return real;
  }
  try {
    const stored = JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
    if (stored.length) return stored;
  } catch (_error) {
    // Fall through to demo data.
  }
  if (localStorage.getItem('studentu_real_user') === 'true') return [];
  if (isShowingDemoPortfolios()) {
    return getDemoPortfoliosWithOverrides();
  }
  return [];
}

function getPlannerPortfolios() {
  return getDashboardPortfolios();
}

function getPlannerTopics(course) {
  const weakTopics = course.weakTopics || [];
  const chapters = (course.chapters || []).map(chapter => chapter.title);
  const materials = (course.materials || []).map(item => item.title || item.source).filter(Boolean);
  return [...weakTopics, ...chapters, ...materials].filter(Boolean);
}

function getPlannerSourceForTopic(course, topic) {
  const normalized = String(topic || '').toLowerCase();
  const materials = course.materials || [];
  const matched = materials.find(item => {
    const text = [item.title, item.source, item.type, item.notes, item.extractedText].filter(Boolean).join(' ').toLowerCase();
    return normalized && text.includes(normalized);
  }) || materials[0];
  if (!matched) return 'Class map';
  return `${matched.type || 'Source'}: ${matched.title || matched.source || 'Saved material'}`;
}

function getPlannerPriority(course, topic) {
  const normalized = String(topic || '').toLowerCase();
  if ((course.weakTopics || []).some(item => String(item).toLowerCase() === normalized)) return 'Weak topic';
  const chapter = (course.chapters || []).find(item => String(item.title).toLowerCase() === normalized);
  if (chapter && Number(chapter.progress) < 60) return 'Low retention';
  if (String(course.examDate || '').toLowerCase().includes('add')) return 'Build baseline';
  return 'Exam prep';
}

function buildPlannerSessions(portfolios) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sessions = [];
  const hasStudyData = portfolios.some(course => getPlannerTopics(course).length || (course.materials || []).length);

  portfolios.forEach(course => {
    const topics = getPlannerTopics(course);
    const uniqueTopics = [...new Set(
      window.StudentUSilent?.sortTopicsByExamProximity?.(topics, course) ?? topics,
    )].slice(0, 7);
    uniqueTopics
      .sort((a, b) => {
        const matchTopic = (topic, label) => (window.StudentUSilent?.fuzzyMatchTopic?.(topic, label) ?? 0) >= 0.82
          || String(topic).toLowerCase() === String(label).toLowerCase();
        const aWeak = (course.weakTopics || []).some(item => matchTopic(a, item)) ? 0 : 1;
        const bWeak = (course.weakTopics || []).some(item => matchTopic(b, item)) ? 0 : 1;
        return aWeak - bWeak;
      })
      .forEach((topic, index) => {
        const urgency = window.StudentUSilent?.scoreExamUrgency?.(course.examDate) ?? 0.35;
        sessions.push({
          course,
          topic,
          day: days[sessions.length % days.length],
          minutes: index < 2 ? (urgency >= 0.75 ? 40 : 35) : (urgency >= 0.75 ? 30 : 25),
          source: getPlannerSourceForTopic(course, topic),
          priority: getPlannerPriority(course, topic),
        });
      });
  });

  return {
    sessions,
    visibleSessions: sessions.slice(0, 7),
    exams: portfolios.filter(course => course.examDate && !String(course.examDate).toLowerCase().includes('add')),
    hasStudyData,
  };
}

function renderPlannerTarget(target) {
  if (!target) return;
  const portfolios = getPlannerPortfolios();
  const plannerData = buildPlannerSessions(portfolios);
  const { visibleSessions, exams, hasStudyData } = plannerData;

  if (!portfolios.length || !hasStudyData) {
    target.innerHTML = `
      <div class="mb-8 reveal visible">
        <h1 class="text-3xl font-extrabold text-ink-400 tracking-tight">Study Planner</h1>
        <p class="text-sm text-ink-50 mt-1">Build a plan from your saved class materials.</p>
      </div>
      <div class="su-card text-center reveal visible">
        <span class="su-card-label">Planner</span>
        <h2 class="su-card-title mt-1">Add a class and upload notes to generate your plan.</h2>
        <p class="su-card-body mt-2">StudentU needs at least one class packet before it can distribute topics across the week.</p>
        <button data-action="switchTab" data-tab-target="profile" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Open My Classes</button>
      </div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="mb-8 reveal visible">
      <h1 class="text-3xl font-extrabold text-ink-400 tracking-tight">Study Planner</h1>
      <p class="text-sm text-ink-50 mt-1">A 7-day plan generated from your saved class packet.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 reveal reveal-d1 visible">
      <div class="lg:col-span-2 su-card">
        <span class="su-card-label">Plan</span>
        <h2 class="su-card-title mt-1 mb-4">Next 7 Days</h2>
        <div class="space-y-4">
          ${visibleSessions.map((session, index) => `
            <div class="flex items-start gap-4 p-4 bg-surface-100 rounded-xl border border-surface-300">
              <div class="w-12 h-12 rounded-xl bg-accent-blue/10 flex flex-col items-center justify-center text-center flex-shrink-0">
                <span class="text-xs font-bold text-accent-blue">${session.day}</span>
                <span class="text-[10px] text-ink-50">${index + 1}</span>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-ink-300">${plannerEscape(session.topic)}</div>
                <div class="text-xs text-ink-50 mt-0.5">${plannerEscape(session.course.title)} - ${session.minutes} min</div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span class="text-[10px] bg-white border border-surface-300 rounded-md px-2 py-1 text-ink-100">${plannerEscape(session.priority)}</span>
                  <span class="text-[10px] bg-white border border-surface-300 rounded-md px-2 py-1 text-ink-100">Source: ${plannerEscape(session.source)}</span>
                </div>
              </div>
              <button data-action="startPlannedSession" data-course-id="${plannerEscape(session.course.id)}" class="px-3 py-1.5 btn-primary rounded-lg text-xs font-medium flex-shrink-0">Start</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="space-y-4">
        <div class="su-card">
          <span class="su-card-label">Exams</span>
          <h3 class="su-card-title mt-1 mb-3">Upcoming Exams</h3>
          <div class="space-y-3">
            ${exams.length ? exams.slice(0, 4).map(course => `
              <div class="flex items-center justify-between p-3 bg-surface-100 border border-surface-200 rounded-xl">
                <span class="text-xs font-semibold text-ink-300">${plannerEscape(course.title)}</span>
                <span class="text-[11px] text-ink-50 font-mono">${plannerEscape(course.examDate)}</span>
              </div>
            `).join('') : '<p class="text-xs text-ink-50">Add exam dates in My Classes.</p>'}
          </div>
        </div>
        <div class="su-card">
          <span class="su-card-label">Goal</span>
          <h3 class="su-card-title mt-1 mb-3">Weekly Goal</h3>
          <div class="text-2xl font-extrabold text-ink-400 mb-1">0 / ${Math.max(3, visibleSessions.length)}</div>
          <div class="text-xs text-ink-50 mb-3">Sessions completed this week</div>
          <div class="progress-track"><div class="progress-fill bg-accent-teal" style="width:0%"></div></div>
          <button data-action="rescheduleReminders" class="mt-4 w-full py-2 btn-outline rounded-xl text-xs font-medium">Adjust Schedule</button>
        </div>
      </div>
    </div>
  `;
}

function renderFirstStudyPlan() {
  renderPlannerTarget(document.getElementById('dash-sub-pane-planner'));
  renderPlannerTarget(document.getElementById('tab-planner'));
}

function rescheduleReminders() {
  renderFirstStudyPlan();
  window.refreshDashboard?.();
  showNotification('Schedule refreshed', 'Your planner was rebuilt from saved class data.', 'success');
}

window.getDashboardPortfolios = getDashboardPortfolios;
window.buildPlannerSessions = buildPlannerSessions;
window.renderFirstStudyPlan = renderFirstStudyPlan;
window.isDemoCourseKey = isDemoCourseKey;
window.isShowingDemoPortfolios = isShowingDemoPortfolios;
window.getDemoPortfoliosWithOverrides = getDemoPortfoliosWithOverrides;
window.saveDemoPortfolioOverride = saveDemoPortfolioOverride;
