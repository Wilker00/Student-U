const router = require('express').Router();

router.post('/generate', (_req, res) => {
  res.status(501).json({ error: 'Gemini generation endpoint is not implemented yet.' });
});

module.exports = router;
