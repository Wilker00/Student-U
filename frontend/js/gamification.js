/**
 * Points, streaks, badges — persisted locally and synced to dashboard UI.
 */
(function () {
  const BADGE_DEFS = [
    { id: 'first_session', label: 'First Session', icon: '*', check: s => s.sessions >= 1 },
    { id: 'streak_3', label: '3-Day Streak', icon: '3', check: s => s.streak >= 3 },
    { id: 'perfect_recall', label: 'Perfect Recall', icon: '100%', check: s => s.perfectSessions >= 1 },
    { id: 'streak_7', label: '7-Day Streak', icon: '7', check: s => s.streak >= 7 },
    { id: 'cards_100', label: '100 Cards', icon: '100', check: s => s.cardsReviewed >= 100 },
    { id: 'top_learner', label: 'Top Learner', icon: '★', check: s => s.points >= 500 },
  ];

  function loadRaw() {
    try {
      return JSON.parse(localStorage.getItem('studentu_gamification') || '{}');
    } catch (_error) {
      return {};
    }
  }

  function saveRaw(state) {
    localStorage.setItem('studentu_gamification', JSON.stringify(state));
    window.StudentUCloudSync?.schedulePush?.();
  }

  function getGamificationState() {
    const stored = loadRaw();
    return {
      points: Number(stored.points ?? 0),
      streak: Number(stored.streak ?? 0),
      lastSessionDate: stored.lastSessionDate || null,
      sessions: Number(stored.sessions ?? 0),
      perfectSessions: Number(stored.perfectSessions ?? 0),
      cardsReviewed: Number(stored.cardsReviewed ?? 0),
    };
  }

  function countEarnedBadges(state) {
    return BADGE_DEFS.filter(badge => badge.check(state)).length;
  }

  function syncGlobals() {
    const state = getGamificationState();
    if (typeof studentPoints !== 'undefined') studentPoints = state.points;
    if (typeof studentBadges !== 'undefined') studentBadges = countEarnedBadges(state);
    return state;
  }

  function loadGamificationState() {
    const state = syncGlobals();
    window.renderDashboardBadges?.();
    return state;
  }

  function awardSessionGamification({ solidCount = 0, totalCount = 0, cardsReviewed = 0 } = {}) {
    const state = loadRaw();
    const pointsEarned = (solidCount * 10) + 5;
    state.points = Number(state.points ?? 0) + pointsEarned;
    state.sessions = Number(state.sessions ?? 0) + 1;
    state.cardsReviewed = Number(state.cardsReviewed ?? 0) + cardsReviewed;
    if (totalCount > 0 && solidCount === totalCount) {
      state.perfectSessions = Number(state.perfectSessions ?? 0) + 1;
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (state.lastSessionDate !== today) {
      state.streak = state.lastSessionDate === yesterday
        ? Number(state.streak ?? 0) + 1
        : 1;
      state.lastSessionDate = today;
    }

    saveRaw(state);
    localStorage.setItem('studentu_study_streak', String(state.streak ?? 0));
    syncGlobals();
    window.renderDashboardBadges?.();
    return pointsEarned;
  }

  function renderDashboardBadges() {
    const root = document.getElementById('dash-progress-badges');
    if (!root) return;
    const state = getGamificationState();
    root.innerHTML = BADGE_DEFS.map(badge => {
      const earned = badge.check(state);
      return `
        <div class="text-center ${earned ? '' : 'opacity-40'}">
          <div class="w-12 h-12 rounded-xl ${earned ? 'bg-accent-yellow/20' : 'bg-surface-200'} flex items-center justify-center mx-auto mb-1 text-sm font-bold">${badge.icon}</div>
          <div class="text-[10px] text-ink-50">${badge.label}</div>
        </div>`;
    }).join('');
  }

  function getCourseReadinessPercent(courseKey) {
    const portfolios = window.getDashboardPortfolios?.() || [];
    const course = portfolios.find(item => item.id === courseKey);
    return Number(course?.retention) || 0;
  }

  window.getGamificationState = getGamificationState;
  window.loadGamificationState = loadGamificationState;
  window.awardSessionGamification = awardSessionGamification;
  window.renderDashboardBadges = renderDashboardBadges;
  window.getCourseReadinessPercent = getCourseReadinessPercent;
})();
