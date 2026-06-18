const router = require('express').Router();
const {
  getCourseMaterials,
  uploadCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterials,
  getClassMemory,
  exportCourseData,
} = require('../services/storage.service');
const { readDb, updateDb } = require('../services/database.service');
const { getFirestore } = require('../services/firebase.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireUsageAllowance } = require('../middleware/ratelimit.middleware');
const { validateBody, validateCourseCreate } = require('../middleware/validate.middleware');

router.use(requireAuth);
router.use(requireUsageAllowance);

router.get('/', async (req, res) => {
  try {
    const firestore = getFirestore();
    if (firestore) {
      const snapshot = await firestore.collection('users').doc(req.user.id).collection('courses').get();
      const savedCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (savedCourses.length) return res.json({ courses: savedCourses });
    }
    const { courses } = readDb();
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: 'Could not load courses.' });
  }
});

router.post('/', validateBody(validateCourseCreate), async (req, res) => {
  try {
    const course = {
      id: req.validatedBody?.id || `course_${Date.now()}`,
      title: req.validatedBody?.title || 'New Class',
      code: req.validatedBody?.code || '',
      professor: req.validatedBody?.professor || '',
      currentChapter: req.validatedBody?.currentChapter || '',
      syllabusStatus: req.validatedBody?.syllabusStatus || 'Syllabus Needed',
      updatedAt: new Date().toISOString(),
    };

    const firestore = getFirestore();
    if (firestore) {
      await firestore.collection('users').doc(req.user.id).collection('courses').doc(course.id).set(course, { merge: true });
      return res.status(201).json({ course });
    }

    updateDb((db) => {
      db.userCourses = db.userCourses || {};
      const existing = db.userCourses[req.user.id] || [];
      db.userCourses[req.user.id] = [course, ...existing.filter(item => item.id !== course.id)];
      return course;
    });
    res.status(201).json({ course });
  } catch (error) {
    res.status(500).json({ error: 'Could not save course.' });
  }
});

router.get('/:courseId/materials', async (req, res) => {
  try {
    res.json({ materials: await getCourseMaterials(req.user.id, req.params.courseId) });
  } catch (error) {
    res.status(500).json({ error: 'Could not load course materials.' });
  }
});

router.post('/:courseId/materials', async (req, res) => {
  try {
    const result = await uploadCourseMaterial(req.user.id, req.params.courseId, req.body || {});
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Could not save course material.' });
  }
});

router.patch('/:courseId/materials/:materialId', async (req, res) => {
  try {
    const { extractedText, notes } = req.body || {};
    const result = await updateCourseMaterial(req.user.id, req.params.courseId, req.params.materialId, {
      extractedText,
      notes,
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Could not update course material.' });
  }
});

router.delete('/:courseId/materials', async (req, res) => {
  try {
    res.json(await deleteCourseMaterials(req.user.id, req.params.courseId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: 'Could not remove course materials.' });
  }
});

router.get('/:courseId/memory', async (req, res) => {
  try {
    res.json({ classMemory: await getClassMemory(req.user.id, req.params.courseId) });
  } catch (error) {
    res.status(500).json({ error: 'Could not load class memory.' });
  }
});

router.get('/:courseId/export', async (req, res) => {
  try {
    res.json(await exportCourseData(req.user.id, req.params.courseId));
  } catch (error) {
    res.status(500).json({ error: 'Could not export course data.' });
  }
});

module.exports = router;
