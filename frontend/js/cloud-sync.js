/**
 * Cloud sync — merge local study state with Firestore on sign-in and after saves.
 */
(function () {
  const SYNC_DEBOUNCE_MS = 1200;
  let pushTimer = null;
  let lastSyncAt = null;
  let lastSyncStatus = 'idle';

  function readJson(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function parseTime(value) {
    if (!value) return 0;
    if (value?.seconds) return value.seconds * 1000;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function collectLocalState() {
    return {
      gamification: readJson('studentu_gamification', {}),
      sessionsCompleted: Number(localStorage.getItem('studentu_sessions_completed') || '0'),
      tier: localStorage.getItem('studentu_tier') || 'free',
      verifiedEmail: localStorage.getItem('studentu_verified_email') || '',
      verifiedSchool: localStorage.getItem('studentu_verified_school') || '',
      studySettings: readJson('studentu_study_settings', {}),
      reminderPrefs: readJson('studentu_reminder_prefs', {}),
      classPortfolios: readJson('studentu_class_portfolios', []),
      activeClassId: localStorage.getItem('studentu_active_class') || '',
      portfoliosUpdatedAt: localStorage.getItem('studentu_portfolios_updated_at') || '',
      realUser: localStorage.getItem('studentu_real_user') === 'true',
    };
  }

  function mergeGamification(local = {}, cloud = {}) {
    const localDate = local.lastSessionDate || '';
    const cloudDate = cloud.lastSessionDate || '';
    const useCloudStreak = parseTime(cloudDate) > parseTime(localDate);
    return {
      points: Math.max(Number(local.points) || 0, Number(cloud.points) || 0),
      sessions: Math.max(Number(local.sessions) || 0, Number(cloud.sessions) || 0),
      perfectSessions: Math.max(Number(local.perfectSessions) || 0, Number(cloud.perfectSessions) || 0),
      cardsReviewed: Math.max(Number(local.cardsReviewed) || 0, Number(cloud.cardsReviewed) || 0),
      streak: useCloudStreak ? Number(cloud.streak) || 0 : Number(local.streak) || 0,
      lastSessionDate: parseTime(cloudDate) >= parseTime(localDate) ? (cloudDate || localDate) : (localDate || cloudDate),
    };
  }

  function tierRank(tier) {
    if (tier === 'premium') return 3;
    if (tier === 'edu') return 2;
    return 1;
  }

  function mergeTier(local, cloud) {
    return tierRank(cloud) >= tierRank(local) ? cloud : local;
  }

  function applyLocalState(local) {
    writeJson('studentu_gamification', local.gamification);
    localStorage.setItem('studentu_study_streak', String(local.gamification.streak ?? 0));
    localStorage.setItem('studentu_sessions_completed', String(local.sessionsCompleted ?? 0));
    window.StudentUStore?.setCompletedSessionCount?.(local.sessionsCompleted ?? 0);

    localStorage.setItem('studentu_tier', local.tier || 'free');
    if (local.verifiedEmail) localStorage.setItem('studentu_verified_email', local.verifiedEmail);
    if (local.verifiedSchool) localStorage.setItem('studentu_verified_school', local.verifiedSchool);

    writeJson('studentu_study_settings', local.studySettings || {});
    writeJson('studentu_reminder_prefs', local.reminderPrefs || {});

    if (local.realUser && Array.isArray(local.classPortfolios)) {
      localStorage.setItem('studentu_real_user', 'true');
      writeJson('studentu_class_portfolios', local.classPortfolios);
      if (local.activeClassId) localStorage.setItem('studentu_active_class', local.activeClassId);
      if (typeof classPortfolios !== 'undefined') {
        classPortfolios = local.classPortfolios;
        activeClassPortfolioId = local.activeClassId || local.classPortfolios[0]?.id || '';
      }
    }
  }

  function mergeLocalAndCloud(local, cloudProfile, cloudPortfolios) {
    const merged = { ...local };
    if (cloudProfile) {
      merged.gamification = mergeGamification(local.gamification, cloudProfile.gamification || {});
      merged.sessionsCompleted = Math.max(
        Number(local.sessionsCompleted) || 0,
        Number(cloudProfile.sessionsCompleted) || 0,
      );
      merged.tier = mergeTier(local.tier, cloudProfile.tier || 'free');
      merged.verifiedEmail = cloudProfile.verifiedEmail || local.verifiedEmail;
      merged.verifiedSchool = cloudProfile.verifiedSchool || local.verifiedSchool;
      merged.studySettings = { ...(cloudProfile.studySettings || {}), ...(local.studySettings || {}) };
      merged.reminderPrefs = { ...(cloudProfile.reminderPrefs || {}), ...(local.reminderPrefs || {}) };
    }

    const cloudPortfolioTime = parseTime(cloudPortfolios?.updatedAt);
    const localPortfolioTime = parseTime(local.portfoliosUpdatedAt);
    if (cloudPortfolios?.portfolios?.length && cloudPortfolioTime >= localPortfolioTime) {
      merged.classPortfolios = cloudPortfolios.portfolios;
      merged.activeClassId = cloudPortfolios.activeClassId || cloudPortfolios.portfolios[0]?.id || '';
      merged.realUser = true;
      merged.portfoliosUpdatedAt = new Date(cloudPortfolioTime || Date.now()).toISOString();
    } else if (local.classPortfolios?.length) {
      merged.classPortfolios = local.classPortfolios;
      merged.activeClassId = local.activeClassId;
      merged.realUser = local.realUser;
    }

    return merged;
  }

  function buildCloudProfile(local) {
    return {
      gamification: local.gamification,
      sessionsCompleted: local.sessionsCompleted,
      tier: local.tier,
      verifiedEmail: local.verifiedEmail,
      verifiedSchool: local.verifiedSchool,
      studySettings: local.studySettings,
      reminderPrefs: local.reminderPrefs,
    };
  }

  function updateSyncStatus(status, message) {
    lastSyncStatus = status;
    if (status === 'synced') lastSyncAt = new Date();
    const el = document.getElementById('account-sync-status');
    if (!el) return;
    const classes = {
      synced: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      syncing: 'bg-accent-blue/5 border border-accent-blue/20 text-accent-blue',
      offline: 'bg-surface-100 border border-surface-300 text-ink-100',
      error: 'bg-rose-50 border border-rose-200 text-rose-700',
    };
    el.className = `rounded-xl px-4 py-3 text-xs font-semibold ${classes[status] || classes.offline}`;
    el.textContent = message;
  }

  async function pullCloudState() {
    if (!window.StudentUSync?.isCloudReady?.()) {
      updateSyncStatus('offline', 'Sign in to sync progress across devices.');
      return null;
    }

    updateSyncStatus('syncing', 'Syncing your study data…');
    try {
      const [cloudProfile, cloudPortfolios] = await Promise.all([
        StudentUSync.getUserProfile(),
        StudentUSync.getClassPortfolios(),
      ]);
      const local = collectLocalState();
      const merged = mergeLocalAndCloud(local, cloudProfile, cloudPortfolios);
      applyLocalState(merged);

      window.updateCourseSelectorFromPortfolios?.();
      window.StudentUClassPortfolio?.render?.();
      window.loadGamificationState?.();
      window.updateUserTierDisplay?.();
      window.updateStudyFlowHome?.();
      window.refreshDashboard?.();
      window.updateSetupProgressUI?.();
      window.StudentUClassPortfolio?.renderAccount?.();

      await pushCloudState(true);
      updateSyncStatus('synced', lastSyncAt
        ? `Synced ${lastSyncAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — progress saved to your account.`
        : 'Synced — progress saved to your account.');
      return merged;
    } catch (error) {
      console.warn('Cloud pull failed:', error);
      updateSyncStatus('error', 'Sync failed — your data is still saved on this device.');
      return null;
    }
  }

  async function pushCloudState(immediate = false) {
    if (!window.StudentUSync?.isCloudReady?.()) return false;

    const run = async () => {
      updateSyncStatus('syncing', 'Saving to cloud…');
      const local = collectLocalState();
      try {
        await StudentUSync.saveUserProfile(buildCloudProfile(local));
        if (local.realUser && local.classPortfolios?.length) {
          await StudentUSync.saveClassPortfolios(local.classPortfolios, local.activeClassId);
          localStorage.setItem('studentu_portfolios_updated_at', new Date().toISOString());
        }
        updateSyncStatus('synced', `Synced ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — progress saved to your account.`);
        return true;
      } catch (error) {
        console.warn('Cloud push failed:', error);
        updateSyncStatus('error', 'Cloud save failed — data remains on this device.');
        return false;
      }
    };

    if (immediate) return run();

    clearTimeout(pushTimer);
    pushTimer = setTimeout(run, SYNC_DEBOUNCE_MS);
    return true;
  }

  function scheduleCloudPush() {
    pushCloudState(false);
  }

  window.StudentUCloudSync = {
    pull: pullCloudState,
    push: pushCloudState,
    schedulePush: scheduleCloudPush,
    updateStatus: updateSyncStatus,
    isReady: () => Boolean(window.StudentUSync?.isCloudReady?.()),
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.StudentUSync?.isCloudReady?.()) {
      updateSyncStatus('offline', 'Sign in to sync progress across devices.');
    }
  });
})();
