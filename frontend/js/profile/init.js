window.StudentUClassPortfolio = {
  addClass: createClassPortfolio,
  addMaterial: addClassMaterial,
  addChapter: addChapterToActiveClass,
  addWeakTopic: addWeakTopicToActiveClass,
  select: selectClassPortfolio,
  render: renderClassPortfolios,
  focusMaterial: focusClassMaterial,
  handleFileSelected: handleClassMaterialFileSelected,
  loadPacket: loadSelectedClassPacket,
  loadLecturePhotos: loadLecturePhotosToStudyDesk,
  reviewPhoto: openPhotoReviewModal,
  buildPlan: generateStudyPlanForActiveClass,
  saveSetup: saveClassSetupDetails,
  clearActiveMaterials: clearActiveClassMaterials,
  exportActiveClass: exportActiveClassData,
  reset: clearAllClassStudyData,
  getContext: getCourseContextForPrompt,
  getActive: getActiveClassPortfolio,
  renderMaterials: renderMaterialsPage,
  renderAccount: renderAccountPage,
  renderFlowPages,
  refreshPanels: refreshVisibleProfilePanels,
  openCourseDetail: openActiveCourseDetail,
  startPractice: startPracticeFromActiveClass,
  startReview: startReviewQueue,
  recordStudyOutcome: recordActiveClassStudyOutcome,
};

window.addEventListener('DOMContentLoaded', () => {
  updateCourseSelectorFromPortfolios();
  renderClassPortfolios();
  window.updateStudyFlowHome?.();
  window.StudentUClassPortfolio?.renderFlowPages?.();
});
