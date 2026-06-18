        const placeholderMaterials = window.StudentUDemoData?.materials || {};
        const courseCardDecks = window.StudentUDemoData?.courseCardDecks || {};
        const courseRecallQuestions = window.StudentUDemoData?.courseRecallQuestions || {};

        function handleCourseChange() {
            const key = document.getElementById('course-selector').value;
            const material = document.getElementById('study-material');
            if (!material) return;
            if (typeof classPortfolios !== 'undefined') {
                const course = classPortfolios.find(item => item.id === key);
                if (course) {
                    const photoText = window.StudentUPhotoNotes?.getCombinedLecturePhotoText?.(course) || '';
                    material.value = photoText || (typeof buildClassContext === 'function' ? buildClassContext(key) : '');
                    return;
                }
            }
            if (placeholderMaterials[key]) {
                material.value = placeholderMaterials[key];
            }
        }

        function ensureDemoClassPortfolio(courseKey = 'neuro') {
            const demoCourses = window.StudentUDemoData?.classPortfolios || [];
            const key = placeholderMaterials[courseKey] ? courseKey : 'neuro';
            const demoCourse = demoCourses.find(course => course.id === key) || demoCourses[0];
            if (!demoCourse) return key;

            const seededCourse = JSON.parse(JSON.stringify(demoCourse));
            seededCourse.demoSeed = true;
            seededCourse.materials = seededCourse.materials?.length
                ? seededCourse.materials
                : [{ id: `${key}-demo-notes`, type: 'Lecture Notes', title: 'Demo notes', source: 'StudentU demo', notes: placeholderMaterials[key] || '' }];

            activeClassPortfolioId = seededCourse.id;
            classPortfolios = [
                seededCourse,
                ...classPortfolios.filter(course => course.id !== seededCourse.id && !course.demoSeed),
            ];
            window.StudentUStore?.setClassPortfolios?.(classPortfolios, activeClassPortfolioId);
            if (typeof updateCourseSelectorFromPortfolios === 'function') updateCourseSelectorFromPortfolios();
            if (typeof renderClassPortfolios === 'function') renderClassPortfolios();
            return seededCourse.id;
        }

        function loadDemoWorkspace(courseKey = 'neuro') {
            const key = placeholderMaterials[courseKey] ? courseKey : 'neuro';
            const activeKey = ensureDemoClassPortfolio(key);
            window.syncClassSelectors?.(key);
            handleCourseChange();
            window.expandStudyGuidePanel?.();
            window.updateStudyFlowHome?.();
            const material = document.getElementById('study-material');
            if (material && !material.value.trim() && placeholderMaterials[key]) {
                material.value = placeholderMaterials[key];
            }
            const selector = document.getElementById('course-selector');
            if (selector && Array.from(selector.options).some(option => option.value === activeKey)) {
                selector.value = activeKey;
            }
            window.StudentUChat?.renderWorkspace?.();
        }

        function handleUseCaseDemo(courseKey) {
            window.StudentUFlow?.setFlowPath?.('explore');
            window.enterGuestStudyMode?.();
            switchTab('workspace');
            loadDemoWorkspace(courseKey);
            window.expandStudyGuidePanel?.();
            const labels = { neuro: 'Neural Networks', calc: 'Calculus III', hist: 'History of Art', macro: 'Macroeconomics' };
            showNotification('Sample class loaded', `${labels[courseKey] || 'Demo'} notes are ready on the Study Desk.`, 'info');
            window.updateSetupProgressUI?.();
            window.refreshFlowCompass?.();
        }

        function handleFileUpload(event) {
            if (!checkUsageLimit('upload')) return;
            const file = event.target.files[0];
            if (!file) return;
            // FIX: Dishonest file upload - Study Desk only reads plain text formats directly.
            if (!/\.(txt|md)$/i.test(file.name || '')) {
                showNotification('Unsupported File', 'Use .txt or .md here. Upload PDFs and DOCX via My Classes.', 'error');
                event.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => { document.getElementById('study-material').value = e.target.result; incrementUsage('upload'); showNotification('File Loaded', `${file.name} loaded successfully.`, 'success'); };
            reader.readAsText(file);
        }

        // ---- LESSON BREAKDOWN SYSTEM HANDLERS ----
        let activeCards = [];
        let activeQuestions = [];
        let currentCardIndex = 0;
        let cardStates = []; // 'neutral', 'learned', 'missed', 'review'
        let activeSessionTimer = null;
        let studySessionSeconds = 0;
        let isTimerRunning = false;
        let studyTimerDuration = 25 * 60;
        let breakTimerDuration = 5 * 60;
        let breakSessionTimer = null;
        let currentBreakSeconds = 0;
        let currentRecallQuestion = null;
        const resumeSessionKey = 'studentu_resume_session';

        function saveSessionSnapshot() {
            if (!activeSession || !activeCards.length) return;
            localStorage.setItem(resumeSessionKey, JSON.stringify({
                courseKey: activeSession.courseKey,
                courseName: activeSession.courseName,
                cards: activeCards,
                questions: activeQuestions,
                cardStates,
                currentCardIndex,
                startedAt: activeSession.startTime,
                savedAt: new Date().toISOString(),
            }));
            window.updateStudyFlowHome?.();
        }

        function clearSessionSnapshot() {
            localStorage.removeItem(resumeSessionKey);
            window.updateStudyFlowHome?.();
        }

        function continuePreviousSession() {
            let snapshot = null;
            try {
                snapshot = JSON.parse(localStorage.getItem(resumeSessionKey) || 'null');
            } catch (error) {
                snapshot = null;
            }
            if (!snapshot?.cards?.length) {
                showNotification('No Saved Session', 'Generate a study guide to create a resumable session.', 'info');
                return;
            }

            assignActiveSession({
                courseKey: snapshot.courseKey || 'neuro',
                courseName: snapshot.courseName || 'Previous study session',
                pointsEarned: 0,
                conceptsMarkedLearned: 0,
                conceptsMissed: 0,
                conceptsReviewed: 0,
                readinessBefore: 74,
                readinessAfter: 74,
                cardsList: snapshot.cards,
                questionsList: snapshot.questions || [],
                currentIndex: snapshot.currentCardIndex || 0,
                startTime: snapshot.startedAt || Date.now(),
            });
            activeCards = snapshot.cards;
            activeQuestions = snapshot.questions || [];
            cardStates = Array.isArray(snapshot.cardStates) && snapshot.cardStates.length === activeCards.length
                ? snapshot.cardStates
                : activeCards.map(() => 'neutral');
            currentCardIndex = Math.min(snapshot.currentCardIndex || 0, activeCards.length - 1);

            const setupPane = document.getElementById('study-desk-setup');
            const activePane = document.getElementById('study-desk-active');
            if (setupPane) setupPane.classList.add('hidden');
            if (activePane) activePane.classList.remove('hidden');
            const label = document.getElementById('active-session-subject-label');
            if (label) label.innerText = activeSession.courseName;
            renderCard();
            updateHighlightStats();
            document.getElementById('main-scroll').scrollTop = 0;
            showNotification('Session Restored', 'You are back where you left off.', 'success');
        }

        function getCurrentStudyAIPrompt() {
            if (!activeSession || !activeCards[currentCardIndex]) {
                const selector = document.getElementById('course-selector');
                const courseName = selector?.options?.[selector.selectedIndex]?.text || 'my selected class';
                return `Help me decide what to study next for ${courseName} using my loaded class packet and notes.`;
            }
            const card = activeCards[currentCardIndex];
            const styleHint = window.StudentUStudySettings?.getChatStyleHint?.()
                || 'Explain this visually, give me one concrete example, and ask one recall question.';
            return [
                `I am studying ${activeSession.courseName}.`,
                `Current card: ${card.title}.`,
                `Simple explanation: ${card.feynman}`,
                `Analogy: ${card.analogy}`,
                `Common mistake: ${card.mistake}`,
                styleHint,
            ].filter(Boolean).join('\n');
        }

        function orderCardsForLearning(cards) {
            if (typeof buildDependencyGraph !== 'function') return cards;
            const result = buildDependencyGraph(cards);
            if (!result.sortedCards || result.sortedCards.length !== cards.length) return cards;
            return result.sortedCards;
        }

        async function validateRecallQuestionsForCards(questions, cards) {
            if (!Array.isArray(questions)) return [];
            const results = await Promise.all(questions.map(async question => {
                const card = cards[question.cardIndexTrigger] || cards.find(item => item.id === question.cardId);
                if (!card) return false;
                try {
                    return (await window.StudentUAnalyticsAPI?.validateQuestion?.(card, question))?.isCoherent !== false;
                } catch (error) {
                    return true;
                }
            }));
            return questions.filter((_, index) => results[index]);
        }

        function getReviewHistoryForCard(cardId) {
            try {
                return JSON.parse(localStorage.getItem(`studentu_review_history_${cardId}`) || '[]');
            } catch (error) {
                return [];
            }
        }

        function saveReviewHistoryForCard(card, performance) {
            const history = getReviewHistoryForCard(card.id);
            history.push({
                correct: performance === 'learned',
                performance,
                difficulty: card.difficulty,
                date: new Date().toISOString()
            });
            localStorage.setItem(`studentu_review_history_${card.id}`, JSON.stringify(history.slice(-12)));
        }

        function inspectCurrentComprehensionGap() {
            if (typeof findComprehensionGaps !== 'function') return null;
            const card = activeCards[currentCardIndex];
            if (!card) return null;
            const key = getActiveCardKey();
            const highlightedHTML = savedCardHighlights[key];
            if (!highlightedHTML) return null;
            const gap = findComprehensionGaps(card.id, highlightedHTML, card.feynman);
            if (gap && (gap.gapSeverity === 'critical' || gap.gapSeverity === 'high')) {
                activeSession.comprehensionGaps = activeSession.comprehensionGaps || [];
                if (!activeSession.comprehensionGaps.some(item => item.cardId === card.id)) {
                    activeSession.comprehensionGaps.push(gap);
                    showNotification('Review Tip', 'One part of this concept may need another pass.', 'info');
                }
            }
            return gap;
        }

        function generateCustomRecallQuestions(cards) {
            return cards.map((card, index) => {
                const question = `Which statement best describes the core mechanism of "${card.title}"?`;
                const summary = card.feynman.substring(0, 80) + "...";
                const options = [
                    `It is characterized by: ${summary}`,
                    `It acts independently of related sub-systems to prevent error propagation.`,
                    `It scales dynamically, but only when user inputs are fully scaled to zero.`,
                    `It refers to the static, unadjusted baseline that occurs before any changes are applied.`
                ];

                const correctText = options[0];
                const shuffled = [...options].sort(() => Math.random() - 0.5);
                const correctIdx = shuffled.indexOf(correctText);

                return {
                    cardIndexTrigger: index,
                    difficulty: card.difficulty === 'Beginner' ? 'EASY' : (card.difficulty === 'Intermediate' ? 'MEDIUM' : 'HARD'),
                    question: question,
                    options: shuffled,
                    correct: correctIdx,
                    explanation: `As covered in the lesson: "${card.feynman.substring(0, 150)}..."`,
                    sourceLabel: card.sourceLabel || 'Class packet'
                };
            });
        }

        function getActiveCardKey() {
            if (!activeCards || !activeCards[currentCardIndex] || !activeSession) return '';
            const currentCard = activeCards[currentCardIndex];
            return activeSession.courseKey + '_' + (currentCard.id || currentCardIndex);
        }

        function getCardExplanationElement() {
            return document.getElementById('active-card-explanation') || document.getElementById('card-feynman');
        }

        function getHighlightToolbarElement() {
            return document.getElementById('highlight-floating-toolbar') || document.getElementById('highlight-toolbar');
        }

        function setTextForIds(ids, value) {
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = value;
            });
        }

        function returnToSetupPane() {
            const summaryScreen = document.getElementById('session-summary-screen');
            const setupPane = document.getElementById('study-desk-setup');
            if (summaryScreen) summaryScreen.classList.add('hidden');
            if (setupPane) setupPane.classList.remove('hidden');
        }

        function startSpecificPlannedSession(key) {
            switchTab('workspace');
            let matched = 'neuro';
            if (key === 'neural' || key === 'neuro') matched = 'neuro';
            else if (key === 'calc') matched = 'calc';
            else if (key === 'hist') matched = 'hist';
            else if (key === 'macro') matched = 'macro';

            document.getElementById('course-selector').value = matched;
            handleCourseChange();
            setTimeout(() => {
                startStudySession();
            }, 300);
        }

        window.handleUseCaseDemo = handleUseCaseDemo;

        function handleHeroAction(actionType) {
            if (actionType === 'demo') {
                window.enterExplorePath?.('neuro');
                return;
            }
            if (actionType === 'setup' || actionType === 'upload') {
                document.getElementById('new-user-onboarding-overlay')?.classList.add('hidden');
                localStorage.setItem('studentu_onboarding_complete', 'true');
                window.enterSetupPath?.();
                return;
            }
            window.enterGuestStudyMode?.();
            switchTab('workspace');
            window.expandStudyGuidePanel?.();
            document.getElementById('study-material')?.focus();
            showNotification('Ready to go', 'Paste your class notes to get started.', 'info');
            window.updateSetupProgressUI?.();
            window.refreshWorkspaceModeUI?.();
        }

        function handleTextSelection(event) {
            handleHighlightToolbarPopup(event);
        }

        function applyHighlight(color) {
            applySelectionHighlight(color);
        }

        function hideHighlightToolbar() {
            const toolbar = getHighlightToolbarElement();
            if (toolbar) toolbar.classList.add('hidden');
        }

        function markCard(state) {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            cardStates[currentCardIndex] = state;
            if (state === 'learned') autoHighlightCardGreen(currentCardIndex);
            if (state === 'missed') autoHighlightCardRed(currentCardIndex);
            renderCard();
            const learnedEl = document.getElementById('sidebar-cards-learned');
            const missedEl = document.getElementById('sidebar-cards-missed');
            if (learnedEl) learnedEl.innerText = cardStates.filter(item => item === 'learned').length;
            if (missedEl) missedEl.innerText = cardStates.filter(item => item === 'missed').length;

            const fatigue = window.StudentUSilent?.assessSessionFatigue?.(cardStates);
            if (fatigue?.fatigued && fatigue.recommendation === 'break' && typeof takeBreak === 'function') {
                showNotification('Quick break', 'You have missed several in a row — a short break can help retention.', 'info');
            } else if (fatigue?.fatigued && fatigue.recommendation === 'ease') {
                showNotification('Slow down', 'Try explaining this card out loud before moving on.', 'info');
            }
        }

        function takeBreak() {
            triggerSimulatedBreak();
        }

        function skipBreak() {
            skipBreakAndResume();
        }

        function openVerificationModal() {
            // FIX: First-time student walkthrough - make the visible verification modal usable instead of a dead placeholder.
            const modal = document.getElementById('verification-modal');
            if (!modal) return;
            const savedEmail = localStorage.getItem('studentu_verified_email') || currentUser?.email || '';
            const savedSchool = localStorage.getItem('studentu_verified_school') || '';
            const emailInput = document.getElementById('modal-email');
            const schoolInput = document.getElementById('modal-school');
            if (emailInput && savedEmail) emailInput.value = savedEmail;
            if (schoolInput && savedSchool) schoolInput.value = savedSchool;
            modal.classList.remove('hidden');
            setTimeout(() => emailInput?.focus(), 50);
        }

        function closeVerificationModal() {
            // FIX: First-time student walkthrough - close the verification modal from its visible close control.
            document.getElementById('verification-modal')?.classList.add('hidden');
        }

        function submitAcademicVerification() {
            // FIX: First-time student walkthrough - persist local student verification so header/account controls update.
            const emailInput = document.getElementById('modal-email');
            const schoolInput = document.getElementById('modal-school');
            const email = String(emailInput?.value || '').trim();
            const school = String(schoolInput?.value || '').trim();
            if (!email || !school) {
                showNotification('Verification Needed', 'Add your school email and university name.', 'info');
                return;
            }
            if (!email.toLowerCase().endsWith('.edu')) {
                showNotification('Use a .edu email', 'Student verification needs a college email address.', 'info');
                emailInput?.focus();
                return;
            }
            localStorage.setItem('studentu_verified_email', email);
            localStorage.setItem('studentu_verified_school', school);
            localStorage.setItem('studentu_tier', 'edu');
            closeVerificationModal();
            updateAuthUI?.();
            window.updateUserTierDisplay?.();
            window.StudentUCloudSync?.schedulePush?.();
            showNotification('Student Verified', `${school} verification saved on this device.`, 'success');
        }
