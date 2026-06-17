// ---- GLOBAL STATE ----
        let studentPoints = 0;
        let studentBadges = 0;
        let currentUser = null;
        let activeSession = null;

        function assignActiveSession(session) {
            activeSession = session;
            window.StudentUStore?.setActiveSession?.(session);
        }
        window.assignActiveSession = assignActiveSession;

        function bindAppStateToStore() {
            const store = window.StudentUStore;
            if (!store) return;
            const initial = store.getState?.();
            if (initial?.currentUser) currentUser = initial.currentUser;
            if (initial?.activeSession) activeSession = initial.activeSession;
            store.subscribe?.((state) => {
                if (state.currentUser !== currentUser) currentUser = state.currentUser;
                if (state.activeSession !== activeSession) activeSession = state.activeSession;
            });
        }
        let currentQuizIndex = 0;
        let currentQuizData = [];
        let highlights = JSON.parse(localStorage.getItem('studentu_highlights') || '{}');
        let selectedRange = null;
        let savedCardHighlights = JSON.parse(localStorage.getItem('savedCardHighlights') || '{}');
        const lockedFirstSessionTabs = ['dashboard', 'practice', 'review-queue', 'session-history', 'reminders', 'settings'];
        const protectedAppTabs = ['workspace', 'profile', 'dashboard', 'ai', 'onboarding', 'course-detail', 'practice', 'review-queue', 'session-history', 'reminders', 'settings', 'account', 'billing', 'planner', 'progress', 'moat-profile', 'materials'];

        function isRealStudentUser() {
            return localStorage.getItem('studentu_real_user') === 'true';
        }

        function getCompletedSessionCount() {
            return window.StudentUStore?.getCompletedSessionCount?.() ?? Number(localStorage.getItem('studentu_sessions_completed') || '0');
        }

        function hasAppAccess() {
            const flowPath = localStorage.getItem('studentu_flow_path') || '';
            return Boolean(currentUser)
                || Boolean(window.StudentUStore?.isGuestMode?.() ?? sessionStorage.getItem('studentu_guest_mode') === 'true')
                || localStorage.getItem('studentu_explore_active') === 'true'
                || localStorage.getItem('studentu_real_user') === 'true'
                || flowPath === 'explore' || flowPath === 'setup' || flowPath === 'study';
        }

        function enterGuestStudyMode() {
            // FIX: Logged-out landing flow - only explicit landing CTAs may enter the app without sign-in.
            window.StudentUStore?.setGuestMode?.(true) ?? sessionStorage.setItem('studentu_guest_mode', 'true');
            window.refreshWorkspaceModeUI?.();
        }
        window.enterGuestStudyMode = enterGuestStudyMode;

        function isGuestStudyMode() {
            return Boolean(window.StudentUStore?.isGuestMode?.() ?? sessionStorage.getItem('studentu_guest_mode') === 'true') && !currentUser;
        }

        function isLockedFirstSessionTab(tabName) {
            return lockedFirstSessionTabs.includes(tabName) && getCompletedSessionCount() <= 0;
        }

        function showLockedTabMessage() {
            showNotification('Complete your first session to unlock', 'Finish one study guide session to open Progress & Planner.', 'info');
        }

        function updateLockedTabs() {
            const isLocked = getCompletedSessionCount() <= 0;
            const lockHint = 'Complete your first session to unlock Progress & Planner';
            document.querySelectorAll('.tab-locked').forEach(el => {
                el.classList.toggle('is-locked', isLocked);
                el.classList.remove('hidden');
                el.setAttribute('aria-disabled', isLocked ? 'true' : 'false');
                el.title = isLocked ? lockHint : '';
            });
            updateStepIndicators();
        }

        function updateStepIndicators() {
            // FIX: Navigation flow - hide setup step labels once the first session is complete.
            const isComplete = getCompletedSessionCount() > 0;
            document.querySelectorAll('.su-step-indicator').forEach(el => {
                el.classList.toggle('is-complete', isComplete);
            });
        }

        // ---- NAVIGATION ----
        function switchTab(tabName) {
            if (tabName === 'developer-settings') {
                openDeveloperSettings();
                return;
            }
            if (protectedAppTabs.includes(tabName) && !hasAppAccess()) {
                showNotification('Sign in or try the demo', 'Use the landing page buttons to start StudentU.', 'info');
                tabName = 'landing';
            }
            if (isLockedFirstSessionTab(tabName)) {
                showLockedTabMessage();
                return;
            }
            // Redirect deprecated tabs to their new unified homes
            if (tabName === 'planner') {
                if (isLockedFirstSessionTab('dashboard')) {
                    showLockedTabMessage();
                    return;
                }
                switchTab('dashboard');
                switchDashboardSubTab('planner');
                window.renderFirstStudyPlan?.();
                return;
            }
            if (tabName === 'moat-profile' || tabName === 'progress') {
                if (isLockedFirstSessionTab('dashboard')) {
                    showLockedTabMessage();
                    return;
                }
                switchTab('dashboard');
                switchDashboardSubTab('progress');
                return;
            }
            if (tabName === 'account') {
                // FIX: Footer navigation cleanup - account should be reachable after app access even before the first session.
                if (!hasAppAccess()) {
                    showNotification('Sign in or try the demo', 'Use the landing page buttons to open account settings.', 'info');
                    switchTab('landing');
                    return;
                }
                document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
                document.getElementById('tab-dashboard')?.classList.remove('hidden');
                switchDashboardSubTab('account');
                return;
            }
            if (tabName === 'materials') {
                switchTab('profile');
                switchClassesSubView('materials');
                return;
            }

            document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById('tab-' + tabName);
            if (target) {
                target.classList.remove('hidden');
                target.classList.remove('tab-enter');
                void target.offsetWidth;
                target.classList.add('tab-enter');
                document.getElementById('main-scroll').scrollTop = 0;
                setTimeout(() => {
                    target.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }

            document.querySelectorAll('.nav-btn').forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('active-tab', isActive);
                btn.classList.toggle('app-nav-item--active', isActive);
                btn.classList.toggle('bg-white', isActive);
                btn.classList.toggle('shadow-sm', isActive);
                btn.classList.toggle('font-semibold', isActive);
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('text-ink-100', !isActive);
                btn.classList.toggle('font-medium', !isActive);
            });

            document.querySelectorAll('#mobile-nav button').forEach(btn => {
                const isActive = btn.dataset.tab === tabName || btn.id === 'nav-btn-' + tabName;
                btn.classList.toggle('active-tab-mobile', isActive);
                btn.classList.toggle('app-mobile-nav__item--active', isActive);
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('text-ink-50', !isActive);
            });

            if (tabName === 'ai') {
                window.StudentUChat?.open?.();
            }
            if (tabName === 'workspace') {
                window.updateStudyFlowHome?.();
            }
            if (tabName === 'dashboard') {
                window.refreshDashboard?.();
            }
            window.updateGlobalModeBanner?.();
            window.refreshDashboard?.();
            syncStudyAiModeBanner();
            window.refreshFlowCompass?.();
            if (['onboarding', 'course-detail', 'practice', 'review-queue', 'session-history', 'reminders', 'settings', 'help', 'billing', 'profile', 'moat-profile', 'account'].includes(tabName)) {
                window.StudentUClassPortfolio?.refreshPanels?.();
            }
        }

        function getStoredClassPortfolios() {
            if (!isRealStudentUser()) return [];
            try {
                return JSON.parse(localStorage.getItem('studentu_class_portfolios') || '[]');
            } catch (error) {
                return [];
            }
        }

        function getActiveStoredClass() {
            const portfolios = getStoredClassPortfolios();
            const activeId = localStorage.getItem('studentu_active_class') || portfolios[0]?.id;
            return portfolios.find(course => course.id === activeId) || portfolios[0] || null;
        }

        function hasStudentClassData() {
            // FIX: False first-user state - use explicit real-user flag instead of seeded demo data.
            return isRealStudentUser();
        }

        function shouldShowOnboardingGate() {
            return !hasStudentClassData();
        }

        function dismissOnboardingGate() {
            localStorage.setItem('studentu_onboarding_dismissed', 'true');
            updateStudyFlowHome();
            focusStudyInput();
        }

        function routeToStudyHome() {
            // FIX: Logged-out landing flow - students should see the public landing page until they act.
            if (!hasAppAccess()) {
                switchTab('landing');
                return;
            }
            if (sessionStorage.getItem('studentu_flow_restored') === 'true') {
                sessionStorage.removeItem('studentu_flow_restored');
                triggerUAIAnimation();
                return;
            }
            switchTab('workspace');
            triggerUAIAnimation();
        }

        function openSetupGuide() {
            // FIX: Footer navigation cleanup - show public guidance before access and the guided setup inside the app.
            switchTab(hasAppAccess() ? 'onboarding' : 'help');
        }

        function focusStudyInput() {
            switchTab('workspace');
            expandStudyGuidePanel();
            setTimeout(() => document.getElementById('study-material')?.focus(), 80);
        }

        function expandStudyGuidePanel() {
            // FIX: Study Desk layout - keep the lower study controls collapsed until the student asks for them.
            const panel = document.getElementById('study-guide-panel');
            if (panel) panel.classList.remove('hidden');
            document.querySelectorAll('.study-extra-panel').forEach(el => el.classList.remove('hidden'));
        }
        window.expandStudyGuidePanel = expandStudyGuidePanel;

        function startSetupFlow() {
            // FIX: Navigation flow - make My Classes the next step from the Study Desk setup CTA.
            expandStudyGuidePanel();
            switchTab('profile');
        }

        function getSavedSessionSnapshot() {
            try {
                return JSON.parse(localStorage.getItem('studentu_resume_session') || 'null');
            } catch (error) {
                return null;
            }
        }

        function updateStudyFlowHome() {
            const course = getActiveStoredClass() || window.StudentUClassPortfolio?.getActive?.();
            const gate = document.getElementById('first-run-study-gate');
            if (gate) gate.classList.toggle('hidden', !shouldShowOnboardingGate());
            renderStudentModeBanner(course);

            const classTitle = document.getElementById('flow-selected-class');
            const classContext = document.getElementById('flow-selected-context');
            const materialCount = document.getElementById('flow-material-count');
            const retention = document.getElementById('flow-retention-score');
            const weakCount = document.getElementById('flow-weak-count');
            const nextReview = document.getElementById('flow-next-review');
            const nextReviewMeta = document.getElementById('flow-next-review-meta');
            const lastSession = document.getElementById('flow-last-session');
            const lastSessionMeta = document.getElementById('flow-last-session-meta');
            const readinessTitle = document.getElementById('flow-readiness-title');
            const readinessSteps = document.getElementById('flow-readiness-steps');
            const contextSnapshot = document.getElementById('flow-context-snapshot');

            if (course) {
                const materials = course.materials || [];
                const weakTopics = course.weakTopics || [];
                const chapters = course.chapters || [];
                const hasSyllabus = materials.some(item => String(item.type || '').toLowerCase().includes('syllabus'));
                const hasNotes = materials.some(item => !String(item.type || '').toLowerCase().includes('syllabus'));
                const hasChapter = Boolean(course.currentChapter && !String(course.currentChapter).toLowerCase().includes('add'));
                const readyCount = [hasSyllabus, hasNotes, hasChapter, weakTopics.length > 0 || chapters.length > 1].filter(Boolean).length;
                if (classTitle) {
                    const sampleSuffix = course.demoSeed ? ' (sample)' : '';
                    classTitle.textContent = `${course.title || 'Selected class'}${sampleSuffix}`;
                }
                if (classContext) classContext.textContent = `${course.currentChapter || 'Current chapter not set'}${course.examDate ? ' - Exam ' + course.examDate : ''}`;
                if (materialCount) materialCount.textContent = materials.length;
                if (retention) retention.textContent = typeof course.retention === 'number' ? `${course.retention}%` : '--';
                if (weakCount) weakCount.textContent = weakTopics.length;

                const dueTopic = weakTopics[0] || chapters.find(chapter => chapter.progress < 80)?.title || 'Generate a study guide';
                if (nextReview) nextReview.textContent = dueTopic;
                if (nextReviewMeta) nextReviewMeta.textContent = `${course.title || 'Selected class'} - ${materials.length ? 'Uses your saved sources' : 'Add sources for better review'}`;
                if (readinessTitle) readinessTitle.textContent = readyCount >= 3 ? 'Ready for a strong study guide' : 'Add a little more context';
                if (readinessSteps) {
                    const steps = [
                        { label: 'Syllabus uploaded', done: hasSyllabus, dataAction: 'focusClassMaterial', materialType: 'Syllabus' },
                        { label: 'Notes or photos saved', done: hasNotes, dataAction: 'focusClassMaterial', materialType: 'Lecture Notes' },
                        { label: 'Current chapter set', done: hasChapter, dataAction: 'switchTab', tab: 'profile' },
                        { label: 'Weak topics tracked', done: weakTopics.length > 0, dataAction: 'switchTab', tab: 'profile' },
                    ];
                    readinessSteps.innerHTML = steps.map(step => {
                        const attrs = [`data-action="${step.dataAction}"`];
                        if (step.materialType) attrs.push(`data-material-type="${step.materialType}"`);
                        if (step.tab) attrs.push(`data-tab-target="${step.tab}"`);
                        return `
                        <button ${attrs.join(' ')} class="w-full flex items-center justify-between gap-3 rounded-xl border ${step.done ? 'border-emerald-200 bg-emerald-50' : 'border-surface-300 bg-white'} px-3 py-2 text-left">
                            <span class="text-[11px] font-semibold ${step.done ? 'text-emerald-700' : 'text-ink-200'}">${step.label}</span>
                            <span class="text-[10px] font-mono ${step.done ? 'text-emerald-700' : 'text-accent-blue'}">${step.done ? 'OK' : 'Add'}</span>
                        </button>`;
                    }).join('');
                }
                if (contextSnapshot) {
                    const latestMaterials = materials.slice(0, 3);
                    contextSnapshot.innerHTML = `
                        <div class="rounded-xl border border-surface-300 bg-white px-3 py-2">
                            <p class="text-[11px] font-bold text-ink-300">${course.currentChapter || 'Current chapter not set'}</p>
                            <p class="text-[10px] text-ink-50 mt-0.5">${weakTopics.length ? `Weak: ${weakTopics.slice(0, 2).join(', ')}` : 'No weak topic marked yet'}</p>
                        </div>
                        ${latestMaterials.length ? latestMaterials.map(item => `
                            <div class="rounded-xl border border-surface-300 bg-white px-3 py-2">
                                <span class="text-[9px] uppercase tracking-wider font-mono text-accent-blue">${item.type || 'Material'}</span>
                                <p class="text-[11px] font-semibold text-ink-300 mt-0.5">${item.title || item.source || 'Saved source'}</p>
                            </div>
                        `).join('') : '<p class="text-xs text-ink-50">Add a syllabus or notes to create a richer packet.</p>'}
                    `;
                }
            } else {
                if (classTitle) classTitle.textContent = 'No class selected';
                if (classContext) classContext.textContent = 'Set up a class or paste notes to begin.';
                if (materialCount) materialCount.textContent = '0';
                if (retention) retention.textContent = '--';
                if (weakCount) weakCount.textContent = '0';
                if (nextReview) nextReview.textContent = 'Add a class to see due reviews';
                if (nextReviewMeta) nextReviewMeta.textContent = 'You can still paste notes and generate a guide.';
                if (readinessTitle) readinessTitle.textContent = 'Set up your first class';
                if (readinessSteps) readinessSteps.innerHTML = `
                    <button data-action="openSetupGuide" class="w-full btn-primary rounded-xl py-2.5 text-xs font-semibold">Open setup guide</button>
                    <button data-action="focusStudyInput" class="w-full btn-outline rounded-xl py-2.5 text-xs font-semibold mt-2">Paste notes instead</button>
                `;
                if (contextSnapshot) contextSnapshot.innerHTML = '<p class="text-xs text-ink-50">No class packet loaded yet. Try the sample guide or add your own notes.</p>';
            }

            const snapshot = getSavedSessionSnapshot();
            if (snapshot?.cards?.length) {
                if (lastSession) lastSession.textContent = snapshot.courseName || 'Previous study session';
                if (lastSessionMeta) lastSessionMeta.textContent = `Card ${(snapshot.currentCardIndex || 0) + 1} of ${snapshot.cards.length} - ${snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleDateString() : 'Saved recently'}`;
            } else {
                if (lastSession) lastSession.textContent = 'No saved session yet';
                if (lastSessionMeta) lastSessionMeta.textContent = 'Generate a guide to create one.';
            }

            window.updateSetupProgressUI?.();
        }
        window.updateStudyFlowHome = updateStudyFlowHome;
        window.getActiveStoredClass = getActiveStoredClass;
        window.hasAppAccess = hasAppAccess;

        function renderStudentModeBanner(_course) {
            const banner = document.getElementById('student-mode-banner');
            if (banner) banner.classList.add('hidden');
        }

        function syncStudyAiModeBanner() {
            const banner = document.getElementById('study-ai-mode-banner');
            if (!banner) return;
            banner.classList.add('hidden');
            banner.innerHTML = '';
        }
        window.syncStudyAiModeBanner = syncStudyAiModeBanner;

        function openContextualAI(prompt) {
            if (!hasAppAccess()) {
                window.enterExplorePath?.('neuro');
                showNotification('Sample class loaded', 'Study AI uses demo notes until you set up your real class.', 'info');
            }
            switchTab('ai');
            const contextualPrompt = prompt || window.getCurrentStudyAIPrompt?.() || 'Help me decide what to study next from my selected class and current notes.';
            setTimeout(() => window.StudentUChat?.usePrompt?.(contextualPrompt), 120);
            window.refreshFlowCompass?.();
        }

        function switchDashboardSubTab(subTabName) {
            if ((subTabName === 'planner' || subTabName === 'progress') && isLockedFirstSessionTab('dashboard')) {
                showLockedTabMessage();
                return;
            }
            document.querySelectorAll('.dash-sub-pane').forEach(pane => pane.classList.add('hidden'));

            const targetPane = document.getElementById('dash-sub-pane-' + subTabName);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                setTimeout(() => {
                    targetPane.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }

            document.querySelectorAll('.dash-sub-nav-btn').forEach(btn => {
                const isActive = btn.dataset.subtab === subTabName;
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('bg-white', isActive);
                btn.classList.toggle('shadow-sm', isActive);
                btn.classList.toggle('font-semibold', isActive);
                btn.classList.toggle('text-ink-100', !isActive);
                btn.classList.toggle('font-medium', !isActive);
            });

            if (subTabName === 'account') {
                window.StudentUClassPortfolio?.renderAccount?.();
                window.refreshStudyServiceStatus?.();
            }
            if (subTabName === 'planner') {
                window.renderFirstStudyPlan?.();
                if (getCompletedSessionCount() > 0) {
                    window.StudentUHappyPath?.markPlannerViewed?.();
                }
            }
            if (subTabName === 'overview' || subTabName === 'progress') {
                window.refreshDashboard?.();
            }
        }

        function switchClassesSubView(subViewName) {
            document.querySelectorAll('.class-sub-view').forEach(view => view.classList.add('hidden'));

            const targetView = document.getElementById('class-view-' + subViewName);
            if (targetView) {
                targetView.classList.remove('hidden');
                setTimeout(() => {
                    targetView.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }

            document.querySelectorAll('.class-sub-nav-btn').forEach(btn => {
                const isActive = btn.dataset.subview === subViewName;
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('bg-white', isActive);
                btn.classList.toggle('shadow-sm', isActive);
                btn.classList.toggle('font-semibold', isActive);
                btn.classList.toggle('text-ink-100', !isActive);
                btn.classList.toggle('font-medium', !isActive);
            });

            if (subViewName === 'materials') {
                window.StudentUClassPortfolio?.renderMaterials?.();
            }
        }

        function initRevealSections() {
            const revealEls = document.querySelectorAll('.reveal');
            if (!revealEls.length) return;

            document.body.classList.add('reveal-ready');

            if (!('IntersectionObserver' in window)) {
                revealEls.forEach(el => el.classList.add('visible'));
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: document.getElementById('main-scroll'),
                threshold: 0.08,
                rootMargin: '0px 0px -40px 0px'
            });

            revealEls.forEach(el => observer.observe(el));
            document.querySelectorAll('.tab-pane:not(.hidden) .reveal').forEach(el => el.classList.add('visible'));
        }

        // ---- LOGO ANIMATION & RANDOMIZATION ----
        function initLogoColors() {
            const wordmarks = document.querySelectorAll('.studentu-wordmark');
            wordmarks.forEach(wm => {
                const dot = wm.querySelector('span');
                if (dot) {
                    dot.classList.add('logo-dot');
                    dot.classList.remove('bg-accent-blue', 'bg-accent-yellow');
                }

                const text = "StudentU";
                wm.innerHTML = '';

                for (let char of text) {
                    const letterSpan = document.createElement('span');
                    letterSpan.className = 'logo-letter inline-block';
                    letterSpan.textContent = char;
                    wm.appendChild(letterSpan);
                }

                if (dot) {
                    wm.appendChild(dot);
                }
            });

            animateLogoColors();
        }

        function animateLogoColors() {
            const letters = document.querySelectorAll('.logo-letter');
            const dots = document.querySelectorAll('.logo-dot');

            // Add animating class to trigger CSS color keyframes
            letters.forEach(letter => letter.classList.add('animating'));
            dots.forEach(dot => dot.classList.add('animating'));

            // Wait 3.8s for the CSS animation and staggered delay to finish, then set random final colors
            setTimeout(() => {
                const colors = ['#1E88E5', '#E53935', '#FDD835']; // Blue, Red, Yellow

                letters.forEach(letter => {
                    letter.classList.remove('animating');
                    letter.style.color = ''; // Return to standard stylesheet color (black/ink-400)
                });

                // Shuffle array helper to ensure all 3 colors are uniquely assigned
                const shuffleArray = (arr) => arr.slice().sort(() => Math.random() - 0.5);

                const headerBrandColors = shuffleArray(colors);
                const footerBrandColors = shuffleArray(colors);

                // Apply to header logo lockup elements
                const headerSvg = document.querySelector('.studentu-vector-logo');
                const headerDot = document.querySelector('.studentu-brand-lockup .logo-dot');
                if (headerSvg) {
                    const rect = headerSvg.querySelector('rect');
                    const path = headerSvg.querySelector('path');
                    if (rect) rect.style.stroke = headerBrandColors[0];
                    if (path) path.style.fill = headerBrandColors[1];
                }
                if (headerDot) {
                    headerDot.classList.remove('animating');
                    headerDot.style.backgroundColor = headerBrandColors[2];
                }

                // Apply to footer logo lockup elements
                const footerSvg = document.querySelector('.studentu-footer-vector-logo');
                const footerDot = document.querySelector('.studentu-footer-lockup .logo-dot');
                if (footerSvg) {
                    const rect = footerSvg.querySelector('rect');
                    const path = footerSvg.querySelector('path');
                    if (rect) rect.style.stroke = footerBrandColors[0];
                    if (path) path.style.fill = footerBrandColors[1];
                }
                if (footerDot) {
                    footerDot.classList.remove('animating');
                    footerDot.style.backgroundColor = footerBrandColors[2];
                }
            }, 3800);
        }

        function triggerUAIAnimation() {
            const btn = document.getElementById('header-uai-btn');
            if (btn) {
                btn.classList.remove('animating-border');
                // Force a reflow to restart CSS keyframe animations
                void btn.offsetWidth;
                btn.classList.add('animating-border');
                setTimeout(() => {
                    btn.classList.remove('animating-border');
                }, 4000); // 2 rotations * 2 seconds = 4000ms
            }
        }

        // ===== PREMIUM CUSTOM DROPDOWN CONVERTER =====
        function convertSelectsToCustomDropdowns() {
            const selects = document.querySelectorAll('select:not(.custom-dropdown-hidden)');
            selects.forEach(select => {
                // Skip explicitly hidden selects or already converted ones
                if (select.classList.contains('custom-dropdown-hidden') ||
                    select.classList.contains('hidden') ||
                    select.style.display === 'none') {
                    return;
                }

                // Hide native select
                select.classList.add('custom-dropdown-hidden');
                select.style.display = 'none';

                // Create wrapper container
                const container = document.createElement('div');
                container.className = 'custom-dropdown-container';
                if (select.classList.contains('w-full')) container.classList.add('w-full');
                if (select.classList.contains('mb-4')) container.classList.add('mb-4');
                if (select.classList.contains('mt-2')) container.classList.add('mt-2');

                // Create trigger button inheriting native select classes
                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.className = `custom-dropdown-trigger flex items-center justify-between text-left focus:outline-none ${select.className}`;
                trigger.classList.remove('w-full', 'mb-4', 'mt-2', 'custom-dropdown-hidden');
                trigger.classList.add('w-full');

                const textSpan = document.createElement('span');
                textSpan.className = 'custom-dropdown-selected-text truncate mr-2';
                trigger.appendChild(textSpan);

                // Add chevron SVG icon
                trigger.innerHTML += `
                    <svg class="custom-dropdown-chevron w-3.5 h-3.5 text-ink-100 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                `;
                const labelSpan = trigger.querySelector('.custom-dropdown-selected-text');

                // Create options menu overlay
                const menu = document.createElement('div');
                menu.className = 'custom-dropdown-menu';

                container.appendChild(trigger);
                container.appendChild(menu);

                // Insert wrapper container before the native select
                select.parentNode.insertBefore(container, select);

                // Rebuild custom options menu items
                function rebuildOptions() {
                    menu.innerHTML = '';
                    const options = select.options;
                    if (options.length === 0) {
                        labelSpan.textContent = select.placeholder || '';
                        return;
                    }

                    let activeText = '';
                    Array.from(options).forEach(opt => {
                        const optButton = document.createElement('button');
                        optButton.type = 'button';
                        optButton.className = 'custom-dropdown-option';
                        optButton.textContent = opt.textContent;
                        optButton.dataset.value = opt.value;

                        if (opt.selected) {
                            optButton.classList.add('active');
                            activeText = opt.textContent;
                        }

                        optButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            select.value = opt.value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));

                            labelSpan.textContent = opt.textContent;
                            menu.querySelectorAll('.custom-dropdown-option').forEach(btn => {
                                btn.classList.toggle('active', btn.dataset.value === opt.value);
                            });

                            menu.classList.remove('show');
                            container.classList.remove('open');
                        });

                        menu.appendChild(optButton);
                    });

                    if (!activeText && options.length > 0) {
                        activeText = options[0].textContent;
                        select.value = options[0].value;
                    }
                    labelSpan.textContent = activeText;
                }

                rebuildOptions();

                // Listen for native select change events (e.g. programmatic changes)
                select.addEventListener('change', () => {
                    const selectedOpt = select.options[select.selectedIndex];
                    if (selectedOpt) {
                        labelSpan.textContent = selectedOpt.textContent;
                        menu.querySelectorAll('.custom-dropdown-option').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.value === select.value);
                        });
                    }
                });

                // Observe option list changes to dynamically rebuild menu
                const selectObserver = new MutationObserver(() => {
                    rebuildOptions();
                });
                selectObserver.observe(select, { childList: true, subtree: true, characterData: true });

                // Handle menu opening/closing
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menu.classList.contains('show');

                    // Close other open dropdowns
                    document.querySelectorAll('.custom-dropdown-menu.show').forEach(otherMenu => {
                        if (otherMenu !== menu) {
                            otherMenu.classList.remove('show');
                            otherMenu.closest('.custom-dropdown-container').classList.remove('open');
                        }
                    });

                    menu.classList.toggle('show', !isOpen);
                    container.classList.toggle('open', !isOpen);
                });
            });
        }

        // Close dropdowns on outside click
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown-container')) {
                document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                    menu.closest('.custom-dropdown-container').classList.remove('open');
                });
            }
        });

        async function openDeveloperSettings() {
            // FIX: Remove AI key banner from student view - API configuration is dev-mode only.
            if (localStorage.getItem('studentu_dev_mode') !== 'true') return;
            document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
            document.getElementById('tab-dashboard')?.classList.remove('hidden');
            switchDashboardSubTab('account');
        }

        function syncClassSelectors(courseKey) {
            if (!courseKey) return;
            const courseSel = document.getElementById('course-selector');
            const aiSel = document.getElementById('ai-class-selector');
            if (courseSel) courseSel.value = courseKey;
            if (aiSel) aiSel.value = courseKey;
            window.StudentUClassPortfolio?.select?.(courseKey);
        }
        window.syncClassSelectors = syncClassSelectors;

        function loadPacketAndWorkspace() {
            const courseId = document.getElementById('ai-class-selector')?.value
                || document.getElementById('course-selector')?.value;
            if (courseId) syncClassSelectors(courseId);
            if (typeof loadSelectedClassPacket === 'function') loadSelectedClassPacket();
            switchTab('workspace');
            expandStudyGuidePanel();
            setTimeout(() => {
                document.getElementById('study-material')?.focus();
                updateStudyFlowHome();
            }, 120);
        }
        window.loadPacketAndWorkspace = loadPacketAndWorkspace;

        function initLandingMockPreview() {
            const mock = document.getElementById('landing-mock');
            if (!mock) return;

            const scenes = [
                {
                    task: 0,
                    title: 'Study AI · Neural Networks',
                    headline: 'Backpropagation, step by step',
                    recall: 'Can you explain the chain rule before looking at the layers?',
                    grid: [
                        ['Key idea', 'Gradients flow backward through each layer.'],
                        ['Example', 'Loss → weights update via partial derivatives.'],
                        ['Next step', 'Quiz yourself on matrix shapes.'],
                    ],
                    chips: ['Explain chain rule', 'Quiz me'],
                },
                {
                    task: 1,
                    title: 'Study AI · Neural Networks',
                    headline: 'Quick recall check',
                    recall: 'What shape must the weight matrix W be for z = Wx + b?',
                    grid: [
                        ['Format', '3 short questions from your lecture notes.'],
                        ['Focus', 'Chain rule and partial derivatives.'],
                        ['Next step', 'Track misses as weak topics.'],
                    ],
                    chips: ['Harder questions', 'Show answers'],
                },
                {
                    task: 2,
                    title: 'Study AI · Neural Networks',
                    headline: 'Review queue for this week',
                    recall: 'Which topic felt shakiest after your last quiz?',
                    grid: [
                        ['Due now', 'Backpropagation chain rule — high impact.'],
                        ['Soon', 'Gradient descent learning rate.'],
                        ['Next step', '15 min review block tonight.'],
                    ],
                    chips: ['Drill weak spots', 'Open planner'],
                },
                {
                    task: 3,
                    title: 'Study AI · Neural Networks',
                    headline: 'Your week, organized',
                    recall: 'When is your next exam or major assignment?',
                    grid: [
                        ['Mon', 'Explain new chapter + 10 recall cards.'],
                        ['Wed', 'Quiz weak topics from last session.'],
                        ['Fri', 'Spaced review before the weekend.'],
                    ],
                    chips: ['Add exam date', 'Adjust plan'],
                },
            ];

            const headline = document.getElementById('landing-mock-headline');
            const recall = document.getElementById('landing-mock-recall');
            const grid = document.getElementById('landing-mock-grid');
            const chips = document.getElementById('landing-mock-chips');
            const title = document.getElementById('landing-mock-title');
            const tasks = mock.querySelectorAll('.landing-mock__task');
            const composer = document.getElementById('landing-mock-composer');
            const uai = document.getElementById('landing-mock-uai');
            const stage = mock.querySelector('.landing-mock__stage');

            const applyScene = (index) => {
                const scene = scenes[index];
                if (!scene) return;

                tasks.forEach((task, i) => task.classList.toggle('is-active', i === scene.task));
                if (title) title.textContent = scene.title;
                if (headline) headline.textContent = scene.headline;
                if (recall) recall.textContent = scene.recall;
                if (grid) {
                    grid.innerHTML = scene.grid.map(([label, text]) =>
                        `<div><small>${label}</small><p>${text}</p></div>`).join('');
                }
                if (chips) {
                    chips.innerHTML = scene.chips.map(text =>
                        `<span class="landing-mock__chip">${text}</span>`).join('');
                }
                if (stage) {
                    stage.classList.remove('is-updating');
                    void stage.offsetWidth;
                    stage.classList.add('is-updating');
                }
                composer?.classList.add('is-active');
                uai?.classList.add('is-pulse');
                setTimeout(() => uai?.classList.remove('is-pulse'), 2200);
            };

            document.addEventListener('studentu:landing-loop-step', (event) => {
                applyScene(event.detail?.index ?? 0);
            });

            applyScene(0);
        }

        function showNewUserOnboarding() {
            // FIX: Fix onboarding not triggering - trigger only for brand-new students after initial render.
            if (!currentUser || localStorage.getItem('studentu_real_user') || localStorage.getItem('studentu_onboarding_complete')) return;
            console.log('[StudentU] onboarding triggered');
            let overlay = document.getElementById('new-user-onboarding-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'new-user-onboarding-overlay';
                overlay.className = 'fixed inset-0 z-[9997] bg-ink-500/50 backdrop-blur-sm flex items-center justify-center p-4';
                overlay.innerHTML = `
                    <div class="onboarding-modal su-panel w-full max-w-lg p-8 sm:p-9">
                        <span class="su-eyebrow">Welcome</span>
                        <h2 class="su-display text-2xl mt-1">Set up your first study space</h2>
                        <p class="su-lead text-sm mt-2">Pick one path to start — you can switch anytime.</p>
                        <div class="onboarding-modal__steps mt-6">
                            <div class="onboarding-modal__step">
                                <span class="onboarding-modal__step-num">A</span>
                                <span class="onboarding-modal__step-text"><strong>Explore sample</strong> — 2-minute demo with Neural Networks notes</span>
                            </div>
                            <div class="onboarding-modal__step">
                                <span class="onboarding-modal__step-num">B</span>
                                <span class="onboarding-modal__step-text"><strong>Set up my class</strong> — syllabus, notes, first guide, planner</span>
                            </div>
                        </div>
                        <button type="button" data-action="enterSetupPath" class="w-full btn-primary rounded-xl py-3 text-sm font-semibold">Set Up My Class</button>
                        <button type="button" data-action="enterExplorePath" data-demo-course="neuro" class="w-full btn-outline rounded-xl py-3 text-sm font-medium mt-2">Explore Sample First</button>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
            overlay.classList.remove('hidden');
        }

        function completeNewUserOnboarding() {
            window.StudentUHappyPath?.startHappyPath?.({ fromOnboarding: true })
              ?? (() => {
                localStorage.setItem('studentu_onboarding_complete', 'true');
                document.getElementById('new-user-onboarding-overlay')?.classList.add('hidden');
                switchTab('profile');
              })();
            updateStudyFlowHome();
        }

        function initLandingStudyLoop() {
            const rail = document.getElementById('landing-study-loop');
            if (!rail) return;

            const steps = Array.from(rail.querySelectorAll('.landing-loop__step'));
            const progress = document.getElementById('landing-loop-progress');
            const liveText = rail.querySelector('.landing-loop__live-text');
            if (!steps.length) return;

            const liveCopy = [
                'Understand — explanations from your notes',
                'Practice — quizzes built from your materials',
                'Remember — spaced review before exam day',
                'Repeat — the loop adapts as you improve'
            ];

            let activeIndex = 0;
            let timerId = null;
            const STEP_MS = 4500;

            const setStep = (index, { fromUser = false } = {}) => {
                activeIndex = index;
                steps.forEach((step, i) => {
                    const isActive = i === index;
                    step.classList.toggle('is-active', isActive);
                    step.setAttribute('aria-selected', isActive ? 'true' : 'false');
                });
                if (progress) {
                    progress.style.width = `${((index + 1) / steps.length) * 100}%`;
                }
                if (liveText) {
                    liveText.textContent = liveCopy[index] || '';
                }
                document.dispatchEvent(new CustomEvent('studentu:landing-loop-step', { detail: { index } }));
                if (fromUser && timerId) {
                    clearInterval(timerId);
                    timerId = setInterval(advance, STEP_MS);
                }
            };

            const advance = () => {
                setStep((activeIndex + 1) % steps.length);
            };

            steps.forEach((step, index) => {
                step.addEventListener('click', () => setStep(index, { fromUser: true }));
            });

            rail.addEventListener('mouseenter', () => {
                if (timerId) clearInterval(timerId);
            });

            rail.addEventListener('mouseleave', () => {
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                timerId = setInterval(advance, STEP_MS);
            });

            setStep(0);
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                timerId = setInterval(advance, STEP_MS);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            bindAppStateToStore();
            initRevealSections();
            initLogoColors();
            initLandingStudyLoop();
            initLandingMockPreview();
            switchDashboardSubTab('overview');
            switchClassesSubView('detail');
            updateLockedTabs();
            updateStudyFlowHome();
            window.loadGamificationState?.();
            window.updateUserTierDisplay?.();
            window.refreshDashboard?.();
            window.restoreFlowSession?.();
            routeToStudyHome();
            setTimeout(showNewUserOnboarding, 300);
            triggerUAIAnimation();

            // Convert initial selects
            convertSelectsToCustomDropdowns();

            // Watch for dynamically inserted select elements
            const globalSelectObserver = new MutationObserver(() => {
                convertSelectsToCustomDropdowns();
            });
            globalSelectObserver.observe(document.body, { childList: true, subtree: true });
        });
