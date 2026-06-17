export const demoMaterials = {
  neuro: 'Neural networks are computational systems inspired by biological neural networks. Backpropagation is an algorithm for training neural networks by computing gradients using the chain rule of calculus. The forward pass computes predictions, while the backward pass propagates errors and updates weights through gradient descent.',
  calc: 'Multivariable calculus extends single-variable calculus to functions of multiple variables. Partial derivatives measure the rate of change with respect to one variable while holding others constant. The gradient vector points in the direction of steepest ascent, and its magnitude indicates the rate of increase.',
  hist: 'The Renaissance was a cultural and intellectual movement in Europe from the 14th to 17th centuries. Key artists include Leonardo da Vinci, Michelangelo, and Raphael. The period was characterized by humanism, a renewed interest in classical antiquity, and revolutionary developments in art, science, and literature.',
  macro: 'Macroeconomics studies economy-wide phenomena including inflation, unemployment, and economic growth. Fiscal policy refers to government spending and taxation decisions. Expansionary fiscal policy increases government spending or cuts taxes to stimulate economic activity during recessions.',
};

export const demoClassPortfolios = [
  {
    id: 'neuro',
    title: 'Neural Networks & Backpropagation',
    code: 'CS 489',
    professor: 'Dr. Chen',
    term: 'Spring',
    examDate: '2026-06-20',
    currentChapter: 'Chapter 5: Backpropagation',
    syllabusStatus: 'Uploaded',
    retention: 78,
    materials: [
      { id: 'neuro-syllabus', type: 'Syllabus', title: 'CS 489 Syllabus', source: 'Uploaded syllabus', notes: demoMaterials.neuro },
    ],
    chapters: [
      { title: 'Neural network basics', status: 'Mastered', progress: 92 },
      { title: 'Gradient descent', status: 'Learning', progress: 74 },
      { title: 'Backpropagation chain rule', status: 'Needs Practice', progress: 48 },
    ],
    weakTopics: ['Backpropagation chain rule'],
    sessions: 12,
  },
  {
    id: 'calc',
    title: 'Calculus III - Multivariable',
    code: 'MATH 321',
    professor: 'Prof. Rodriguez',
    term: 'Spring',
    examDate: '2026-06-28',
    currentChapter: 'Chapter 3: Gradients and Optimization',
    syllabusStatus: 'Uploaded',
    retention: 65,
    materials: [
      { id: 'calc-notes', type: 'Lecture Notes', title: 'Gradient Vectors', source: 'Lecture notes', notes: demoMaterials.calc },
    ],
    chapters: [
      { title: 'Partial derivatives', status: 'Mastered', progress: 85 },
      { title: 'Gradient vectors', status: 'Learning', progress: 62 },
      { title: 'Constrained optimization', status: 'Needs Practice', progress: 39 },
    ],
    weakTopics: ['Constrained optimization'],
    sessions: 8,
  },
  {
    id: 'hist',
    title: 'History of Art - Renaissance',
    code: 'ART 210',
    professor: 'Dr. Moreau',
    term: 'Spring',
    examDate: '2026-07-05',
    currentChapter: 'Unit 2: Perspective and Humanism',
    syllabusStatus: 'Needs Update',
    retention: 82,
    materials: [
      { id: 'hist-reading', type: 'Reading Notes', title: 'Renaissance Humanism', source: 'Reading notes', notes: demoMaterials.hist },
    ],
    chapters: [
      { title: 'Humanism', status: 'Mastered', progress: 90 },
      { title: 'Linear perspective', status: 'Learning', progress: 76 },
      { title: 'Patronage systems', status: 'Review Soon', progress: 68 },
    ],
    weakTopics: ['Patronage systems'],
    sessions: 15,
  },
  {
    id: 'macro',
    title: 'Macroeconomics - Fiscal Policy',
    code: 'ECON 202',
    professor: 'Prof. Kim',
    term: 'Spring',
    examDate: '2026-06-24',
    currentChapter: 'Chapter 9: Fiscal Multipliers',
    syllabusStatus: 'Uploaded',
    retention: 71,
    materials: [
      { id: 'macro-notes', type: 'Lecture Notes', title: 'Fiscal Policy Notes', source: 'Lecture notes', notes: demoMaterials.macro },
    ],
    chapters: [
      { title: 'Aggregate demand', status: 'Mastered', progress: 83 },
      { title: 'Fiscal multipliers', status: 'Learning', progress: 66 },
      { title: 'Deficit spending inflation risk', status: 'Needs Practice', progress: 52 },
    ],
    weakTopics: ['Fiscal multipliers'],
    sessions: 10,
  },
];

export const courseCardDecks = {
  neuro: [
    { id: 'n1', title: 'What is a Neural Network?', difficulty: 'Beginner', feynman: 'A neural network is like a team of workers, each passing information forward.', analogy: 'Like an assembly line.', mistake: 'Thinking neurons think like humans.', whyItMatters: 'Foundation of modern AI.' },
    { id: 'n3', title: 'Backpropagation Algorithm', difficulty: 'Intermediate', feynman: 'Backpropagation computes gradients using the chain rule.', analogy: 'Reviewing a bad assembly line backward.', mistake: 'Confusing backprop with gradient descent.', whyItMatters: 'Enables deep network training.' },
  ],
  calc: [
    { id: 'c1', title: 'Partial Derivatives', difficulty: 'Beginner', feynman: 'Partial derivatives measure change in one direction.', analogy: 'Measuring hill steepness north-south only.', mistake: 'Treating partials like total derivatives.', whyItMatters: 'Foundation for ML optimization.' },
    { id: 'c2', title: 'The Gradient Vector', difficulty: 'Intermediate', feynman: 'The gradient points in the direction of steepest ascent.', analogy: 'A compass pointing uphill.', mistake: 'Thinking the gradient is just numbers.', whyItMatters: 'Core tool for gradient descent.' },
  ],
  hist: [
    { id: 'h1', title: 'The Renaissance Spirit', difficulty: 'Beginner', feynman: 'A rebirth of classical knowledge with humanism at the center.', analogy: 'Rediscovering an old photo album.', mistake: 'Assuming it happened everywhere at once.', whyItMatters: 'Groundwork for the Scientific Revolution.' },
  ],
  macro: [
    { id: 'm1', title: 'What is Fiscal Policy?', difficulty: 'Beginner', feynman: 'Government uses spending and taxation to influence the economy.', analogy: 'A doctor adjusting medicine doses.', mistake: 'Confusing fiscal with monetary policy.', whyItMatters: 'Main recession-fighting tool.' },
    { id: 'm2', title: 'The Multiplier Effect', difficulty: 'Intermediate', feynman: 'Government spending ripples through the economy.', analogy: 'Pebbles creating pond ripples.', mistake: 'Assuming multiplier is always above 1.', whyItMatters: 'Determines stimulus effectiveness.' },
  ],
};

export const courseRecallQuestions = {
  neuro: [{ cardIndexTrigger: 1, difficulty: 'MEDIUM', question: 'What enables backpropagation through layers?', options: ['Product rule', 'Chain rule', 'Power rule', 'Quotient rule'], correct: 1, explanation: 'The chain rule propagates gradients through composite layers.' }],
  calc: [{ cardIndexTrigger: 1, difficulty: 'MEDIUM', question: 'Where does the gradient point?', options: ['Steepest descent', 'Steepest ascent', 'Origin', 'Minimum'], correct: 1, explanation: 'The gradient points toward steepest increase.' }],
  hist: [{ cardIndexTrigger: 0, difficulty: 'EASY', question: 'Where did the Renaissance begin?', options: ['France', 'Germany', 'Italian city-states', 'England'], correct: 2, explanation: 'It began in Italian city-states in the 14th century.' }],
  macro: [{ cardIndexTrigger: 1, difficulty: 'MEDIUM', question: 'Fiscal vs monetary policy?', options: ['Same thing', 'Fiscal uses budget; monetary uses rates', 'Fiscal is faster', 'Monetary controls taxes'], correct: 1, explanation: 'Fiscal is spending/taxes; monetary is central bank rates.' }],
};
