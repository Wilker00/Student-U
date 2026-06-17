/**
 * MiniSearch-backed material retrieval for class context building.
 */

let MiniSearchLib = null;

function loadMiniSearch() {
  if (MiniSearchLib !== null) return MiniSearchLib;
  try {
    MiniSearchLib = require('minisearch');
  } catch (_error) {
    MiniSearchLib = false;
  }
  return MiniSearchLib;
}

function getMaterialDocumentBody(material = {}) {
  return [material.title, material.type, material.notes, material.extractedText, material.source]
    .filter(Boolean)
    .join('\n')
    .slice(0, 8000);
}

function buildMaterialSearchIndex(materials = []) {
  const MiniSearch = loadMiniSearch();
  if (!MiniSearch || !materials.length) return null;

  const docs = materials.map((item, index) => ({
    id: item.id || `material_${index}`,
    title: item.title || '',
    type: item.type || '',
    body: getMaterialDocumentBody(item),
  }));

  const index = new MiniSearch({
    fields: ['title', 'type', 'body'],
    storeFields: ['id', 'title', 'type'],
    searchOptions: {
      boost: { title: 3, type: 1.5, body: 1 },
      fuzzy: 0.15,
      prefix: true,
    },
  });

  index.addAll(docs);
  return { index, docs };
}

function buildSearchQuery(course = {}) {
  return [
    course.currentChapter,
    ...(course.weakTopics || []),
    ...(course.chapters || []).filter(ch => Number(ch.progress) < 60).map(ch => ch.title),
  ].filter(Boolean).join(' ');
}

function searchMaterials(materials = [], query = '', limit = 3) {
  const built = buildMaterialSearchIndex(materials);
  if (!built || !query.trim()) return [];

  const results = built.index.search(query, { limit: Math.max(limit, limit * 2) });
  const byId = new Map(materials.map(item => [item.id, item]));
  return results
    .map(result => byId.get(result.id))
    .filter(Boolean)
    .slice(0, limit);
}

function rankMaterialsForCourse(materials = [], course = {}, limit = 3, scoreMaterialRelevance) {
  const query = buildSearchQuery(course);
  const searchHits = searchMaterials(materials, query, limit);
  const searchIds = new Set(searchHits.map(item => item.id));

  const scored = materials.map((item) => {
    const heuristic = typeof scoreMaterialRelevance === 'function' ? scoreMaterialRelevance(item, course) : 0;
    const searchBoost = searchIds.has(item.id) ? 0.35 : 0;
    return { item, score: heuristic + searchBoost };
  });

  const merged = [...searchHits];
  scored
    .sort((a, b) => b.score - a.score)
    .forEach(({ item }) => {
      if (!merged.some(existing => existing.id === item.id)) merged.push(item);
    });

  return merged.slice(0, limit);
}

module.exports = {
  buildMaterialSearchIndex,
  buildSearchQuery,
  searchMaterials,
  rankMaterialsForCourse,
  getMaterialDocumentBody,
};
