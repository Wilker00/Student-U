// Profile views entry
// Profile views and page actions

function renderActionButton(step, className = '') {
  const action = step.dataAction || step.actionName || 'createClassPortfolio';
  const attrs = [`data-action="${action}"`];
  if (step.materialType) attrs.push(`data-material-type="${escapeHtml(step.materialType)}"`);
  if (step.tab) attrs.push(`data-tab-target="${escapeHtml(step.tab)}"`);
  if (step.subtab) attrs.push(`data-subtab-target="${escapeHtml(step.subtab)}"`);
  if (step.courseId) attrs.push(`data-course-id="${escapeHtml(step.courseId)}"`);
  return `<button ${attrs.join(' ')} class="${className}">${step.done ? 'Done' : step.button}</button>`;
}

function renderFirstRunChecklist(course) {
  if (!course) {
    if (typeof window.renderPersistentSetupChecklist === 'function') {
      return window.renderPersistentSetupChecklist(null) || `
      <div class="su-panel text-center px-6 py-8">
        <h2 class="su-card-title">Add your first class</h2>
        <p class="su-card-body text-sm mt-2 max-w-md mx-auto">Create one class, then add a syllabus or notes to build your study plan.</p>
        <button data-action="createClassPortfolio" class="mt-5 btn-primary rounded-xl px-5 py-2.5 text-xs font-semibold">Add your first class</button>
      </div>`;
    }
    return `
      <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="text-lg font-extrabold text-ink-400 mt-1">Add your first class.</h2>
            <p class="text-xs text-ink-50 mt-1">Create one class, then add a syllabus or notes to build your study plan.</p>
          </div>
        </div>
      </div>
    `;
  }
  const hasClass = Boolean(course);
  const hasSyllabus = hasMaterialType(course, 'syllabus');
  const hasNotes = course.materials.some(item => !String(item.type).toLowerCase().includes('syllabus'));
  const readyPlan = hasClass && hasSyllabus && hasNotes;
  const checklistSteps = typeof window.buildSetupChecklistSteps === 'function'
    ? window.buildSetupChecklistSteps(course).slice(1, 4)
    : [
    { label: 'Upload syllabus', done: hasSyllabus, dataAction: 'focusClassMaterial', materialType: 'Syllabus', button: 'Upload' },
    { label: 'Upload notes or photos', done: hasNotes, dataAction: 'focusClassMaterial', materialType: 'Lecture Notes', button: 'Add Notes' },
    { label: 'Get study plan', done: readyPlan, dataAction: 'generateStudyPlan', button: 'Build Plan' },
  ];
  const steps = checklistSteps;

  return `
    <div class="bg-surface-50 border border-surface-300/60 rounded-2xl p-5 shadow-sm">
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-extrabold text-ink-400 mt-1">Turn one class into a study plan.</h2>
          <p class="text-xs text-ink-50 mt-1">StudentU works best when it can see the syllabus, your notes, and the chapter you are learning now.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_1.2fr_auto] gap-2">
          <input id="setup-class-title" value="${escapeHtml(course.title)}" class="bg-surface-100 border border-surface-300 rounded-xl px-3 py-2.5 text-xs text-ink-300 focus:outline-none" aria-label="Class name">
          <input id="setup-class-exam" value="${escapeHtml(course.examDate)}" class="bg-surface-100 border border-surface-300 rounded-xl px-3 py-2.5 text-xs text-ink-300 focus:outline-none" aria-label="Exam date">
          <input id="setup-class-chapter" value="${escapeHtml(course.currentChapter)}" class="bg-surface-100 border border-surface-300 rounded-xl px-3 py-2.5 text-xs text-ink-300 focus:outline-none" aria-label="Current chapter">
          <button data-action="saveClassSetupDetails" class="btn-primary rounded-xl px-4 py-2.5 text-xs font-semibold">Save</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          ${steps.map(step => `
            <div class="border ${step.done ? 'border-emerald-200 bg-emerald-50' : 'border-surface-300 bg-surface-100'} rounded-xl p-3 min-h-[92px] flex flex-col justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full ${step.done ? 'bg-emerald-600 text-white' : 'bg-white text-ink-50 border border-surface-300'} flex items-center justify-center text-[10px] font-bold">${step.done ? 'OK' : ''}</span>
                <span class="text-[11px] font-bold text-ink-300 leading-tight">${step.label}</span>
              </div>
              ${renderActionButton(step, `mt-3 text-[10px] font-semibold ${step.done ? 'text-emerald-700' : 'text-accent-blue hover:text-accent-teal'} text-left`)}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
