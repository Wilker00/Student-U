const router = require('express').Router();
const { getCourseMaterials, uploadCourseMaterial } = require('../services/storage.service');
const { readDb } = require('../services/database.service');

router.get('/', (_req, res) => {
  const { courses } = readDb();
  res.json({ courses });
});

router.get('/:courseId/materials', (req, res) => {
  res.json({ materials: getCourseMaterials(req.params.courseId) });
});

router.post('/:courseId/materials', async (req, res) => {
  try {
    const material = await uploadCourseMaterial(req.params.courseId, req.body || {});
    res.status(201).json({ material });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: 'Could not save course material.' });
  }
});

module.exports = router;
