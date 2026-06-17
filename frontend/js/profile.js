// ---- CLASS PORTFOLIO MANAGEMENT ----
const defaultClassPortfolios = window.StudentUDemoData?.classPortfolios || [];

const hasRealStudentProfile = () => localStorage.getItem('studentu_real_user') === 'true';
let classPortfolios = hasRealStudentProfile()
  ? (window.StudentUStore?.getState?.().classPortfolios || JSON.parse(localStorage.getItem('studentu_class_portfolios') || 'null') || defaultClassPortfolios)
  : [];
let activeClassPortfolioId = window.StudentUStore?.getState?.().activeClassPortfolioId || localStorage.getItem('studentu_active_class') || classPortfolios[0]?.id || '';
const maxClassUploadBytes = 5 * 1024 * 1024;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasMaterialType(course, keyword) {
  return (course?.materials || []).some(item => String(item.type).toLowerCase().includes(keyword));
}

function getMaterialContextText(item) {
  const isPhoto = String(item.type || '').toLowerCase().includes('photo')
    || String(item.fileType || '').startsWith('image/');
  const primary = isPhoto
    ? [item.extractedText, item.notes].filter(Boolean).join('\n')
    : [item.notes, item.extractedText].filter(Boolean).join('\n');
  const raw = primary.slice(0, 1800);
  const glossary = getActiveClassPortfolio()?.classMemory?.glossary || {};
  const cleaned = window.StudentUSilent?.cleanNoteText?.(raw, { maxLength: 1800 }) ?? raw;
  return window.StudentUSilent?.expandGlossaryInText?.(cleaned, glossary) ?? cleaned;
}

function getCourseReadiness(course) {
  if (!course) {
    return {
      score: 0,
      total: 5,
      percent: 0,
      label: 'Not started',
      missing: ['class', 'syllabus', 'notes', 'exam date', 'weak topic'],
      flags: [],
    };
  }

  const materials = course.materials || [];
  const flags = [
    { key: 'syllabus', label: 'Syllabus', done: hasMaterialType(course, 'syllabus'), action: 'focusClassMaterial', materialType: 'Syllabus', button: 'Add syllabus' },
    { key: 'notes', label: 'Notes or photos', done: materials.some(item => !String(item.type).toLowerCase().includes('syllabus')), action: 'focusClassMaterial', materialType: 'Lecture Notes', button: 'Add notes' },
    { key: 'exam', label: 'Exam date', done: Boolean(course.examDate && !String(course.examDate).toLowerCase().includes('add')), action: 'openCourseDetail', button: 'Set date' },
    { key: 'weak', label: 'Weak topic', done: (course.weakTopics || []).length > 0, action: 'openCourseDetail', button: 'Track topic' },
    { key: 'plan', label: 'Study plan', done: (course.chapters || []).some(chapter => Number(chapter.progress) > 0), action: 'generateStudyPlan', button: 'Generate plan' },
  ];
  const doneCount = flags.filter(item => item.done).length;
  return {
    score: doneCount,
    total: flags.length,
    percent: Math.round((doneCount / flags.length) * 100),
    label: doneCount >= 4 ? 'Product-ready loop' : doneCount >= 2 ? 'Usable, needs grounding' : 'Setup needed',
    missing: flags.filter(item => !item.done).map(item => item.label),
    flags,
  };
}

function getCourseSourceSummary(course) {
  const materials = course?.materials || [];
  if (!materials.length) return 'No saved sources yet';
  const labels = materials.slice(0, 3).map(item => item.title || item.source || item.type).filter(Boolean);
  return labels.join(', ') + (materials.length > labels.length ? ` +${materials.length - labels.length} more` : '');
}

function getRecommendedCourseAction(course) {
  const readiness = getCourseReadiness(course);
  const nextMissing = readiness.flags.find(item => !item.done);
  if (nextMissing) {
    return {
      label: nextMissing.button,
      action: nextMissing.action,
      materialType: nextMissing.materialType,
      title: `Next: ${nextMissing.label}`,
      body: `${nextMissing.label} improves source grounding before StudentU generates plans, quizzes, and review queues.`,
    };
  }
  const weakTopic = course.weakTopics?.[0] || course.chapters?.find(chapter => Number(chapter.progress) < 75)?.title || course.currentChapter;
  return {
    label: 'Start focused review',
    action: 'startClassContextSession',
    courseId: course.id,
    title: `Review ${weakTopic || 'this class'}`,
    body: 'The core loop is ready. Study, answer questions, then let weak topics update the next session.',
  };
}

function renderCourseReadinessPanel(course) {
  const readiness = getCourseReadiness(course);
  const next = getRecommendedCourseAction(course);
  const actionAttrs = [
    `data-action="${next.action}"`,
    next.materialType ? `data-material-type="${escapeHtml(next.materialType)}"` : '',
    next.courseId ? `data-course-id="${escapeHtml(next.courseId)}"` : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="bg-white border border-surface-300/70 rounded-xl p-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="su-card-label">Product Loop</span>
          <h3 class="text-sm font-bold text-ink-400 mt-1">${escapeHtml(readiness.label)}</h3>
          <p class="text-[11px] text-ink-50 mt-1">Grounding score: ${readiness.score}/${readiness.total} - sources: ${escapeHtml(getCourseSourceSummary(course))}</p>
        </div>
        <span class="text-lg font-extrabold text-ink-400">${readiness.percent}%</span>
      </div>
      <div class="progress-track mt-3"><div class="progress-fill bg-accent-blue" style="width:${readiness.percent}%"></div></div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
        ${readiness.flags.map(flag => `
          <div class="rounded-lg border ${flag.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-surface-300 bg-surface-100 text-ink-50'} px-2 py-2 text-[10px] font-semibold">
            <span>${flag.done ? 'OK' : 'Need'}</span>
            <p class="mt-0.5">${escapeHtml(flag.label)}</p>
          </div>
        `).join('')}
      </div>
      <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-surface-300/60 pt-3">
        <div>
          <p class="text-xs font-bold text-ink-300">${escapeHtml(next.title)}</p>
          <p class="text-[11px] text-ink-50 mt-0.5">${escapeHtml(next.body)}</p>
        </div>
        <button ${actionAttrs} class="btn-primary rounded-lg px-3 py-2 text-[11px] font-semibold shrink-0">${escapeHtml(next.label)}</button>
      </div>
    </div>
  `;
}

function mergeClassMemory(course, classMemory) {
  if (!course || !classMemory) return;
  const syllabus = classMemory.syllabus || {};
  if (syllabus.examDates?.length) course.examDate = syllabus.examDates[0];
  if (classMemory.concepts?.length) {
    const existingTitles = new Set(course.chapters.map(chapter => chapter.title.toLowerCase()));
    classMemory.concepts.slice(0, 8).forEach((concept) => {
      if (!existingTitles.has(String(concept).toLowerCase())) {
        course.chapters.push({ title: concept, status: 'Mapped from class materials', progress: 5 });
      }
    });
  }
  if (classMemory.glossary && Object.keys(classMemory.glossary).length) {
    course.classMemory = { ...(course.classMemory || {}), glossary: classMemory.glossary };
  }
  course.classMemory = { ...(course.classMemory || {}), ...classMemory };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFilePayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const processFile = async () => {
      let workingFile = file;
      if (String(file.type || '').startsWith('image/') && window.StudentUImagePrep?.preprocessImageFile) {
        try {
          const prepped = await window.StudentUImagePrep.preprocessImageFile(file);
          workingFile = prepped.file || file;
        } catch (_error) {
          workingFile = file;
        }
      }

      const isTextLike = /^text\//.test(workingFile.type || '') || /\.(txt|md|csv|json)$/i.test(workingFile.name || '');
      const reader = new FileReader();
      reader.onload = () => {
        const extractedText = isTextLike
          ? window.StudentUSilent?.cleanNoteText?.(String(reader.result || '')) ?? String(reader.result || '')
          : '';
        resolve({
          fileData: isTextLike ? null : reader.result,
          fileName: workingFile.name,
          fileType: workingFile.type || 'unknown',
          fileSize: workingFile.size || 0,
          extractedText: extractedText.slice(0, 12000),
        });
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
      if (isTextLike) reader.readAsText(workingFile);
      else reader.readAsDataURL(workingFile);
    };

    processFile().catch(reject);
  });
}

function saveClassPortfolios() {
  const realCourses = classPortfolios.filter(course => !course.demoSeed);
  if (realCourses.length) localStorage.setItem('studentu_real_user', 'true');
  window.StudentUStore?.setClassPortfolios?.(classPortfolios, activeClassPortfolioId);
  if (!window.StudentUStore) {
    localStorage.setItem('studentu_class_portfolios', JSON.stringify(realCourses));
    localStorage.setItem('studentu_active_class', activeClassPortfolioId);
  }
  localStorage.setItem('studentu_portfolios_updated_at', new Date().toISOString());
  window.StudentUCloudSync?.schedulePush?.();
  window.updateStudyFlowHome?.();
  window.refreshDashboard?.();
  window.updateUserTierDisplay?.();
  window.refreshWorkspaceModeUI?.();
}

function getActiveClassPortfolio() {
  return classPortfolios.find(item => item.id === activeClassPortfolioId) || classPortfolios[0];
}

function selectClassPortfolio(courseId) {
  activeClassPortfolioId = courseId;
  saveClassPortfolios();
  renderClassPortfolios();
  window.updateStudyFlowHome?.();
}

function createClassPortfolio() {
  const wasDemo = window.getWorkspaceMode?.() === 'demo'
    || sessionStorage.getItem('studentu_guest_mode') === 'true'
    || localStorage.getItem('studentu_explore_active') === 'true';
  window.StudentUFlow?.setFlowPath?.('setup');
  window.StudentUStore?.setGuestMode?.(false) ?? sessionStorage.removeItem('studentu_guest_mode');
  localStorage.removeItem('studentu_explore_active');
  classPortfolios = classPortfolios.filter(course => !course.demoSeed);
  const count = classPortfolios.length + 1;
  const id = `class_${Date.now()}`;
  localStorage.setItem('studentu_real_user', 'true');
  classPortfolios.push({
    id,
    title: `New Class ${count}`,
    code: 'COURSE 100',
    professor: 'Professor name',
    examDate: 'Add date',
    retention: 0,
    sessions: 0,
    syllabusStatus: 'Syllabus Needed',
    currentChapter: 'Add current chapter',
    chapters: [{ title: 'Add first chapter', status: 'Not Started', progress: 0 }],
    materials: [],
    weakTopics: [],
  });
  activeClassPortfolioId = id;
  saveClassPortfolios();
  renderClassPortfolios();
  if (wasDemo) {
    window.StudentUFlow?.showDemoHandoffModal?.();
  } else {
    showNotification('Class Added', 'New class portfolio created.', 'success');
  }
  window.StudentUHappyPath?.onClassCreated?.(wasDemo);
  window.refreshWorkspaceModeUI?.();
}

function saveClassSetupDetails() {
  const course = getActiveClassPortfolio();
  if (!course) return;
  const title = document.getElementById('setup-class-title')?.value.trim();
  const examDate = document.getElementById('setup-class-exam')?.value.trim();
  const chapter = document.getElementById('setup-class-chapter')?.value.trim();
  if (title) course.title = title;
  if (examDate) course.examDate = examDate;
  if (chapter) course.currentChapter = chapter;
  saveClassPortfolios();
  updateCourseSelectorFromPortfolios();
  renderClassPortfolios();
  showNotification('Class Updated', 'Your class details are saved.', 'success');
}

function addChapterToActiveClass() {
  const course = getActiveClassPortfolio();
  const input = document.getElementById('new-chapter-title');
  const title = input?.value.trim();
  if (!course || !title) {
    showNotification('Chapter Needed', 'Add a chapter, unit, or topic name first.', 'error');
    return;
  }
  const exists = course.chapters.some(chapter => chapter.title.toLowerCase() === title.toLowerCase());
  if (!exists) {
    course.chapters.push({ title, status: 'Queued for Study', progress: 0 });
  }
  course.currentChapter = title;
  if (input) input.value = '';
  saveClassPortfolios();
  renderClassPortfolios();
  showNotification('Chapter Added', `${title} is now part of this class map.`, 'success');
}

function addWeakTopicToActiveClass(topicValue) {
  const course = getActiveClassPortfolio();
  const input = document.getElementById('new-weak-topic');
  const rawTopic = String(topicValue || input?.value || '').trim();
  const candidates = [
    ...(course?.weakTopics || []),
    ...(course?.chapters || []).map(item => item.title),
    ...(course?.classMemory?.concepts || []),
  ];
  const topic = window.StudentUSilent?.resolveTopicTitle?.(rawTopic, candidates) ?? rawTopic;
  if (!course || !topic) {
    showNotification('Topic Needed', 'Add a weak topic first.', 'error');
    return;
  }
  const matchesTopic = (value) => (window.StudentUSilent?.fuzzyMatchTopic?.(value, topic) ?? 0) >= 0.82
    || String(value).toLowerCase() === topic.toLowerCase();
  if (!course.weakTopics.some(item => matchesTopic(item))) {
    course.weakTopics.unshift(topic);
  }
  const chapter = course.chapters.find(item => matchesTopic(item.title));
  if (chapter) {
    chapter.status = 'Needs Practice';
    chapter.progress = Math.min(chapter.progress || 0, 45);
  }
  if (input) input.value = '';
  saveClassPortfolios();
  renderClassPortfolios();
  showNotification('Weak Topic Tracked', `${topic} will be prioritized in Study Desk.`, 'success');
}

function applyStudyOutcomeToCourse(course, { learned = 0, missed = 0, concepts = [], missedConcepts = [] } = {}) {
  const total = Math.max(1, learned + missed);
  const delta = Math.round(((learned - missed) / total) * 8);
  course.retention = Math.max(0, Math.min(99, (Number(course.retention) || 0) + delta));
  course.sessions = (Number(course.sessions) || 0) + 1;

  concepts.forEach((concept) => {
    const title = typeof concept === 'string' ? concept : concept?.title;
    if (!title) return;
    const existing = course.chapters.find(chapter => chapter.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.progress = Math.max(existing.progress || 0, missedConcepts.includes(title) ? 45 : 80);
      existing.status = missedConcepts.includes(title) ? 'Needs Practice' : 'Studied';
    } else {
      course.chapters.push({ title, status: missedConcepts.includes(title) ? 'Needs Practice' : 'Studied', progress: missedConcepts.includes(title) ? 35 : 75 });
    }
  });

  missedConcepts.forEach((title) => {
    const candidates = [...course.weakTopics, ...course.chapters.map(item => item.title)];
    const resolved = window.StudentUSilent?.resolveTopicTitle?.(title, candidates) ?? title;
    const matchesTopic = (value) => (window.StudentUSilent?.fuzzyMatchTopic?.(value, resolved) ?? 0) >= 0.82
      || String(value).toLowerCase() === String(resolved).toLowerCase();
    if (resolved && !course.weakTopics.some(item => matchesTopic(item))) {
      course.weakTopics.unshift(resolved);
    }
  });
}

function recordActiveClassStudyOutcome({ courseId, learned = 0, missed = 0, concepts = [], missedConcepts = [] } = {}) {
  if (window.isDemoCourseKey?.(courseId) && !classPortfolios.find(item => item.id === courseId)) {
    const demoPortfolios = window.getDemoPortfoliosWithOverrides?.() || [];
    const course = demoPortfolios.find(item => item.id === courseId);
    if (!course) return;
    applyStudyOutcomeToCourse(course, { learned, missed, concepts, missedConcepts });
    window.saveDemoPortfolioOverride?.(courseId, course);
    window.updateStudyFlowHome?.();
    window.refreshDashboard?.();
    return;
  }

  const course = classPortfolios.find(item => item.id === courseId) || getActiveClassPortfolio();
  if (!course) return;
  applyStudyOutcomeToCourse(course, { learned, missed, concepts, missedConcepts });

  saveClassPortfolios();
  window.updateStudyFlowHome?.();
  window.refreshDashboard?.();
}

async function uploadMaterialToServer(activeClass, material, localMaterial) {
  const response = await studentUFetch(`/api/courses/${activeClass.id}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(material),
  });

  if (response.ok) {
    const result = await response.json();
    mergeClassMemory(activeClass, result.classMemory);
    const index = activeClass.materials.findIndex(item => item.id === localMaterial.id);
    if (result.material && index >= 0) {
      activeClass.materials[index] = result.material;
      saveClassPortfolios();
      renderClassPortfolios();
    }
    return result.material;
  }

  if (response.status === 409) {
    activeClass.materials = activeClass.materials.filter(item => item.id !== localMaterial.id);
    saveClassPortfolios();
    renderClassPortfolios();
    showNotification('Already Saved', 'This material looks like a duplicate of something in this class.', 'info');
    return null;
  }

  let message = 'Could not sync material to the server.';
  try {
    const body = await response.json();
    if (body.error) message = body.error;
  } catch (_error) {
    // Keep generic message.
  }
  showNotification('Sync Issue', message, 'error');
  return localMaterial;
}

async function buildMaterialPayload(file, index, batchMeta = {}) {
  const typeEl = document.getElementById('class-material-type');
  const titleEl = document.getElementById('class-material-title');
  const notesEl = document.getElementById('class-material-notes');
  const isImage = file && String(file.type || '').startsWith('image/');
  const filePayload = file ? await readFilePayload(file) : null;
  const baseTitle = titleEl?.value.trim() || '';
  const defaultType = isImage ? 'Photo Notes' : (typeEl?.value || 'Lecture Notes');

  const material = {
    id: `material_${Date.now()}_${index}`,
    type: defaultType,
    title: baseTitle || (isImage ? `Lecture photo ${index + 1}` : `${defaultType} upload`),
    source: file ? file.name : 'Manual note',
    fileType: file ? file.type || 'unknown' : 'text',
    fileSize: file ? file.size || 0 : 0,
    notes: window.StudentUSilent?.cleanNoteText?.(notesEl?.value.trim() || (isImage ? '' : 'No notes added yet.')) ?? (notesEl?.value.trim() || (isImage ? '' : 'No notes added yet.')),
    addedAt: new Date().toISOString(),
    ...(filePayload || {}),
    ...(batchMeta.lectureSetId ? { lectureSetId: batchMeta.lectureSetId, pageIndex: index } : {}),
  };

  const prepared = window.StudentUSilent?.prepareMaterialFields?.(material, batchMeta.existingMaterials || []);
  if (prepared) {
    material.notes = prepared.notes;
    material.extractedText = prepared.extractedText || material.extractedText || '';
    if (!baseTitle && (!typeEl?.value || typeEl.value === 'Lecture Notes')) material.type = isImage ? 'Photo Notes' : prepared.type;
    if (prepared.duplicate) return { duplicate: true, material };
  }

  return { duplicate: false, material };
}

async function addClassMaterial() {
  const activeClass = getActiveClassPortfolio();
  if (!activeClass) return;

  const typeEl = document.getElementById('class-material-type');
  const titleEl = document.getElementById('class-material-title');
  const notesEl = document.getElementById('class-material-notes');
  const fileEl = document.getElementById('class-material-file');
  const consentEl = document.getElementById('class-material-consent');
  const files = fileEl?.files?.length ? Array.from(fileEl.files) : [];
  const singleFile = files[0];

  if (files.some(file => file.size > maxClassUploadBytes)) {
    showNotification('File Too Large', 'Please add files under 5 MB each or paste the key notes instead.', 'error');
    return;
  }
  if (consentEl && !consentEl.checked) {
    showNotification('Permission Needed', 'Please confirm you have permission to add this material.', 'error');
    return;
  }
  if (!files.length && !notesEl?.value.trim()) {
    showNotification('Material Needed', 'Paste notes or attach a file/photo first.', 'error');
    return;
  }

  const lectureSetId = files.length > 1 ? `lecture_${Date.now()}` : null;
  const uploadItems = files.length ? files : [null];
  let needsReviewMaterial = null;
  let savedCount = 0;

  for (let index = 0; index < uploadItems.length; index += 1) {
    const file = uploadItems[index];
    try {
      const built = await buildMaterialPayload(file, index, {
        lectureSetId,
        existingMaterials: activeClass.materials,
      });
      if (built.duplicate) continue;

      const material = built.material;
      const localMaterial = { ...material };
      delete localMaterial.fileData;
      activeClass.materials.unshift(localMaterial);
      if (localMaterial.type === 'Syllabus') activeClass.syllabusStatus = 'Uploaded';

      saveClassPortfolios();
      renderClassPortfolios();

      if (file && String(file.type || '').startsWith('image/')) {
        showNotification('Reading Photo', `Extracting text from ${file.name}…`, 'info');
      }

      const savedMaterial = await uploadMaterialToServer(activeClass, material, localMaterial);
      if (savedMaterial) {
        savedCount += 1;
        if (savedMaterial.processingStatus === 'needs_review' || savedMaterial.processingStatus === 'saved_for_image_review') {
          needsReviewMaterial = savedMaterial;
        }
      }
    } catch (error) {
      showNotification('Upload Issue', file ? `Could not add ${file.name}.` : 'Could not add material.', 'error');
    }
  }

  if (titleEl) titleEl.value = '';
  if (notesEl) notesEl.value = '';
  if (fileEl) fileEl.value = '';
  if (consentEl) consentEl.checked = false;
  if (typeEl && !files.length) typeEl.value = typeEl.value || 'Lecture Notes';

  window.updateStudyFlowHome?.();
  window.StudentUClassPortfolio?.renderMaterials?.();

  if (savedCount > 0) {
    const label = savedCount > 1 ? `${savedCount} photos saved` : `${uploadItems[0] ? 'Photo' : 'Material'} saved`;
    showNotification('Material Saved', `${label} to ${activeClass.title}.`, 'success');
    const savedType = typeEl?.value || (files.some(f => String(f.type || '').startsWith('image/')) ? 'Photo Notes' : 'Lecture Notes');
    window.StudentUHappyPath?.onMaterialSaved?.(savedType);
  }

  if (needsReviewMaterial) {
    setTimeout(() => window.openPhotoReviewModal?.(activeClass.id, needsReviewMaterial.id), 350);
  }
}
