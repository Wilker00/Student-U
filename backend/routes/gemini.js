const router = require('express').Router();
const { generateContent } = require('../services/gemini.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');

const demoCards = [
  {
    title: 'Neural Network Basics',
    difficulty: 'Beginner',
    feynman: 'A neural network passes information through connected layers. Each layer transforms the input a little so the final layer can make a prediction.',
    analogy: 'Like an assembly line where each station adds one useful step before the final product is inspected.',
    mistake: 'Thinking every artificial neuron understands meaning like a human brain cell.',
    whyItMatters: 'This gives the student the foundation for understanding training and backpropagation.',
    sourceLabel: 'Demo notes',
    confidence: 'High',
  },
  {
    title: 'Backpropagation Chain Rule',
    difficulty: 'Intermediate',
    feynman: 'Backpropagation works backward from the error and uses the chain rule to calculate how much each weight contributed to that error.',
    analogy: 'Like tracing a bad assembly-line result backward to find which station introduced the problem.',
    mistake: 'Confusing backpropagation, which computes gradients, with gradient descent, which uses those gradients to update weights.',
    whyItMatters: 'It explains how neural networks learn from mistakes instead of only making predictions.',
    sourceLabel: 'Demo notes',
    confidence: 'High',
  },
  {
    title: 'Gradient Descent Updates',
    difficulty: 'Intermediate',
    feynman: 'Gradient descent adjusts weights in the direction that should reduce loss, taking small steps instead of guessing randomly.',
    analogy: 'Like walking downhill in fog by feeling which direction slopes downward under your feet.',
    mistake: 'Assuming a bigger step is always better; steps that are too large can overshoot the best answer.',
    whyItMatters: 'It connects the calculated gradients to the actual learning process.',
    sourceLabel: 'Demo notes',
    confidence: 'Medium',
  },
];

const demoQuestions = [
  {
    cardIndexTrigger: 0,
    cardId: 'n1',
    difficulty: 'EASY',
    question: 'What is the best simple description of a neural network?',
    options: [
      'A layered system that transforms inputs into predictions',
      'A database table that stores class notes',
      'A rule that prevents all prediction errors',
      'A calculator that only performs the chain rule',
    ],
    correct: 0,
    explanation: 'The demo notes describe neural networks as layered computational systems that pass information forward to make predictions.',
    sourceLabel: 'Demo notes',
  },
  {
    cardIndexTrigger: 1,
    cardId: 'n3',
    difficulty: 'MEDIUM',
    question: 'Why is the chain rule important for backpropagation?',
    options: [
      'It randomly initializes weights',
      'It computes gradients through connected layers',
      'It removes the need for a forward pass',
      'It stores syllabus dates',
    ],
    correct: 1,
    explanation: 'Backpropagation depends on the chain rule to trace error backward through composite layer operations.',
    sourceLabel: 'Demo notes',
  },
  {
    cardIndexTrigger: 2,
    cardId: 'demo-gradient-descent',
    difficulty: 'MEDIUM',
    question: 'What does gradient descent do with gradients?',
    options: [
      'Uses them to update weights toward lower loss',
      'Uses them to delete the training data',
      'Uses them only during the first prediction',
      'Uses them to replace the syllabus',
    ],
    correct: 0,
    explanation: 'Gradient descent applies gradients as directions for small weight updates that reduce loss.',
    sourceLabel: 'Demo notes',
  },
];

function buildDemoGeneration({ prompt, jsonMode }) {
  if (!jsonMode) {
    return [
      'Demo study guide: Neural networks make predictions by passing information through layers.',
      'Backpropagation then traces prediction error backward with the chain rule so each weight can be adjusted.',
      'Review question: why does gradient descent need gradients before it can update weights?',
    ].join('\n\n');
  }

  const lowerPrompt = String(prompt || '').toLowerCase();
  const wantsQuestions = lowerPrompt.includes('question')
    || lowerPrompt.includes('quiz')
    || lowerPrompt.includes('active recall')
    || lowerPrompt.includes('options');

  return JSON.stringify(wantsQuestions ? demoQuestions : demoCards);
}

function sendStatus(_req, res) {
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    demoFallback: !process.env.GEMINI_API_KEY,
  });
}

router.get('/', sendStatus);
router.get('/status', sendStatus);

async function handleGenerate(req, res) {
  const { prompt, systemInstruction = '', jsonMode = false } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: buildDemoGeneration({ prompt, jsonMode: Boolean(jsonMode) }),
      fallback: true,
      mode: 'demo',
    });
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
}

router.post('/', requireAuth, requireUsageAllowance, handleGenerate);
router.post('/generate', requireAuth, requireUsageAllowance, handleGenerate);

module.exports = router;
