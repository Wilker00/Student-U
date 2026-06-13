const router = require('express').Router();
const { generateContent } = require('../services/gemini.service');

router.post('/generate', async (req, res) => {
  const { prompt, systemInstruction = '', jsonMode = false } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const text = await generateContent({
      prompt,
      systemInstruction,
      jsonMode: Boolean(jsonMode),
    });

    return res.json({ text });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.publicMessage || 'Gemini generation failed.',
    });
  }
});

module.exports = router;
