try {
  require('dotenv').config();
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const path = require('path');
const fs = require('fs');
const express = require('express');

let helmet;
try {
  helmet = require('helmet');
} catch (_error) {
  helmet = null;
}

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
}

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (allowedOrigins.length && origin) {
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'Origin is not allowed.' });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!allowedOrigins.length && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-studentu-user-id');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const billingRoutes = require('./routes/billing');
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingRoutes.handleStripeWebhook,
);

app.use(express.json({ limit: '7mb' }));
app.use('/api/billing', billingRoutes);

const frontendRoot = path.join(__dirname, '..', 'frontend');
const frontendDist = path.join(frontendRoot, 'dist');
const distIndex = path.join(frontendDist, 'index.html');

if (fs.existsSync(distIndex)) {
  app.use(express.static(frontendDist));
} else {
  // Dev fallback: serve source frontend so index.html + styles/components.css work without a Vite build.
  app.use(express.static(frontendRoot));
  console.warn('[StudentU] Serving frontend/ source (no dist build). Use `cd frontend && npm run dev` for Vite, or `npm run build` for production static assets.');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'studentu-api' });
});

app.use('/api/gemini', require('./routes/gemini'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/signups', require('./routes/signups'));
app.use('/api/analytics', require('./routes/analytics'));

app.listen(port, () => {
  console.log(`StudentU API listening on port ${port}`);
});
