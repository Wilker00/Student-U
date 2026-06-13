const router = require('express').Router();

router.post('/', (_req, res) => {
  res.status(501).json({ error: 'Waitlist endpoint is not implemented yet.' });
});

module.exports = router;
