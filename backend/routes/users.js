const router = require('express').Router();

router.get('/me', (_req, res) => {
  res.status(501).json({ error: 'User profile endpoint is not implemented yet.' });
});

module.exports = router;
