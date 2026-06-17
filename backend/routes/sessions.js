const router = require('express').Router();
const { readDb, updateDb } = require('../services/database.service');
const { getFirestore } = require('../services/firebase.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');
const { normalizeSessionRecord } = require('../services/session.service');
const { validateBody, validateSessionComplete } = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireUsageAllowance);

router.get('/', async (req, res) => {
  try {
    const firestore = getFirestore();
    if (firestore) {
      const snapshot = await firestore
        .collection('users')
        .doc(req.user.id)
        .collection('sessions')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      return res.json({ sessions: snapshot.docs.map(doc => doc.data()) });
    }

    const db = readDb();
    const sessions = db.sessions?.[req.user.id] || [];
    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load study sessions.' });
  }
});

router.post('/', validateBody(validateSessionComplete), async (req, res) => {
  try {
    const session = normalizeSessionRecord(req.validatedBody || {});

    const firestore = getFirestore();
    if (firestore) {
      await firestore
        .collection('users')
        .doc(req.user.id)
        .collection('sessions')
        .doc(session.id)
        .set(session, { merge: true });
      return res.status(201).json({ session });
    }

    updateDb((db) => {
      db.sessions = db.sessions || {};
      db.sessions[req.user.id] = [session, ...(db.sessions[req.user.id] || [])].slice(0, 100);
      return session;
    });

    return res.status(201).json({ session });
  } catch (error) {
    return res.status(500).json({ error: 'Could not save study session.' });
  }
});

module.exports = router;
