const router = require('express').Router();
const { readDb, updateDb } = require('../services/database.service');
const { getFirestore } = require('../services/firebase.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');

router.use(requireAuth);
router.use(requireUsageAllowance);

async function saveProgressDoc(userId, collectionName, payload) {
  const record = {
    id: payload.id || `${collectionName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
    createdAt: payload.createdAt || new Date().toISOString(),
  };

  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(userId).collection(collectionName).doc(record.id).set(record, { merge: true });
    return record;
  }

  updateDb((db) => {
    db.progress = db.progress || {};
    db.progress[userId] = db.progress[userId] || {};
    db.progress[userId][collectionName] = [record, ...(db.progress[userId][collectionName] || [])].slice(0, 300);
    return record;
  });

  return record;
}

async function listProgressDocs(userId, collectionName) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection(collectionName)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  const db = readDb();
  return db.progress?.[userId]?.[collectionName] || [];
}

router.get('/:collectionName', async (req, res) => {
  try {
    const allowed = ['concepts', 'quiz-results', 'performance', 'highlights'];
    if (!allowed.includes(req.params.collectionName)) {
      return res.status(404).json({ error: 'Progress collection not found.' });
    }
    return res.json({ records: await listProgressDocs(req.user.id, req.params.collectionName) });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load progress.' });
  }
});

router.post('/:collectionName', async (req, res) => {
  try {
    const allowed = ['concepts', 'quiz-results', 'performance', 'highlights'];
    if (!allowed.includes(req.params.collectionName)) {
      return res.status(404).json({ error: 'Progress collection not found.' });
    }
    const record = await saveProgressDoc(req.user.id, req.params.collectionName, req.body || {});
    return res.status(201).json({ record });
  } catch (error) {
    return res.status(500).json({ error: 'Could not save progress.' });
  }
});

module.exports = router;
