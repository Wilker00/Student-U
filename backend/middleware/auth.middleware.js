function requireAuth(_req, res, _next) {
  res.status(501).json({ error: 'Auth middleware is not implemented yet.' });
}

module.exports = { requireAuth };
