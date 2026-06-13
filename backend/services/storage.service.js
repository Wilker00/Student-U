const { readDb, updateDb } = require('./database.service');

function getCourseMaterials(courseId) {
  const db = readDb();
  return db.materials[courseId] || [];
}

async function uploadCourseMaterial(courseId, material) {
  if (!courseId) {
    const error = new Error('Course id is required.');
    error.statusCode = 400;
    throw error;
  }

  const savedMaterial = {
    id: material.id || `material_${Date.now()}`,
    courseId,
    type: material.type || 'Lecture Notes',
    title: material.title || 'Untitled material',
    source: material.source || 'Manual note',
    fileType: material.fileType || 'text',
    notes: material.notes || '',
    addedAt: material.addedAt || new Date().toISOString(),
  };

  updateDb((db) => {
    const existing = db.materials[courseId] || [];
    db.materials[courseId] = [savedMaterial, ...existing];
    return savedMaterial;
  });

  return savedMaterial;
}

module.exports = { getCourseMaterials, uploadCourseMaterial };
