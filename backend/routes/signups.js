const router = require('express').Router();
const { readDb, updateDb } = require('../services/database.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');

function cleanText(value = '', max = 160) {
  return String(value).trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

router.get('/', requireAuth, requireUsageAllowance, (_req, res) => {
  // FIX: Protect signup data - public visitors may join the list, but cannot read everyone else's emails.
  const { signups } = readDb();
  res.json({ signups });
});

router.post('/', (req, res) => {
  const { email, name = '', school = '', intent = 'student signup' } = req.body || {};
  const cleanEmail = cleanText(email, 254).toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const signup = updateDb((db) => {
    const existing = db.signups.find(item => item.email.toLowerCase() === cleanEmail);
    if (existing) return existing;

    const saved = {
      id: `signup_${Date.now()}`,
      email: cleanEmail,
      name: cleanText(name),
      school: cleanText(school),
      intent: cleanText(intent, 80) || 'student signup',
      createdAt: new Date().toISOString(),
    };
    db.signups.unshift(saved);
    return saved;
  });

  return res.status(201).json({ signup });
});

module.exports = router;
