const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { getFirestore } = require('../services/firebase.service');
const { readDb, updateDb } = require('../services/database.service');

async function loadUser(userId) {
  const firestore = getFirestore();
  if (firestore) {
    const doc = await firestore.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  }
  const db = readDb();
  return db.users?.[userId] || null;
}

async function saveUser(user) {
  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(user.id).set(user, { merge: true });
    return user;
  }
  updateDb((db) => {
    db.users = db.users || {};
    db.users[user.id] = { ...(db.users[user.id] || {}), ...user };
    return user;
  });
  return user;
}

async function getMe(req, res) {
  try {
    const stored = await loadUser(req.user.id);
    const user = {
      id: req.user.id,
      email: stored?.email || req.user.email || '',
      name: stored?.name || '',
      school: stored?.school || '',
      plan: stored?.plan || 'free',
      authMode: req.user.authMode,
      lastSeenAt: new Date().toISOString(),
    };
    await saveUser(user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        school: user.school,
        plan: user.plan,
        authMode: user.authMode,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not load user profile.' });
  }
}

async function saveMe(req, res) {
  try {
    const updates = req.body || {};
    const user = {
      id: req.user.id,
      email: updates.email || req.user.email || '',
      name: updates.name || '',
      school: updates.school || '',
      plan: updates.plan || 'free',
      authMode: req.user.authMode,
      updatedAt: new Date().toISOString(),
    };
    await saveUser(user);
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Could not save user profile.' });
  }
}

router.get('/', requireAuth, getMe);
router.get('/me', requireAuth, getMe);
router.post('/', requireAuth, saveMe);
router.post('/me', requireAuth, saveMe);

module.exports = router;
