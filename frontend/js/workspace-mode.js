/**
 * Single source of truth for demo vs real class vs signed-in workspace modes.
 */
(function () {
  const MODE = {
    landing: {
      id: 'landing',
      label: '',
      shortLabel: '',
      description: '',
      showBanner: false,
      bannerClass: '',
      pillClass: 'hidden',
    },
    demo: {
      id: 'demo',
      label: 'Demo',
      shortLabel: 'Demo',
      description: 'Sample notes only — nothing here saves to your real class.',
      showBanner: true,
      bannerClass: 'global-mode-banner--demo',
      pillClass: 'workspace-mode-pill--demo',
      cta: { label: 'Set up my class', action: 'switchTab', tab: 'profile' },
    },
    setup: {
      id: 'setup',
      label: 'Setup',
      shortLabel: 'Setup',
      description: 'Add a class and upload materials for syllabus-aware study guides.',
      showBanner: true,
      bannerClass: 'global-mode-banner--setup',
      pillClass: 'workspace-mode-pill--setup',
      cta: { label: 'Add a class', action: 'switchTab', tab: 'profile' },
    },
    signed_in: {
      id: 'signed_in',
      label: 'Signed in',
      shortLabel: 'Signed in',
      description: 'Your account is connected — add a class to sync syllabus, notes, and progress.',
      showBanner: true,
      bannerClass: 'global-mode-banner--setup',
      pillClass: 'workspace-mode-pill--synced',
      cta: { label: 'Add my class', action: 'switchTab', tab: 'profile' },
    },
    my_class: {
      id: 'my_class',
      label: 'My class',
      shortLabel: 'My class',
      description: 'Your materials and progress stay on this device until you sign in.',
      showBanner: false,
      bannerClass: '',
      pillClass: 'workspace-mode-pill--class',
    },
    synced: {
      id: 'synced',
      label: 'Synced',
      shortLabel: 'Synced',
      description: 'Your class materials and progress sync across devices.',
      showBanner: false,
      bannerClass: '',
      pillClass: 'workspace-mode-pill--synced',
    },
  };

  function hasAppAccess() {
    if (typeof window.hasAppAccess === 'function') return window.hasAppAccess();
    return Boolean(
      localStorage.getItem('studentu_real_user') === 'true'
      || sessionStorage.getItem('studentu_guest_mode') === 'true'
    );
  }

  function isGuestMode() {
    return Boolean(window.StudentUStore?.isGuestMode?.() ?? sessionStorage.getItem('studentu_guest_mode') === 'true');
  }

  function getCurrentUser() {
    return window.StudentUStore?.getState?.()?.currentUser
      ?? (typeof currentUser !== 'undefined' ? currentUser : null);
  }

  function isRealStudentFlag() {
    return localStorage.getItem('studentu_real_user') === 'true';
  }

  function getStoredClassPortfolios() {
    try {
      return JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
    } catch (_error) {
      return [];
    }
  }

  function getInMemoryClassPortfolios() {
    if (typeof classPortfolios === 'undefined' || !Array.isArray(classPortfolios)) return [];
    return classPortfolios;
  }

  function isDemoPortfolio(course) {
    return Boolean(course?.demoSeed) || (typeof window.isDemoCourseKey === 'function' && window.isDemoCourseKey(course?.id));
  }

  function getRealClassPortfolios() {
    const inMemory = getInMemoryClassPortfolios().filter((course) => !isDemoPortfolio(course));
    if (inMemory.length) return inMemory;
    if (!isRealStudentFlag()) return [];
    return getStoredClassPortfolios().filter((course) => !isDemoPortfolio(course));
  }

  function hasRealClassPortfolios() {
    return getRealClassPortfolios().length > 0;
  }

  function getWorkspaceMode() {
    if (!hasAppAccess()) return 'landing';

    const user = getCurrentUser();
    const guest = isGuestMode() && !isRealStudentFlag();
    const hasClass = hasRealClassPortfolios();

    if (guest) return 'demo';
    if (user && hasClass) return 'synced';
    if (hasClass) return 'my_class';
    if (user) return 'signed_in';
    return 'setup';
  }

  function getWorkspaceModeInfo(modeId) {
    const id = modeId || getWorkspaceMode();
    return MODE[id] || MODE.landing;
  }

  function isDemoWorkspace() {
    return getWorkspaceMode() === 'demo';
  }

  function isShowingSampleData() {
    if (hasRealClassPortfolios()) return false;
    if (typeof window.isShowingDemoPortfolios === 'function') {
      return window.isShowingDemoPortfolios();
    }
    return isDemoWorkspace();
  }

  function renderBannerMarkup(info) {
    if (!info.showBanner || !info.cta) return '';
    const cta = info.cta;
    const attrs = [`data-action="${cta.action}"`];
    if (cta.tab) attrs.push(`data-tab-target="${cta.tab}"`);
    return `
      <p class="global-mode-banner__text">
        <strong>${info.shortLabel}</strong> — ${info.description}
      </p>
      <button type="button" ${attrs.join(' ')} class="global-mode-banner__btn">${cta.label}</button>`;
  }

  function renderGlobalModeBanner() {
    const banner = document.getElementById('global-mode-banner');
    if (!banner) return;

    const mode = getWorkspaceMode();
    const info = getWorkspaceModeInfo(mode);

    if (!hasAppAccess() || !info.showBanner) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      banner.dataset.workspaceMode = mode;
      return;
    }

    banner.className = `global-mode-banner ${info.bannerClass}`.trim();
    banner.innerHTML = renderBannerMarkup(info);
    banner.classList.remove('hidden');
    banner.dataset.workspaceMode = mode;
  }

  function renderWorkspaceModePill() {
    const pill = document.getElementById('workspace-mode-pill');
    if (!pill) return;

    const mode = getWorkspaceMode();
    const info = getWorkspaceModeInfo(mode);

    if (!hasAppAccess() || mode === 'landing' || !info.shortLabel) {
      pill.classList.add('hidden');
      pill.textContent = '';
      pill.dataset.workspaceMode = mode;
      return;
    }

    pill.className = `workspace-mode-pill ${info.pillClass}`.trim();
    pill.textContent = info.shortLabel;
    pill.title = info.description;
    pill.dataset.workspaceMode = mode;
    pill.classList.remove('hidden');
  }

  function refreshWorkspaceModeUI() {
    renderGlobalModeBanner();
    renderWorkspaceModePill();
  }

  window.StudentUWorkspaceMode = {
    MODE,
    getWorkspaceMode,
    getWorkspaceModeInfo,
    hasRealClassPortfolios,
    getRealClassPortfolios,
    isDemoPortfolio,
    isDemoWorkspace,
    isShowingSampleData,
    refreshWorkspaceModeUI,
    renderGlobalModeBanner,
    renderWorkspaceModePill,
  };
  window.getWorkspaceMode = getWorkspaceMode;
  window.isDemoWorkspace = isDemoWorkspace;
  window.hasRealClassPortfolios = hasRealClassPortfolios;
  window.refreshWorkspaceModeUI = refreshWorkspaceModeUI;
})();
