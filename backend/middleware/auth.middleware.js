const { getFirebaseAdmin } = require('../services/firebase.service');

function normalizeUserId(value = '') {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

async function requireAuth(req, res, next) {
  const headerUser = req.get('x-studentu-user-id');
  const bearer = req.get('authorization') || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
  const admin = getFirebaseAdmin();
  const allowLocalAuth = process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_AUTH === 'true';

  if (token && admin) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        id: normalizeUserId(decoded.uid),
        email: decoded.email || '',
        authMode: 'firebase',
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }
  }

  if (!allowLocalAuth) {
    return res.status(401).json({ error: 'Sign in is required.' });
  }

  const rawUserId = headerUser || 'demo_student';
  const id = normalizeUserId(rawUserId) || 'demo_student';

  req.user = {
    id,
    authMode: 'local',
  };

  next();
}

module.exports = { requireAuth };
