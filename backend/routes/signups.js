const router = require('express').Router();
const { readDb, updateDb } = require('../services/database.service');

router.get('/', (_req, res) => {
  const { signups } = readDb();
  res.json({ signups });
});

router.post('/', (req, res) => {
  const { email, name = '', school = '', intent = 'student signup' } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const signup = updateDb((db) => {
    const existing = db.signups.find(item => item.email.toLowerCase() === email.toLowerCase());
    if (existing) return existing;

    const saved = {
      id: `signup_${Date.now()}`,
      email,
      name,
      school,
      intent,
      createdAt: new Date().toISOString(),
    };
    db.signups.unshift(saved);
    return saved;
  });

  return res.status(201).json({ signup });
});

module.exports = router;
