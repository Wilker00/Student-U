// Profile class list + detail renderers

function refreshVisibleProfilePanels() {
  const visibleTab = document.querySelector('.tab-pane:not(.hidden)')?.id || '';
  if (visibleTab === 'tab-profile') {
    const subView = document.querySelector('.class-sub-view:not(.hidden)')?.id || 'class-view-detail';
    if (subView === 'class-view-materials') renderMaterialsPage();
    return;
  }
  const accountPane = document.getElementById('dash-sub-pane-account');
  if (accountPane && !accountPane.classList.contains('hidden')) {
    renderAccountPage();
    return;
  }
  const flowRenderers = {
    'tab-onboarding': renderOnboardingPage,
    'tab-course-detail': renderCourseDetailPage,
    'tab-practice': renderPracticeCenterPage,
    'tab-review-queue': renderReviewQueuePage,
    'tab-session-history': renderSessionHistoryPage,
    'tab-reminders': renderRemindersPage,
    'tab-settings': renderSettingsPage,
    'tab-help': renderHelpPage,
    'tab-billing': renderBillingPage,
  };
  if (flowRenderers[visibleTab]) flowRenderers[visibleTab]();
}

function renderClassPortfolios() {
  const list = document.getElementById('class-portfolio-list');
  const detail = document.getElementById('class-portfolio-detail');
  const contextPanel = document.getElementById('class-context-panel');
  if (!list || !detail || !contextPanel) return;
  const flow = document.getElementById('first-run-class-flow');

  if (!classPortfolios.length) {
    // FIX: Consolidate duplicate Add Class buttons - left rail uses a muted inline link instead of a second primary CTA.
    list.innerHTML = `
      <div class="su-card">
        <span class="su-card-label">Classes</span>
        <h3 class="su-card-title mt-1">No classes yet</h3>
        <p class="su-card-body mt-2">Start with the class you need to study next.</p>
        <button data-action="createClassPortfolio" class="mt-3 text-[11px] text-ink-50 hover:text-ink-300 font-semibold">Add class</button>
      </div>
    `;
    detail.innerHTML = `
      <div class="min-h-[320px] flex items-center justify-center text-center">
        <div class="max-w-sm">
          <h2 class="text-xl font-extrabold text-ink-400">No classes yet</h2>
          <p class="text-xs text-ink-50 leading-relaxed mt-2">Add a class, then save notes or a syllabus to create a study packet.</p>
          <button data-action="createClassPortfolio" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Add your first class</button>
        </div>
      </div>
    `;
    contextPanel.innerHTML = '<p class="text-xs text-ink-50">Your class study packet will appear here after setup.</p>';
    if (flow) flow.innerHTML = renderFirstRunChecklist(null);
    refreshVisibleProfilePanels();
    return;
  }

  list.innerHTML = classPortfolios.map(course => {
    const active = course.id === activeClassPortfolioId;
    return `
      <button data-action="selectClassPortfolio" data-course-id="${course.id}" class="w-full text-left su-card ${active ? 'border-ink-400' : ''} hover:shadow-md transition-all">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="su-card-label">${escapeHtml(course.code)}</span>
            <h3 class="su-card-title mt-1">${escapeHtml(course.title)}</h3>
            <p class="su-card-body text-xs mt-1">${escapeHtml(course.professor)}</p>
          </div>
          <span class="text-[10px] font-mono ${course.syllabusStatus === 'Uploaded' ? 'text-emerald-700' : 'text-accent-warm'}">${escapeHtml(course.syllabusStatus)}</span>
        </div>
        <div class="progress-track mt-3"><div class="progress-fill bg-accent-blue" style="width:${course.retention}%"></div></div>
        <div class="flex justify-between text-[10px] text-ink-50 mt-2">
          <span>${course.retention}% retention</span>
          <span>${course.materials.length} materials</span>
        </div>
      </button>
    `;
  }).join('') + '<button data-action="createClassPortfolio" class="text-[11px] text-ink-50 hover:text-ink-300 font-semibold px-1">Add class</button>';

  const course = getActiveClassPortfolio();
  const memory = course.classMemory || {};
  const memoryConcepts = memory.concepts?.slice(0, 6) || [];
  const memoryDates = memory.syllabus?.examDates?.slice(0, 3) || [];
  const materials = course.materials.map(item => {
    const statusBadge = window.StudentUPhotoNotes?.renderMaterialStatusBadge?.(item) || '';
    const preview = getMaterialContextText(item) || item.notes || 'No text extracted yet.';
    const reviewBtn = (item.processingStatus === 'needs_review' || item.processingStatus === 'saved_for_image_review')
      ? `<button type="button" data-action="openPhotoReview" data-course-id="${escapeHtml(course.id)}" data-material-id="${escapeHtml(item.id)}" class="mt-2 text-[10px] font-semibold text-accent-blue hover:underline">Review extracted text</button>`
      : '';
    return `
    <div class="border border-surface-300/60 rounded-xl p-3 bg-white">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] uppercase tracking-wider font-mono text-accent-blue">${escapeHtml(item.type)}</span>
          <h4 class="text-xs font-bold text-ink-300 mt-1">${escapeHtml(item.title)}</h4>
          <p class="text-[10px] text-ink-50 mt-0.5">${escapeHtml(item.source)}</p>
        </div>
        ${statusBadge}
      </div>
      <p class="text-[11px] text-ink-100 leading-relaxed mt-2">${escapeHtml(preview)}</p>
      ${reviewBtn}
    </div>`;
  }).join('');

  if (flow) flow.innerHTML = renderFirstRunChecklist(course);

  detail.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-ink-400 mt-1">${escapeHtml(course.title)}</h2>
        <p class="text-xs text-ink-50 mt-1">${escapeHtml(course.code)} &middot; ${escapeHtml(course.professor)} &middot; Exam: ${escapeHtml(course.examDate)}</p>
      </div>
      <button data-action="startClassContextSession" data-course-id="${escapeHtml(course.id)}" class="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold">Study This Class</button>
    </div>

    <div class="mb-5">
      ${renderCourseReadinessPanel(course)}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-xs font-semibold text-ink-100">Current Chapter</span>
        <p class="text-xs font-bold text-ink-300 mt-1">${escapeHtml(course.currentChapter)}</p>
      </div>
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-xs font-semibold text-ink-100">Materials</span>
        <p class="text-lg font-extrabold text-ink-400 mt-1">${course.materials.length}</p>
      </div>
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-xs font-semibold text-ink-100">Weak Topics</span>
        <p class="text-xs font-bold text-accent-warm mt-1">${escapeHtml(course.weakTopics.join(', ') || 'None yet')}</p>
      </div>
    </div>

    <div class="mb-5">
      <h3 class="text-sm font-bold text-ink-400 mb-3">Chapter Progress</h3>
      <div class="space-y-3">
        ${course.chapters.map(chapter => `
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="font-semibold text-ink-300">${escapeHtml(chapter.title)}</span>
              <span class="text-ink-50">${escapeHtml(chapter.status)}</span>
            </div>
            <div class="progress-track"><div class="progress-fill bg-accent-teal" style="width:${chapter.progress}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-4">
        <h3 class="text-xs font-bold text-ink-300 mb-2">Add Chapter or Unit</h3>
        <div class="flex gap-2">
          <input id="new-chapter-title" type="text" placeholder="e.g. Chain rule derivatives" class="flex-1 bg-white border border-surface-300 rounded-lg px-3 py-2 text-xs text-ink-300 placeholder:text-ink-50 focus:outline-none">
          <button data-action="addChapterToActiveClass" class="btn-primary rounded-lg px-3 py-2 text-xs font-semibold">Add</button>
        </div>
      </div>
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-4">
        <h3 class="text-xs font-bold text-ink-300 mb-2">Track Weak Topic</h3>
        <div class="flex gap-2">
          <input id="new-weak-topic" type="text" placeholder="e.g. Vanishing gradients" class="flex-1 bg-white border border-surface-300 rounded-lg px-3 py-2 text-xs text-ink-300 placeholder:text-ink-50 focus:outline-none">
          <button data-action="addWeakTopicToActiveClass" class="btn-outline rounded-lg px-3 py-2 text-xs font-semibold">Track</button>
        </div>
      </div>
    </div>

    <h3 class="text-sm font-bold text-ink-400 mb-3">Class Materials</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${materials || '<p class="text-xs text-ink-50">No materials yet.</p>'}</div>

    <div class="mt-5 bg-surface-100 border border-surface-300 rounded-xl p-4">
      <h3 class="text-sm font-bold text-ink-400 mb-3">What StudentU Found</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="mt-2 space-y-1">${memoryDates.length ? memoryDates.map(item => `<p class="text-[11px] text-ink-200">${escapeHtml(item)}</p>`).join('') : '<p class="text-[11px] text-ink-50">Upload a syllabus to map dates.</p>'}</div>
        </div>
        <div>
          <div class="mt-2 flex flex-wrap gap-1.5">${memoryConcepts.length ? memoryConcepts.map(item => `<span class="text-[10px] bg-white border border-surface-300 rounded-md px-2 py-1 text-ink-200">${escapeHtml(item)}</span>`).join('') : '<p class="text-[11px] text-ink-50">Upload notes to map concepts.</p>'}</div>
        </div>
      </div>
    </div>
  `;

  contextPanel.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 class="text-sm font-bold text-ink-400">Class Study Packet</h3>
        <p class="text-xs text-ink-50 mt-1">Your syllabus, notes, chapters, and class hints are gathered here for class-specific explanations and practice.</p>
      </div>
      <button data-action="copyClassContext" class="btn-outline rounded-lg px-3 py-2 text-xs font-medium">Copy Context</button>
    </div>
    <pre id="class-context-output" class="bg-surface-100 border border-surface-300 rounded-xl p-4 text-[11px] text-ink-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">${escapeHtml(buildClassContext(course.id))}</pre>
  `;

  refreshVisibleProfilePanels();
}

function renderMaterialsPage() {
  const selector = document.getElementById('materials-class-selector');
  const summary = document.getElementById('materials-page-summary');
  const list = document.getElementById('materials-page-list');
  const insights = document.getElementById('materials-page-insights');
  if (!selector || !summary || !list || !insights) return;

  const course = getActiveClassPortfolio();
  if (!course) {
    selector.innerHTML = '';
    summary.innerHTML = '';
    list.innerHTML = '<p class="text-xs text-ink-50">Add a class before saving materials.</p>';
    insights.innerHTML = '';
    return;
  }
  if (!course) return;

  selector.innerHTML = classPortfolios.map(item => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('');
  selector.value = course.id;

  const materialCounts = course.materials.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
  const memory = course.classMemory || {};
  const mappedConcepts = memory.concepts?.slice(0, 8) || [];
  const syllabusDates = memory.syllabus?.examDates?.slice(0, 4) || [];

  summary.innerHTML = [
    ['Materials', course.materials.length],
    ['Chapters', course.chapters.length],
    ['Weak Topics', course.weakTopics.length],
  ].map(([label, value]) => `
    <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-4 shadow-sm">
      <span class="text-xs font-semibold text-ink-100">${label}</span>
      <p class="text-2xl font-extrabold text-ink-400 mt-1">${value}</p>
    </div>
  `).join('');

  const materials = course.materials.map(item => {
    const statusBadge = window.StudentUPhotoNotes?.renderMaterialStatusBadge?.(item)
      || '<span class="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">Ready</span>';
    const preview = getMaterialContextText(item) || item.notes || 'Saved for this class packet.';
    const reviewBtn = (item.processingStatus === 'needs_review' || item.processingStatus === 'saved_for_image_review')
      ? `<button type="button" data-action="openPhotoReview" data-course-id="${escapeHtml(course.id)}" data-material-id="${escapeHtml(item.id)}" class="mt-2 text-[10px] font-semibold text-accent-blue hover:underline">Review extracted text</button>`
      : '';
    return `
    <div class="border border-surface-300/60 bg-white rounded-xl p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] uppercase tracking-wider font-mono text-accent-blue">${escapeHtml(item.type)}</span>
          <h3 class="text-sm font-bold text-ink-300 mt-1">${escapeHtml(item.title)}</h3>
          <p class="text-[10px] text-ink-50 mt-0.5">${escapeHtml(item.source)}</p>
        </div>
        ${statusBadge}
      </div>
      <p class="text-xs text-ink-100 leading-relaxed mt-3">${escapeHtml(preview)}</p>
      ${reviewBtn}
    </div>`;
  }).join('');

  list.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-ink-400 mt-1">${escapeHtml(course.title)}</h2>
        <p class="text-xs text-ink-50 mt-1">${escapeHtml(course.code)} &middot; ${escapeHtml(course.professor)}</p>
      </div>
      <button data-action="startClassContextSession" data-course-id="${escapeHtml(course.id)}" class="btn-primary rounded-xl px-4 py-2.5 text-xs font-semibold">Study This Packet</button>
      <button data-action="loadLecturePhotos" data-course-id="${escapeHtml(course.id)}" class="btn-outline rounded-xl px-4 py-2.5 text-xs font-semibold">Use Lecture Photos</button>
    </div>
    <div class="flex flex-wrap gap-2 mb-5">
      ${Object.keys(materialCounts).length ? Object.entries(materialCounts).map(([type, count]) => `<span class="text-[10px] bg-surface-100 border border-surface-300 rounded-md px-2 py-1 text-ink-200">${escapeHtml(type)}: ${count}</span>`).join('') : '<span class="text-xs text-ink-50">No materials yet.</span>'}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${materials || '<p class="text-xs text-ink-50">Add a syllabus or notes to build this class packet.</p>'}</div>
  `;

  insights.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 class="text-base font-bold text-ink-400">What StudentU Can Use</h2>
        <p class="text-xs text-ink-50 mt-1">These signals shape class-specific explanations, quizzes, and study plans.</p>
      </div>
      <button data-action="copyClassContext" class="btn-outline rounded-lg px-3 py-2 text-xs font-medium">Copy Packet</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <div class="mt-2 space-y-1">${syllabusDates.length ? syllabusDates.map(item => `<p class="text-[11px] text-ink-200">${escapeHtml(item)}</p>`).join('') : '<p class="text-[11px] text-ink-50">Add a syllabus to map dates.</p>'}</div>
      </div>
      <div>
        <div class="mt-2 flex flex-wrap gap-1.5">${mappedConcepts.length ? mappedConcepts.map(item => `<span class="text-[10px] bg-white border border-surface-300 rounded-md px-2 py-1 text-ink-200">${escapeHtml(item)}</span>`).join('') : '<p class="text-[11px] text-ink-50">Add notes to map concepts.</p>'}</div>
      </div>
      <div>
        <p class="text-[11px] text-ink-200 leading-relaxed mt-2">Load this packet into Study Desk, generate practice questions, or turn weak topics into the next study plan.</p>
      </div>
    </div>
  `;
}

function renderAccountPage() {
  const profile = document.getElementById('account-profile-panel');
  const summary = document.getElementById('account-data-summary');
  if (!profile || !summary) return;

  const course = getActiveClassPortfolio();
  const name = currentUser?.name || currentUser?.email || 'Guest student';
  const signedIn = Boolean(currentUser);
  const totalMaterials = classPortfolios.reduce((sum, item) => sum + item.materials.length, 0);
  const totalSessions = classPortfolios.reduce((sum, item) => sum + (Number(item.sessions) || 0), 0);

  profile.innerHTML = `
    <div class="flex items-center justify-between text-xs border-b border-surface-300/60 pb-2">
      <span class="text-ink-50">Status</span>
      <span class="font-semibold ${signedIn ? 'text-emerald-700' : 'text-ink-300'}">${signedIn ? 'Signed in' : 'Guest mode'}</span>
    </div>
    <div class="flex items-center justify-between text-xs border-b border-surface-300/60 pb-2">
      <span class="text-ink-50">Name</span>
      <span class="font-semibold text-ink-300 text-right">${escapeHtml(name)}</span>
    </div>
    <div class="flex items-center justify-between text-xs">
      <span class="text-ink-50">Current class</span>
      <span class="font-semibold text-ink-300 text-right">${escapeHtml(course?.title || 'No class selected')}</span>
    </div>
  `;

  summary.innerHTML = [
    ['Classes', classPortfolios.length],
    ['Materials', totalMaterials],
    ['Sessions', totalSessions],
  ].map(([label, value]) => `
    <div class="bg-surface-100 border border-surface-300 rounded-xl p-4">
      <span class="text-xs font-semibold text-ink-100">${label}</span>
      <p class="text-2xl font-extrabold text-ink-400 mt-1">${value}</p>
    </div>
  `).join('');
}

function getClassSetupState(course = getActiveClassPortfolio()) {
  if (!course) return { hasSyllabus: false, hasNotes: false, hasChapters: false, hasPlan: false };
  const hasSyllabus = hasMaterialType(course, 'syllabus');
  const hasNotes = course.materials.some(item => !String(item.type).toLowerCase().includes('syllabus'));
  const hasChapters = course.chapters.length > 0 && course.chapters.some(chapter => chapter.progress > 0);
  const hasPlan = Boolean(course.examDate && course.examDate !== 'Add date');
  return { hasSyllabus, hasNotes, hasChapters, hasPlan };
}

function getClassHealth(course = getActiveClassPortfolio()) {
  if (!course) {
    return { label: 'No class', tone: 'text-ink-100', bg: 'bg-surface-100 border-surface-300' };
  }
  const weakCount = (course.weakTopics || []).length;
  if (course.retention >= 80 && weakCount <= 1) return { label: 'Strong', tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' };
  if (course.retention >= 60) return { label: 'Needs steady review', tone: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' };
  return { label: 'Needs attention', tone: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' };
}
