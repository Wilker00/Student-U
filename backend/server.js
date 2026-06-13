try {
  require('dotenv').config();
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'studentu-api' });
});

app.use('/api/gemini', require('./routes/gemini'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/signups', require('./routes/signups'));

app.listen(port, () => {
  console.log(`StudentU API listening on port ${port}`);
});
