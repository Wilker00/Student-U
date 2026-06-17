const router = require('express').Router();
const { generateContent } = require('../services/gemini.service');
const { readDb, updateDb } = require('../services/database.service');
const { getFirestore } = require('../services/firebase.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');
const { validateBody } = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireUsageAllowance);

const VISUAL_IDS = ['recall', 'flow', 'map', 'timeline', 'radial', 'ripple', 'compare'];
const SUGGESTED_ACTIONS = ['none', 'start_quiz', 'open_planner', 'mark_weak', 'open_workspace'];
const TASK_TYPES = ['explain', 'quiz', 'plan', 'review', 'summarize', 'freeform'];

function buildSystemInstruction(taskType = 'freeform', studyPreferences = null) {
  const taskHints = {
    explain: 'Focus on plain-language explanation with one concrete example and one recall question.',
    quiz: 'Emphasize testable ideas and set suggestedAction to start_quiz when practice is appropriate.',
    plan: 'Produce a realistic weekly plan in planItems (3-7 entries with day, topic, minutes). Set suggestedAction to open_planner.',
    review: 'Prioritize reviewItems ordered by urgency using weak topics and any review hints in context. Set suggestedAction to mark_weak when a weak topic should be tracked.',
    summarize: 'Condense to the most testable ideas in breakdown. Set suggestedAction to open_workspace when notes should go to Study Desk.',
    freeform: 'Answer the student directly using all provided context.',
  };

  const preferenceLines = [];
  if (studyPreferences?.explanationInstruction) {
    preferenceLines.push(`Explanation style: ${studyPreferences.explanationInstruction}`);
  }
  if (studyPreferences?.difficultyInstruction) {
    preferenceLines.push(`Difficulty preference: ${studyPreferences.difficultyInstruction}`);
  }
  if (studyPreferences?.chatStyleHint) {
    preferenceLines.push(`Response format: ${studyPreferences.chatStyleHint}`);
  }

  return [
    'You are StudentU, a warm and concise AI study coach.',
    'Help students understand class material, plan reviews, and practice active recall.',
    'Do not complete graded assignments for the student. Teach, ask guiding questions, and suggest next steps.',
    taskHints[taskType] || taskHints.freeform,
    ...preferenceLines,
    'Return ONLY valid JSON (no markdown fences) matching this schema:',
    '{',
    '  "title": "string — short topic title",',
    '  "summary": "string — 2-3 sentences",',
    '  "breakdown": ["string — 2-5 key points"],',
    '  "example": "string — concrete example",',
    '  "memoryHook": "string — one-line mnemonic or anchor",',
    '  "recallQuestion": "string — one active recall question",',
    `  "visualId": one of ${VISUAL_IDS.join('|')},`,
    `  "suggestedAction": one of ${SUGGESTED_ACTIONS.join('|')},`,
    '  "weakTopicLabel": "string or empty — topic to track when suggestedAction is mark_weak",',
    '  "planItems": [{"day":"Mon|Tue|...","topic":"string","minutes":number}] — optional, for plan tasks',
    '  "reviewItems": [{"title":"string","reason":"string","daysUntil":number}] — optional, for review tasks',
    '}',
  ].join('\n');
}

function normalizeMessages(messages = []) {
  return messages
    .filter(item => item && typeof item.content === 'string')
    .slice(-12)
    .map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.slice(0, 4000),
    }));
}

function buildPrompt({ message, messages, classContext, taskType, extraContext }) {
  const history = normalizeMessages(messages)
    .map(item => `${item.role === 'assistant' ? 'StudentU' : 'Student'}: ${item.content}`)
    .join('\n');
  return [
    classContext ? `Class packet:\n${String(classContext).slice(0, 8000)}` : '',
    extraContext ? `Task context (${taskType}):\n${String(extraContext).slice(0, 6000)}` : '',
    history ? `Conversation so far:\n${history}` : '',
    `Student task (${taskType}): ${message}`,
    'Respond with JSON only.',
  ].filter(Boolean).join('\n\n');
}

function parseStructuredReply(rawText = '') {
  let cleaned = String(rawText).trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    return normalizeStructured(parsed);
  } catch (_error) {
    return normalizeStructured({
      title: 'Study explanation',
      summary: cleaned.slice(0, 500) || 'No response generated.',
      breakdown: cleaned.split(/\n+/).filter(Boolean).slice(0, 4),
      example: 'Review the summary above with your class notes open.',
      memoryHook: 'Anchor the idea to one image, one example, and one recall question.',
      recallQuestion: 'Can you explain this in your own words without looking?',
      visualId: 'recall',
      suggestedAction: 'none',
      weakTopicLabel: '',
      planItems: [],
      reviewItems: [],
    });
  }
}

function normalizeStructured(payload = {}) {
  const visualId = VISUAL_IDS.includes(payload.visualId) ? payload.visualId : 'recall';
  const suggestedAction = SUGGESTED_ACTIONS.includes(payload.suggestedAction)
    ? payload.suggestedAction
    : 'none';

  return {
    title: String(payload.title || 'Study explanation').slice(0, 200),
    summary: String(payload.summary || '').slice(0, 2000),
    breakdown: Array.isArray(payload.breakdown)
      ? payload.breakdown.map(item => String(item).slice(0, 500)).slice(0, 6)
      : [],
    example: String(payload.example || '').slice(0, 1500),
    memoryHook: String(payload.memoryHook || '').slice(0, 500),
    recallQuestion: String(payload.recallQuestion || '').slice(0, 500),
    visualId,
    suggestedAction,
    weakTopicLabel: String(payload.weakTopicLabel || '').slice(0, 120),
    planItems: Array.isArray(payload.planItems)
      ? payload.planItems.slice(0, 7).map(item => ({
        day: String(item.day || 'Today').slice(0, 12),
        topic: String(item.topic || '').slice(0, 200),
        minutes: Number(item.minutes) || 25,
      }))
      : [],
    reviewItems: Array.isArray(payload.reviewItems)
      ? payload.reviewItems.slice(0, 8).map(item => ({
        title: String(item.title || '').slice(0, 200),
        reason: String(item.reason || '').slice(0, 300),
        daysUntil: Number(item.daysUntil) || 0,
      }))
      : [],
  };
}

function validateChatPost(body) {
  if (!body || typeof body !== 'object') return { error: 'Request body must be an object.' };
  if (!body.message || typeof body.message !== 'string') return { error: 'Message is required.' };
  if (body.taskType && !TASK_TYPES.includes(body.taskType)) {
    return { error: `taskType must be one of: ${TASK_TYPES.join(', ')}.` };
  }
  return { value: body };
}

async function saveChatTurn(userId, turn) {
  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(userId).collection('chat').doc(turn.id).set(turn, { merge: true });
    return;
  }

  updateDb((db) => {
    db.chat = db.chat || {};
    db.chat[userId] = [turn, ...(db.chat[userId] || [])].slice(0, 100);
    return turn;
  });
}

router.get('/', async (req, res) => {
  try {
    const firestore = getFirestore();
    if (firestore) {
      const snapshot = await firestore
        .collection('users')
        .doc(req.user.id)
        .collection('chat')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return res.json({ messages: snapshot.docs.map(doc => doc.data()).reverse() });
    }

    const db = readDb();
    return res.json({ messages: (db.chat?.[req.user.id] || []).slice().reverse() });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load chat history.' });
  }
});

router.post('/', validateBody(validateChatPost), async (req, res) => {
  const { message, messages = [], classContext = '', taskType = 'freeform', extraContext = '', studyPreferences = null } = req.validatedBody;
  const safeTask = TASK_TYPES.includes(taskType) ? taskType : 'freeform';

  try {
    const rawReply = await generateContent({
      prompt: buildPrompt({ message, messages, classContext, taskType: safeTask, extraContext }),
      systemInstruction: buildSystemInstruction(safeTask, studyPreferences),
      jsonMode: true,
    });

    const structured = parseStructuredReply(rawReply);
    const reply = structured.summary || rawReply;

    const turn = {
      id: `chat_${Date.now()}`,
      userMessage: message.slice(0, 4000),
      assistantMessage: reply,
      structured,
      taskType: safeTask,
      createdAt: new Date().toISOString(),
    };
    await saveChatTurn(req.user.id, turn);

    return res.status(201).json({ reply, structured, turn });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.publicMessage || 'Could not send message.',
      code: status === 503 ? 'ai_not_configured' : 'ai_generation_failed',
    });
  }
});

module.exports = router;
