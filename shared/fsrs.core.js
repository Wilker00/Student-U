/**
 * Simplified FSRS-4.5 inspired scheduler for spaced review.
 * Deterministic — no external API.
 */

const DEFAULT_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0834, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function initDifficulty(rating) {
  const w = DEFAULT_WEIGHTS;
  return clamp(w[4] - (rating - 3) * w[5], 1, 10);
}

function initStability(rating) {
  const w = DEFAULT_WEIGHTS;
  return Math.max(0.1, w[rating - 1] || w[2]);
}

function nextInterval(stability) {
  return Math.max(1, Math.round(stability));
}

function mapPerformanceToRating(performance = 'neutral', reviewHistory = []) {
  if (performance === 'missed') return 1;
  if (performance === 'review') return 2;
  if (performance === 'learned') return reviewHistory.length >= 2 ? 4 : 3;
  return 3;
}

function deriveFsrsState(card = {}, reviewHistory = []) {
  if (card.fsrs?.stability && card.fsrs?.difficulty) {
    return { ...card.fsrs };
  }

  const last = reviewHistory[reviewHistory.length - 1];
  const rating = last
    ? mapPerformanceToRating(last.status || (last.correct ? 'learned' : 'missed'), reviewHistory.slice(0, -1))
    : 3;

  return {
    stability: initStability(rating),
    difficulty: initDifficulty(rating),
    reps: reviewHistory.length,
    lapses: reviewHistory.filter(item => item.status === 'missed' || item.correct === false).length,
  };
}

function applyReview(state, rating, now = new Date()) {
  const w = DEFAULT_WEIGHTS;
  let { stability, difficulty, reps = 0, lapses = 0 } = state;
  difficulty = clamp(difficulty - w[6] * (rating - 3), 1, 10);

  if (rating === 1) {
    lapses += 1;
    stability = Math.max(0.1, w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, w[13]) - 1) * Math.exp(w[14] * (1 - 1)));
    stability = Math.max(0.1, w[15] * Math.pow(difficulty, -w[16]) * (Math.pow(stability, w[17]) - 1));
    stability = Math.max(0.4, stability * 0.35);
  } else if (reps === 0) {
    stability = initStability(rating);
  } else {
    const hardPenalty = rating === 2 ? w[15] : 1;
    const easyBoost = rating === 4 ? w[16] : 1;
    stability = stability * (1 + Math.exp(w[8]) * (11 - difficulty) * Math.pow(stability, -w[9]) * (Math.exp((1 - 1) * w[10]) - 1));
    stability = stability * hardPenalty * easyBoost;
    if (rating === 4) stability *= 1.25;
    if (rating === 2) stability *= 0.85;
  }

  reps += 1;
  const intervalDays = nextInterval(stability);
  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + intervalDays);

  return {
    stability: clamp(stability, 0.1, 365),
    difficulty: clamp(difficulty, 1, 10),
    reps,
    lapses,
    intervalDays,
    reviewDate,
    rating,
  };
}

function scheduleFsrsReview(card = {}, performance = 'neutral', reviewHistory = [], now = new Date()) {
  const rating = mapPerformanceToRating(performance, reviewHistory);
  const state = deriveFsrsState(card, reviewHistory);
  const result = applyReview(state, rating, now);

  return {
    interval: result.intervalDays,
    intervalDays: result.intervalDays,
    reviewDate: result.reviewDate,
    dateString: result.reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    reasoning: `FSRS: ${result.intervalDays}d (stability ${result.stability.toFixed(1)}, difficulty ${result.difficulty.toFixed(1)}, rating ${rating})`,
    fsrs: {
      stability: result.stability,
      difficulty: result.difficulty,
      reps: result.reps,
      lapses: result.lapses,
    },
    algorithm: 'fsrs',
  };
}

module.exports = {
  scheduleFsrsReview,
  mapPerformanceToRating,
  deriveFsrsState,
  applyReview,
};
