const router = require('express').Router();

router.post('/', (_req, res) => {
  res.status(501).json({ error: 'Study session endpoint is not implemented yet.' });
});

module.exports = router;
