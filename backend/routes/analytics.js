const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');
const { getFirestore } = require('../services/firebase.service');
const { readDb, updateDb } = require('../services/database.service');
const {
  calculatePerformanceVelocity,
  calibrateDifficulty,
  validateQuestionCoherence,
  calculateOptimalReviewDate,
  clusterWeakSpots,
} = require('../services/algorithms.service');
const {
  normalizeSessionRecord,
  getReviewHistoryForCard,
} = require('../services/session.service');
const {
  validateBody,
  validateSessionComplete,
  validateQuizValidate,
  validateWeakSpotDrills,
} = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireUsageAllowance);

async function saveSession(userId, session) {
  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(userId).collection('sessions').doc(session.id).set(session, { merge: true });
    return;
  }

  updateDb((db) => {
    db.sessions = db.sessions || {};
    db.sessions[userId] = [session, ...(db.sessions[userId] || []).filter(item => item.id !== session.id)].slice(0, 100);
    return session;
  });
}

async function getUserSessionHistory(userId) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => normalizeSessionRecord(doc.data())).reverse();
  }

  const db = readDb();
  return (db.sessions?.[userId] || []).map(item => normalizeSessionRecord(item)).reverse();
}

async function savePerformance(userId, courseKey, velocity) {
  const metrics = {
    id: `velocity_${courseKey}`,
    courseKey,
    velocity,
    updatedAt: new Date().toISOString(),
  };

  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(userId).collection('performance').doc(metrics.id).set(metrics, { merge: true });
    return metrics;
  }

  updateDb((db) => {
    db.progress = db.progress || {};
    db.progress[userId] = db.progress[userId] || {};
    db.progress[userId].performance = [metrics, ...(db.progress[userId].performance || []).filter(item => item.id !== metrics.id)].slice(0, 50);
    return metrics;
  });
  return metrics;
}

function aggregateDifficulty(courseHistory) {
  const byDifficulty = {
    easy: { correct: 0, total: 0, accuracy: 0 },
    medium: { correct: 0, total: 0, accuracy: 0 },
    hard: { correct: 0, total: 0, accuracy: 0 },
  };

  courseHistory.forEach(session => {
    session.quizResults.forEach(result => {
      const key = String(result.difficulty || 'MEDIUM').toLowerCase();
      if (!byDifficulty[key]) return;
      byDifficulty[key].total += 1;
      if (result.correct) byDifficulty[key].correct += 1;
    });

    Object.values(session.cardStates || {}).forEach(cardState => {
      const key = String(cardState.difficulty || 'MEDIUM').toLowerCase();
      if (!byDifficulty[key]) return;
      byDifficulty[key].total += 1;
      if (cardState.status === 'learned') byDifficulty[key].correct += 1;
    });
  });

  Object.values(byDifficulty).forEach(bucket => {
    bucket.accuracy = bucket.total > 0 ? bucket.correct / bucket.total : 0.5;
  });

  return byDifficulty;
}

async function getConceptCards(userId, courseKey) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('concepts')
      .where('course_id', '==', courseKey)
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  const db = readDb();
  return (db.progress?.[userId]?.concepts || []).filter(item => item.course_id === courseKey || item.courseKey === courseKey);
}

router.post('/sessions/:sessionId/complete', validateBody(validateSessionComplete), async (req, res) => {
  try {
    const session = normalizeSessionRecord(req.validatedBody || {}, { id: req.params.sessionId });
    await saveSession(req.user.id, session);

    const history = await getUserSessionHistory(req.user.id);
    const courseHistory = history.filter(item => item.courseKey === session.courseKey);
    const velocity = calculatePerformanceVelocity(courseHistory);
    await savePerformance(req.user.id, session.courseKey, velocity);

    res.json({ success: true, session, velocity });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Could not complete session.' });
  }
});

router.get('/recommendations/:courseKey', async (req, res) => {
  try {
    const { courseKey } = req.params;
    const history = await getUserSessionHistory(req.user.id);
    const courseHistory = history.filter(item => item.courseKey === courseKey);
    const velocity = calculatePerformanceVelocity(courseHistory);
    const calibration = calibrateDifficulty(aggregateDifficulty(courseHistory), velocity);
    res.json({ ...calibration, velocity });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Could not fetch recommendations.' });
  }
});

router.post('/quiz/validate', validateBody(validateQuizValidate), (req, res) => {
  const { card, question } = req.validatedBody;
  res.json(validateQuestionCoherence(card, question));
});

router.get('/review-schedule', async (req, res) => {
  try {
    const history = await getUserSessionHistory(req.user.id);
    const latestByCard = new Map();

    history.forEach(session => {
      Object.entries(session.cardStates || {}).forEach(([cardId, state]) => {
        latestByCard.set(cardId, { id: cardId, ...state, courseKey: session.courseKey });
      });
    });

    const schedule = [...latestByCard.values()].map(card => {
      const reviewHistory = getReviewHistoryForCard(history, card.id);
      const optimal = calculateOptimalReviewDate(card, card.status || 'neutral', reviewHistory);
      return {
        cardId: card.id,
        title: card.title || card.id,
        status: card.status,
        courseKey: card.courseKey,
        reviewDate: optimal.reviewDate,
        intervalDays: optimal.interval,
        reasoning: optimal.reasoning,
      };
    });

    res.json({ schedule });
  } catch (error) {
    console.error('Review schedule error:', error);
    res.status(500).json({ error: 'Could not retrieve review schedule.' });
  }
});

router.post('/weak-spot-drills/:courseKey', validateBody(validateWeakSpotDrills), async (req, res) => {
  try {
    const { courseKey } = req.params;
    const history = await getUserSessionHistory(req.user.id);
    const courseHistory = history.filter(item => item.courseKey === courseKey);
    const cardsFromConcepts = await getConceptCards(req.user.id, courseKey);
    const cardsFromSessions = courseHistory.flatMap(session =>
      Object.entries(session.cardStates || {}).map(([id, state]) => ({
        id,
        title: state.title || id,
        feynman: state.feynman || '',
        analogy: state.analogy || '',
        difficulty: state.difficulty || 'Intermediate',
      }))
    );
    const allCards = [...cardsFromConcepts, ...cardsFromSessions];
    const missedCardIds = req.validatedBody?.missedCardIds || courseHistory.flatMap(session =>
      Object.entries(session.cardStates || {})
        .filter(([, state]) => state.status === 'missed')
        .map(([cardId]) => cardId)
    );

    res.json({ clusters: clusterWeakSpots([...new Set(missedCardIds)], allCards) });
  } catch (error) {
    console.error('Weak spots error:', error);
    res.status(500).json({ error: 'Could not cluster weak spots.' });
  }
});

module.exports = router;
