        const quizDecks = {
            neuro: [
                { question: "What does the chain rule enable in backpropagation?", options: ["Random weight initialization", "Computing gradients through layers", "Faster forward passes", "Data augmentation"], correct: 1, difficulty: "MEDIUM", explanation: "The chain rule allows gradients to be computed and propagated backward through each layer of the neural network.", concept_id: "n3" },
                { question: "Which activation function is most commonly used in hidden layers?", options: ["Sigmoid", "Tanh", "ReLU", "Softmax"], correct: 2, difficulty: "EASY", explanation: "ReLU is preferred as it avoids the vanishing gradient problem that affects Sigmoid and Tanh.", concept_id: "n6" }
            ],
            calc: [{ question: "The gradient vector points in which direction?", options: ["Steepest descent", "Steepest ascent", "Along the x-axis", "Toward the origin"], correct: 1, difficulty: "MEDIUM", explanation: "The gradient always points in the direction of steepest increase. To minimize, we go in the negative gradient direction.", concept_id: "c2" }],
            hist: [{ question: "Which technique creates depth illusion in Renaissance paintings?", options: ["Sfumato", "Chiaroscuro", "Linear Perspective", "Impasto"], correct: 2, difficulty: "EASY", explanation: "Linear perspective uses converging lines meeting at a vanishing point to create the illusion of three-dimensional depth.", concept_id: "h3" }],
            macro: [{ question: "Expansionary fiscal policy involves:", options: ["Raising taxes and cutting spending", "Lowering interest rates", "Increasing government spending or cutting taxes", "Reducing money supply"], correct: 2, difficulty: "MEDIUM", explanation: "Expansionary fiscal policy stimulates economic activity by increasing government spending and/or reducing taxes.", concept_id: "m1" }]
        };

        function generateAdaptiveQuiz() {
            if (!checkUsageLimit('quiz')) return;
            const key = document.getElementById('course-selector').value;
            currentQuizData = quizDecks[key] || quizDecks.neuro;
            currentQuizIndex = 0;
            document.getElementById('quiz-area').classList.remove('hidden');
            document.getElementById('study-desk-setup').scrollIntoView({ behavior: 'smooth' });
            renderQuizQuestion();
            incrementUsage('quiz');
        }

        function renderQuizQuestion() {
            if (currentQuizIndex >= currentQuizData.length) {
                document.getElementById('quiz-question-text').textContent = 'Quiz Complete! Great job reviewing.';
                document.getElementById('quiz-options').innerHTML = '<button onclick="closeQuiz()" class="px-4 py-2 btn-primary rounded-xl text-xs">Done</button>';
                document.getElementById('quiz-feedback').classList.add('hidden');
                return;
            }
            const q = currentQuizData[currentQuizIndex];
            document.getElementById('quiz-question-text').textContent = q.question;
            const opts = document.getElementById('quiz-options');
            opts.innerHTML = '';
            q.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-4 py-3 rounded-xl border border-surface-300 text-xs text-ink-300 hover:bg-surface-100 transition-colors font-medium';
                btn.textContent = opt;
                btn.onclick = () => submitQuizAnswer(i);
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
            const duration = '0.0';
            if (isCorrect) { studentPoints += 10; updatePointsDisplay(); showNotification('Correct! +10 XP', q.explanation, 'success'); }
            else { showNotification('Incorrect', `Correct answer: ${q.options[q.correct]}. ${q.explanation}`, 'error'); }
            const fb = document.getElementById('quiz-feedback');
            const fbTitle = document.getElementById('quiz-feedback-title');
            const fbExpl = document.getElementById('quiz-feedback-explanation');
            fb.className = `mt-4 p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`;
            fbTitle.className = `text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`;
            fbTitle.textContent = isCorrect ? '&check; Correct!' : '&times; Incorrect';
            fbExpl.textContent = q.explanation;
            fb.classList.remove('hidden');

            StudentUSync.saveQuizResult({
                course_id: document.getElementById('course-selector').value,
                concept_id: q.concept_id || "general",
                question_text: q.question,
                selected_answer: selectedIdx,
                correct_answer: q.correct,
                is_correct: isCorrect,
                difficulty: q.difficulty || "MEDIUM",
                time_taken_seconds: parseFloat(duration)
            });

            document.getElementById('quiz-feedback').classList.remove('hidden');
        }

        function advanceQuiz() { currentQuizIndex++; renderQuizQuestion(); }
