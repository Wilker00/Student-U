/**
 * Client-side algorithms (latency-sensitive, no server round-trip).
 * Personalization algorithms 3–7 run server-side via /api/analytics.
 */

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
    backpropagation: ['gradient', 'derivative', 'chain rule', 'forward pass'],
    'gradient descent': ['gradient', 'partial derivative'],
    'chain rule': ['derivative', 'calculus'],
    'neural network': ['forward pass', 'activation function'],
    'multiplier effect': ['fiscal policy', 'spending'],
    'linear perspective': ['vanishing point', 'depth'],
    renaissance: ['humanism', 'classical antiquity'],
  };

  cards.forEach(card => {
    const cardKeywords = `${card.title || ''} ${card.feynman || ''}`.toLowerCase();
    cards.forEach(other => {
      if (other.id === card.id) return;
      const otherKeywords = `${other.title || ''} ${other.feynman || ''}`.toLowerCase();
      const otherTitle = (other.title || '').toLowerCase();
      if (cardKeywords.includes(otherTitle)) addDependency(card.id, other.id);
      Object.entries(prerequisitePatterns).forEach(([concept, prereqs]) => {
        if (!cardKeywords.includes(concept)) return;
        prereqs.forEach(prereq => {
          if (otherKeywords.includes(prereq)) addDependency(card.id, other.id);
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
    (dependencies[cardId] || []).forEach(depId => visit(depId));
    visiting.delete(cardId);
    visited.add(cardId);
    sorted.push(cardId);
  }

  cards.forEach(card => visit(card.id));
  const sortedCards = sorted.map(id => cards.find(c => c.id === id)).filter(Boolean);

  return { sortedCards, dependencies, dependents, graph: { dependencies, dependents } };
}

function findComprehensionGaps(cardId, highlightedHTML, originalText) {
  if (!highlightedHTML || !originalText) return null;

  const highlightedSpans = highlightedHTML.match(/<span[^>]*data-hl-color[^>]*>([^<]+)<\/span>/g) || [];
  const highlightedWords = new Set();
  highlightedSpans.forEach(span => {
    const match = span.match(/>([^<]+)<\/span>/);
    if (match) match[1].split(/\s+/).forEach(word => highlightedWords.add(word.toLowerCase()));
  });

  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  const unhighlightedSegments = [];
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    const highlightedCount = words.filter(w => highlightedWords.has(w.toLowerCase())).length;
    const highlightPercentage = (highlightedCount / words.length) * 100;
    if (highlightPercentage < 30) {
      unhighlightedSegments.push({ text: sentence.trim(), highlightPercentage, importance: 'high' });
    }
  });

  const totalWords = originalText.split(/\s+/).length;
  const gapPercentage = ((totalWords - highlightedWords.size) / totalWords) * 100;

  return {
    cardId,
    gapPercentage: Math.round(gapPercentage),
    gapSeverity: gapPercentage > 60 ? 'critical' : gapPercentage > 40 ? 'high' : 'moderate',
    unhighlightedSegments: unhighlightedSegments.slice(0, 3),
    recommendation: gapPercentage > 40
      ? 'Ask AI for deeper explanation of these untouched sections'
      : 'Good comprehension coverage',
    suggestedPrompt: unhighlightedSegments.length > 0
      ? `The student didn't highlight these parts: ${unhighlightedSegments.map(s => `"${s.text}"`).join(', ')}. Generate a simple explanation focused on these overlooked areas.`
      : null,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildDependencyGraph, findComprehensionGaps };
}
