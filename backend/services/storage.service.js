const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { readDb, updateDb } = require('./database.service');
const { getFirestore } = require('./firebase.service');
const {
  cleanNoteText,
  buildGlossaryFromText,
  prepareMaterialFields,
  computeOcrConfidence,
} = require('./silent-algorithms.service');
const { extractTextFromImageBuffer, resolveImageProcessingStatus } = require('./image-extraction.service');
const { extractDocxText } = require('./document-extraction.service');

const uploadsRoot = path.join(__dirname, '..', 'data', 'uploads');
const maxUploadBytes = 5 * 1024 * 1024;
const allowedExtensions = new Set(['.txt', '.md', '.csv', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp']);

function makeStorageKey(userId, courseId) {
  return `${String(userId || 'demo_student').replace(/[^a-zA-Z0-9_-]/g, '_')}:${String(courseId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function ensureUploadDir(userId, courseId) {
  const safeUserId = String(userId || 'demo_student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(uploadsRoot, safeUserId, safeCourseId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeFileName(name = 'material.txt') {
  const parsed = path.parse(name);
  const base = (parsed.name || 'material').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const ext = (parsed.ext || '.txt').replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
  return `${base}${ext}`;
}

function validateUpload(fileName, fileType, buffer) {
  const ext = path.extname(fileName).toLowerCase();
  const type = String(fileType || '').toLowerCase();
  const isAllowed = allowedExtensions.has(ext) || type.startsWith('text/') || type.startsWith('image/');

  if (!isAllowed) {
    const error = new Error('Unsupported file type.');
    error.statusCode = 415;
    throw error;
  }

  const looksExecutable = buffer.subarray(0, 2).toString('hex') === '4d5a';
  if (looksExecutable) {
    const error = new Error('Executable files are not allowed.');
    error.statusCode = 415;
    throw error;
  }
}

function decodeFilePayload(fileData = '') {
  if (!fileData) return null;
  const dataUrlMatch = String(fileData).match(/^data:([^;]+);base64,(.+)$/);
  const base64 = dataUrlMatch ? dataUrlMatch[2] : fileData;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;
  if (buffer.length > maxUploadBytes) {
    const error = new Error('File is too large.');
    error.statusCode = 413;
    throw error;
  }
  return buffer;
}

function extractTextPreview(buffer, fileName, fileType) {
  const lowerName = String(fileName || '').toLowerCase();
  const type = String(fileType || '').toLowerCase();
  const isPlainText = type.startsWith('text/') || /\.(txt|md|csv)$/i.test(lowerName);
  if (!buffer) return '';
  if (isPlainText) return cleanNoteText(buffer.toString('utf8').replace(/\0/g, '')).slice(0, 12000);
  if (lowerName.endsWith('.pdf') || type === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      // pdf-parse sync usage via buffer — wrapped in try for optional install
      return extractPdfTextSync(buffer, pdfParse).slice(0, 12000);
    } catch (_error) {
      const raw = buffer.toString('latin1');
      const chunks = [...raw.matchAll(/\(([^()]{8,260})\)\s*Tj/g)]
        .map(match => match[1].replace(/\\([()\\])/g, '$1').trim())
        .filter(Boolean);
      return chunks.join('\n').slice(0, 12000);
    }
  }
  if (/\.docx$/i.test(lowerName) || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractOfficeText(buffer).slice(0, 12000);
  }
  if (/\.pptx$/i.test(lowerName)) {
    return extractOfficeText(buffer).slice(0, 12000);
  }
  return '';
}

async function extractPdfText(buffer, pdfParse) {
  const result = await pdfParse(buffer);
  return String(result.text || '').replace(/\s+/g, ' ').trim();
}

function extractPdfTextSync(buffer, pdfParse) {
  // pdf-parse is async-only; callers use extractTextPreviewAsync for PDFs when available
  const raw = buffer.toString('latin1');
  const chunks = [...raw.matchAll(/\(([^()]{8,260})\)\s*Tj/g)]
    .map(match => match[1].replace(/\\([()\\])/g, '$1').trim())
    .filter(Boolean);
  return chunks.join('\n');
}

async function extractTextPreviewAsync(buffer, fileName, fileType) {
  const lowerName = String(fileName || '').toLowerCase();
  const type = String(fileType || '').toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName)) {
    const imageResult = await extractTextFromImageBuffer(buffer, type || 'image/jpeg', { hint: fileName });
    return imageResult.text || '';
  }
  if (lowerName.endsWith('.pdf') || type === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const text = await extractPdfText(buffer, pdfParse);
      if (text) return text.slice(0, 12000);
    } catch (_error) {
      // fall through to regex stub
    }
  }
  if (/\.docx$/i.test(lowerName) || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const docxText = await extractDocxText(buffer);
    if (docxText) return docxText;
  }
  return extractTextPreview(buffer, fileName, fileType);
}

function getProcessingStatus(fileName, fileType, extractedText, ocrConfidence) {
  const lowerName = String(fileName || '').toLowerCase();
  const type = String(fileType || '').toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName)) {
    return resolveImageProcessingStatus(extractedText, ocrConfidence ?? computeOcrConfidence(extractedText));
  }
  if (extractedText && extractedText.length > 40) return 'ready';
  if (lowerName.endsWith('.pdf') || /\.(docx?|pptx?)$/i.test(lowerName)) {
    return extractedText ? 'ready' : 'processing';
  }
  return extractedText ? 'ready' : 'saved';
}

function readZipEntries(buffer, matcher) {
  const entries = [];
  let offset = 0;

  while (offset < buffer.length - 46) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8');
    offset = nameStart + fileNameLength + extraLength + commentLength;

    if (!matcher(name) || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    try {
      if (compression === 0) entries.push(compressed.toString('utf8'));
      if (compression === 8) entries.push(zlib.inflateRawSync(compressed).toString('utf8'));
    } catch (error) {
      // Some office files use ZIP features this lightweight extractor skips.
    }
  }

  return entries;
}

function extractOfficeText(buffer) {
  const xmlParts = readZipEntries(buffer, name =>
    /word\/document\.xml$|ppt\/slides\/slide\d+\.xml$/i.test(name)
  );
  return xmlParts
    .map(xml => xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)
    .join('\n');
}

function parseSyllabusText(text = '') {
  const cleaned = cleanNoteText(text, { maxLength: 20000 });
  const lines = cleaned
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const fullText = lines.join('\n');
  const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi;
  const examDates = [];
  const chapters = [];
  const gradingWeights = [];
  const professorHints = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if ((lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) && datePattern.test(line)) {
      examDates.push(line);
    }
    datePattern.lastIndex = 0;
    if (/chapter|unit|week\s+\d+|module/i.test(line) && chapters.length < 12) {
      chapters.push(line.replace(/^[-*\d.\s]+/, ''));
    }
    if (/%/.test(line) && /(grade|grading|points|participation|exam|quiz|assignment|project)/i.test(line)) {
      gradingWeights.push(line);
    }
    if (/(office hours|policy|late|attendance|required|recommended|focus|emphas)/i.test(line) && professorHints.length < 10) {
      professorHints.push(line);
    }
  });

  return {
    examDates: [...new Set(examDates)].slice(0, 8),
    chapters: [...new Set(chapters)].slice(0, 12),
    gradingWeights: [...new Set(gradingWeights)].slice(0, 8),
    professorHints: [...new Set(professorHints)].slice(0, 10),
    summary: fullText.slice(0, 1200),
  };
}

function buildClassMemory(materials = []) {
  const syllabus = materials.find(item => item.type === 'Syllabus');
  const syllabusInsights = syllabus?.syllabusInsights || parseSyllabusText([syllabus?.notes, syllabus?.extractedText].filter(Boolean).join('\n'));
  const conceptCandidates = [];
  const professorSignals = [];

  materials.forEach((item) => {
    const text = [item.title, item.notes, item.extractedText].filter(Boolean).join('\n');
    text.split(/[.\n;]/).forEach((piece) => {
      const clean = piece.trim().replace(/^[-*\d.\s]+/, '');
      if (clean.length >= 18 && clean.length <= 110 && conceptCandidates.length < 20) conceptCandidates.push(clean);
    });
    if (String(item.type).includes('Professor')) professorSignals.push(item.notes || item.title);
  });

  return {
    syllabus: syllabusInsights,
    concepts: [...new Set([...syllabusInsights.chapters, ...conceptCandidates])].slice(0, 16),
    professorSignals: [...new Set(professorSignals.filter(Boolean))].slice(0, 6),
    glossary: buildGlossaryFromText([syllabus?.notes, syllabus?.extractedText].filter(Boolean).join('\n')),
    materialCount: materials.length,
    updatedAt: new Date().toISOString(),
  };
}

function materialCollection(db, userId, courseId) {
  return db.collection('users').doc(userId).collection('courses').doc(courseId).collection('materials');
}

function classMemoryDoc(db, userId, courseId) {
  return db.collection('users').doc(userId).collection('courses').doc(courseId).collection('system').doc('classMemory');
}

async function getCourseMaterials(userId, courseId) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await materialCollection(firestore, userId, courseId)
      .orderBy('addedAt', 'desc')
      .limit(100)
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  const db = readDb();
  return db.materials[makeStorageKey(userId, courseId)] || [];
}

async function deleteCourseMaterials(userId, courseId) {
  if (!courseId) {
    const error = new Error('Course id is required.');
    error.statusCode = 400;
    throw error;
  }

  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await materialCollection(firestore, userId, courseId).limit(250).get();
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(classMemoryDoc(firestore, userId, courseId));
    await batch.commit();
  } else {
    updateDb((db) => {
      db.materials[makeStorageKey(userId, courseId)] = [];
      if (db.classMemory) delete db.classMemory[makeStorageKey(userId, courseId)];
      return true;
    });
  }

  const safeUserId = String(userId || 'demo_student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadDir = path.join(uploadsRoot, safeUserId, safeCourseId);
  if (fs.existsSync(uploadDir)) fs.rmSync(uploadDir, { recursive: true, force: true });

  return { deleted: true };
}

async function uploadCourseMaterial(userId, courseId, material) {
  if (!courseId) {
    const error = new Error('Course id is required.');
    error.statusCode = 400;
    throw error;
  }

  const materialId = material.id || `material_${Date.now()}`;
  let fileRecord = {};
  if (material.fileData) {
    const buffer = decodeFilePayload(material.fileData);
    if (buffer) {
      const fileName = sanitizeFileName(material.fileName || material.source || `${materialId}.txt`);
      validateUpload(fileName, material.fileType, buffer);
      const uploadDir = ensureUploadDir(userId, courseId);
      const storedName = `${materialId}_${fileName}`;
      const storedPath = path.join(uploadDir, storedName);
      fs.writeFileSync(storedPath, buffer);

      const isImage = String(material.fileType || '').startsWith('image/')
        || /\.(png|jpe?g|webp)$/i.test(fileName);
      let extractedText = '';
      let ocrConfidence = null;
      let extractionMethod = null;

      if (isImage) {
        const imageResult = await extractTextFromImageBuffer(buffer, material.fileType || 'image/jpeg', {
          hint: material.title || fileName,
        });
        extractedText = imageResult.text;
        ocrConfidence = imageResult.confidence;
        extractionMethod = imageResult.method;
        fileRecord = {
          fileName,
          fileSize: buffer.length,
          extractedText,
          ocrConfidence,
          extractionMethod,
          processingStatus: imageResult.processingStatus,
        };
      } else {
        extractedText = await extractTextPreviewAsync(buffer, fileName, material.fileType);
        fileRecord = {
          fileName,
          fileSize: buffer.length,
          extractedText,
          processingStatus: getProcessingStatus(fileName, material.fileType, extractedText),
        };
      }
    }
  }

  const savedMaterial = {
    id: materialId,
    courseId,
    type: material.type || 'Lecture Notes',
    title: material.title || 'Untitled material',
    source: material.source || material.fileName || 'Manual note',
    fileType: material.fileType || 'text',
    fileSize: material.fileSize || fileRecord.fileSize || 0,
    notes: material.notes || '',
    addedAt: material.addedAt || new Date().toISOString(),
    ...fileRecord,
  };

  const existingMaterials = await getCourseMaterials(userId, courseId);
  const prepared = prepareMaterialFields(savedMaterial, existingMaterials);
  savedMaterial.notes = prepared.notes;
  savedMaterial.extractedText = prepared.extractedText || savedMaterial.extractedText || '';
  savedMaterial.type = prepared.type;
  if (prepared.duplicate) {
    const error = new Error('This material looks like a duplicate of something you already saved.');
    error.statusCode = 409;
    throw error;
  }
  if (savedMaterial.extractedText) {
    const confidence = savedMaterial.ocrConfidence ?? prepared.ocrConfidence ?? computeOcrConfidence(savedMaterial.extractedText);
    savedMaterial.ocrConfidence = confidence;
    if (String(savedMaterial.fileType || '').startsWith('image/') || savedMaterial.extractionMethod) {
      savedMaterial.processingStatus = resolveImageProcessingStatus(savedMaterial.extractedText, confidence);
    } else if (confidence < 0.35) {
      savedMaterial.processingStatus = 'needs_review';
    }
  }
  if (material.lectureSetId) savedMaterial.lectureSetId = material.lectureSetId;
  if (Number.isFinite(material.pageIndex)) savedMaterial.pageIndex = material.pageIndex;

  if (savedMaterial.type === 'Syllabus') {
    savedMaterial.syllabusInsights = parseSyllabusText([savedMaterial.notes, savedMaterial.extractedText].filter(Boolean).join('\n'));
  }

  let classMemory = null;

  const firestore = getFirestore();
  if (firestore) {
    const materialsRef = materialCollection(firestore, userId, courseId);
    await materialsRef.doc(savedMaterial.id).set(savedMaterial, { merge: true });
    const snapshot = await materialsRef.orderBy('addedAt', 'desc').limit(100).get();
    classMemory = buildClassMemory(snapshot.docs.map(doc => doc.data()));
    await classMemoryDoc(firestore, userId, courseId).set(classMemory, { merge: true });
  } else {
    updateDb((db) => {
      const key = makeStorageKey(userId, courseId);
      const existing = db.materials[key] || [];
      db.materials[key] = [savedMaterial, ...existing];
      db.classMemory = db.classMemory || {};
      classMemory = buildClassMemory(db.materials[key]);
      db.classMemory[key] = classMemory;
      return savedMaterial;
    });
  }

  return { material: savedMaterial, classMemory };
}

async function updateCourseMaterial(userId, courseId, materialId, updates = {}) {
  if (!courseId || !materialId) {
    const error = new Error('Course id and material id are required.');
    error.statusCode = 400;
    throw error;
  }

  const materials = await getCourseMaterials(userId, courseId);
  const existing = materials.find(item => item.id === materialId);
  if (!existing) {
    const error = new Error('Material not found.');
    error.statusCode = 404;
    throw error;
  }

  const extractedText = cleanNoteText(updates.extractedText ?? existing.extractedText ?? '', { maxLength: 12000 });
  const notes = cleanNoteText(updates.notes ?? existing.notes ?? '', { maxLength: 12000 });
  const confidence = computeOcrConfidence(extractedText || notes);
  const updated = {
    ...existing,
    notes: notes || extractedText.slice(0, 500) || existing.notes,
    extractedText,
    ocrConfidence: confidence,
    processingStatus: resolveImageProcessingStatus(extractedText || notes, confidence),
    reviewedAt: new Date().toISOString(),
  };

  const firestore = getFirestore();
  if (firestore) {
    await materialCollection(firestore, userId, courseId).doc(materialId).set(updated, { merge: true });
    const snapshot = await materialCollection(firestore, userId, courseId).orderBy('addedAt', 'desc').limit(100).get();
    const classMemory = buildClassMemory(snapshot.docs.map(doc => doc.data()));
    await classMemoryDoc(firestore, userId, courseId).set(classMemory, { merge: true });
    return { material: updated, classMemory };
  }

  let classMemory = null;
  updateDb((db) => {
    const key = makeStorageKey(userId, courseId);
    db.materials[key] = (db.materials[key] || []).map(item => (item.id === materialId ? updated : item));
    classMemory = buildClassMemory(db.materials[key]);
    db.classMemory[key] = classMemory;
    return updated;
  });

  return { material: updated, classMemory };
}

async function getClassMemory(userId, courseId) {
  const firestore = getFirestore();
  if (firestore) {
    const snapshot = await classMemoryDoc(firestore, userId, courseId).get();
    if (snapshot.exists) return snapshot.data();
    return buildClassMemory(await getCourseMaterials(userId, courseId));
  }

  const db = readDb();
  const key = makeStorageKey(userId, courseId);
  return db.classMemory?.[key] || buildClassMemory(db.materials[key] || []);
}

async function exportCourseData(userId, courseId) {
  const materials = await getCourseMaterials(userId, courseId);
  return {
    courseId,
    exportedAt: new Date().toISOString(),
    classMemory: await getClassMemory(userId, courseId),
    materials: materials.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      source: item.source,
      fileType: item.fileType,
      fileSize: item.fileSize,
      notes: item.notes,
      extractedText: item.extractedText,
      processingStatus: item.processingStatus,
      addedAt: item.addedAt,
      syllabusInsights: item.syllabusInsights,
    })),
  };
}

module.exports = {
  getCourseMaterials,
  uploadCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterials,
  getClassMemory,
  exportCourseData,
  parseSyllabusText,
  buildClassMemory,
};
