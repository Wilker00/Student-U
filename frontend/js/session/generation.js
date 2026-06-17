        // Session generation module
        const placeholderMaterials = window.StudentUDemoData?.materials || {};
        const courseCardDecks = window.StudentUDemoData?.courseCardDecks || {};

        function readStudySettings() {
            try {
                return JSON.parse(localStorage.getItem('studentu_study_settings') || '{}');
            } catch (_error) {
                return {};
            }
        }

        function getSessionTimerMinutes() {
            const settings = readStudySettings();
            const minutes = Number(settings.sessionLength);
            return Number.isFinite(minutes) && minutes >= 10 ? minutes : 25;
        }

        function cleanStudyMaterialText(text = '') {
            return window.StudentUSilent?.cleanNoteText?.(text) ?? String(text || '').trim();
        }

        function refineGeneratedCards(cards = [], sourceTexts = []) {
            let refined = Array.isArray(cards) ? [...cards] : [];
            if (window.StudentUSilent?.dedupeSimilarCards) {
                refined = window.StudentUSilent.dedupeSimilarCards(refined);
            }
            if (window.StudentUSilent?.filterGroundedCards && sourceTexts.length) {
                const grounded = window.StudentUSilent.filterGroundedCards(refined, sourceTexts);
                if (grounded.length >= Math.max(1, Math.ceil(refined.length * 0.5))) {
                    refined = grounded;
                }
            }
            return refined;
        }

        async function startStudySession() {
            if (!checkUsageLimit('session')) return;

            const selector = document.getElementById('course-selector');
            const selectedCourseKey = selector.value;
            const materialText = cleanStudyMaterialText(document.getElementById('study-material').value.trim());
            const classContext = typeof getCourseContextForPrompt === 'function' ? getCourseContextForPrompt(selectedCourseKey) : '';

            if (!materialText) {
                showNotification("Error", "Please paste or write study material first.", "error");
                return;
            }

            assignActiveSession({
                courseKey: selectedCourseKey,
                courseName: selector.options[selector.selectedIndex]?.text || 'Pasted Notes',
                pointsEarned: 0,
                conceptsMarkedLearned: 0,
                conceptsMissed: 0,
                conceptsReviewed: 0,
                readinessBefore: 74,
                readinessAfter: 74,
                cardsList: [],
                questionsList: [],
                currentIndex: 0,
                startTime: Date.now()
            });

            const isPreset = placeholderMaterials[selectedCourseKey] && materialText.includes(placeholderMaterials[selectedCourseKey].substring(0, 50));

            const generateBtn = document.querySelector('#study-desk-setup button[data-action="startStudySession"]');
            const originalText = generateBtn ? generateBtn.innerHTML : "Generate Study Guide";
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-1.5"><img src="assets/icons/synchronize.svg" class="asset-icon w-3.5 h-3.5 animate-spin"> Analyzing notes...</span>`;
            }

            try {
                if (isPreset) {
                    activeSession.cardsList = orderCardsForLearning(JSON.parse(JSON.stringify(courseCardDecks[selectedCourseKey])));
                    activeSession.questionsList = generateCustomRecallQuestions(activeSession.cardsList);
                } else {
                    // Use the study generation service to generate custom cards.
                    const systemInstruction = window.StudentUStudySettings?.augmentCardGenerationSystemInstruction?.(
                        "You are StudentU, a helpful study coach. Break the given study materials into atomic concept cards using the class syllabus, professor signals, current chapter, weak topics, and uploaded materials as priority context. Do not invent facts outside the supplied material. Return only a valid JSON array of objects, with no markdown code blocks. Each object must have keys: title (3-5 words max), difficulty (Beginner, Intermediate, or Advanced), feynman (simple explanation using the Feynman technique), analogy (real world analogy), mistake (common mistake), whyItMatters (one sentence connecting it to the bigger topic), sourceLabel (short source name from the class context or 'Pasted notes'), confidence (High, Medium, or Low)."
                    ) || "You are StudentU, a helpful study coach. Break the given study materials into atomic concept cards using the class syllabus, professor signals, current chapter, weak topics, and uploaded materials as priority context. Do not invent facts outside the supplied material. Return only a valid JSON array of objects, with no markdown code blocks. Each object must have keys: title (3-5 words max), difficulty (Beginner, Intermediate, or Advanced), feynman (simple explanation using the Feynman technique), analogy (real world analogy), mistake (common mistake), whyItMatters (one sentence connecting it to the bigger topic), sourceLabel (short source name from the class context or 'Pasted notes'), confidence (High, Medium, or Low).";
                    const prompt = `Class context:\n${classContext || 'No class portfolio context available.'}\n\nBreak this material into atomic concept cards. Return JSON array: [{title, difficulty, feynman, analogy, mistake, whyItMatters, sourceLabel, confidence}]. Material: ${materialText}`;

                    const responseText = await callGeminiAPI(prompt, systemInstruction, true);
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
                    if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
                    if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
                    cleaned = cleaned.trim();

                    const cardsArray = JSON.parse(cleaned);
                    if (Array.isArray(cardsArray) && cardsArray.length > 0) {
                        activeSession.cardsList = orderCardsForLearning(refineGeneratedCards(cardsArray.map((c, index) => ({
                            id: `gemini_card_${Date.now()}_${index}`,
                            title: c.title || `Concept Block ${index + 1}`,
                            difficulty: c.difficulty || "Intermediate",
                            feynman: c.feynman || "Feynman explanation here.",
                            analogy: c.analogy || "Analogy here.",
                            mistake: c.mistake || "Mistake here.",
                            whyItMatters: c.whyItMatters || "Why it matters here.",
                            sourceLabel: c.sourceLabel || "Pasted notes",
                            confidence: c.confidence || "Medium"
                        })), [materialText, classContext]));

                        try {
                            let difficultyInstruction = window.StudentUStudySettings?.getDifficultyPromptModifier?.(null)
                                || 'Generate EASY, MEDIUM, or HARD questions.';
                            try {
                                const calibration = await window.StudentUAnalyticsAPI?.getRecommendations?.(selectedCourseKey);
                                difficultyInstruction = window.StudentUStudySettings?.getDifficultyPromptModifier?.(calibration)
                                    || difficultyInstruction;
                            } catch (calcError) {
                                console.warn('Could not fetch difficulty calibration, using settings default:', calcError);
                            }

                            const questionPrompt = `Generate active recall checkpoint questions for these concept cards using only the class context, syllabus priorities, professor comments, weak topics, and current chapter. ${difficultyInstruction} Return a JSON array where each object has: cardIndexTrigger (number, between 0 and ${activeSession.cardsList.length - 1}), difficulty (EASY, MEDIUM, or HARD), question (string), options (array of 4 strings), correct (number, index of correct option 0-3), explanation (string), sourceLabel (short source name).\n\nClass context:\n${classContext || 'No class portfolio context available.'}\n\nConcepts: ${JSON.stringify(activeSession.cardsList.map(c => ({ title: c.title, feynman: c.feynman, sourceLabel: c.sourceLabel })))}`;
                            const qResponse = await callGeminiAPI(questionPrompt, "You are a quiz generator. Return only a valid JSON array of multiple-choice questions.", true);
                            let qCleaned = qResponse.trim();
                            if (qCleaned.startsWith("```json")) qCleaned = qCleaned.substring(7);
                            if (qCleaned.startsWith("```")) qCleaned = qCleaned.substring(3);
                            if (qCleaned.endsWith("```")) qCleaned = qCleaned.substring(0, qCleaned.length - 3);
                            qCleaned = qCleaned.trim();

                            const questionsArray = JSON.parse(qCleaned);
                            const coherentQuestions = await validateRecallQuestionsForCards(questionsArray, activeSession.cardsList);
                            if (coherentQuestions.length > 0) {
                                activeSession.questionsList = coherentQuestions;
                            } else {
                                activeSession.questionsList = generateCustomRecallQuestions(activeSession.cardsList);
                            }
                        } catch (err) {
                            console.warn("Failed to generate questions with Gemini, using fallback:", err);
                            activeSession.questionsList = generateCustomRecallQuestions(activeSession.cardsList);
                        }
                    } else {
                        throw new Error("Invalid array format from Gemini");
                    }
                }

                // Register concepts for saved progress.
                for (const card of activeSession.cardsList) {
                    await StudentUSync.saveConcept({
                        id: card.id,
                        course_id: selectedCourseKey,
                        title: card.title,
                        difficulty: card.difficulty,
                        status: 'neutral',
                        retention_score: 70,
                        times_correct: 0,
                        times_incorrect: 0,
                        feynman_text: card.feynman,
                        analogy_text: card.analogy,
                        mistake_text: card.mistake,
                        why_it_matters: card.whyItMatters || ""
                    });
                }

                activeCards = activeSession.cardsList;
                activeQuestions = activeSession.questionsList;
                currentCardIndex = 0;
                cardStates = activeCards.map(() => 'neutral');

                document.getElementById('active-session-subject-label').innerText = activeSession.courseName;
                document.getElementById('active-session-title').innerText = "Interactive Study Session";

                document.getElementById('study-desk-setup').classList.add('hidden');
                document.getElementById('study-desk-active').classList.remove('hidden');

                document.getElementById('main-scroll').scrollTop = 0;

                studySessionSeconds = 0;
                studyTimerDuration = getSessionTimerMinutes() * 60;
                isTimerRunning = true;
                updateTimerDisplay();

                if (activeSessionTimer) clearInterval(activeSessionTimer);
                activeSessionTimer = setInterval(tickTimer, 1000);

                const playPauseBtn = document.getElementById('session-play-pause-btn');
                if (playPauseBtn) {
                    playPauseBtn.innerHTML = `<span>Pause</span> <span id="play-pause-text">Pause</span>`;
                }
                const timerDot = document.getElementById('timer-dot');
                if (timerDot) timerDot.classList.add('animate-pulse');

                renderCard();
                updateHighlightStats();

                incrementUsage('session');
                showNotification("Session Started", "Lesson Breakdown generated successfully!", "success");
            } catch (error) {
                console.error("Error generating study session:", error);
                showNotification("Study Guide Ready", "StudentU built a study guide from your saved class materials.", "info");

                // Fallback to local deconstruction
                activeSession.cardsList = orderCardsForLearning(refineGeneratedCards(generateCustomCardsFromText(materialText), [materialText, classContext]));
                activeSession.questionsList = generateCustomRecallQuestions(activeSession.cardsList);

                for (const card of activeSession.cardsList) {
                    await StudentUSync.saveConcept({
                        id: card.id,
                        course_id: selectedCourseKey,
                        title: card.title,
                        difficulty: card.difficulty,
                        status: 'neutral',
                        retention_score: 70,
                        times_correct: 0,
                        times_incorrect: 0,
                        feynman_text: card.feynman,
                        analogy_text: card.analogy,
                        mistake_text: card.mistake,
                        why_it_matters: card.whyItMatters || ""
                    });
                }

                activeCards = activeSession.cardsList;
                activeQuestions = activeSession.questionsList;
                currentCardIndex = 0;
                cardStates = activeCards.map(() => 'neutral');

                document.getElementById('active-session-subject-label').innerText = activeSession.courseName;
                document.getElementById('active-session-title').innerText = "Interactive Study Session";

                document.getElementById('study-desk-setup').classList.add('hidden');
                document.getElementById('study-desk-active').classList.remove('hidden');

                document.getElementById('main-scroll').scrollTop = 0;

                studySessionSeconds = 0;
                studyTimerDuration = getSessionTimerMinutes() * 60;
                isTimerRunning = true;
                updateTimerDisplay();

                if (activeSessionTimer) clearInterval(activeSessionTimer);
                activeSessionTimer = setInterval(tickTimer, 1000);

                renderCard();
                updateHighlightStats();

                incrementUsage('session');
            } finally {
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = originalText;
                }
            }
        }

        function generateCustomCardsFromText(text) {
            let paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 20);

            if (paragraphs.length === 0) {
                const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                paragraphs = [];
                let currentPara = "";
                for (let i = 0; i < sentences.length; i++) {
                    currentPara += sentences[i] + " ";
                    if ((i + 1) % 3 === 0 || i === sentences.length - 1) {
                        paragraphs.push(currentPara.trim());
                        currentPara = "";
                    }
                }
            }

            if (paragraphs.length < 3) {
                while (paragraphs.length < 3) {
                    paragraphs.push(paragraphs[paragraphs.length - 1] || "Foundation concept regarding the uploaded lecture material.");
                }
            }
            paragraphs = paragraphs.slice(0, 6);

            const difficulties = ["Beginner", "Intermediate", "Advanced"];

            return paragraphs.map((para, index) => {
                const cleanPara = para.replace(/[^\w\s]/g, '');
                const words = cleanPara.split(/\s+/).filter(w => w.length > 2);
                let title = words.slice(0, 4).join(' ');
                if (!title) title = `Concept Block ${index + 1}`;
                title = title.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');

                const diff = difficulties[index % 3];
                const feynman = para;

                let analogy = `Think of this like an interconnected system of gears. If you adjust the alignment of one gear (the inputs), it ripples through the rest of the mechanism to change the final output.`;
                if (cleanPara.toLowerCase().includes("data") || cleanPara.toLowerCase().includes("code")) {
                    analogy = `Think of it like a library index. Instead of reading every book on a shelf to find a topic, you go straight to the catalog card that points directly to the row and shelf number.`;
                } else if (cleanPara.toLowerCase().includes("math") || cleanPara.toLowerCase().includes("calc")) {
                    analogy = `Imagine walking on a foggy terrain with a compass that tells you how steep the ground is under your feet. You step in the direction of the slope to reach the peak or valley.`;
                } else if (cleanPara.toLowerCase().includes("power") || cleanPara.toLowerCase().includes("social")) {
                    analogy = `Imagine playing a board game where the rules are written to favor one side. Nobody has to physically force you to make choices; the rules themselves shape how you play.`;
                } else if (cleanPara.toLowerCase().includes("money") || cleanPara.toLowerCase().includes("spend")) {
                    analogy = `Think of dropping a stone in a calm pond. The splash is the initial change, but the ripples extend far across the surface, moving water in distant corners.`;
                }

                let mistake = `Assuming this concept works in isolation, without understanding its upstream inputs or downstream effects.`;
                if (diff === "Advanced") {
                    mistake = `Neglecting border constraints or mathematical derivatives that squeeze standard values to zero.`;
                } else if (diff === "Intermediate") {
                    mistake = `Confusing rate values with absolute level values, which leads to scaling calculations in the wrong direction.`;
                }

                const whyItMatters = `Mastering this unit allows you to build a structured foundation for analyzing more complex relationships in this topic.`;

                return {
                    id: `custom_${index + 1}`,
                    title: title,
                    difficulty: diff,
                    feynman: feynman,
                    analogy: analogy,
                    mistake: mistake,
                    whyItMatters: whyItMatters,
                    sourceLabel: "Pasted notes",
                    confidence: "Medium"
                };
            });
        }
