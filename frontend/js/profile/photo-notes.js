/**
 * Lecture photo workflow: review extracted text, batch upload, load into Study Desk.
 */
(function () {
  let reviewTarget = null;

  function getCombinedLecturePhotoText(course) {
    if (!course) return '';
    return window.StudentUSilent?.combineLecturePhotoText?.(course.materials || []) || '';
  }

  function formatMaterialStatusBadge(status) {
    const map = {
      ready: { label: 'Ready', className: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
      needs_review: { label: 'Review text', className: 'text-amber-700 bg-amber-50 border-amber-100' },
      saved_for_image_review: { label: 'Needs photo', className: 'text-rose-700 bg-rose-50 border-rose-100' },
      processing: { label: 'Processing', className: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' },
    };
    const entry = map[status] || { label: 'Saved', className: 'text-ink-100 bg-surface-100 border-surface-300' };
    return `<span class="text-[9px] font-mono ${entry.className} border rounded-md px-1.5 py-0.5">${entry.label}</span>`;
  }

  function renderMaterialStatusBadge(item) {
    return item.processingStatus ? formatMaterialStatusBadge(item.processingStatus) : '';
  }

  function openPhotoReviewModal(courseId, materialId) {
    const course = typeof classPortfolios !== 'undefined'
      ? classPortfolios.find(item => item.id === courseId)
      : null;
    const material = course?.materials?.find(item => item.id === materialId);
    if (!material) return;

    reviewTarget = { courseId, materialId };
    const modal = document.getElementById('photo-review-modal');
    const title = document.getElementById('photo-review-title');
    const textarea = document.getElementById('photo-review-text');
    if (!modal || !textarea) return;

    if (title) title.textContent = material.title || material.source || 'Lecture photo';
    textarea.value = material.extractedText || material.notes || '';
    modal.classList.remove('hidden');
    setTimeout(() => textarea.focus(), 50);
  }

  function closePhotoReviewModal() {
    reviewTarget = null;
    document.getElementById('photo-review-modal')?.classList.add('hidden');
  }

  async function savePhotoReview() {
    if (!reviewTarget) return;
    const textarea = document.getElementById('photo-review-text');
    const extractedText = window.StudentUSilent?.cleanNoteText?.(textarea?.value || '') ?? (textarea?.value || '').trim();
    if (!extractedText) {
      showNotification('Text Needed', 'Add or fix the extracted lecture text first.', 'error');
      return;
    }

    try {
      const response = await studentUFetch(
        `/api/courses/${encodeURIComponent(reviewTarget.courseId)}/materials/${encodeURIComponent(reviewTarget.materialId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedText, notes: extractedText.slice(0, 500) }),
        },
      );
      if (!response.ok) throw new Error('Could not save photo text.');

      const result = await response.json();
      const course = classPortfolios.find(item => item.id === reviewTarget.courseId);
      const index = course?.materials?.findIndex(item => item.id === reviewTarget.materialId) ?? -1;
      if (course && index >= 0 && result.material) {
        course.materials[index] = result.material;
        mergeClassMemory(course, result.classMemory);
        saveClassPortfolios();
        renderClassPortfolios();
        window.StudentUClassPortfolio?.renderMaterials?.();
      }
      closePhotoReviewModal();
      showNotification('Photo Ready', 'Lecture text saved — you can generate a study guide from it.', 'success');
    } catch (error) {
      showNotification('Save Failed', error.message || 'Could not save photo text.', 'error');
    }
  }

  function loadLecturePhotosToStudyDesk(courseId) {
    const course = classPortfolios.find(item => item.id === courseId) || getActiveClassPortfolio?.();
    const combined = getCombinedLecturePhotoText(course);
    if (!combined) {
      showNotification('No Photo Text', 'Upload lecture photos first — StudentU will read them into your class packet.', 'info');
      return;
    }

    const selector = document.getElementById('course-selector');
    const material = document.getElementById('study-material');
    if (selector && course?.id) selector.value = course.id;
    if (material) material.value = combined;
    switchTab?.('workspace');
    showNotification('Photos Loaded', 'Combined lecture text is ready in Study Desk.', 'success');
    setTimeout(() => window.focusStudyInput?.(), 120);
  }

  window.StudentUPhotoNotes = {
    getCombinedLecturePhotoText,
    formatMaterialStatusBadge,
    renderMaterialStatusBadge,
    openPhotoReviewModal,
    closePhotoReviewModal,
    savePhotoReview,
    loadLecturePhotosToStudyDesk,
  };
  window.openPhotoReviewModal = openPhotoReviewModal;
  window.closePhotoReviewModal = closePhotoReviewModal;
  window.savePhotoReview = savePhotoReview;
  window.loadLecturePhotosToStudyDesk = loadLecturePhotosToStudyDesk;
})();
