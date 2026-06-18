// Profile context builders (loaded before profile/views.js)

function buildClassContext(courseId = activeClassPortfolioId) {
  const course = classPortfolios.find(item => item.id === courseId);
  if (!course) return '';

  if (window.StudentUSilent?.buildFocusedClassContext) {
    return window.StudentUSilent.buildFocusedClassContext(course, {
      getMaterialContextText,
      materialLimit: 3,
      maxLength: 8000,
    });
  }

  const syllabus = course.materials.find(item => item.type === 'Syllabus');
  const professorSignals = course.materials
    .filter(item => item.type.includes('Professor'))
    .slice(0, 3)
    .map(item => `${item.title}: ${getMaterialContextText(item)}`)
    .join('\n');
  const recentMaterials = course.materials
    .slice(0, 5)
    .map(item => `${item.type} - ${item.title}: ${getMaterialContextText(item)}`)
    .join('\n');
  const chapters = course.chapters
    .map(item => `${item.title} (${item.status}, ${item.progress}% complete)`)
    .join('; ');

  return [
    `Class: ${course.title} (${course.code})`,
    `Professor: ${course.professor}`,
    `Current chapter: ${course.currentChapter}`,
    `Exam date: ${course.examDate}`,
    `Syllabus status: ${course.syllabusStatus}`,
    `Syllabus summary: ${syllabus ? getMaterialContextText(syllabus) : 'No syllabus uploaded yet.'}`,
    `Chapter progress: ${chapters}`,
    `Weak topics: ${course.weakTopics.join(', ') || 'None recorded yet'}`,
    course.classMemory?.syllabus?.examDates?.length ? `Important dates:\n${course.classMemory.syllabus.examDates.join('\n')}` : '',
    course.classMemory?.syllabus?.gradingWeights?.length ? `Grade focus:\n${course.classMemory.syllabus.gradingWeights.join('\n')}` : '',
    course.classMemory?.concepts?.length ? `Mapped concepts:\n${course.classMemory.concepts.join('\n')}` : '',
    professorSignals ? `Professor signals:\n${professorSignals}` : '',
    recentMaterials ? `Recent class materials:\n${recentMaterials}` : '',
  ].filter(Boolean).join('\n');
}

function getCourseContextForPrompt(courseId) {
  return buildClassContext(courseId);
}
