/**
 * STUDENTU SHARED CORE ALGORITHMS
 * Server-authoritative personalization logic shared by backend services and tests.
 */

const { scheduleFsrsReview } = require('./fsrs.core');

// ============================================================================
// 1. KNOWLEDGE DEPENDENCY GRAPH
// ============================================================================
function buildDependencyGraph(cards) {
  if (!cards || cards.length === 0) return { sortedCards: [], dependencies: {}, dependents: {}, graph: {} };

  const dependencies = {};
  const dependents = {};

  cards.forEach(card => {
    dependencies[card.id] = [];
    dependents[card.id] = [];
  });

  function addDependency(cardId, dependencyId) {
    if (cardId === dependencyId) return;
    if (!dependencies[cardId].includes(dependencyId)) {
      dependencies[cardId].push(dependencyId);
      dependents[dependencyId].push(cardId);
    }
  }

  const prerequisitePatterns = {
    'backpropagation': ['gradient', 'derivative', 'chain rule', 'forward pass'],
    'gradient descent': ['gradient', 'partial derivative'],
    'chain rule': ['derivative', 'calculus'],
    'neural network': ['forward pass', 'activation function'],
    'multiplier effect': ['fiscal policy', 'spending'],
    'linear perspective': ['vanishing point', 'depth'],
    'renaissance': ['humanism', 'classical antiquity']
  };

  cards.forEach(card => {
    const cardKeywords = `${card.title || ''} ${card.feynman || ''}`.toLowerCase();

    cards.forEach(other => {
      if (other.id === card.id) return;

      const otherKeywords = `${other.title || ''} ${other.feynman || ''}`.toLowerCase();
      const otherTitle = (other.title || '').toLowerCase();

      if (cardKeywords.includes(otherTitle)) {
        addDependency(card.id, other.id);
      }

      Object.entries(prerequisitePatterns).forEach(([concept, prereqs]) => {
        if (!cardKeywords.includes(concept)) return;
        prereqs.forEach(prereq => {
          if (otherKeywords.includes(prereq)) {
            addDependency(card.id, other.id);
          }
        });
      });
    });
  });

  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(cardId) {
    if (visited.has(cardId)) return;
    if (visiting.has(cardId)) return;

    visiting.add(cardId);

    (dependencies[cardId] || []).forEach(depId => {
      visit(depId);
    });

    visiting.delete(cardId);
    visited.add(cardId);
    sorted.push(cardId);
  }

  cards.forEach(card => visit(card.id));
  const sortedCards = sorted.map(id => cards.find(c => c.id === id)).filter(Boolean);

  return {
    sortedCards,
    dependencies,
    dependents,
    graph: { dependencies, dependents }
  };
}

// ============================================================================
// 2. COMPREHENSION GAP ANALYSIS
// ============================================================================
function findComprehensionGaps(cardId, highlightedHTML, originalText) {
  if (!highlightedHTML || !originalText) return null;

  const highlightedSpans = highlightedHTML.match(/<span[^>]*data-hl-color[^>]*>([^<]+)<\/span>/g) || [];
  const highlightedWords = new Set();

  highlightedSpans.forEach(span => {
    const match = span.match(/>([^<]+)<\/span>/);
    if (match) {
      match[1].split(/\s+/).forEach(word => {
        highlightedWords.add(word.toLowerCase());
      });
    }
  });

  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  const unhighlightedSegments = [];

  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    const highlightedCount = words.filter(w => highlightedWords.has(w.toLowerCase())).length;
    const highlightPercentage = (highlightedCount / words.length) * 100;

    if (highlightPercentage < 30) {
      unhighlightedSegments.push({
        text: sentence.trim(),
        highlightPercentage,
        importance: 'high'
      });
    }
  });

  const totalWords = originalText.split(/\s+/).length;
  const highlightedTotal = highlightedWords.size;
  const gapPercentage = ((totalWords - highlightedTotal) / totalWords) * 100;

  return {
    cardId,
    gapPercentage: Math.round(gapPercentage),
    gapSeverity: gapPercentage > 60 ? 'critical' : gapPercentage > 40 ? 'high' : 'moderate',
    unhighlightedSegments: unhighlightedSegments.slice(0, 3),
    recommendation: gapPercentage > 40 ? 'Ask AI for deeper explanation of these untouched sections' : 'Good comprehension coverage',
    suggestedPrompt: unhighlightedSegments.length > 0
      ? `The student didn't highlight these parts: ${unhighlightedSegments.map(s => `"${s.text}"`).join(', ')}. Generate a simple explanation focused on these overlooked areas.`
      : null
  };
}

// ============================================================================
// 3. PERFORMANCE VELOCITY TRACKING
// ============================================================================
function calculatePerformanceVelocity(sessionHistory) {
  if (!sessionHistory || sessionHistory.length < 2) {
    return { velocity: 0, trend: 'insufficient_data' };
  }

  const last5 = sessionHistory.slice(-5);

  const accuracies = last5.map(session => {
    const total = (session.correctAnswers || 0) + (session.missedAnswers || 0);
    return total > 0 ? session.correctAnswers / total : 0.5;
  });

  const n = accuracies.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = accuracies.reduce((a, b) => a + b, 0);
  const sumXY = accuracies.reduce((sum, y, i) => sum + i * y, 0);
  const sumX2 = accuracies.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const velocity = slope;

  const currentAccuracy = accuracies[accuracies.length - 1];
  const previousAccuracy = accuracies[0];
  const improvement = currentAccuracy - previousAccuracy;

  let trend = 'stable';
  let difficultyAdjustment = 'maintain';
  let multiplier = 1.0;

  if (velocity > 0.15) {
    trend = 'improving_fast';
    difficultyAdjustment = 'increase';
    multiplier = 1.4;
  } else if (velocity > 0.05) {
    trend = 'improving_slowly';
    difficultyAdjustment = 'slight_increase';
    multiplier = 1.15;
  } else if (velocity < -0.15) {
    trend = 'declining_fast';
    difficultyAdjustment = 'decrease';
    multiplier = 0.6;
  } else if (velocity < -0.05) {
    trend = 'declining_slowly';
    difficultyAdjustment = 'slight_decrease';
    multiplier = 0.85;
  }

  return {
    velocity: parseFloat(velocity.toFixed(3)),
    trend,
    currentAccuracy: parseFloat((currentAccuracy * 100).toFixed(1)),
    improvementOverTime: parseFloat((improvement * 100).toFixed(1)),
    difficultyAdjustment,
    difficultyMultiplier: multiplier,
    recommendation: `${trend}: ${difficultyAdjustment} difficulty level`,
    nextSessionAdvice: difficultyAdjustment === 'increase'
      ? 'Student ready for Advanced concepts'
      : difficultyAdjustment === 'decrease'
      ? 'Focus on Beginner-Intermediate concepts'
      : 'Continue current difficulty progression'
  };
}

// ============================================================================
// 4. OPTIMAL SPACING CALCULATOR (FSRS-backed)
// ============================================================================
function calculateOptimalReviewDate(card, performance, reviewHistory = []) {
  return scheduleFsrsReview(card, performance, reviewHistory);
}

// ============================================================================
// 5. WEAK SPOT CLUSTERING
// ============================================================================
function clusterWeakSpots(missedCardIds, allCards) {
  if (!missedCardIds || missedCardIds.length === 0) return [];

  const missedCards = missedCardIds
    .map(id => allCards.find(c => c.id === id))
    .filter(Boolean);

  if (missedCards.length === 0) return [];

  function calculateSimilarity(card1, card2) {
    const text1 = `${card1.title || ''} ${card1.feynman || ''} ${card1.analogy || ''}`.toLowerCase().split(/\s+/);
    const text2 = `${card2.title || ''} ${card2.feynman || ''} ${card2.analogy || ''}`.toLowerCase().split(/\s+/);

    const set1 = new Set(text1);
    const set2 = new Set(text2);

    const intersection = [...set1].filter(word => set2.has(word));
    const union = new Set([...set1, ...set2]);

    return intersection.length / union.size;
  }

  const clusters = [];
  const clustered = new Set();

  missedCards.forEach((card, idx) => {
    if (clustered.has(card.id)) return;

    const relatedCards = [card];
    clustered.add(card.id);

    missedCards.slice(idx + 1).forEach(otherCard => {
      if (!clustered.has(otherCard.id)) {
        const similarity = calculateSimilarity(card, otherCard);
        if (similarity > 0.2) {
          relatedCards.push(otherCard);
          clustered.add(otherCard.id);
        }
      }
    });

    if (relatedCards.length > 0) {
      const focusKeywords = relatedCards
        .map(c => (c.title || '').split(' ')[0])
        .join(' + ');

      clusters.push({
        focusArea: focusKeywords,
        cardIds: relatedCards.map(c => c.id),
        cards: relatedCards,
        count: relatedCards.length,
        suggestedDrill: `Generate 3 advanced questions that connect ${relatedCards.map(c => `"${c.title}"`).join(', ')}`
      });
    }
  });

  return clusters.sort((a, b) => b.count - a.count);
}

// ============================================================================
// 6. DIFFICULTY CALIBRATION
// ============================================================================
function calibrateDifficulty(studentPerformanceData, historicalVelocity = null) {
  if (!studentPerformanceData) {
    return { difficulty: 'MEDIUM', confidence: 'low' };
  }

  const easyAccuracy = studentPerformanceData.easy?.accuracy || 0;
  const mediumAccuracy = studentPerformanceData.medium?.accuracy || 0;
  const hardAccuracy = studentPerformanceData.hard?.accuracy || 0;

  let difficulty = 'MEDIUM';
  let reason = '';

  if (mediumAccuracy > 0.85) {
    difficulty = 'HARD';
    reason = 'Mastering medium difficulty';
  } else if (mediumAccuracy < 0.50) {
    difficulty = 'EASY';
    reason = 'Need to build foundation';
  } else if (hardAccuracy > 0.75) {
    difficulty = 'HARD';
    reason = 'Advanced concepts within reach';
  } else if (easyAccuracy < 0.70) {
    difficulty = 'EASY';
    reason = 'Reinforcing basics';
  }

  if (historicalVelocity) {
    if (historicalVelocity.trend === 'improving_fast' && difficulty !== 'HARD') {
      difficulty = 'HARD';
      reason = `Fast improvement detected (${historicalVelocity.currentAccuracy}% accuracy)`;
    } else if (historicalVelocity.trend === 'declining_fast' && difficulty !== 'EASY') {
      difficulty = 'EASY';
      reason = `Performance decline detected (${historicalVelocity.currentAccuracy}% accuracy)`;
    }
  }

  const difficultyMix = {
    'EASY': difficulty === 'EASY' ? 0.7 : difficulty === 'MEDIUM' ? 0.3 : 0.1,
    'MEDIUM': difficulty === 'MEDIUM' ? 0.6 : difficulty === 'HARD' ? 0.3 : 0.5,
    'HARD': difficulty === 'HARD' ? 0.6 : difficulty === 'MEDIUM' ? 0.1 : 0.05
  };

  return {
    primaryDifficulty: difficulty,
    reason,
    difficultyMix,
    confidence: mediumAccuracy > 0.5 ? 'high' : 'medium',
    aiPromptModifier: `Generate mostly ${difficulty} questions (${Math.round(difficultyMix[difficulty] * 100)}%), with ${Object.entries(difficultyMix).filter(([d]) => d !== difficulty).map(([d, p]) => `${Math.round(p * 100)}% ${d}`).join(' and ')}.`
  };
}

// ============================================================================
// 7. MATERIAL COHERENCE VALIDATOR
// ============================================================================
function validateQuestionCoherence(card, question) {
  if (!card || !question) return { isCoherent: false, reason: 'Missing data' };

  const cardText = `${card.title || ''} ${card.feynman || ''} ${card.analogy || ''}`.toLowerCase();
  const cardWords = cardText.split(/\s+/).filter(w => w.length > 4);
  const cardKeywords = [...new Set(cardWords)].slice(0, 8);

  if (!Array.isArray(question.options)) {
    return {
      isCoherent: false,
      reason: 'Missing answer options',
      overlapPercentage: 0,
      suggestion: 'Regenerate with exactly 4 options'
    };
  }

  const questionText = `${question.question || ''} ${(question.options || []).join(' ')} ${question.explanation || ''}`.toLowerCase();
  const questionKeywords = questionText.split(/\s+/).filter(w => w.length > 4);

  const keywordMatches = cardKeywords.filter(kw =>
    questionKeywords.some(qk =>
      qk.includes(kw) || kw.includes(qk) ||
      (kw.length > 6 && qk.length > 6 && levenshteinDistance(kw, qk) <= 2)
    )
  );

  const overlapPercentage = cardKeywords.length > 0 ? (keywordMatches.length / cardKeywords.length) * 100 : 0;

  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
    return {
      isCoherent: false,
      reason: 'Invalid correct answer index',
      overlapPercentage: 0,
      suggestion: 'Regenerate: ensure correct answer is properly specified'
    };
  }

  if (question.options.length !== 4) {
    return {
      isCoherent: false,
      reason: `Invalid number of options (got ${question.options.length}, need 4)`,
      suggestion: 'Regenerate with exactly 4 options'
    };
  }

  const isCoherent = overlapPercentage >= 40;

  return {
    isCoherent,
    overlapPercentage: Math.round(overlapPercentage),
    keywordMatches,
    matchedKeywords: keywordMatches.slice(0, 5),
    reason: isCoherent
      ? `Good coherence: ${Math.round(overlapPercentage)}% keyword overlap`
      : `Low coherence: only ${Math.round(overlapPercentage)}% keyword overlap`,
    suggestion: isCoherent
      ? 'Question is well-aligned with material'
      : `Regenerate focusing on: ${cardKeywords.slice(0, 3).join(', ')}`
  };
}

function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
}

module.exports = {
  buildDependencyGraph,
  findComprehensionGaps,
  calculatePerformanceVelocity,
  calculateOptimalReviewDate,
  clusterWeakSpots,
  calibrateDifficulty,
  validateQuestionCoherence,
  levenshteinDistance
};
