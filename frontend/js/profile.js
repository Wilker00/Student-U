// ---- CLASS PORTFOLIO MANAGEMENT ----
const defaultClassPortfolios = [
  {
    id: 'neuro',
    title: 'Neural Networks & Backpropagation',
    code: 'CS 489',
    professor: 'Dr. Chen',
    examDate: 'Jun 20',
    retention: 78,
    sessions: 3,
    syllabusStatus: 'Uploaded',
    currentChapter: 'Chapter 5: Backpropagation',
    chapters: [
      { title: 'Neural network basics', status: 'Mastered', progress: 92 },
      { title: 'Gradient descent', status: 'Learning', progress: 74 },
      { title: 'Backpropagation chain rule', status: 'Needs Practice', progress: 48 },
    ],
    materials: [
      { type: 'Syllabus', title: 'CS 489 syllabus', source: 'cs489_syllabus.pdf', notes: 'Midterm emphasizes backpropagation, activation functions, and gradient descent.' },
      { type: 'Professor Notes', title: 'Exam hint from lecture', source: 'Lecture 12', notes: 'Professor said to explain every chain rule step, not just memorize formulas.' },
      { type: 'Lecture Notes', title: 'Backprop derivation notes', source: 'Week 6 notebook', notes: 'Error gradients flow backward from output layer to hidden layers.' },
    ],
    weakTopics: ['Backpropagation chain rule', 'Vanishing gradients'],
  },
  {
    id: 'calc',
    title: 'Calculus III - Multivariable',
    code: 'MATH 321',
    professor: 'Prof. Rodriguez',
    examDate: 'Jun 28',
    retention: 65,
    sessions: 2,
    syllabusStatus: 'Uploaded',
    currentChapter: 'Chapter 3: Gradients and Optimization',
    chapters: [
      { title: 'Partial derivatives', status: 'Mastered', progress: 85 },
      { title: 'Gradient vectors', status: 'Learning', progress: 62 },
      { title: 'Constrained optimization', status: 'Needs Practice', progress: 39 },
    ],
    materials: [
      { type: 'Syllabus', title: 'MATH 321 topic calendar', source: 'math321_syllabus.pdf', notes: 'Optimization and gradients are listed as midterm topics.' },
      { type: 'Photo Notes', title: 'Whiteboard optimization example', source: 'photo_upload.jpg', notes: 'Professor solved a Lagrange multiplier problem step by step.' },
    ],
    weakTopics: ['Constrained optimization', 'Gradient interpretation'],
  },
  {
    id: 'hist',
    title: 'History of Art - Renaissance',
    code: 'ART 210',
    professor: 'Dr. Moreau',
    examDate: 'Jul 5',
    retention: 82,
    sessions: 4,
    syllabusStatus: 'Needs Update',
    currentChapter: 'Unit 2: Perspective and Humanism',
    chapters: [
      { title: 'Humanism', status: 'Mastered', progress: 90 },
      { title: 'Linear perspective', status: 'Learning', progress: 76 },
      { title: 'Patronage systems', status: 'Review Soon', progress: 68 },
    ],
    materials: [
      { type: 'Professor Comment', title: 'Essay feedback', source: 'Draft 1', notes: 'Connect visual technique to political and religious patronage.' },
      { type: 'Lecture Notes', title: 'Perspective lecture', source: 'Week 4 notes', notes: 'Vanishing point technique changed how depth was represented.' },
    ],
    weakTopics: ['Patronage systems'],
  },
  {
    id: 'macro',
    title: 'Macroeconomics - Fiscal Policy',
    code: 'ECON 202',
    professor: 'Prof. Kim',
    examDate: 'Jul 10',
    retention: 71,
    sessions: 2,
    syllabusStatus: 'Uploaded',
    currentChapter: 'Chapter 9: Fiscal Multipliers',
    chapters: [
      { title: 'Aggregate demand', status: 'Mastered', progress: 83 },
      { title: 'Fiscal multipliers', status: 'Learning', progress: 66 },
      { title: 'Deficit spending inflation risk', status: 'Needs Practice', progress: 52 },
    ],
    materials: [
      { type: 'Syllabus', title: 'ECON 202 exam calendar', source: 'econ202_syllabus.pdf', notes: 'Fiscal policy and multiplier models are exam priorities.' },
      { type: 'Assignment', title: 'Problem set 4', source: 'pset4.pdf', notes: 'Missed one question on multiplier leakage through savings/imports.' },
    ],
    weakTopics: ['Multiplier leakage', 'Demand-pull inflation'],
  },
];

let classPortfolios = JSON.parse(localStorage.getItem('studentu_class_portfolios') || 'null') || defaultClassPortfolios;
let activeClassPortfolioId = localStorage.getItem('studentu_active_class') || classPortfolios[0]?.id || 'neuro';

function saveClassPortfolios() {
  localStorage.setItem('studentu_class_portfolios', JSON.stringify(classPortfolios));
  localStorage.setItem('studentu_active_class', activeClassPortfolioId);
}

function getActiveClassPortfolio() {
  return classPortfolios.find(item => item.id === activeClassPortfolioId) || classPortfolios[0];
}

function selectClassPortfolio(courseId) {
  activeClassPortfolioId = courseId;
  saveClassPortfolios();
  renderClassPortfolios();
}

function createClassPortfolio() {
  const count = classPortfolios.length + 1;
  const id = `class_${Date.now()}`;
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
  showNotification('Class Added', 'New class portfolio created.', 'success');
}

async function addClassMaterial() {
  const activeClass = getActiveClassPortfolio();
  if (!activeClass) return;

  const typeEl = document.getElementById('class-material-type');
  const titleEl = document.getElementById('class-material-title');
  const notesEl = document.getElementById('class-material-notes');
  const fileEl = document.getElementById('class-material-file');
  const file = fileEl?.files?.[0];

  const material = {
    type: typeEl.value,
    title: titleEl.value.trim() || `${typeEl.value} upload`,
    source: file ? file.name : 'Manual note',
    fileType: file ? file.type || 'unknown' : 'text',
    notes: notesEl.value.trim() || 'No notes added yet.',
    addedAt: new Date().toISOString(),
  };

  activeClass.materials.unshift(material);
  if (material.type === 'Syllabus') activeClass.syllabusStatus = 'Uploaded';

  if (material.notes.length > 24 && !activeClass.chapters.some(chapter => material.notes.toLowerCase().includes(chapter.title.toLowerCase()))) {
    activeClass.chapters.push({
      title: material.title,
      status: 'New Context',
      progress: 10,
    });
  }

  saveClassPortfolios();
  renderClassPortfolios();
  titleEl.value = '';
  notesEl.value = '';
  if (fileEl) fileEl.value = '';

  try {
    await fetch(`/api/courses/${activeClass.id}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material),
    });
  } catch (error) {
    // Static prototype fallback: local portfolio state is still saved.
  }

  showNotification('Material Saved', `${material.type} added to ${activeClass.title}.`, 'success');
}

function buildClassContext(courseId = activeClassPortfolioId) {
  const course = classPortfolios.find(item => item.id === courseId);
  if (!course) return '';

  const syllabus = course.materials.find(item => item.type === 'Syllabus');
  const professorSignals = course.materials
    .filter(item => item.type.includes('Professor'))
    .slice(0, 3)
    .map(item => `${item.title}: ${item.notes}`)
    .join('\n');
  const recentMaterials = course.materials
    .slice(0, 5)
    .map(item => `${item.type} - ${item.title}: ${item.notes}`)
    .join('\n');
  const chapters = course.chapters
    .map(item => `${item.title} (${item.status}, ${item.progress}% complete)`)
    .join('; ');

  return [
    `Class: ${course.title} (${course.code})`,
    `Professor: ${course.professor}`,
    `Current chapter: ${course.currentChapter}`,
    `Exam date: ${course.examDate}`,
    `Syllabus status: ${course.syllabusStatus}`,
    `Syllabus summary: ${syllabus ? syllabus.notes : 'No syllabus uploaded yet.'}`,
    `Chapter progress: ${chapters}`,
    `Weak topics: ${course.weakTopics.join(', ') || 'None recorded yet'}`,
    professorSignals ? `Professor signals:\n${professorSignals}` : '',
    recentMaterials ? `Recent class materials:\n${recentMaterials}` : '',
  ].filter(Boolean).join('\n');
}

function renderClassPortfolios() {
  const list = document.getElementById('class-portfolio-list');
  const detail = document.getElementById('class-portfolio-detail');
  const contextPanel = document.getElementById('class-context-panel');
  if (!list || !detail || !contextPanel) return;

  list.innerHTML = classPortfolios.map(course => {
    const active = course.id === activeClassPortfolioId;
    return `
      <button onclick="selectClassPortfolio('${course.id}')" class="w-full text-left bg-surface-50 border ${active ? 'border-ink-400 shadow-md' : 'border-surface-300/60 shadow-sm'} rounded-2xl p-4 hover:shadow-md transition-all">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-ink-400">${course.title}</h3>
            <p class="text-[11px] text-ink-50 mt-1">${course.code} &middot; ${course.professor}</p>
          </div>
          <span class="text-[10px] font-mono ${course.syllabusStatus === 'Uploaded' ? 'text-emerald-700' : 'text-accent-warm'}">${course.syllabusStatus}</span>
        </div>
        <div class="progress-track mt-3"><div class="progress-fill bg-accent-blue" style="width:${course.retention}%"></div></div>
        <div class="flex justify-between text-[10px] text-ink-50 mt-2">
          <span>${course.retention}% retention</span>
          <span>${course.materials.length} materials</span>
        </div>
      </button>
    `;
  }).join('');

  const course = getActiveClassPortfolio();
  const materials = course.materials.map(item => `
    <div class="border border-surface-300/60 rounded-xl p-3 bg-white">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] uppercase tracking-wider font-mono text-accent-blue">${item.type}</span>
          <h4 class="text-xs font-bold text-ink-300 mt-1">${item.title}</h4>
          <p class="text-[10px] text-ink-50 mt-0.5">${item.source}</p>
        </div>
      </div>
      <p class="text-[11px] text-ink-100 leading-relaxed mt-2">${item.notes}</p>
    </div>
  `).join('');

  detail.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
      <div>
        <span class="text-[10px] uppercase tracking-widest font-mono text-ink-50">Selected Class</span>
        <h2 class="text-xl font-extrabold text-ink-400 mt-1">${course.title}</h2>
        <p class="text-xs text-ink-50 mt-1">${course.code} &middot; ${course.professor} &middot; Exam: ${course.examDate}</p>
      </div>
      <button onclick="startClassContextSession('${course.id}')" class="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold">Study This Class</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-[10px] text-ink-50 uppercase font-mono">Current Chapter</span>
        <p class="text-xs font-bold text-ink-300 mt-1">${course.currentChapter}</p>
      </div>
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-[10px] text-ink-50 uppercase font-mono">Materials</span>
        <p class="text-lg font-extrabold text-ink-400 mt-1">${course.materials.length}</p>
      </div>
      <div class="bg-surface-100 border border-surface-300 rounded-xl p-3">
        <span class="text-[10px] text-ink-50 uppercase font-mono">Weak Topics</span>
        <p class="text-xs font-bold text-accent-warm mt-1">${course.weakTopics.join(', ') || 'None yet'}</p>
      </div>
    </div>

    <div class="mb-5">
      <h3 class="text-sm font-bold text-ink-400 mb-3">Chapter Progress</h3>
      <div class="space-y-3">
        ${course.chapters.map(chapter => `
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="font-semibold text-ink-300">${chapter.title}</span>
              <span class="text-ink-50">${chapter.status}</span>
            </div>
            <div class="progress-track"><div class="progress-fill bg-accent-teal" style="width:${chapter.progress}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>

    <h3 class="text-sm font-bold text-ink-400 mb-3">Class Materials</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${materials || '<p class="text-xs text-ink-50">No materials yet.</p>'}</div>
  `;

  contextPanel.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-3">
      <div>
        <h3 class="text-sm font-bold text-ink-400">AI Context Packet</h3>
        <p class="text-xs text-ink-50 mt-1">This is what StudentU uses to generate class-specific explanations and practice.</p>
      </div>
      <button onclick="copyClassContextPacket()" class="btn-outline rounded-lg px-3 py-2 text-xs font-medium">Copy Context</button>
    </div>
    <pre id="class-context-output" class="bg-surface-100 border border-surface-300 rounded-xl p-4 text-[11px] text-ink-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">${buildClassContext(course.id)}</pre>
  `;
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
  showNotification('Class Context Loaded', `${course.title} context is ready in Study Desk.`, 'success');
}

function copyClassContextPacket() {
  const output = document.getElementById('class-context-output');
  if (!output) return;
  navigator.clipboard?.writeText(output.innerText);
  showNotification('Context Copied', 'Class context packet copied.', 'success');
}

function updateCourseSelectorFromPortfolios() {
  const selector = document.getElementById('course-selector');
  if (!selector) return;
  selector.innerHTML = classPortfolios.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
}

function getCourseContextForPrompt(courseId) {
  return buildClassContext(courseId);
}

window.addEventListener('DOMContentLoaded', () => {
  updateCourseSelectorFromPortfolios();
  renderClassPortfolios();
});
