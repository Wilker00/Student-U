const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'studentu.db.json');

const seed = {
  courses: [
    {
      id: 'neuro',
      title: 'Neural Networks & Backpropagation',
      code: 'CS 489',
      professor: 'Dr. Chen',
      currentChapter: 'Chapter 5: Backpropagation',
      syllabusStatus: 'Uploaded',
    },
    {
      id: 'calc',
      title: 'Calculus III - Multivariable',
      code: 'MATH 321',
      professor: 'Prof. Rodriguez',
      currentChapter: 'Chapter 3: Gradients and Optimization',
      syllabusStatus: 'Uploaded',
    },
    {
      id: 'hist',
      title: 'History of Art - Renaissance',
      code: 'ART 210',
      professor: 'Dr. Moreau',
      currentChapter: 'Unit 2: Perspective and Humanism',
      syllabusStatus: 'Needs Update',
    },
    {
      id: 'macro',
      title: 'Macroeconomics - Fiscal Policy',
      code: 'ECON 202',
      professor: 'Prof. Kim',
      currentChapter: 'Chapter 9: Fiscal Multipliers',
      syllabusStatus: 'Uploaded',
    },
  ],
  materials: {},
  signups: [],
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2));
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  return data;
}

function updateDb(mutator) {
  const data = readDb();
  const result = mutator(data);
  writeDb(data);
  return result;
}

module.exports = { readDb, updateDb };
