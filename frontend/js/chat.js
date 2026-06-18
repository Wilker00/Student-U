const StudentUChat = {
  messages: (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('studentu_chat_messages') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  })(),
  activeTask: localStorage.getItem('studentu_active_task') || null,
  threadMode: false,
  visualAssets: [
    { id: 'recall', path: 'assets/learning-visuals/animated-recall-loop.svg', title: 'Recall Loop' },
    { id: 'flow', path: 'assets/learning-visuals/animated-flow-map.svg', title: 'Cause to Effect' },
    { id: 'map', path: 'assets/learning-visuals/neural-concept-map.svg', title: 'Connection Map' },
    { id: 'timeline', path: 'assets/learning-visuals/history-timeline.svg', title: 'Memory Timeline' },
    { id: 'radial', path: 'assets/learning-visuals/radial-metrics.svg', title: 'Retention Metrics' },
    { id: 'ripple', path: 'assets/learning-visuals/economic-ripples.svg', title: 'Economic Ripple' },
    { id: 'compare', path: 'assets/learning-visuals/comparison-traps.svg', title: 'Correct vs Trap' },
    { id: 'funnel', path: 'assets/learning-visuals/process-funnel.svg', title: 'Step Focus' },
  ],

  taskPrompts: {
    explain: 'Explain the hardest part of my current class packet in plain English. Include a simple example and one recall question.',
    quiz: 'Generate practice questions from my notes and syllabus priorities. Focus on what is most likely to appear on the exam.',
    plan: 'Build a study plan based on my exam date, weak topics, and uploaded materials.',
    review: 'Find my weak spots and tell me exactly what to review first.',
    summarize: 'Summarize my uploaded notes into the most testable ideas.',
  },

  taskPlaceholders: {
    explain: 'What topic should I explain in plain English?',
    quiz: 'What should I quiz you on?',
    plan: 'Any constraints for your weekly plan?',
    review: 'What felt hardest in your last session?',
    summarize: 'Which notes or chapter should I condense?',
    freeform: 'Ask about this class, card, or next review...',
  },

  init() {
    this.purgeStaleErrors();
    this.syncMobileTaskRail();
    this.renderTaskRailActive();
    this.renderMessages();
    this.renderWorkspace();
    this.renderDynamicChips();
    this.updateComposerPlaceholder();
    this.loadHistory();
    const input = document.getElementById('studentu-chat-input');
    input?.addEventListener('keydown', event => this.handleKeydown(event));
    input?.addEventListener('focus', () => this.pulseUaiSubmit());
    const selector = document.getElementById('ai-class-selector');
    selector?.addEventListener('change', event => this.handleClassChange(event.target.value));
  },

  toggle() {
    switchTab('ai');
    this.open();
  },

  open() {
    this.renderWorkspace();
    this.renderDynamicChips();
    document.getElementById('studentu-chat-input')?.focus();
    this.renderMessages();
  },

  toggleThread() {
    this.threadMode = !this.threadMode;
    this.updateThreadToggleLabel();
    this.renderMessages();
  },

  updateThreadToggleLabel() {
    const btn = document.getElementById('ai-thread-toggle');
    if (btn) {
      btn.textContent = this.threadMode ? 'Hide thread' : 'Show thread';
      btn.classList.toggle('is-active', this.threadMode);
      btn.setAttribute('aria-pressed', this.threadMode ? 'true' : 'false');
    }
    const thread = document.getElementById('ai-thread-history');
    if (thread) thread.classList.toggle('hidden', !this.threadMode);
  },

  handleClassChange(courseId) {
    window.StudentUClassPortfolio?.select?.(courseId);
    this.renderWorkspace();
    this.renderDynamicChips();
    this.updateSubtitle();
  },

  saveLocal() {
    localStorage.setItem('studentu_chat_messages', JSON.stringify(this.messages.slice(-30)));
  },

  purgeStaleErrors() {
    const filtered = this.messages.filter(message => !message?.structured?.isError);
    if (filtered.length === this.messages.length) return;
    this.messages = filtered;
    this.saveLocal();
  },

  buildLocalDemoReply({ message, taskType = 'freeform', classContext = '', extraContext = '' }) {
    const context = [classContext, extraContext]
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, 500);
    const topicMatch = String(message || context || 'your class material')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90);
    const safeTask = taskType === 'freeform' ? 'explain' : taskType;
    const titleByTask = {
      plan: 'Demo study plan',
      quiz: 'Demo practice prompt',
      review: 'Demo review focus',
      summarize: 'Demo summary',
      explain: 'Demo study explanation',
    };
    const suggestedActionByTask = {
      quiz: 'start_quiz',
      plan: 'open_planner',
      review: 'mark_weak',
      summarize: 'open_workspace',
    };
    const course = this.getActiveCourse?.() || null;
    const subject = course?.id || '';
    const demoPayload = {
      title: titleByTask[safeTask] || titleByTask.explain,
      summary: `Offline demo: Study AI is using a local coach response for "${topicMatch}". Focus on the main idea, one worked example, and one recall question before moving on.`,
      breakdown: [
        'Name the concept in one plain sentence.',
        'Connect it to a concrete class example or uploaded note.',
        'Test yourself without looking, then patch the weakest part.',
      ],
      taskType: safeTask,
      subject,
    };

    return {
      title: demoPayload.title,
      summary: demoPayload.summary,
      breakdown: demoPayload.breakdown,
      example: context
        ? `Using your class context: ${context.slice(0, 220)}${context.length > 220 ? '…' : ''}`
        : 'Example: turn a note heading into a question, answer it from memory, then compare against the source.',
      memoryHook: 'One idea, one example, one recall check.',
      recallQuestion: `How would you explain ${topicMatch || 'this topic'} in your own words?`,
      visualId: window.StudentUConceptVisuals?.resolveVisualId?.(demoPayload) || (safeTask === 'plan' ? 'timeline' : 'flow'),
      suggestedAction: suggestedActionByTask[safeTask] || 'none',
      weakTopicLabel: safeTask === 'review' ? topicMatch : '',
      planItems: safeTask === 'plan'
        ? [
          { day: 'Today', topic: 'Preview notes and mark weak spots', minutes: 20 },
          { day: 'Tomorrow', topic: 'Practice active recall questions', minutes: 25 },
          { day: 'Fri', topic: 'Review misses and summarize corrections', minutes: 20 },
        ]
        : [],
      reviewItems: safeTask === 'review'
        ? [{ title: topicMatch || 'Current topic', reason: 'Demo mode review target from the current request.', daysUntil: 0 }]
        : [],
    };
  },

  setActiveTask(taskType) {
    this.activeTask = taskType || null;
    if (this.activeTask) localStorage.setItem('studentu_active_task', this.activeTask);
    else localStorage.removeItem('studentu_active_task');
    this.renderTaskRailActive();
    this.updateComposerPlaceholder();
    this.updateSubtitle();
  },

  updateSubtitle() {
    const el = document.getElementById('study-ai-subtitle');
    const course = this.getActiveCourse();
    if (!el) return;
    const taskLabel = this.activeTask ? this.activeTask.charAt(0).toUpperCase() + this.activeTask.slice(1) : null;
    if (!course) {
      el.textContent = 'Add a class to ground answers in your syllabus and notes.';
      return;
    }
    el.textContent = taskLabel
      ? `${taskLabel} mode · ${course.title}`
      : `Grounded in ${course.title} — pick a task or ask anything.`;
  },

  updateComposerPlaceholder() {
    const input = document.getElementById('studentu-chat-input');
    if (!input) return;
    input.placeholder = this.taskPlaceholders[this.activeTask] || this.taskPlaceholders.freeform;
  },

  syncMobileTaskRail() {
    const mobile = document.getElementById('ai-task-rail-mobile');
    const desktop = document.getElementById('ai-task-rail');
    if (!mobile || !desktop) return;
    mobile.innerHTML = desktop.innerHTML;
  },

  renderTaskRailActive() {
    document.querySelectorAll('#ai-task-rail .study-ai__task, #ai-task-rail-mobile .study-ai__task').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.task === this.activeTask);
    });
  },

  async loadHistory() {
    try {
      const response = await studentUFetch('/api/chat');
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.messages) || !data.messages.length) return;
      this.messages = data.messages.flatMap(turn => {
        const items = [{ role: 'user', content: turn.userMessage }];
        if (turn.structured) {
          items.push({ role: 'assistant', content: turn.assistantMessage || turn.structured.summary, structured: turn.structured });
        } else if (turn.assistantMessage) {
          items.push({ role: 'assistant', content: turn.assistantMessage });
        }
        return items;
      }).filter(item => item.content);
      this.saveLocal();
      this.renderMessages();
    } catch (_error) {
      // Local chat history is enough when the study service is not running.
    }
  },

  getActiveCourse() {
    const selector = document.getElementById('ai-class-selector') || document.getElementById('course-selector');
    const courseId = selector?.value;
    const portfolios = JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
    return portfolios.find(course => course.id === courseId) || portfolios[0] || null;
  },

  getClassContext() {
    const selector = document.getElementById('ai-class-selector') || document.getElementById('course-selector');
    const courseId = selector?.value;
    const classPacket = window.StudentUClassPortfolio?.getContext?.(courseId) || '';
    const currentCardPrompt = window.getCurrentStudyAIPrompt?.() || '';
    const pastedNotes = document.getElementById('study-material')?.value?.trim() || '';
    return [
      classPacket,
      currentCardPrompt ? `Current active study focus:\n${currentCardPrompt}` : '',
      pastedNotes ? `Study Desk notes currently loaded:\n${pastedNotes.slice(0, 5000)}` : '',
    ].filter(Boolean).join('\n\n');
  },

  getContextReadiness(course) {
    if (!course) {
      return { score: 0, label: 'No class', hints: ['Add a class'], ready: false, flags: [] };
    }
    const materials = course.materials || [];
    const flags = [
      { key: 'syllabus', label: 'Syllabus', ok: materials.some(item => String(item.type).toLowerCase().includes('syllabus')) },
      { key: 'notes', label: 'Notes', ok: materials.some(item => !String(item.type).toLowerCase().includes('syllabus')) },
      { key: 'chapter', label: 'Chapter', ok: Boolean(course.currentChapter && !String(course.currentChapter).toLowerCase().includes('add')) },
      { key: 'weak', label: 'Weak topics', ok: (course.weakTopics || []).length > 0 },
      { key: 'exam', label: 'Exam date', ok: Boolean(course.examDate && !String(course.examDate).toLowerCase().includes('add')) },
    ];
    const score = flags.filter(item => item.ok).length;
    const hints = flags.filter(item => !item.ok).map(item => item.label);
    return {
      score,
      label: score >= 4 ? 'Strong' : score >= 2 ? 'Partial' : 'Thin',
      hints,
      ready: score >= 2,
      flags,
    };
  },

  renderWorkspace() {
    const selector = document.getElementById('ai-class-selector');
    const grounding = document.getElementById('ai-grounding-panel');
    const portfolios = JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
    const activeId = localStorage.getItem('studentu_active_class') || portfolios[0]?.id;
    const active = portfolios.find(course => course.id === activeId) || portfolios[0];

    if (selector && portfolios.length) {
      selector.innerHTML = portfolios.map(course => `<option value="${this.escapeAttr(course.id)}">${this.escape(course.title)}</option>`).join('');
      selector.value = active?.id || '';
    } else if (selector) {
      selector.innerHTML = '<option value="">No class selected</option>';
    }

    this.renderGroundingPanel(active);
    this.updateSubtitle();
  },

  renderGroundingPanel(course) {
    const panel = document.getElementById('ai-grounding-panel');
    if (!panel) return;

    if (!course) {
      panel.innerHTML = `
        <span class="su-card-label study-ai__group-label">Grounding</span>
        <div class="study-ai__grounding study-ai__grounding--empty">
          <div class="study-ai__grounding-empty-icon" aria-hidden="true">
            <img src="assets/icons/plus.svg" alt="" class="asset-icon w-4 h-4">
          </div>
          <h3 class="su-card-title mt-1">No class yet</h3>
          <p class="su-card-body text-xs mt-2">Study AI needs at least one class packet to give specific answers.</p>
          <button type="button" data-action="switchTab" data-tab-target="profile" class="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold mt-3">Add a class</button>
        </div>`;
      return;
    }

    const readiness = this.getContextReadiness(course);
    const toneClass = readiness.score >= 4 ? 'is-strong' : readiness.score >= 2 ? '' : 'is-thin';
    const progressPct = (readiness.score / 5) * 100;

    panel.innerHTML = `
      <span class="su-card-label study-ai__group-label">Grounded in</span>
      <div class="study-ai__grounding ${toneClass}">
        <div class="study-ai__grounding-head">
          <div class="study-ai__grounding-ring" style="--grounding-progress: ${progressPct}%">
            <span>${readiness.score}/5</span>
          </div>
          <span class="study-ai__grounding-score">${readiness.label} context</span>
        </div>
        <h3 class="su-card-title mt-2">${this.escape(course.title)}</h3>
        <p class="su-card-body text-xs mt-1">${readiness.ready
    ? 'Your class packet is ready for specific explanations and quizzes.'
    : `Add: ${this.escape(readiness.hints.slice(0, 3).join(', '))}`}</p>
        <div class="study-ai__source-list">
          ${readiness.flags.map(item => `
            <div class="study-ai__source-item ${item.ok ? 'is-ok' : ''}">
              <span>${item.label}</span>
              <span class="study-ai__source-check">${item.ok ? '✓' : '—'}</span>
            </div>`).join('')}
        </div>
        <div class="study-ai__grounding-actions">
          <button type="button" data-action="focusClassMaterial" data-material-type="Lecture Notes" class="btn-outline rounded-lg px-3 py-1.5 text-[10px] font-semibold">Add source</button>
          <button type="button" data-action="switchTab" data-tab-target="profile" class="btn-outline rounded-lg px-3 py-1.5 text-[10px] font-semibold">Manage</button>
        </div>
      </div>`;
  },

  renderDynamicChips() {
    const row = document.getElementById('ai-dynamic-chips');
    if (!row) return;
    const course = this.getActiveCourse();
    const weakTopics = course?.weakTopics || [];
    const chapter = course?.currentChapter;
    const chips = [];
    if (chapter && !String(chapter).toLowerCase().includes('add')) {
      chips.push({ label: `Explain ${chapter}`, prompt: `Explain ${chapter} from my class packet in plain English with an example and recall question.` });
    }
    weakTopics.slice(0, 3).forEach(topic => {
      chips.push({ label: `Review ${topic}`, prompt: `Help me review ${topic}. Explain the core idea, common mistake, and one recall question.` });
    });
    if (!chips.length) {
      chips.push(
        { label: 'Make flashcards', prompt: 'Make flashcards from my current class packet.' },
        { label: 'Exam questions', prompt: 'Give me exam-style questions and explain each answer.' },
      );
    }
    row.innerHTML = chips.map(chip => `
      <button type="button" data-action="chatPrompt" data-prompt="${this.escapeAttr(chip.prompt)}" class="study-ai__prompt">${this.escape(chip.label)}</button>
    `).join('');
  },

  getLatestAssistantIndex() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (message?.role === 'assistant' && !message?.structured?.isError) return i;
    }
    return -1;
  },

  updateStageHeader(structured) {
    const label = document.getElementById('study-ai-answer-label');
    const title = document.getElementById('study-ai-answer-title');
    const deskBtn = document.getElementById('study-ai-desk-btn');
    if (!label || !title) return;
    if (!structured) {
      label.textContent = 'Study session';
      title.textContent = 'Your answers live here';
      deskBtn?.classList.add('hidden');
      return;
    }
    label.textContent = structured.isError ? 'Something went wrong' : structured.isLoading ? 'Generating…' : 'Your explanation';
    title.textContent = structured.title || 'Study explanation';
    deskBtn?.classList.toggle('hidden', structured.isLoading || structured.isError);
  },

  renderMessages() {
    this.renderHero();
    this.renderThreadHistory();
    this.updateThreadToggleLabel();
  },

  renderHero() {
    const hero = document.getElementById('studentu-chat-messages');
    if (!hero) return;

    const latestIndex = this.getLatestAssistantIndex();
    if (latestIndex < 0) {
      this.updateStageHeader(null);
      hero.innerHTML = `
        <div class="study-ai__empty">
          <div class="study-ai__empty-glow" aria-hidden="true"></div>
          <div class="study-ai__empty-icon">
            <img src="assets/icons/assistant.svg" alt="" class="asset-icon w-5 h-5">
          </div>
          <p class="study-ai__empty-title">Ready to study</p>
          <p class="study-ai__empty-copy">Pick a task on the left, try a suggested prompt, or ask anything in the box below.</p>
        </div>`;
      return;
    }

    const message = this.messages[latestIndex];
    const previousUser = this.findPreviousUserMessage(this.messages, latestIndex);
    const html = message.structured
      ? this.renderStructuredAnswer(message.structured, latestIndex)
      : this.renderLegacyAnswer(message.content, previousUser, latestIndex);
    this.updateStageHeader(message.structured || { title: 'Study explanation' });
    hero.innerHTML = html;
  },

  renderThreadHistory() {
    const thread = document.getElementById('ai-thread-history');
    if (!thread) return;
    if (!this.threadMode || this.messages.length <= 2) {
      thread.innerHTML = '';
      thread.classList.add('hidden');
      return;
    }

    const latestIndex = this.getLatestAssistantIndex();
    const prior = this.messages.slice(0, latestIndex);
    if (!prior.length) {
      thread.innerHTML = '';
      return;
    }

    thread.classList.remove('hidden');
    thread.innerHTML = prior.map(message => {
      if (message.role === 'user') {
        return `<div class="study-ai__thread-item flex justify-end"><div class="study-ai__thread-user">${this.escape(message.content)}</div></div>`;
      }
      const preview = message.structured?.title || message.content?.slice(0, 120) || 'Answer';
      return `<div class="study-ai__thread-item"><div class="study-ai__thread-assistant"><strong>Study AI:</strong> ${this.escape(preview)}</div></div>`;
    }).join('');
  },

  renderLoadingSkeleton() {
    const hero = document.getElementById('studentu-chat-messages');
    if (!hero) return;
    this.updateStageHeader({ title: 'Thinking…', isLoading: true });
    hero.innerHTML = `
      <article class="study-ai-answer uai-skeleton">
        <div class="study-ai-answer__head">
          <div class="uai-skeleton-line uai-skeleton-title"></div>
          <div class="uai-skeleton-line"></div>
        </div>
        <div class="study-ai-answer__recall uai-skeleton-block" style="min-height:4rem;margin:0 1rem 1rem"></div>
        <div class="study-ai-answer__grid">
          <div class="uai-skeleton-block"></div>
          <div class="uai-skeleton-block"></div>
          <div class="uai-skeleton-block"></div>
        </div>
      </article>`;
  },

  findPreviousUserMessage(messages, index) {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return messages[i].content || '';
    }
    return '';
  },

  getVisual(id) {
    return window.StudentUConceptVisuals?.resolveVisual?.({ visualId: id })
      || this.visualAssets.find(item => item.id === id)
      || this.visualAssets[0];
  },

  renderStudyVisual(structured, taskType) {
    const enriched = {
      ...structured,
      subject: structured.subject || this.getActiveCourse()?.id || '',
    };
    if (window.StudentUConceptVisuals?.renderStudyVisualBlock) {
      return window.StudentUConceptVisuals.renderStudyVisualBlock(
        enriched,
        taskType || this.activeTask || 'freeform',
      );
    }
    const visual = this.getVisual(structured.visualId);
    return `
      <div class="study-ai-answer__visual study-ai-answer__visual--hero">
        <img src="${this.escapeAttr(visual.path)}" alt="${this.escapeAttr(visual.title)} visual">
      </div>`;
  },

  renderStructuredAnswer(structured, messageIndex) {
    const visual = this.getVisual(structured.visualId);
    const breakdown = structured.breakdown?.length ? structured.breakdown : [structured.summary].filter(Boolean);
    const errorClass = structured.isError ? ' is-error' : '';
    const taskType = this.activeTask || 'freeform';

    const planBlock = structured.planItems?.length ? `
      <div class="study-ai-answer__extra rich-answer-block">
        <h5>Weekly plan</h5>
        <ul>${structured.planItems.map(item => `<li><strong>${this.escape(item.day)}</strong> — ${this.escape(item.topic)} (${item.minutes} min)</li>`).join('')}</ul>
      </div>` : '';

    const reviewBlock = structured.reviewItems?.length ? `
      <div class="study-ai-answer__extra rich-answer-block">
        <h5>Review queue</h5>
        <ul>${structured.reviewItems.map(item => `<li><strong>${this.escape(item.title)}</strong> — ${this.escape(item.reason)}${item.daysUntil ? ` (in ${item.daysUntil}d)` : ''}</li>`).join('')}</ul>
      </div>` : '';

    const primaryAction = structured.suggestedAction === 'start_quiz'
      ? `<button type="button" data-action="generateAdaptiveQuiz" class="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold">Start quiz</button>`
      : structured.suggestedAction === 'open_planner'
        ? `<button type="button" data-action="switchTab" data-tab-target="dashboard" data-subtab-target="planner" class="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold">Open planner</button>`
        : structured.suggestedAction === 'open_workspace'
          ? `<button type="button" data-action="chatApplyDesk" data-message-index="${messageIndex}" class="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold">Continue on Study Desk</button>`
          : '';

    return `
      <article class="study-ai-answer${errorClass}" data-message-index="${messageIndex}">
        ${!structured.isError ? `
        <div class="study-ai-answer__visual study-ai-answer__visual--hero">
          ${this.renderStudyVisual(structured, taskType)}
        </div>` : ''}
        <div class="study-ai-answer__head">
          <span class="rich-answer-kicker">Study AI · ${this.escape(visual.title)}</span>
          <h3 class="study-ai-answer__title">${this.escape(structured.title)}</h3>
          <p class="study-ai-answer__summary">${this.escape(structured.summary)}</p>
        </div>
        ${structured.recallQuestion ? `
        <div class="study-ai-answer__recall">
          <strong>Try recall first</strong>
          <p>${this.escape(structured.recallQuestion)}</p>
        </div>` : ''}
        <div class="study-ai-answer__grid">
          <div class="study-ai-answer__block">
            <h5>Breakdown</h5>
            <ul>${breakdown.map(item => `<li>${this.escape(item)}</li>`).join('')}</ul>
          </div>
          <div class="study-ai-answer__block">
            <h5>Example</h5>
            <p>${this.escape(structured.example || 'Connect this to one example from your notes.')}</p>
          </div>
          <div class="study-ai-answer__block">
            <h5>Memory hook</h5>
            <p>${this.escape(structured.memoryHook || 'Anchor the idea to one image and one question.')}</p>
          </div>
        </div>
        ${planBlock}
        ${reviewBlock}
        <div class="study-ai-answer__actions">
          ${primaryAction}
          <button type="button" data-action="chatApplyDesk" data-message-index="${messageIndex}" class="btn-outline rounded-lg px-3 py-1.5 text-[11px] font-semibold">Study Desk</button>
          <button type="button" data-action="chatFollowUp" data-follow-up="simpler" data-message-index="${messageIndex}" class="btn-outline rounded-lg px-3 py-1.5 text-[11px] font-semibold">Simpler</button>
          <button type="button" data-action="chatFollowUp" data-follow-up="quiz" data-message-index="${messageIndex}" class="btn-outline rounded-lg px-3 py-1.5 text-[11px] font-semibold">Quiz me</button>
          ${structured.weakTopicLabel ? `<button type="button" data-action="chatMarkWeak" data-topic="${this.escapeAttr(structured.weakTopicLabel)}" class="btn-outline rounded-lg px-3 py-1.5 text-[11px] font-semibold">Track weak topic</button>` : ''}
        </div>
      </article>`;
  },

  renderLegacyAnswer(content, previousUser, messageIndex) {
    const sentences = String(content).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g) || [content];
    return this.renderStructuredAnswer({
      title: previousUser.split(/\s+/).slice(0, 5).join(' ') || 'Study explanation',
      summary: sentences.slice(0, 2).join(' '),
      breakdown: sentences.slice(2, 5),
      example: sentences[5] || 'Connect this idea to one example from your notes.',
      memoryHook: 'Anchor the idea to one image, one example, and one recall question.',
      recallQuestion: 'Can you explain this without looking at your notes?',
      visualId: window.StudentUConceptVisuals?.resolveVisualId?.({ title: previousUser, taskType: 'freeform' }) || 'flow',
      suggestedAction: 'none',
      weakTopicLabel: '',
      planItems: [],
      reviewItems: [],
    }, messageIndex);
  },

  pulseUaiSubmit() {
    const btn = document.getElementById('studentu-chat-send');
    if (!btn || btn.disabled) return;
    btn.classList.remove('animating-border');
    void btn.offsetWidth;
    btn.classList.add('animating-border');
    setTimeout(() => {
      if (!btn.disabled) btn.classList.remove('animating-border');
    }, 4000);
  },

  setComposerBusy(isBusy) {
    const field = document.getElementById('study-ai-composer-field');
    if (field) field.classList.toggle('is-busy', isBusy);
  },

  setBusy(isBusy) {
    const button = document.getElementById('studentu-chat-send');
    const input = document.getElementById('studentu-chat-input');
    if (button) {
      button.disabled = isBusy;
      button.classList.toggle('animating-border', isBusy);
      button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
      button.setAttribute('aria-label', isBusy ? 'Sending…' : 'Send to Study AI');
    }
    if (input) input.disabled = isBusy;
    this.setComposerBusy(isBusy);
  },

  usePrompt(prompt, taskType = 'freeform') {
    const input = document.getElementById('studentu-chat-input');
    if (input) input.value = prompt;
    if (taskType !== 'freeform') this.setActiveTask(taskType);
    this.send(taskType);
  },

  runTask(taskType) {
    const prompt = this.taskPrompts[taskType] || '';
    if (!prompt) return;
    this.setActiveTask(taskType);
    const input = document.getElementById('studentu-chat-input');
    if (input) input.value = prompt;
    this.send(taskType);
  },

  async buildExtraContext(taskType) {
    const course = this.getActiveCourse();
    const courseKey = course?.id || 'general';
    if (taskType === 'review') {
      try {
        const [schedule, drills] = await Promise.all([
          window.StudentUAnalyticsAPI?.getReviewSchedule?.().catch(() => ({ schedule: [] })),
          window.StudentUAnalyticsAPI?.getWeakSpotDrills?.(courseKey, []).catch(() => ({ clusters: [] })),
        ]);
        return JSON.stringify({
          reviewSchedule: schedule?.schedule?.slice(0, 12) || [],
          weakSpotClusters: drills?.clusters?.slice(0, 6) || [],
          weakTopics: course?.weakTopics || [],
        }, null, 2);
      } catch (_error) {
        return JSON.stringify({ weakTopics: course?.weakTopics || [] });
      }
    }
    if (taskType === 'plan') {
      const materials = course?.materials || [];
      const topics = [...(course?.weakTopics || []), ...(course?.chapters || []).map(c => c.title)];
      return JSON.stringify({
        examDate: course?.examDate || '',
        currentChapter: course?.currentChapter || '',
        weakTopics: course?.weakTopics || [],
        topics: [...new Set(topics.filter(Boolean))].slice(0, 12),
        materialCount: materials.length,
      }, null, 2);
    }
    if (taskType === 'quiz') {
      try {
        const calibration = await window.StudentUAnalyticsAPI?.getRecommendations?.(courseKey);
        const difficultyInstruction = window.StudentUStudySettings?.getDifficultyPromptModifier?.(calibration);
        return JSON.stringify({
          difficultyCalibration: calibration || {},
          difficultyInstruction,
          weakTopics: course?.weakTopics || [],
        });
      } catch (_error) {
        return JSON.stringify({
          difficultyInstruction: window.StudentUStudySettings?.getDifficultyPromptModifier?.(null),
          weakTopics: course?.weakTopics || [],
        });
      }
    }
    return '';
  },

  async send(taskType = 'freeform') {
    const input = document.getElementById('studentu-chat-input');
    const text = input?.value.trim();
    if (!text) return;

    if (taskType !== 'freeform') this.setActiveTask(taskType);

    input.value = '';
    this.messages.push({ role: 'user', content: text });
    this.saveLocal();
    this.renderMessages();
    this.pulseUaiSubmit();
    this.setBusy(true);
    this.renderLoadingSkeleton();

    const extraContext = await this.buildExtraContext(taskType);
    const studyPreferences = window.StudentUStudySettings?.getStudyPreferencesPayload?.() || null;
    const classContext = this.getClassContext();
    const pushDemoReply = (mode = 'offline') => {
      const structured = this.buildLocalDemoReply({
        message: text,
        taskType,
        classContext,
        extraContext,
      });
      if (mode === 'offline') {
        structured.summary = structured.summary.replace('Offline demo:', 'Offline demo (backend unavailable):');
      }
      this.messages.push({
        role: 'assistant',
        content: structured.summary,
        structured,
      });
      this.handleSuggestedAction(structured);
    };

    try {
      const response = await studentUFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          messages: this.messages.slice(-12),
          classContext,
          taskType,
          extraContext,
          studyPreferences,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_parseError) {
        pushDemoReply('offline');
        return;
      }

      if (!response.ok && !data.structured) {
        pushDemoReply('offline');
        return;
      }

      const structured = data.structured || null;
      if (!structured) {
        pushDemoReply('offline');
        return;
      }

      this.messages.push({
        role: 'assistant',
        content: structured.summary || data.reply || '',
        structured,
      });
      this.handleSuggestedAction(structured);
    } catch (_error) {
      pushDemoReply('offline');
    } finally {
      this.setBusy(false);
      this.saveLocal();
      this.renderMessages();
    }
  },

  handleSuggestedAction(structured) {
    if (!structured?.suggestedAction || structured.isError) return;
    if (structured.suggestedAction === 'open_planner') {
      switchTab('dashboard');
      switchDashboardSubTab('planner');
      window.renderFirstStudyPlan?.();
    }
    if (structured.suggestedAction === 'start_quiz') {
      switchTab('workspace');
      setTimeout(() => { if (typeof generateAdaptiveQuiz === 'function') generateAdaptiveQuiz(); }, 400);
    }
    if (structured.suggestedAction === 'open_workspace') {
      const lastIndex = this.messages.length - 1;
      if (lastIndex >= 0) this.applyToStudyDesk(lastIndex);
    }
  },

  applyToStudyDesk(messageIndex) {
    const message = this.messages[Number(messageIndex)];
    const structured = message?.structured;
    if (!structured) return;
    const material = document.getElementById('study-material');
    if (!material) return;

    const courseId = document.getElementById('ai-class-selector')?.value;
    if (courseId) window.syncClassSelectors?.(courseId);

    material.value = [
      `# ${structured.title}`,
      '',
      structured.summary,
      '',
      '## Key points',
      ...(structured.breakdown || []).map(item => `- ${item}`),
      '',
      '## Example',
      structured.example,
      '',
      '## Memory hook',
      structured.memoryHook,
      '',
      '## Recall',
      structured.recallQuestion,
    ].filter(Boolean).join('\n');

    switchTab('workspace');
    window.expandStudyGuidePanel?.();
    setTimeout(() => {
      material.focus();
      material.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      window.updateStudyFlowHome?.();
    }, 150);
    showNotification(
      'Continued on Study Desk',
      'Your AI answer is in the notes field — tap Start New Guide when ready.',
      'success'
    );
  },

  markWeakTopic(topic) {
    if (!topic) return;
    addWeakTopicToActiveClass(topic);
    this.renderWorkspace();
    this.renderDynamicChips();
  },

  followUp(type, messageIndex) {
    const message = this.messages[Number(messageIndex)];
    const title = message?.structured?.title || 'this topic';
    if (type === 'simpler') {
      this.usePrompt(`Explain "${title}" more simply, like I am seeing it for the first time.`, 'explain');
      return;
    }
    if (type === 'quiz') {
      this.usePrompt(`Quiz me on "${title}" with 3 questions and explanations.`, 'quiz');
    }
  },

  handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send(this.activeTask || 'freeform');
    }
  },

  escape(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  },

  escapeAttr(value = '') {
    return this.escape(value).replace(/`/g, '&#096;');
  },
};

window.StudentUChat = StudentUChat;
window.addEventListener('DOMContentLoaded', () => StudentUChat.init());
