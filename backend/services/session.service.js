function normalizeDifficulty(value = 'MEDIUM') {
  const raw = String(value || 'MEDIUM').toUpperCase();
  if (raw === 'BEGINNER') return 'EASY';
  if (raw === 'INTERMEDIATE') return 'MEDIUM';
  if (raw === 'ADVANCED') return 'HARD';
  return ['EASY', 'MEDIUM', 'HARD'].includes(raw) ? raw : 'MEDIUM';
}

function normalizeCardStates(input = {}, cards = []) {
  if (input && !Array.isArray(input) && typeof input === 'object') {
    return Object.fromEntries(Object.entries(input).map(([cardId, value]) => {
      const state = typeof value === 'string' ? { status: value } : (value || {});
      return [cardId, {
        status: state.status || 'neutral',
        difficulty: normalizeDifficulty(state.difficulty),
        title: state.title || '',
        reviewedAt: state.reviewedAt || state.timestamp || null,
      }];
    }));
  }

  const byId = {};
  const states = Array.isArray(input) ? input : [];
  if (!cards.length && states.some(item => item && typeof item === 'object')) {
    states.forEach((state, index) => {
      const cardId = state.id || state.cardId || state.conceptId || state.concept_id || `card_${index}`;
      byId[cardId] = {
        status: state.status || 'neutral',
        difficulty: normalizeDifficulty(state.difficulty),
        title: state.title || cardId,
        reviewedAt: state.reviewedAt || state.timestamp || null,
      };
    });
    return byId;
  }
  cards.forEach((card, index) => {
    const state = states[index] || 'neutral';
    byId[card.id || `card_${index}`] = {
      status: typeof state === 'string' ? state : state.status || 'neutral',
      difficulty: normalizeDifficulty(card.difficulty || state.difficulty),
      title: card.title || state.title || '',
      reviewedAt: state.reviewedAt || state.timestamp || null,
    };
  });
  return byId;
}

function normalizeQuizResults(input = []) {
  return (Array.isArray(input) ? input : []).map(item => ({
    cardId: item.cardId || item.conceptId || item.concept_id || 'general',
    correct: Boolean(item.correct ?? item.isCorrect ?? item.is_correct),
    difficulty: normalizeDifficulty(item.difficulty),
  }));
}

function summarizeSession(session) {
  const cardStates = Object.values(session.cardStates || {});
  const quizResults = session.quizResults || [];
  const learnedCards = cardStates.filter(item => item.status === 'learned').length;
  const missedCards = cardStates.filter(item => item.status === 'missed').length;
  const correctQuiz = quizResults.filter(item => item.correct).length;
  const missedQuiz = quizResults.filter(item => !item.correct).length;

  return {
    correctAnswers: correctQuiz || learnedCards,
    missedAnswers: quizResults.length ? missedQuiz : missedCards,
  };
}

function normalizeSessionRecord(payload = {}, defaults = {}) {
  const cards = payload.cards || payload.cardsList || [];
  const createdAt = payload.createdAt || payload.created_at || payload.ended_at || new Date().toISOString();
  const durationMs = Number(
    payload.durationMs ??
    payload.duration_ms ??
    (payload.durationSeconds ?? payload.duration_seconds ?? payload.duration ?? 0) * 1000
  ) || 0;

  const session = {
    id: payload.id || defaults.id || `session_${Date.now()}`,
    courseKey: payload.courseKey || payload.courseId || payload.course_id || defaults.courseKey || 'general',
    durationMs,
    cardStates: normalizeCardStates(payload.cardStates || payload.conceptsCovered || payload.concepts_covered || [], cards),
    quizResults: normalizeQuizResults(payload.quizResults || payload.quiz_results || []),
    createdAt,
  };

  return {
    ...session,
    ...summarizeSession(session),
  };
}

function getReviewHistoryForCard(sessionHistory = [], cardId) {
  return sessionHistory
    .filter(session => session.cardStates?.[cardId] || session.quizResults?.some(result => result.cardId === cardId))
    .map(session => {
      const cardState = session.cardStates?.[cardId];
      const quizResult = session.quizResults?.find(result => result.cardId === cardId);
      return {
        correct: quizResult ? quizResult.correct : cardState?.status === 'learned',
        status: cardState?.status || (quizResult?.correct ? 'learned' : 'missed'),
        difficulty: cardState?.difficulty || quizResult?.difficulty || 'MEDIUM',
        reviewedAt: session.createdAt,
      };
    });
}

module.exports = {
  normalizeSessionRecord,
  getReviewHistoryForCard,
  summarizeSession,
};
