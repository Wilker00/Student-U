/**
 * Legacy script-tag store (mirrors src/state/store.js for non-Vite loads).
 */
(function () {
  const STORAGE_KEYS = {
    userId: 'studentu_user_id',
    realUser: 'studentu_real_user',
    classPortfolios: 'studentu_class_portfolios',
    activeClass: 'studentu_active_class',
    guestMode: 'studentu_guest_mode',
    sessionsCompleted: 'studentu_sessions_completed',
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const listeners = new Set();
  const state = {
    currentUser: null,
    activeSession: null,
    classPortfolios: readJSON(STORAGE_KEYS.classPortfolios, []),
    activeClassPortfolioId: localStorage.getItem(STORAGE_KEYS.activeClass) || '',
  };

  function emit() {
    listeners.forEach(listener => listener(getState()));
  }

  function getState() {
    return {
      ...state,
      classPortfolios: [...state.classPortfolios],
    };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setCurrentUser(user) {
    state.currentUser = user || null;
    emit();
  }

  function setActiveSession(session) {
    state.activeSession = session || null;
    emit();
  }

  function hydrateClassPortfolios() {
    state.classPortfolios = readJSON(STORAGE_KEYS.classPortfolios, []);
    state.activeClassPortfolioId = localStorage.getItem(STORAGE_KEYS.activeClass) || state.classPortfolios[0]?.id || '';
    emit();
  }

  function setClassPortfolios(portfolios, activeId = '') {
    state.classPortfolios = Array.isArray(portfolios) ? portfolios : [];
    state.activeClassPortfolioId = activeId || state.classPortfolios[0]?.id || '';
    writeJSON(STORAGE_KEYS.classPortfolios, state.classPortfolios);
    if (state.activeClassPortfolioId) localStorage.setItem(STORAGE_KEYS.activeClass, state.activeClassPortfolioId);
    if (state.classPortfolios.length) localStorage.setItem(STORAGE_KEYS.realUser, 'true');
    emit();
  }

  function setActiveClassPortfolioId(classId) {
    state.activeClassPortfolioId = classId || '';
    if (state.activeClassPortfolioId) localStorage.setItem(STORAGE_KEYS.activeClass, state.activeClassPortfolioId);
    emit();
  }

  function getActiveClassPortfolio() {
    return state.classPortfolios.find(item => item.id === state.activeClassPortfolioId) || state.classPortfolios[0] || null;
  }

  function isGuestMode() {
    return sessionStorage.getItem(STORAGE_KEYS.guestMode) === 'true';
  }

  function setGuestMode(enabled) {
    if (enabled) sessionStorage.setItem(STORAGE_KEYS.guestMode, 'true');
    else sessionStorage.removeItem(STORAGE_KEYS.guestMode);
    emit();
  }

  function getCompletedSessionCount() {
    return Number(localStorage.getItem(STORAGE_KEYS.sessionsCompleted) || '0');
  }

  function setCompletedSessionCount(count) {
    localStorage.setItem(STORAGE_KEYS.sessionsCompleted, String(Number(count) || 0));
    emit();
  }

  if (!window.StudentUStore) {
    window.StudentUStore = {
      STORAGE_KEYS,
      getState,
      subscribe,
      setCurrentUser,
      setActiveSession,
      hydrateClassPortfolios,
      setClassPortfolios,
      setActiveClassPortfolioId,
      getActiveClassPortfolio,
      isGuestMode,
      setGuestMode,
      getCompletedSessionCount,
      setCompletedSessionCount,
    };
    window.StudentUStore.hydrateClassPortfolios();
  }
})();
