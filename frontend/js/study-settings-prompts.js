/**
 * Study preference → AI prompt modifiers (difficulty + explanation style).
 */
(function () {
  const DIFFICULTY_PROMPTS = {
    Adaptive: null,
    Gentle: 'Prefer mostly EASY questions with straightforward wording. Avoid trick questions or ambiguous distractors.',
    'Exam style': 'Prefer MEDIUM and HARD exam-style questions with plausible distractors, multi-step reasoning, and time-pressure realism.',
  };

  const EXPLANATION_PROMPTS = {
    'Feynman first': 'For each card, write the feynman field as a plain-language explanation a beginner could teach back. Keep the analogy brief and supportive.',
    'Analogy first': 'For each card, lead with a vivid real-world analogy in the analogy field, then briefly explain the concept in feynman.',
    'Step-by-step': 'For each card, structure the feynman field as numbered steps (1., 2., 3.) walking through the concept procedurally.',
  };

  const CHAT_STYLE_HINTS = {
    'Feynman first': 'Explain in plain language first (Feynman style), then give one example and one recall question.',
    'Analogy first': 'Lead with a vivid analogy, then explain the concept briefly, then ask one recall question.',
    'Step-by-step': 'Break the answer into numbered steps, then give one example and one recall question.',
  };

  function readSettings() {
    if (typeof window.getStudySettings === 'function') return window.getStudySettings();
    try {
      return JSON.parse(localStorage.getItem('studentu_study_settings') || '{}');
    } catch (_error) {
      return {};
    }
  }

  function getDifficultyPromptModifier(calibration) {
    const difficulty = readSettings().difficulty || 'Adaptive';
    if (difficulty === 'Adaptive') {
      return calibration?.aiPromptModifier
        || 'Mix EASY, MEDIUM, and HARD based on weak topics, chapter progress, and recent performance.';
    }
    return DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.Adaptive;
  }

  function getExplanationStyleInstruction() {
    const style = readSettings().explanation || 'Feynman first';
    return EXPLANATION_PROMPTS[style] || EXPLANATION_PROMPTS['Feynman first'];
  }

  function getChatStyleHint() {
    const style = readSettings().explanation || 'Feynman first';
    return CHAT_STYLE_HINTS[style] || CHAT_STYLE_HINTS['Feynman first'];
  }

  function augmentCardGenerationSystemInstruction(baseInstruction) {
    return `${baseInstruction} ${getExplanationStyleInstruction()}`;
  }

  function getStudyPreferencesPayload() {
    const settings = readSettings();
    return {
      difficulty: settings.difficulty || 'Adaptive',
      explanation: settings.explanation || 'Feynman first',
      sessionLength: settings.sessionLength ?? 25,
      explanationInstruction: getExplanationStyleInstruction(),
      chatStyleHint: getChatStyleHint(),
      difficultyInstruction: getDifficultyPromptModifier(null),
    };
  }

  window.StudentUStudySettings = {
    getDifficultyPromptModifier,
    getExplanationStyleInstruction,
    getChatStyleHint,
    augmentCardGenerationSystemInstruction,
    getStudyPreferencesPayload,
  };
})();
