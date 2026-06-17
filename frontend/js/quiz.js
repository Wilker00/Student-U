        const quizDecks = {
            neuro: [
                { question: "What does the chain rule enable in backpropagation?", options: ["Random weight initialization", "Computing gradients through layers", "Faster forward passes", "Data augmentation"], correct: 1, difficulty: "MEDIUM", explanation: "The chain rule allows gradients to be computed and propagated backward through each layer of the neural network.", concept_id: "n3" },
                { question: "Which activation function is most commonly used in hidden layers?", options: ["Sigmoid", "Tanh", "ReLU", "Softmax"], correct: 2, difficulty: "EASY", explanation: "ReLU is preferred as it avoids the vanishing gradient problem that affects Sigmoid and Tanh.", concept_id: "n6" }
            ],
            calc: [{ question: "The gradient vector points in which direction?", options: ["Steepest descent", "Steepest ascent", "Along the x-axis", "Toward the origin"], correct: 1, difficulty: "MEDIUM", explanation: "The gradient always points in the direction of steepest increase. To minimize, we go in the negative gradient direction.", concept_id: "c2" }],
            hist: [{ question: "Which technique creates depth illusion in Renaissance paintings?", options: ["Sfumato", "Chiaroscuro", "Linear Perspective", "Impasto"], correct: 2, difficulty: "EASY", explanation: "Linear perspective uses converging lines meeting at a vanishing point to create the illusion of three-dimensional depth.", concept_id: "h3" }],
            macro: [{ question: "Expansionary fiscal policy involves:", options: ["Raising taxes and cutting spending", "Lowering interest rates", "Increasing government spending or cutting taxes", "Reducing money supply"], correct: 2, difficulty: "MEDIUM", explanation: "Expansionary fiscal policy stimulates economic activity by increasing government spending and/or reducing taxes.", concept_id: "m1" }]
        };

        let quizQuestionStartedAt = Date.now();

        function getCardForQuestion(question) {
            if (!Array.isArray(activeCards)) return null;
            return activeCards.find(card => card.id === question.concept_id || card.id === question.cardId) || activeCards[question.cardIndexTrigger] || null;
        }

        async function getServerDifficultyCalibration(courseKey) {
            try {
                return await window.StudentUAnalyticsAPI?.getRecommendations?.(courseKey);
            } catch (error) {
                return null;
            }
        }

        async function applyDifficultyCalibration(questions, courseKey) {
            const calibration = await getServerDifficultyCalibration(courseKey);
            if (!calibration) return questions;
            const primary = calibration.primaryDifficulty || calibration.difficulty || 'MEDIUM';
            const ordered = [...questions].sort((a, b) => {
                const aScore = a.difficulty === primary ? 0 : 1;
                const bScore = b.difficulty === primary ? 0 : 1;
                return aScore - bScore;
            });
            return ordered;
        }

        async function filterCoherentQuestions(questions) {
            const results = await Promise.all(questions.map(async question => {
                const card = getCardForQuestion(question);
                if (!card) return true;
                try {
                    return (await window.StudentUAnalyticsAPI?.validateQuestion?.(card, question))?.isCoherent !== false;
                } catch (error) {
                    return true;
                }
            }));
            const filtered = questions.filter((_, index) => results[index]);
            return filtered.length > 0 ? filtered : questions;
        }

        async function generateAdaptiveQuiz() {
            if (!checkUsageLimit('quiz')) return;
            const key = document.getElementById('course-selector').value;

            const generateBtn = document.querySelector('button[data-action="generateAdaptiveQuiz"]') || document.querySelector('#study-desk-setup button[data-action="generateAdaptiveQuiz"]');
            let originalText = "Generate Practice Quiz";
            if (generateBtn) {
                originalText = generateBtn.innerHTML;
                generateBtn.disabled = true;
                generateBtn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-1.5"><img src="assets/icons/synchronize.svg" class="asset-icon w-3.5 h-3.5 animate-spin"> Creating quiz...</span>`;
            }

            try {
                let questions = [];
                const cards = (activeCards && activeCards.length) ? activeCards : (window.courseCardDecks?.[key] || (typeof courseCardDecks !== 'undefined' ? courseCardDecks[key] : []));

                if (cards && cards.length > 0 && typeof callGeminiAPI === 'function') {
                    const calibration = await getServerDifficultyCalibration(key);
                    const difficultyInstruction = window.StudentUStudySettings?.getDifficultyPromptModifier?.(calibration)
                        || (calibration ? calibration.aiPromptModifier : 'Generate EASY, MEDIUM, or HARD questions.');

                    const classContext = typeof getCourseContextForPrompt === 'function' ? getCourseContextForPrompt(key) : '';

                    const systemInstruction = "You are a quiz generator. Use only the supplied class context and concept cards. Return only a valid JSON array of multiple-choice questions.";
                    const prompt = `Generate active recall checkpoint questions for these concept cards using the class context, syllabus priorities, professor comments, weak topics, and current chapter. ${difficultyInstruction} Return a JSON array where each object has: cardId (string of the card ID), difficulty (EASY, MEDIUM, or HARD), question (string), options (array of 4 strings), correct (number, index of correct option 0-3), explanation (string), sourceLabel (short source name).\n\nClass context:\n${classContext || 'No class portfolio context available.'}\n\nConcepts: ${JSON.stringify(cards.map(c => ({ id: c.id, title: c.title, feynman: c.feynman, sourceLabel: c.sourceLabel })))}`;

                    const responseText = await callGeminiAPI(prompt, systemInstruction, true);
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
                    if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
                    if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
                    cleaned = cleaned.trim();

                    const questionsArray = JSON.parse(cleaned);
                    const normalized = questionsArray.map((q, idx) => ({
                        concept_id: q.cardId || q.concept_id || (cards[q.cardIndexTrigger]?.id) || 'general',
                        cardId: q.cardId || q.concept_id || (cards[q.cardIndexTrigger]?.id) || 'general',
                        cardIndexTrigger: typeof q.cardIndexTrigger === 'number' ? q.cardIndexTrigger : idx,
                        difficulty: q.difficulty || 'MEDIUM',
                        question: q.question,
                        options: q.options,
                        correct: q.correct,
                        explanation: q.explanation,
                        sourceLabel: q.sourceLabel || cards[q.cardIndexTrigger]?.sourceLabel || 'Class packet'
                    }));

                    const coherentQuestions = await filterCoherentQuestions(normalized);
                    if (coherentQuestions.length > 0) {
                        questions = coherentQuestions;
                    }
                }

                if (questions.length === 0) {
                    const baseDeck = activeCards && activeCards.length ? generateCustomRecallQuestions(activeCards) : (quizDecks[key] || quizDecks.neuro);
                    questions = await applyDifficultyCalibration(await filterCoherentQuestions(baseDeck), key);
                }

                currentQuizData = questions;
                currentQuizIndex = 0;
                document.getElementById('quiz-area').classList.remove('hidden');
                document.getElementById('study-desk-setup').scrollIntoView({ behavior: 'smooth' });
                renderQuizQuestion();
                incrementUsage('quiz');
            } catch (err) {
                console.error("Adaptive quiz generation error, using fallback:", err);
                const baseDeck = activeCards && activeCards.length ? generateCustomRecallQuestions(activeCards) : (quizDecks[key] || quizDecks.neuro);
                currentQuizData = await applyDifficultyCalibration(await filterCoherentQuestions(baseDeck), key);
                currentQuizIndex = 0;
                document.getElementById('quiz-area').classList.remove('hidden');
                document.getElementById('study-desk-setup').scrollIntoView({ behavior: 'smooth' });
                renderQuizQuestion();
            } finally {
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = originalText;
                }
            }
        }

        function renderQuizQuestion() {
            if (currentQuizIndex >= currentQuizData.length) {
                document.getElementById('quiz-question-text').textContent = 'Quiz Complete! Great job reviewing.';
                document.getElementById('quiz-options').innerHTML = '<button data-action="closeQuiz" class="px-4 py-2 btn-primary rounded-xl text-xs">Done</button>';
                document.getElementById('quiz-feedback').classList.add('hidden');
                return;
            }
            const q = currentQuizData[currentQuizIndex];
            quizQuestionStartedAt = Date.now();
            document.getElementById('quiz-question-text').textContent = q.question;
            const opts = document.getElementById('quiz-options');
            opts.innerHTML = '';
            q.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-4 py-3 rounded-xl border border-surface-300 text-xs text-ink-300 hover:bg-surface-100 transition-colors font-medium';
                btn.textContent = opt;
                btn.dataset.action = 'submitQuizAnswer';
                btn.dataset.quizIndex = String(i);
                opts.appendChild(btn);
            });
            document.getElementById('quiz-feedback').classList.add('hidden');
        }

        function closeQuiz() { document.getElementById('quiz-area').classList.add('hidden'); }

        function updatePointsDisplay() {
            const el = document.getElementById('dash-stat-points');
            if (el) el.textContent = studentPoints;
        }

        function submitQuizAnswer(selectedIdx) {
            const q = currentQuizData[currentQuizIndex];
            const isCorrect = selectedIdx === q.correct;
            const duration = Math.max(1, Math.round((Date.now() - quizQuestionStartedAt) / 1000));
            if (isCorrect) { studentPoints += 10; updatePointsDisplay(); showNotification('Correct! +10 XP', q.explanation, 'success'); }
            else { showNotification('Incorrect', `Correct answer: ${q.options[q.correct]}. ${q.explanation}`, 'error'); }
            const fb = document.getElementById('quiz-feedback');
            const fbTitle = document.getElementById('quiz-feedback-title');
            const fbExpl = document.getElementById('quiz-feedback-explanation');
            const fbSource = document.getElementById('quiz-feedback-source');
            fb.className = `mt-4 p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`;
            fbTitle.className = `text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`;
            fbTitle.textContent = isCorrect ? '&check; Correct!' : '&times; Incorrect';
            fbExpl.textContent = q.explanation;
            if (fbSource) fbSource.textContent = `Source: ${q.sourceLabel || 'Class packet'}`;
            fb.classList.remove('hidden');

            StudentUSync.saveQuizResult({
                course_id: document.getElementById('course-selector').value,
                concept_id: q.concept_id || "general",
                question_text: q.question,
                selected_answer: selectedIdx,
                correct_answer: q.correct,
                is_correct: isCorrect,
                difficulty: q.difficulty || "MEDIUM",
                time_taken_seconds: duration
            });

            if (typeof savePerformanceRecord === 'function') {
                savePerformanceRecord({
                    courseKey: document.getElementById('course-selector').value,
                    correctAnswers: isCorrect ? 1 : 0,
                    missedAnswers: isCorrect ? 0 : 1,
                    quizResults: [{
                        difficulty: q.difficulty || 'MEDIUM',
                        isCorrect,
                        conceptId: q.concept_id || q.cardId || 'general'
                    }],
                    duration
                });
            }

            const quizCard = getCardForQuestion(q);
            const conceptTitle = quizCard?.title || q.concept_title || q.concept_id || q.cardId || q.question;
            window.StudentUClassPortfolio?.recordStudyOutcome?.({
                courseId: document.getElementById('course-selector').value,
                learned: isCorrect ? 1 : 0,
                missed: isCorrect ? 0 : 1,
                concepts: [conceptTitle],
                missedConcepts: isCorrect ? [] : [conceptTitle],
            });

            document.getElementById('quiz-feedback').classList.remove('hidden');
        }

        function advanceQuiz() { currentQuizIndex++; renderQuizQuestion(); }
