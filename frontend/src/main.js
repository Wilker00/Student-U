import '../styles/main.css';
import { StudentUStore } from './state/store.js';
import { demoClassPortfolios, demoMaterials, courseCardDecks, courseRecallQuestions } from './data/demo-courses.js';
import { loadPartials } from './partials/loader.js';
import * as StudentUSilent from '../../shared/silent-algorithms.core.js';

window.StudentUStore = StudentUStore;
window.StudentUSilent = StudentUSilent;
window.StudentUDemoData = {
  classPortfolios: demoClassPortfolios,
  materials: demoMaterials,
  courseCardDecks,
  courseRecallQuestions,
};

window.StudentU = {
  store: StudentUStore,
  demo: window.StudentUDemoData,
  actions: {},
};

// Action delegation is handled by js/ui/actions-bridge.js (legacy script bundle).

document.addEventListener('DOMContentLoaded', () => {
  loadPartials();
});

StudentUStore.hydrateClassPortfolios();
