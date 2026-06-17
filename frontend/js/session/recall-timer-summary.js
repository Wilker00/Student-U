        // Session recall, timer, and summary modules
        function triggerRecallCheckpoint(q) {
            currentRecallQuestion = q;
            const difficultyEl = document.getElementById('recall-difficulty');
            if (difficultyEl) difficultyEl.innerText = q.difficulty;
            document.getElementById('recall-question-text').innerText = q.question;

            const container = document.getElementById('recall-options-container') || document.getElementById('recall-options');
            if (!container) {
                advanceNextCard();
                return;
            }
            container.innerHTML = '';

            const feedbackBox = document.getElementById('recall-feedback-box') || document.getElementById('recall-feedback');
            if (feedbackBox) feedbackBox.classList.add('hidden');

            const continueBtn = document.getElementById('recall-continue-btn');
            if (continueBtn) {
                continueBtn.disabled = true;
                continueBtn.className = "bg-surface-200 text-ink-50 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-not-allowed";
            }

            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left text-sm text-ink-200 border border-surface-300 hover:border-ink-200 focus:outline-none transition-all p-3 rounded-xl bg-surface-100/60";
                btn.innerText = opt;
                btn.dataset.action = 'submitRecallAnswer';
                btn.dataset.recallIndex = String(idx);
                container.appendChild(btn);
            });

            const overlay = document.getElementById('recall-checkpoint-overlay');
            if (overlay) overlay.classList.remove('hidden');
        }

        function submitRecallAnswer(selectedIdx) {
            if (!currentRecallQuestion) return;
            const q = currentRecallQuestion;

            const buttons = document.querySelectorAll('#recall-options-container button, #recall-options button');
            buttons.forEach((btn, idx) => {
                btn.disabled = true;
                if (idx === q.correct) {
                    btn.className = "w-full text-left text-sm text-emerald-900 border border-emerald-300 p-3 rounded-xl bg-emerald-100 font-semibold";
                } else if (idx === selectedIdx) {
                    btn.className = "w-full text-left text-sm text-rose-900 border border-rose-300 p-3 rounded-xl bg-rose-100 font-semibold";
                } else {
                    btn.className = "w-full text-left text-sm text-ink-100 border border-surface-200 p-3 rounded-xl bg-surface-50 opacity-60";
                }
            });

            const badge = document.getElementById('recall-feedback-badge');
            const pointsBadge = document.getElementById('recall-points-badge');
            const explanationText = document.getElementById('recall-feedback-explanation') || document.getElementById('recall-feedback');

            if (explanationText) explanationText.innerText = q.explanation;

            const isCorrect = (selectedIdx === q.correct);
            if (isCorrect) {
                if (badge) {
                    badge.innerText = "CORRECT";
                    badge.className = "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold";
                }
                if (pointsBadge) {
                    pointsBadge.innerText = "+10 points!";
                    pointsBadge.classList.remove('hidden');
                }

                cardStates[currentCardIndex] = 'learned';
                autoHighlightCardGreen(currentCardIndex);

                studentPoints += 10;
                if (studentPoints % 50 === 0) {
                    studentBadges += 1;
                    showNotification("New Badge Unlocked!", "Earned a badge for study consistency.", "success");
                }
                updateDashboardStats();
                StudentUSync.saveUser({
                    points: studentPoints,
                    badges: studentBadges,
                    last_active: new Date().toISOString()
                });

                // Update concept progress.
                StudentUSync.saveConcept({
                    id: activeCards[currentCardIndex].id,
                    course_id: activeSession ? activeSession.courseKey : 'neuro',
                    title: activeCards[currentCardIndex].title,
                    difficulty: activeCards[currentCardIndex].difficulty,
                    status: 'learned',
                    retention_score: 95,
                    times_correct: 1,
                    times_incorrect: 0,
                    feynman_text: activeCards[currentCardIndex].feynman,
                    analogy_text: activeCards[currentCardIndex].analogy,
                    mistake_text: activeCards[currentCardIndex].mistake,
                    why_it_matters: activeCards[currentCardIndex].whyItMatters || ""
                });
            } else {
                if (badge) {
                    badge.innerText = "INCORRECT";
                    badge.className = "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-semibold";
                }
                if (pointsBadge) pointsBadge.classList.add('hidden');

                cardStates[currentCardIndex] = 'missed';
                autoHighlightCardRed(currentCardIndex);

                // Update concept progress.
                StudentUSync.saveConcept({
                    id: activeCards[currentCardIndex].id,
                    course_id: activeSession ? activeSession.courseKey : 'neuro',
                    title: activeCards[currentCardIndex].title,
                    difficulty: activeCards[currentCardIndex].difficulty,
                    status: 'missed',
                    retention_score: 30,
                    times_correct: 0,
                    times_incorrect: 1,
                    feynman_text: activeCards[currentCardIndex].feynman,
                    analogy_text: activeCards[currentCardIndex].analogy,
                    mistake_text: activeCards[currentCardIndex].mistake,
                    why_it_matters: activeCards[currentCardIndex].whyItMatters || ""
                });
            }

            StudentUSync.saveQuizResult({
                course_id: activeSession ? activeSession.courseKey : 'neuro',
                concept_id: activeCards[currentCardIndex]?.id || "checkpoint",
                question_text: q.question,
                selected_answer: selectedIdx,
                correct_answer: q.correct,
                is_correct: isCorrect,
                difficulty: q.difficulty || "MEDIUM",
                time_taken_seconds: 5
            });

            const feedbackBox = document.getElementById('recall-feedback-box') || document.getElementById('recall-feedback');
            if (feedbackBox) feedbackBox.classList.remove('hidden');

            const continueBtn = document.getElementById('recall-continue-btn');
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.className = "bg-accent-teal text-white hover:bg-teal-600 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer";
            }
        }

        function dismissRecallCheckpoint() {
            const overlay = document.getElementById('recall-checkpoint-overlay');
            if (overlay) overlay.classList.add('hidden');
            renderCard();
            advanceNextCard();
        }

        // ---- Pomodoro Timer & Smart Break Reminders ----
        function toggleSessionTimer() {
            isTimerRunning = !isTimerRunning;
            const btnText = document.getElementById('play-pause-text');
            const btnIcon = document.getElementById('play-pause-icon');
            const timerDot = document.getElementById('timer-dot');

            if (isTimerRunning) {
                if (btnText) btnText.innerText = "Pause";
                if (btnIcon) btnIcon.innerText = "Pause";
                if (timerDot) timerDot.classList.add('animate-pulse');
            } else {
                if (btnText) btnText.innerText = "Resume";
                if (btnIcon) btnIcon.innerText = "Play";
                if (timerDot) timerDot.classList.remove('animate-pulse');
            }
        }

        function tickTimer() {
            if (!isTimerRunning) return;

            studySessionSeconds++;

            const remaining = studyTimerDuration - studySessionSeconds;
            if (remaining <= 0) {
                triggerSimulatedBreak();
            } else {
                updateTimerDisplay(remaining);
            }
        }

        function updateTimerDisplay(secondsLeft = studyTimerDuration) {
            const min = Math.floor(secondsLeft / 60);
            const sec = secondsLeft % 60;
            const display = document.getElementById('session-timer-display');
            if (display) display.innerText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

        function triggerSimulatedBreak() {
            isTimerRunning = false;
            const timerDot = document.getElementById('timer-dot');
            if (timerDot) timerDot.classList.remove('animate-pulse');

            const listContainer = document.getElementById('break-recap-list') || document.getElementById('break-learned-list');
            if (listContainer) {
                listContainer.innerHTML = '';

                activeCards.forEach((card, idx) => {
                    const state = cardStates[idx];
                    let stateBadge = `<span class="bg-surface-200 text-ink-100 text-[9px] px-1.5 py-0.5 rounded font-mono">Not Tested</span>`;
                    if (state === 'learned') {
                        stateBadge = `<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Solid</span>`;
                    } else if (state === 'missed') {
                        stateBadge = `<span class="bg-rose-100 text-rose-700 border border-rose-200 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">Needs Review</span>`;
                    }

                    const item = document.createElement('div');
                    item.className = "flex items-center justify-between py-2 border-b border-surface-200/50";
                    item.innerHTML = `
                        <span class="text-xs font-semibold text-ink-300 truncate max-w-[70%]">${card.title}</span>
                        ${stateBadge}
                    `;
                    listContainer.appendChild(item);
                });
            }

            const breakOverlay = document.getElementById('break-recap-screen') || document.getElementById('smart-break-overlay');
            if (breakOverlay) breakOverlay.classList.remove('hidden');

            currentBreakSeconds = 0;
            updateBreakTimerDisplay(breakTimerDuration);

            if (breakSessionTimer) clearInterval(breakSessionTimer);
            breakSessionTimer = setInterval(() => {
                currentBreakSeconds++;
                const left = breakTimerDuration - currentBreakSeconds;
                if (left <= 0) {
                    endBreakAndResume();
                } else {
                    updateBreakTimerDisplay(left);
                }
            }, 1000);
        }

        function updateBreakTimerDisplay(secondsLeft) {
            const min = Math.floor(secondsLeft / 60);
            const sec = secondsLeft % 60;
            const display = document.getElementById('break-timer-display');
            if (display) display.innerText = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

        function skipBreakAndResume() {
            endBreakAndResume();
        }

        function endBreakAndResume() {
            if (breakSessionTimer) clearInterval(breakSessionTimer);
            const breakOverlay = document.getElementById('break-recap-screen') || document.getElementById('smart-break-overlay');
            if (breakOverlay) breakOverlay.classList.add('hidden');

            reorderWeakestConceptsFirst();

            studySessionSeconds = 0;
            isTimerRunning = true;
            updateTimerDisplay();
            const timerDot = document.getElementById('timer-dot');
            if (timerDot) timerDot.classList.add('animate-pulse');

            renderCard();
            showNotification("Welcome Back!", "Starting with your weakest concepts to reinforce them.", "info");
        }

        function reorderWeakestConceptsFirst() {
            const missedIndices = [];
            cardStates.forEach((state, idx) => {
                if (state === 'missed') {
                    missedIndices.push(idx);
                }
            });

            if (missedIndices.length > 0) {
                const missedCards = [];
                const missedStates = [];
                const otherCards = [];
                const otherStates = [];

                activeCards.forEach((card, idx) => {
                    if (cardStates[idx] === 'missed') {
                        missedCards.push(card);
                        missedStates.push('missed');
                    } else {
                        otherCards.push(card);
                        otherStates.push(cardStates[idx]);
                    }
                });

                activeCards = [...missedCards, ...otherCards];
                cardStates = [...missedStates, ...otherStates];
                currentCardIndex = 0;
            }
        }

        // ---- Session Summary ----
        function endActiveStudySession() {
            if (confirm("Are you sure you want to end this study session early?")) {
                endActiveStudySessionAndShowSummary();
            }
        }

        async function endActiveStudySessionAndShowSummary() {
            if (activeSessionTimer) clearInterval(activeSessionTimer);
            if (breakSessionTimer) clearInterval(breakSessionTimer);
            isTimerRunning = false;

            document.getElementById('study-desk-active').classList.add('hidden');

            const totalCount = activeCards.length;
            const solidCount = cardStates.filter(s => s === 'learned').length;
            const missedCount = cardStates.filter(s => s === 'missed').length;
            const durationSecs = Math.round((Date.now() - activeSession.startTime) / 1000);
            const sessionId = `session_${Date.now()}`;
            const canonicalCardStates = Object.fromEntries(activeCards.map((card, idx) => [card.id, {
                status: cardStates[idx] || 'neutral',
                difficulty: card.difficulty || 'Intermediate',
                title: card.title || card.id,
            }]));
            const canonicalQuizResults = activeQuestions.map(question => {
                const card = activeCards[question.cardIndexTrigger] || activeCards.find(item => item.id === question.cardId || item.id === question.concept_id);
                const state = card ? canonicalCardStates[card.id]?.status : 'neutral';
                return {
                    cardId: card?.id || question.cardId || question.concept_id || 'general',
                    correct: state === 'learned',
                    difficulty: question.difficulty || card?.difficulty || 'MEDIUM',
                };
            });
            const canonicalSession = {
                id: sessionId,
                courseKey: activeSession.courseKey,
                durationMs: durationSecs * 1000,
                cardStates: canonicalCardStates,
                quizResults: canonicalQuizResults,
                createdAt: new Date().toISOString(),
            };
            let velocity = { trend: 'insufficient_data' };
            try {
                const completion = await window.StudentUAnalyticsAPI?.completeSession?.(sessionId, canonicalSession);
                velocity = completion?.velocity || velocity;
            } catch (error) {
                console.warn('Analytics session completion failed:', error);
            }
            await StudentUSync.saveSession?.(canonicalSession);

            const coveredEl = document.getElementById('summary-covered-count');
            const solidEl = document.getElementById('summary-solid-count') || document.getElementById('summary-learned-count');
            const missedEl = document.getElementById('summary-missed-count');
            if (coveredEl) coveredEl.innerText = totalCount;
            if (solidEl) solidEl.innerText = solidCount;
            if (missedEl) missedEl.innerText = missedCount;

            const pointsEarned = window.awardSessionGamification?.({
                solidCount,
                totalCount,
                cardsReviewed: totalCount,
            }) ?? ((solidCount * 10) + 5);
            const pointsEl = document.getElementById('summary-points-earned');
            if (pointsEl) pointsEl.innerText = `+${pointsEarned} XP`;

            updateDashboardStats();

            let motivation = "Incredible work today! You deconstructed this material into bite-sized retention blocks.";
            if (solidCount === totalCount) {
                motivation = "Perfect score! You have achieved absolute mastery of these concepts. Keep up the high retention streak! ";
            } else if (solidCount >= totalCount / 2) {
                motivation = "Superb effort! Most concepts are solid, and the spaced repetition loop will reinforce the rest automatically. ";
            } else {
                motivation = "Great start! Don't worry about the mistakes&mdash;spaced reviews are designed to build memory half-life precisely here. Strong";
            }
            if (velocity.trend === 'improving_fast' || velocity.trend === 'improving_slowly') {
                motivation += " Your recent sessions are trending upward.";
            } else if (velocity.trend === 'declining_fast' || velocity.trend === 'declining_slowly') {
                motivation += " StudentU will lower the next round's difficulty and reinforce the basics.";
            }
            const motivationEl = document.getElementById('summary-motivation-msg');
            if (motivationEl) motivationEl.innerText = motivation;

            const beforePercent = window.getCourseReadinessPercent?.(activeSession.courseKey) || 0;
            const gain = totalCount > 0 ? Math.round((solidCount / totalCount) * 12) : 0;
            const afterPercent = Math.min(99, beforePercent + gain);
            const beforeEl = document.getElementById('readiness-before-percent');
            const afterEl = document.getElementById('readiness-after-percent');
            const afterBar = document.getElementById('readiness-after-bar');
            if (beforeEl) beforeEl.innerText = beforePercent > 0 ? `${beforePercent}%` : '—';
            if (afterEl) afterEl.innerText = `${afterPercent}%`;
            if (afterBar) afterBar.style.width = `${afterPercent}%`;

            const learnedTitles = activeCards
                .filter((_card, idx) => cardStates[idx] === 'learned')
                .map(card => card.title);
            const missedTitles = activeCards
                .filter((_card, idx) => cardStates[idx] === 'missed')
                .map(card => card.title);
            if (typeof recordActiveClassStudyOutcome === 'function') {
                recordActiveClassStudyOutcome({
                    courseId: activeSession.courseKey,
                    learned: solidCount,
                    missed: missedCount,
                    concepts: activeCards.map(card => card.title),
                    missedConcepts: missedTitles,
                });
            }
            window.refreshDashboard?.();

            const forecastList = document.getElementById('forgetting-curve-list');
            if (forecastList) {
                forecastList.innerHTML = '';
                let serverScheduleByCard = {};
                try {
                    const scheduleResponse = await window.StudentUAnalyticsAPI?.getReviewSchedule?.();
                    serverScheduleByCard = Object.fromEntries((scheduleResponse?.schedule || []).map(item => [item.cardId, item]));
                } catch (error) {
                    serverScheduleByCard = {};
                }

                activeCards.forEach((card, idx) => {
                    const state = cardStates[idx];
                    const serverReview = serverScheduleByCard[card.id];
                    const reviewData = serverReview || null;
                    let intervalDays = reviewData ? (reviewData.intervalDays || reviewData.interval) : 3;
                    let recommendation = `Review in ${intervalDays} days`;
                    let badgeColor = "bg-amber-100 text-amber-700 border-amber-200";

                    if (state === 'learned') {
                        recommendation = `Review in ${intervalDays} days (memory is strengthening)`;
                        badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                    } else if (state === 'missed') {
                        recommendation = intervalDays <= 1 ? "Review tomorrow (reinforce immediately)" : `Review in ${intervalDays} days`;
                        badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
                    }

                    const reviewDate = reviewData ? new Date(reviewData.reviewDate) : new Date();
                    if (!reviewData) reviewDate.setDate(reviewDate.getDate() + intervalDays);
                    const dateString = reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    saveReviewHistoryForCard(card, state);

                    const item = document.createElement('div');
                    item.className = "flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-surface-200 last:border-0";
                    item.innerHTML = `
                        <div>
                            <span class="font-bold text-ink-300 block">${card.title}</span>
                            <span class="text-[10px] text-ink-50">${recommendation}</span>
                        </div>
                        <span class="mt-1 sm:mt-0 text-[10px] px-2 py-0.5 rounded font-mono font-bold ${badgeColor} border self-start">
                            ${dateString}
                        </span>
                    `;
                    forecastList.appendChild(item);
                });
            }

            const missedIds = activeCards
                .map((card, idx) => cardStates[idx] === 'missed' ? card.id : null)
                .filter(Boolean);
            let weakClusters = [];
            try {
                weakClusters = (await window.StudentUAnalyticsAPI?.getWeakSpotDrills?.(activeSession.courseKey, missedIds))?.clusters || [];
            } catch (error) {
                weakClusters = [];
            }
            if (weakClusters.length > 0) {
                const primaryCluster = weakClusters[0];
                showNotification('Focused Practice Ready', `Next drill will target ${primaryCluster.focusArea}.`, 'info');
            }

            StudentUSync.saveUser({
                points: studentPoints,
                badges: studentBadges,
                sessions_this_week: (currentUser?.sessions_this_week || 0) + 1,
                total_sessions: (currentUser?.total_sessions || 0) + 1,
                last_active: new Date().toISOString()
            });

            // FIX: Hide incomplete tabs from new users - unlock follow-up areas after the first completed session.
            const completedSessions = Number(localStorage.getItem('studentu_sessions_completed') || '0') + 1;
            window.StudentUStore?.setCompletedSessionCount?.(completedSessions) ?? localStorage.setItem('studentu_sessions_completed', String(completedSessions));
            window.StudentUCloudSync?.schedulePush?.();
            window.updateLockedTabs?.();
            window.updateSetupProgressUI?.();

            const summaryScreen = document.getElementById('session-summary-screen');
            if (summaryScreen) summaryScreen.classList.remove('hidden');
        }
