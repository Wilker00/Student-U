/**
 * Concept visuals — subject-aware hybrid cues for Study AI and Study Desk.
 * Catalog mirrors assets/learning-visuals/manifest.json
 */
(function () {
  const MANIFEST = [
    { id: 'neural-concept-map', visualId: 'map', type: 'map', subjects: ['neuro', 'calc'], keywords: ['network', 'gradient', 'backprop', 'chain', 'system', 'node', 'neural', 'layer'], path: 'assets/learning-visuals/neural-concept-map.svg', title: 'Connection Map', caption: 'See how the key ideas link together instead of memorizing isolated facts.' },
    { id: 'history-timeline', visualId: 'timeline', type: 'timeline', subjects: ['hist'], keywords: ['history', 'renaissance', 'perspective', 'chapter', 'origin', 'era', 'period', 'sequence'], path: 'assets/learning-visuals/history-timeline.svg', title: 'Memory Timeline', caption: 'Place each step in order so the sequence sticks in memory.' },
    { id: 'process-funnel', visualId: 'funnel', type: 'funnel', subjects: ['neuro', 'calc', 'macro'], keywords: ['algorithm', 'process', 'step', 'pass', 'derivative', 'calculus', 'partial'], path: 'assets/learning-visuals/process-funnel.svg', title: 'Step Focus', caption: 'Break the concept into ordered steps and focus on the moving part.' },
    { id: 'radial-metrics', visualId: 'radial', type: 'radial', subjects: ['macro', 'calc'], keywords: ['percent', 'metric', 'risk', 'retention', 'fiscal', 'ratio', 'rate'], path: 'assets/learning-visuals/radial-metrics.svg', title: 'Retention Metrics', caption: 'Compare the moving parts — rates, ratios, and what each one controls.' },
    { id: 'comparison-traps', visualId: 'compare', type: 'compare', subjects: ['neuro', 'calc', 'hist', 'macro'], keywords: ['mistake', 'confusing', 'difference', 'versus', 'trap', 'wrong', 'instead'], path: 'assets/learning-visuals/comparison-traps.svg', title: 'Correct vs Trap', caption: 'Contrast the right mental model with the mistake students usually make.' },
    { id: 'economic-ripples', visualId: 'ripple', type: 'ripple', subjects: ['macro'], keywords: ['multiplier', 'fiscal', 'spending', 'inflation', 'demand', 'econom', 'gdp'], path: 'assets/learning-visuals/economic-ripples.svg', title: 'Economic Ripple', caption: 'Watch how a change at the center spreads through the wider system.' },
    { id: 'animated-recall-loop', visualId: 'recall', type: 'animation', subjects: ['neuro', 'calc', 'hist', 'macro'], keywords: ['recall', 'memory', 'review', 'practice', 'quiz', 'test'], path: 'assets/learning-visuals/animated-recall-loop.svg', title: 'Recall Loop', caption: 'Study moves in a loop: preview, test yourself, fix gaps, then review on schedule.' },
    { id: 'animated-flow-map', visualId: 'flow', type: 'animation', subjects: ['neuro', 'calc', 'macro'], keywords: ['flow', 'process', 'system', 'cause', 'effect', 'input', 'output'], path: 'assets/learning-visuals/animated-flow-map.svg', title: 'Cause to Effect', caption: 'Follow how one input ripples through steps to produce the final result.' },
  ];

  const SUBJECT_DEFAULTS = {
    neuro: 'map',
    calc: 'funnel',
    hist: 'timeline',
    macro: 'ripple',
  };

  const SUBJECT_LABELS = {
    neuro: 'STEM',
    calc: 'STEM',
    hist: 'Humanities',
    macro: 'Economics',
  };

  const TASK_OVERRIDES = {
    plan: 'timeline',
    review: 'compare',
    quiz: 'recall',
    summarize: 'map',
  };

  const VISUALS = MANIFEST.reduce((acc, entry) => {
    acc[entry.visualId] = {
      id: entry.visualId,
      manifestId: entry.id,
      type: entry.type,
      path: entry.path,
      title: entry.title,
      caption: entry.caption,
      subjects: entry.subjects,
      keywords: entry.keywords,
    };
    return acc;
  }, {});

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(value, max = 80) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
  }

  function normalizeSubject(raw = '') {
    const value = String(raw || '').toLowerCase();
    if (SUBJECT_DEFAULTS[value]) return value;
    if (/neuro|network|cs\s*\d|backprop/.test(value)) return 'neuro';
    if (/calc|math|multivar|gradient vector|321/.test(value)) return 'calc';
    if (/hist|art|renaissance|humanities/.test(value)) return 'hist';
    if (/macro|econ|fiscal|multiplier/.test(value)) return 'macro';
    return '';
  }

  function getSubjectDefault(subjectKey) {
    const normalized = normalizeSubject(subjectKey);
    const visualId = SUBJECT_DEFAULTS[normalized] || 'flow';
    return VISUALS[visualId] || VISUALS.flow;
  }

  function scoreKeywordVisual(text, subjectKey = '') {
    const lower = String(text || '').toLowerCase();
    const normalized = normalizeSubject(subjectKey);
    let bestId = '';
    let bestScore = 0;

    MANIFEST.forEach((entry) => {
      let score = 0;
      entry.keywords.forEach((word) => {
        if (lower.includes(word)) score += 2;
      });
      if (normalized && entry.subjects.includes(normalized)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.visualId;
      }
    });

    return bestScore > 0 ? VISUALS[bestId] : null;
  }

  function resolveVisual(options = {}) {
    const {
      visualId,
      title = '',
      summary = '',
      breakdown = [],
      taskType = 'freeform',
      subject = '',
    } = options;

    const normalizedSubject = normalizeSubject(subject);
    const taskOverride = TASK_OVERRIDES[taskType];
    if (taskOverride && VISUALS[taskOverride]) {
      if (taskType === 'quiz' || taskType === 'review' || taskType === 'plan') {
        return VISUALS[taskOverride];
      }
    }

    if (visualId && VISUALS[visualId]) {
      return VISUALS[visualId];
    }

    if (taskOverride && VISUALS[taskOverride]) {
      return VISUALS[taskOverride];
    }

    if (normalizedSubject && SUBJECT_DEFAULTS[normalizedSubject]) {
      const subjectDefault = VISUALS[SUBJECT_DEFAULTS[normalizedSubject]];
      const text = [title, summary, ...(Array.isArray(breakdown) ? breakdown : [])].join(' ');
      const keywordMatch = scoreKeywordVisual(text, normalizedSubject);
      if (keywordMatch && keywordMatch.id !== 'recall') {
        return keywordMatch;
      }
      return subjectDefault;
    }

    const text = [title, summary, ...(Array.isArray(breakdown) ? breakdown : [])].join(' ');
    const keywordMatch = scoreKeywordVisual(text, normalizedSubject);
    if (keywordMatch) return keywordMatch;

    return VISUALS.flow || VISUALS.map;
  }

  function resolveVisualId(options = {}) {
    return resolveVisual(options).id;
  }

  function buildStepItems(structured = {}) {
    const breakdown = Array.isArray(structured.breakdown)
      ? structured.breakdown.filter(Boolean)
      : [];
    if (breakdown.length) return breakdown.slice(0, 4);
    return [structured.summary, structured.example, structured.memoryHook]
      .filter(Boolean)
      .slice(0, 3);
  }

  function buildCaption(visual, structured = {}) {
    if (structured.mistake && visual.id === 'compare') {
      return `Spot the trap: ${truncate(structured.mistake, 110)}`;
    }
    if (structured.title) {
      return `${visual.caption} Focus: ${truncate(structured.title, 90)}.`;
    }
    return visual.caption;
  }

  function getSubjectLabel(subjectKey = '') {
    const normalized = normalizeSubject(subjectKey);
    return SUBJECT_LABELS[normalized] || (normalized ? normalized.toUpperCase() : 'General');
  }

  function renderStepStrip(items) {
    if (!items.length) return '';
    return `
      <ol class="concept-visual-steps" style="--step-count: ${items.length}">
        ${items.map((item, index) => `
          <li class="concept-visual-step" style="--step-index: ${index}">
            <span class="concept-visual-step__num">${index + 1}</span>
            <span class="concept-visual-step__text">${escapeHtml(truncate(item, 78))}</span>
          </li>
        `).join('')}
      </ol>`;
  }

  function renderAssetFrame(visual) {
    const motionClass = visual.type === 'animation' ? ' concept-visual-asset--animated' : ' concept-visual-asset--static';
    return `
      <div class="concept-visual-asset${motionClass}" data-visual-id="${escapeHtml(visual.id)}">
        <img src="${escapeHtml(visual.path)}" alt="${escapeHtml(visual.title)} visual" loading="lazy">
      </div>`;
  }

  function renderComparePanel(structured, items) {
    const correctItems = items.slice(0, 2);
    if (!correctItems.length && !structured.mistake) return '';
    const trapText = structured.mistake || items[2] || structured.example || 'Watch for the common shortcut that skips a key step.';
    return `
      <div class="concept-visual-compare-panel visual-compare">
        <div class="compare-column compare-column--good">
          <h5>Key idea</h5>
          <ul>${(correctItems.length ? correctItems : [structured.summary || 'Core concept']).map(item => `<li>${escapeHtml(truncate(item, 90))}</li>`).join('')}</ul>
        </div>
        <div class="compare-column compare-column--trap">
          <h5>Common trap</h5>
          <ul><li>${escapeHtml(truncate(trapText, 120))}</li></ul>
        </div>
      </div>`;
  }

  function renderStudyVisualBlock(structured = {}, taskType = 'freeform') {
    const subject = structured.subject || '';
    const visual = resolveVisual({ ...structured, taskType, subject });
    const items = buildStepItems(structured);
    const caption = buildCaption(visual, structured);
    const subjectLabel = getSubjectLabel(subject);
    const typeBadge = visual.type === 'animation' ? 'Animated cue' : 'Concept diagram';
    const comparePanel = visual.id === 'compare' ? renderComparePanel(structured, items) : '';

    return `
      <div class="concept-visual-stage" data-visual-type="${escapeHtml(visual.id)}" data-subject="${escapeHtml(normalizeSubject(subject) || 'general')}">
        <div class="concept-visual-stage__header">
          <div class="concept-visual-stage__badges">
            <span class="concept-visual-stage__badge concept-visual-stage__badge--subject">${escapeHtml(subjectLabel)}</span>
            <span class="concept-visual-stage__badge">${escapeHtml(typeBadge)}</span>
          </div>
          <h4 class="concept-visual-stage__title">${escapeHtml(visual.title)}</h4>
        </div>
        <div class="concept-visual-stage__body concept-visual-stage__body--hybrid">
          ${renderAssetFrame(visual)}
          ${items.length ? renderStepStrip(items) : ''}
        </div>
        ${comparePanel}
        <p class="concept-visual-stage__caption">${escapeHtml(caption)}</p>
      </div>`;
  }

  function mountCardVisual(card = {}, courseKey = '') {
    const panel = document.getElementById('card-visual-panel');
    const titleEl = document.getElementById('card-visual-title');
    const typeEl = document.getElementById('card-visual-type');
    if (!panel) return;

    const structured = {
      title: card.title,
      summary: card.feynman,
      breakdown: [card.feynman, card.analogy, card.whyItMatters].filter(Boolean),
      example: card.analogy,
      mistake: card.mistake,
      subject: courseKey,
    };
    const visual = resolveVisual(structured);

    if (titleEl) titleEl.textContent = visual.title;
    if (typeEl) {
      typeEl.textContent = visual.type === 'animation' ? 'Animated' : visual.type;
    }

    panel.innerHTML = renderStudyVisualBlock(structured);
  }

  window.StudentUConceptVisuals = {
    MANIFEST,
    VISUALS,
    SUBJECT_DEFAULTS,
    resolveVisual,
    resolveVisualId,
    getSubjectDefault,
    renderStudyVisualBlock,
    mountCardVisual,
  };
})();
