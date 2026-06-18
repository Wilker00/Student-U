/**
 * Live dashboard rendering — welcome, schedule, review queue, classes grid, progress sub-pane.
 */
(function () {
  const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SCHEDULE_METHODS = ['Feynman Method', 'Active Recall', 'Spaced Repetition'];
  const ICON_BG = ['bg-accent-blue/10', 'bg-accent-teal/10', 'bg-accent-warm/10', 'bg-accent-yellow/10'];
  const FILL_COLORS = ['bg-accent-blue', 'bg-accent-teal', 'bg-accent-warm', 'bg-accent-yellow'];

  let activeDayFilter = 'today';

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getSessionCount() {
    return window.StudentUStore?.getCompletedSessionCount?.()
      ?? Number(localStorage.getItem('studentu_sessions_completed') || '0');
  }

  function getTodayAbbr() {
    return DAY_ABBR[new Date().getDay()];
  }

  function getTomorrowAbbr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return DAY_ABBR[d.getDay()];
  }

  function getWelcomeName() {
    const user = window.StudentUStore?.getState?.()?.currentUser;
    if (user?.name) return user.name.split(/\s+/)[0];
    if (user?.email) return user.email.split('@')[0];
    const verified = localStorage.getItem('studentu_verified_email');
    if (verified) return verified.split('@')[0];
    if (sessionStorage.getItem('studentu_guest_mode') === 'true') return 'Guest';
    return 'there';
  }

  function getWelcomeMessage() {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${getWelcomeName()}`;
  }

  function getStoredSessionHistory() {
    try {
      return JSON.parse(localStorage.getItem('studentu_sessions') || '[]');
    } catch (_error) {
      return [];
    }
  }

  function getCourseTitle(courseKey, portfolios) {
    const match = portfolios.find(item => item.id === courseKey);
    return match?.title || courseKey || 'Study session';
  }

  function filterSessionsByDay(sessions, filter) {
    if (filter === 'week') return sessions;
    const target = filter === 'tomorrow' ? getTomorrowAbbr() : getTodayAbbr();
    return sessions.filter(session => session.day === target);
  }

  function getReviewQueueItems(portfolios) {
    const items = [];
    portfolios.forEach(course => {
      (course.weakTopics || []).forEach(topic => {
        items.push({ course, topic, risk: 'High Risk', riskClass: 'text-rose-600' });
      });
      (course.chapters || []).forEach(chapter => {
        if (chapter.progress >= 80) return;
        if ((course.weakTopics || []).some(t => String(t).toLowerCase() === String(chapter.title).toLowerCase())) return;
        const risk = chapter.progress < 50 ? 'High Risk' : 'Medium Risk';
        const riskClass = chapter.progress < 50 ? 'text-rose-600' : 'text-amber-700';
        items.push({ course, topic: chapter.title, risk, riskClass });
      });
    });
    return items.slice(0, 6);
  }

  function getOverallRetention(portfolios) {
    if (!portfolios.length) return null;
    const total = portfolios.reduce((sum, course) => sum + (Number(course.retention) || 0), 0);
    return Math.round(total / portfolios.length);
  }

  function renderScheduleRow(session, index) {
    const method = SCHEDULE_METHODS[index % SCHEDULE_METHODS.length];
    const courseId = session.course.id;
    const demoKeys = ['neuro', 'calc', 'hist', 'macro'];
    const startAttrs = demoKeys.includes(courseId)
      ? `data-action="startSpecificPlannedSession" data-course="${escapeHtml(courseId)}"`
      : `data-action="startPlannedSession" data-course-id="${escapeHtml(courseId)}"`;
    const iconBg = ICON_BG[index % ICON_BG.length];

    return `
      <div class="flex items-center gap-3 py-3 border-b border-surface-200 last:border-0">
        <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0">
          <img src="assets/icons/light_at_the_end_of_tunnel.svg" alt="" class="asset-icon w-5 h-5">
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-ink-300 truncate">${escapeHtml(session.course.title)} &mdash; ${escapeHtml(session.topic)}</div>
          <div class="text-[11px] text-ink-50">${escapeHtml(session.day)} &middot; ${session.minutes} min &middot; ${method}</div>
        </div>
        <button ${startAttrs} class="flex-shrink-0 px-3 py-1.5 btn-primary rounded-lg text-xs font-medium">Start</button>
      </div>`;
  }

  function renderDashboardWelcome() {
    const el = document.getElementById('dashboard-welcome-msg');
    if (el) el.textContent = getWelcomeMessage();
  }

  function renderDashboardDataModeBanner() {
    const banner = document.getElementById('dashboard-data-mode-banner');
    if (!banner) return;

    const globalBanner = document.getElementById('global-mode-banner');
    const globalVisible = globalBanner && !globalBanner.classList.contains('hidden');
    const showingDemo = window.StudentUWorkspaceMode?.isShowingSampleData?.()
      ?? window.isShowingDemoPortfolios?.();

    if (!showingDemo || globalVisible) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    banner.classList.remove('hidden');
    banner.className = 'global-mode-banner global-mode-banner--demo reveal';
    banner.innerHTML = `
      <p class="global-mode-banner__text">
        <strong>Sample data</strong> — charts and schedule below use demo classes, not your real courses.
      </p>
      <button type="button" data-action="switchTab" data-tab-target="profile" class="global-mode-banner__btn">Add my class</button>`;
  }

  function renderDashboardSchedule(portfolios, plannerData) {
    const list = document.getElementById('schedule-list');
    const empty = document.getElementById('dash-schedule-empty');
    if (!list) return;

    const sessions = getSessionCount() > 0 ? filterSessionsByDay(plannerData.sessions, activeDayFilter) : [];
    const showEmpty = getSessionCount() <= 0 || !plannerData.hasStudyData || sessions.length === 0;

    if (empty) empty.classList.toggle('hidden', !showEmpty);
    list.classList.toggle('hidden', showEmpty);

    if (showEmpty) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = sessions.slice(0, 6).map(renderScheduleRow).join('');
  }

  function renderDashboardReadiness(portfolios) {
    const statEl = document.getElementById('stat-speed');
    const fillEl = document.getElementById('stat-speed-fill');
    const retention = getOverallRetention(portfolios);
    const sessions = getSessionCount();

    if (!statEl) return;

    if (retention != null && sessions > 0) {
      statEl.textContent = `${retention}%`;
      if (fillEl) fillEl.style.width = `${retention}%`;
    } else {
      statEl.textContent = sessions > 0 ? 'Building…' : '—';
      if (fillEl) fillEl.style.width = '0%';
    }
  }

  function renderDashboardReviewQueue(portfolios) {
    const list = document.getElementById('dash-review-queue-list');
    const empty = document.getElementById('dash-review-queue-empty');
    if (!list) return;

    const items = getReviewQueueItems(portfolios);
    const showEmpty = items.length === 0;

    if (empty) empty.classList.toggle('hidden', !showEmpty);
    list.classList.toggle('hidden', showEmpty);

    if (showEmpty) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="flex items-center justify-between text-xs py-2 border-b border-surface-200 last:border-0">
        <span class="font-medium text-ink-300">${escapeHtml(item.topic)}</span>
        <span class="${item.riskClass} font-semibold">${escapeHtml(item.risk)}</span>
      </div>`).join('');
  }

  function renderDashboardClassesGrid(portfolios) {
    const grid = document.getElementById('dash-classes-grid');
    const empty = document.getElementById('dash-classes-empty');
    if (!grid) return;

    if (!portfolios.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      grid.classList.add('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    grid.classList.remove('hidden');

    grid.innerHTML = portfolios.slice(0, 4).map((course, index) => {
      const retention = Number(course.retention) || 0;
      const cards = (course.chapters || []).length;
      const color = FILL_COLORS[index % FILL_COLORS.length];
      return `
        <div class="space-y-2">
          <div class="text-sm font-semibold text-ink-300">${escapeHtml(course.title)}</div>
          <div class="text-[11px] text-ink-50">${retention}% retention &middot; ${cards} topic${cards === 1 ? '' : 's'}</div>
          <div class="progress-track"><div class="progress-fill ${color}" style="width:${Math.max(retention, 4)}%"></div></div>
        </div>`;
    }).join('');
  }

  function updateDashboardPriorityStats(portfolios, plannerData) {
    const reviewsEl = document.getElementById('dash-stat-reviews');
    const streakEl = document.getElementById('dash-stat-streak');
    const todayEl = document.getElementById('dash-stat-today');
    const certsEl = document.getElementById('dash-stat-certs');

    const reviewCount = getReviewQueueItems(portfolios).length;
    const sessions = getSessionCount();
    const todaySessions = filterSessionsByDay(plannerData.sessions, 'today');

    if (reviewsEl) {
      reviewsEl.textContent = reviewCount
        ? `${reviewCount} topic${reviewCount > 1 ? 's' : ''}`
        : (sessions > 0 ? 'All caught up' : 'After first session');
    }

    if (streakEl) {
      const stored = Number(localStorage.getItem('studentu_study_streak') || '0');
      const gamification = window.getGamificationState?.();
      const streak = gamification?.streak ?? stored;
      streakEl.textContent = streak > 0
        ? `${streak} day${streak > 1 ? 's' : ''}`
        : (sessions > 0 ? 'Start tomorrow' : 'Start today');
    }

    if (todayEl) {
      todayEl.textContent = todaySessions.length
        ? `${todaySessions.length} planned`
        : (sessions > 0 ? 'Plan building' : '0 planned');
    }

    if (certsEl) {
      const certs = Math.max(0, Math.floor(sessions / 3));
      certsEl.textContent = String(certs);
    }
  }

  function renderDashboardProgressSubpane(portfolios) {
    const retentionRoot = document.getElementById('dash-progress-retention');
    const activityRoot = document.getElementById('dash-progress-activity');
    const sessionsDisplay = document.getElementById('user-sessions-display');

    if (sessionsDisplay) {
      const weekCount = getStoredSessionHistory().filter(item => {
        const age = Date.now() - new Date(item.createdAt || item.savedAt || 0).getTime();
        return age < 7 * 86400000;
      }).length;
      sessionsDisplay.textContent = String(weekCount);
    }

    if (retentionRoot) {
      if (!portfolios.length) {
        retentionRoot.innerHTML = '<p class="text-xs text-ink-50">Add a class to track retention by subject.</p>';
      } else {
        retentionRoot.innerHTML = portfolios.map((course, index) => {
          const retention = Number(course.retention) || 0;
          const color = FILL_COLORS[index % FILL_COLORS.length];
          return `
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-ink-300">${escapeHtml(course.title)}</span>
                <span class="text-ink-50">${retention}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill ${color}" style="width:${Math.max(retention, 4)}%"></div></div>
            </div>`;
        }).join('');
      }
    }

    if (activityRoot) {
      const history = getStoredSessionHistory();
      const dayCounts = DAY_ABBR.slice(1).concat(DAY_ABBR[0]).map(() => 0);
      history.forEach(item => {
        const d = new Date(item.createdAt || item.savedAt || Date.now());
        const abbr = DAY_ABBR[d.getDay()];
        const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(abbr);
        if (idx >= 0) dayCounts[idx] += 1;
      });
      const max = Math.max(1, ...dayCounts);
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      activityRoot.innerHTML = labels.map((label, index) => {
        const pct = Math.round((dayCounts[index] / max) * 100);
        return `
          <div class="text-center">
            <div class="text-[10px] text-ink-50 mb-1">${label}</div>
            <div class="h-16 bg-accent-blue/20 rounded-lg relative">
              <div class="absolute bottom-0 left-0 right-0 bg-accent-blue rounded-lg" style="height:${pct || 4}%"></div>
            </div>
          </div>`;
      }).join('');
    }
  }

  function refreshDashboard() {
    const portfolios = window.getDashboardPortfolios?.() || [];
    const plannerData = window.buildPlannerSessions?.(portfolios) || { sessions: [], hasStudyData: false };

    renderDashboardWelcome();
    renderDashboardDataModeBanner();
    renderDashboardSchedule(portfolios, plannerData);
    renderDashboardReadiness(portfolios);
    renderDashboardReviewQueue(portfolios);
    renderDashboardClassesGrid(portfolios);
    updateDashboardPriorityStats(portfolios, plannerData);
    renderDashboardProgressSubpane(portfolios);
    window.renderDashboardBadges?.();
  }

  function setDashboardDayFilter(day) {
    activeDayFilter = day || 'today';
    refreshDashboard();
  }

  window.refreshDashboard = refreshDashboard;
  window.setDashboardDayFilter = setDashboardDayFilter;
  window.getWelcomeMessage = getWelcomeMessage;
  window.getStoredSessionHistory = getStoredSessionHistory;
})();
