const buckets = new Map();

function requireUsageAllowance(req, res, next) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;
  const key = `${req.user?.id || req.ip}:${req.baseUrl || req.path}`;
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));

  if (bucket.count > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }

  next();
}

module.exports = { requireUsageAllowance };
