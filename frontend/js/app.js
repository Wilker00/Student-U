// ---- GLOBAL STATE ----
        let studentPoints = 100;
        let studentBadges = 32;
        let currentUser = null;
        let geminiApiKey = localStorage.getItem('studentu_gemini_key') || '';
        let activeSession = null;
        let currentQuizIndex = 0;
        let currentQuizData = [];
        let highlights = JSON.parse(localStorage.getItem('studentu_highlights') || '{}');
        let selectedRange = null;

        // ---- STUDENTSYNC: Firebase sync bridge (graceful offline fallback) ----
        const StudentUSync = {
            _db: null,
            _userId: null,
            init(db, userId) { this._db = db; this._userId = userId; },
            async saveConcept(concept) {
                if (!this._db || !this._userId) return; // offline mode â€” no-op
                try {
                    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await setDoc(doc(this._db, 'users', this._userId, 'concepts', concept.id), concept, { merge: true });
                } catch (e) { console.warn('StudentUSync.saveConcept failed:', e); }
            },
            async saveQuizResult(result) {
                if (!this._db || !this._userId) return; // offline mode â€” no-op
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'quiz_results'), { ...result, timestamp: serverTimestamp() });
                } catch (e) { console.warn('StudentUSync.saveQuizResult failed:', e); }
            },
            async saveSession(session) {
                if (!this._db || !this._userId) return;
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'sessions'), { ...session, timestamp: serverTimestamp() });
                } catch (e) { console.warn('StudentUSync.saveSession failed:', e); }
            },
            async getConcepts(courseId) {
                if (!this._db || !this._userId) return [];
                try {
                    const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    const q = query(collection(this._db, 'users', this._userId, 'concepts'), where('course_id', '==', courseId));
                    const snap = await getDocs(q);
                    return snap.docs.map(d => d.data());
                } catch (e) { return []; }
            }
        };


        // ---- NAVIGATION ----
        function switchTab(tabName) {
            document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById('tab-' + tabName);
            if (target) {
                target.classList.remove('hidden');
                document.getElementById('main-scroll').scrollTop = 0;
                setTimeout(() => {
                    target.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }
            document.querySelectorAll('#main-nav button, #mobile-nav button').forEach(btn => {
                btn.classList.remove('active-tab-mobile', 'text-ink-400');
                btn.classList.add('text-ink-50');
            });
            const navBtn = document.getElementById('nav-btn-' + tabName);
            if (navBtn) {
                navBtn.classList.add('active-tab-mobile', 'text-ink-400');
                navBtn.classList.remove('text-ink-50');
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

        document.addEventListener('DOMContentLoaded', initRevealSections);

        function showNotification(title, body, type = 'info') {
            const box = document.getElementById('alert-box');
            const icon = document.getElementById('alert-icon');
            const titleEl = document.getElementById('alert-title');
            const bodyEl = document.getElementById('alert-body');
            const icons = { success: 'âœ“', error: 'âœ—', warning: 'âš ', info: 'â„¹', primary: 'â˜…' };
            const colors = { success: 'bg-emerald-100 text-emerald-600', error: 'bg-rose-100 text-rose-600', warning: 'bg-amber-100 text-amber-700', info: 'bg-accent-blue/10 text-accent-blue', primary: 'bg-ink-400 text-white' };
            icon.className = `w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${colors[type] || colors.info}`;
            icon.textContent = icons[type] || 'â„¹';
            titleEl.textContent = title;
            bodyEl.textContent = body;
            box.classList.remove('hidden');
            setTimeout(() => box.classList.add('hidden'), 4000);
        }

        const USAGE_LIMITS = {
            free: { session: 1, quiz: 10, explanation: 5, upload: 2 },
            edu: { session: 3, quiz: 20, explanation: 10, upload: 5 },
            premium: { session: Infinity, quiz: Infinity, explanation: Infinity, upload: Infinity }
        };

        function getUserTier() { return localStorage.getItem('studentu_tier') || 'free'; }

        function checkUsageLimit(type) {
            const tier = getUserTier();
            const limits = USAGE_LIMITS[tier] || USAGE_LIMITS.free;
            const key = `studentu_usage_${type}_${new Date().toISOString().split('T')[0]}`;
            const used = parseInt(localStorage.getItem(key) || '0');
            if (used >= limits[type]) {
                openUpgradeModal();
                showNotification('Limit Reached', `You've hit your ${type} limit for today. Upgrade to continue.`, 'warning');
                return false;
            }
            return true;
        }

        function incrementUsage(type) {
            const key = `studentu_usage_${type}_${new Date().toISOString().split('T')[0]}`;
            const used = parseInt(localStorage.getItem(key) || '0');
            localStorage.setItem(key, used + 1);
        }

        function openUpgradeModal() { document.getElementById('upgrade-modal').classList.remove('hidden'); }
        function closeUpgradeModal() { document.getElementById('upgrade-modal').classList.add('hidden'); }

        function simulateStripeCheckout() {
            showNotification('Processing...', 'Connecting to payment gateway.', 'info');
            setTimeout(() => {
                localStorage.setItem('studentu_tier', 'premium');
                closeUpgradeModal();
                showNotification('Upgraded!', 'Welcome to StudentU Premium. All limits removed.', 'success');
                updateUserTierDisplay();
            }, 2000);
        }

        function updateUserTierDisplay() {
            const tier = getUserTier();
            const el = document.getElementById('user-tier-display');
            if (el) el.textContent = tier === 'premium' ? 'Premium â­' : tier === 'edu' ? 'Verified .edu ðŸŽ“' : 'Free';
        }

        function switchDayTab(btn, day) {
            document.querySelectorAll('#day-tabs button').forEach(b => b.classList.remove('active-day-tab'));
            btn.classList.add('active-day-tab');
        }

        function saveGeminiKey() {
            const key = document.getElementById('gemini-key-input').value.trim();
            if (key) { geminiApiKey = key; localStorage.setItem('studentu_gemini_key', key); showNotification('Key Saved', 'Gemini API key saved locally.', 'success'); }
        }

        function saveGeminiKeyFromPanel() {
            const key = document.getElementById('gemini-api-key-panel').value.trim();
            if (key) { geminiApiKey = key; localStorage.setItem('studentu_gemini_key', key); showNotification('Key Saved', 'Gemini API key saved locally.', 'success'); }
        }

        function saveFirebaseConfig() {
            const config = document.getElementById('firebase-config-input').value.trim();
            if (config) { localStorage.setItem('studentu_firebase_config', config); showNotification('Config Saved', 'Firebase config saved. Refresh to apply.', 'success'); }
        }

        function signInWithGoogle() { showNotification('Sign In', 'Google sign-in requires Firebase config. Set it up in the Dev Config panel.', 'info'); }

        function signOut() {
            currentUser = null;
            document.getElementById('auth-signed-in').classList.add('hidden');
            document.getElementById('auth-signed-out').classList.remove('hidden');
            showNotification('Signed Out', 'You have been signed out.', 'info');
        }

        async function callGeminiAPI(prompt, systemInstruction = '', jsonMode = false) {
            if (!geminiApiKey) throw new Error('No Gemini API key');
            const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {} };
            if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        const placeholderMaterials = {
            neuro: "Neural networks are computational systems inspired by biological neural networks. Backpropagation is an algorithm for training neural networks by computing gradients using the chain rule of calculus. The forward pass computes predictions, while the backward pass propagates errors and updates weights through gradient descent.",
            calc: "Multivariable calculus extends single-variable calculus to functions of multiple variables. Partial derivatives measure the rate of change with respect to one variable while holding others constant. The gradient vector points in the direction of steepest ascent, and its magnitude indicates the rate of increase.",
            hist: "The Renaissance was a cultural and intellectual movement in Europe from the 14th to 17th centuries. Key artists include Leonardo da Vinci, Michelangelo, and Raphael. The period was characterized by humanism, a renewed interest in classical antiquity, and revolutionary developments in art, science, and literature.",
            macro: "Macroeconomics studies economy-wide phenomena including inflation, unemployment, and economic growth. Fiscal policy refers to government spending and taxation decisions. Expansionary fiscal policy increases government spending or cuts taxes to stimulate economic activity during recessions."
        };

        const courseCardDecks = {
            neuro: [
                { id: 'n1', title: 'What is a Neural Network?', difficulty: 'Beginner', feynman: 'A neural network is like a team of workers, each passing information forward. Each worker (neuron) takes input, processes it, and passes the result to the next worker. Together they learn to recognize patterns.', analogy: 'Like an assembly line where each station transforms the product slightly until the final output is complete.', mistake: 'Thinking neurons "think" like humans. They are just mathematical functions â€” weighted sums followed by activation functions.', whyItMatters: 'Neural networks are the foundation of modern AI, from image recognition to language models.' },
                { id: 'n2', title: 'The Forward Pass', difficulty: 'Beginner', feynman: 'The forward pass is when data travels from input to output through the network. Each layer transforms the data using weights and an activation function until we get a prediction.', analogy: 'Like water flowing through a series of filters, each one reshaping the liquid slightly.', mistake: 'Thinking the forward pass "learns" anything. It just computes â€” learning happens in the backward pass.', whyItMatters: 'Without the forward pass, there is no prediction to compare against the correct answer.' },
                { id: 'n3', title: 'Backpropagation Algorithm', difficulty: 'Intermediate', feynman: 'Backpropagation computes how much each weight contributed to the error. It works backward through the network using the chain rule to assign blame and calculate gradients for each weight.', analogy: 'Like reviewing a bad assembly line step-by-step from the final product back to raw materials, finding which station made a mistake.', mistake: 'Confusing backpropagation with gradient descent. Backprop computes gradients; gradient descent updates weights using them.', whyItMatters: 'Backpropagation is the reason deep networks can be trained at all â€” without it, training would be impossible.' },
                { id: 'n4', title: 'Gradient Descent', difficulty: 'Intermediate', feynman: 'Gradient descent is an optimization algorithm that minimizes the loss function by taking steps in the direction of steepest descent. The learning rate controls how large each step is.', analogy: 'Like hiking down a mountain blindfolded â€” you feel which direction is downhill and take a step, repeating until you reach the valley.', mistake: 'Using a learning rate that is too large (overshooting the minimum) or too small (very slow convergence).', whyItMatters: 'Every neural network training process relies on gradient descent or one of its variants.' },
                { id: 'n5', title: 'The Chain Rule', difficulty: 'Advanced', feynman: 'The chain rule allows us to compute derivatives of composite functions. In neural networks, since each layer is a function of the previous, we use it to propagate gradients backward through layers.', analogy: 'Like tracking a rumor through a chain of people â€” you trace the message backward from the last person to the source.', mistake: 'Forgetting to multiply gradients at each layer â€” missing one factor breaks the chain completely.', whyItMatters: 'The chain rule is the mathematical backbone of backpropagation and the entire modern deep learning revolution.' },
                { id: 'n6', title: 'Activation Functions', difficulty: 'Intermediate', feynman: 'Activation functions introduce non-linearity into neural networks. Without them, deep networks would collapse to a single linear transformation. Common ones include ReLU (max(0,x)), Sigmoid, and Tanh.', analogy: 'Like gates that decide whether to let a signal pass or block it, adding complexity to the path.', mistake: 'Using sigmoid in deep networks â€” it suffers from vanishing gradients. Use ReLU for hidden layers.', whyItMatters: 'Activation functions are why neural networks can model non-linear, complex relationships.' }
            ],
            calc: [
                { id: 'c1', title: 'Partial Derivatives', difficulty: 'Beginner', feynman: 'A partial derivative measures how a function changes when you move in one direction while keeping all other variables frozen.', analogy: 'Like standing on a hill and measuring how steep it is only in the north-south direction, ignoring east-west.', mistake: 'Treating partial derivatives like total derivatives â€” they only capture one dimension of change.', whyItMatters: 'Partial derivatives are the foundation for optimization in machine learning and engineering.' },
                { id: 'c2', title: 'The Gradient Vector', difficulty: 'Intermediate', feynman: 'The gradient is a vector containing all partial derivatives of a function. It points in the direction of steepest ascent.', analogy: 'Like a compass that always points uphill on a mountain terrain.', mistake: 'Thinking the gradient is just a collection of numbers. It is a vector with direction and magnitude.', whyItMatters: 'The gradient is the core tool for optimization â€” gradient descent subtracts it to go downhill toward minima.' },
                { id: 'c3', title: 'Multiple Integrals', difficulty: 'Advanced', feynman: 'Multiple integrals extend integration to functions of several variables. A double integral sums up a function over a 2D area.', analogy: 'Like calculating the total water in a lake by summing up water in every tiny column across the entire surface.', mistake: 'Forgetting to set the correct bounds for each variable â€” wrong integration order leads to wrong answers.', whyItMatters: 'Multiple integrals appear in physics for calculating mass, volume, charge, and probability distributions.' }
            ],
            hist: [
                { id: 'h1', title: 'The Renaissance Spirit', difficulty: 'Beginner', feynman: 'The Renaissance was a rebirth of classical Greek and Roman knowledge in Europe. Thinkers began to place humans at the center of intellectual life (humanism).', analogy: 'Like rediscovering an old photo album and using your ancestors\' wisdom to shape how you live today.', mistake: 'Assuming the Renaissance happened everywhere at once. It started in Italian city-states before spreading.', whyItMatters: 'The Renaissance laid the groundwork for the Scientific Revolution and modern Western culture.' },
                { id: 'h2', title: 'Leonardo da Vinci', difficulty: 'Beginner', feynman: 'Da Vinci was the ultimate Renaissance man â€” painter, scientist, inventor, and anatomist. His notebooks reveal a mind driven by curiosity.', analogy: 'Like a person who is simultaneously a top-class engineer, artist, and biologist.', mistake: 'Thinking his art and science were separate. For da Vinci, understanding anatomy made his paintings more realistic.', whyItMatters: 'Da Vinci demonstrates how deep observation of nature drives both art and science.' },
                { id: 'h3', title: 'Linear Perspective', difficulty: 'Intermediate', feynman: 'Linear perspective is a technique where parallel lines converge at a vanishing point on the horizon, creating the illusion of depth on a flat surface.', analogy: 'Like train tracks that appear to meet in the distance â€” your brain interprets convergence as depth.', mistake: 'Using perspective inconsistently within a painting â€” multiple vanishing points must be used intentionally.', whyItMatters: 'Linear perspective revolutionized visual art and remains fundamental to painting, architecture, and 3D graphics.' }
            ],
            macro: [
                { id: 'm1', title: 'What is Fiscal Policy?', difficulty: 'Beginner', feynman: 'Fiscal policy is when the government uses spending and taxation to influence the economy. Expansionary policy boosts the economy; contractionary policy slows it down.', analogy: 'Like a doctor adjusting medicine doses â€” increase during illness (recession) and reduce when overheating (inflation).', mistake: 'Confusing fiscal policy with monetary policy. Fiscal is the government\'s budget; monetary is the central bank\'s interest rates.', whyItMatters: 'Fiscal policy is the main tool governments use to fight recessions and manage economic growth.' },
                { id: 'm2', title: 'The Multiplier Effect', difficulty: 'Intermediate', feynman: 'When the government spends money, that dollar flows through the economy as people spend it, creating more income â€” a cascading effect.', analogy: 'Like dropping a pebble in a pond â€” the ripples spread outward, each touching more water.', mistake: 'Assuming the multiplier is always greater than 1. During recessions, people save more, reducing the multiplier.', whyItMatters: 'The multiplier determines how effective government spending is at stimulating economic growth.' },
                { id: 'm3', title: 'Budget Deficit vs Surplus', difficulty: 'Beginner', feynman: 'A budget deficit occurs when government spending exceeds revenue (taxes). A surplus is the opposite. Deficits require borrowing; surpluses allow debt repayment.', analogy: 'Like your monthly personal budget â€” spending more than you earn means debt; earning more means savings.', mistake: 'Assuming deficits are always bad. During recessions, intentional deficits can be necessary to stimulate growth.', whyItMatters: 'Understanding deficits is critical for evaluating government economic decisions and their long-term consequences.' }
            ]
        };

        const courseRecallQuestions = {
            neuro: [
                { cardIndexTrigger: 2, difficulty: 'MEDIUM', question: 'What is the primary purpose of backpropagation?', options: ['To make predictions', 'To compute gradients for weight updates', 'To load training data', 'To initialize weights'], correct: 1, explanation: 'Backpropagation computes the gradient of the loss function with respect to each weight, which is then used by gradient descent to update the weights.' },
                { cardIndexTrigger: 4, difficulty: 'HARD', question: 'Which mathematical rule enables backpropagation to work through multiple layers?', options: ['Product rule', 'Quotient rule', 'Chain rule', 'Power rule'], correct: 2, explanation: 'The chain rule allows gradients to be propagated backward through composite functions (layers), multiplying partial derivatives at each step.' }
            ],
            calc: [{ cardIndexTrigger: 1, difficulty: 'MEDIUM', question: 'What does the gradient vector point toward?', options: ['Steepest descent', 'Steepest ascent', 'The origin', 'The minimum'], correct: 1, explanation: 'The gradient always points in the direction of steepest ascent. To minimize a function, we move in the opposite direction.' }],
            hist: [{ cardIndexTrigger: 1, difficulty: 'EASY', question: 'Where did the Renaissance originate?', options: ['France', 'Germany', 'Italian city-states', 'England'], correct: 2, explanation: 'The Renaissance began in Italian city-states like Florence and Venice in the 14th century before spreading to the rest of Europe.' }],
            macro: [{ cardIndexTrigger: 1, difficulty: 'MEDIUM', question: 'What is the key difference between fiscal and monetary policy?', options: ['Fiscal is faster', 'Fiscal uses government budget; monetary uses interest rates', 'They are the same', 'Monetary controls taxes'], correct: 1, explanation: 'Fiscal policy involves government spending and taxation decisions, while monetary policy is controlled by central banks through interest rates and money supply.' }]
        };

        function handleCourseChange() {
            const key = document.getElementById('course-selector').value;
            const material = document.getElementById('study-material');
            if (material && placeholderMaterials[key]) material.value = placeholderMaterials[key];
        }

        function handleFileUpload(event) {
            if (!checkUsageLimit('upload')) return;
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => { document.getElementById('study-material').value = e.target.result; incrementUsage('upload'); showNotification('File Loaded', `${file.name} loaded successfully.`, 'success'); };
            reader.readAsText(file);
        }

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
            fbTitle.textContent = isCorrect ? 'âœ“ Correct!' : 'âœ— Incorrect';
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
        // UX Tab mapping redirects
        function drillWeakSpots() { switchTab('workspace'); setTimeout(() => { generateAdaptiveQuiz(); showNotification("Focused Practice", "Targeting your weakest topics.", "info"); }, 300); }
        function rescheduleReminders() { showNotification("Schedule Updated", "Study plan adjusted around your exams.", "success"); }

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

        async function startStudySession() {
            if (!checkUsageLimit('session')) return;

            const selector = document.getElementById('course-selector');
            const selectedCourseKey = selector.value;
            const materialText = document.getElementById('study-material').value.trim();
            
            if (!materialText) {
                showNotification("Error", "Please paste or write study material first.", "error");
                return;
            }

            activeSession = {
                courseKey: selectedCourseKey,
                courseName: selector.options[selector.selectedIndex].text,
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
            };

            const isPreset = placeholderMaterials[selectedCourseKey] && materialText.includes(placeholderMaterials[selectedCourseKey].substring(0, 50));
            
            const generateBtn = document.querySelector('#study-desk-setup button[onclick="startStudySession()"]');
            const originalText = generateBtn ? generateBtn.innerHTML : "Generate Study Guide";
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = `<span class="animate-pulse flex items-center justify-center gap-1.5"><img src="assets/icons/synchronize.svg" class="asset-icon w-3.5 h-3.5 animate-spin"> Analyzing notes...</span>`;
            }

            try {
                if (isPreset) {
                    activeSession.cardsList = JSON.parse(JSON.stringify(courseCardDecks[selectedCourseKey]));
                    activeSession.questionsList = JSON.parse(JSON.stringify(courseRecallQuestions[selectedCourseKey] || []));
                } else if (geminiApiKey && geminiApiKey.trim() !== "") {
                    // Use Gemini API to generate the custom cards
                    const systemInstruction = "You are StudentU, a helpful study coach. Break the given study materials into atomic concept cards. Return only a valid JSON array of objects, with no markdown code blocks. Each object must have keys: title (3-5 words max), difficulty (Beginner, Intermediate, or Advanced), feynman (simple explanation using the Feynman technique), analogy (real world analogy), mistake (common mistake), whyItMatters (one sentence connecting it to the bigger topic).";
                    const prompt = `Break this material into atomic concept cards. Return JSON array: [{title, difficulty, feynman, analogy, mistake, whyItMatters}]. Material: ${materialText}`;
                    
                    const responseText = await callGeminiAPI(prompt, systemInstruction, true);
                    let cleaned = responseText.trim();
                    if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
                    if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
                    if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
                    cleaned = cleaned.trim();
                    
                    const cardsArray = JSON.parse(cleaned);
                    if (Array.isArray(cardsArray) && cardsArray.length > 0) {
                        activeSession.cardsList = cardsArray.map((c, index) => ({
                            id: `gemini_card_${Date.now()}_${index}`,
                            title: c.title || `Concept Block ${index + 1}`,
                            difficulty: c.difficulty || "Intermediate",
                            feynman: c.feynman || "Feynman explanation here.",
                            analogy: c.analogy || "Analogy here.",
                            mistake: c.mistake || "Mistake here.",
                            whyItMatters: c.whyItMatters || "Why it matters here."
                        }));
                        
                        try {
                            const questionPrompt = `Generate active recall checkpoint questions for these concept cards. Return a JSON array where each object has: cardIndexTrigger (number, between 0 and ${activeSession.cardsList.length - 1}), difficulty (EASY, MEDIUM, or HARD), question (string), options (array of 4 strings), correct (number, index of correct option 0-3), explanation (string). Concepts: ${JSON.stringify(activeSession.cardsList.map(c => ({ title: c.title, feynman: c.feynman })))}`;
                            const qResponse = await callGeminiAPI(questionPrompt, "You are a quiz generator. Return only a valid JSON array of multiple-choice questions.", true);
                            let qCleaned = qResponse.trim();
                            if (qCleaned.startsWith("```json")) qCleaned = qCleaned.substring(7);
                            if (qCleaned.startsWith("```")) qCleaned = qCleaned.substring(3);
                            if (qCleaned.endsWith("```")) qCleaned = qCleaned.substring(0, qCleaned.length - 3);
                            qCleaned = qCleaned.trim();
                            
                            const questionsArray = JSON.parse(qCleaned);
                            if (Array.isArray(questionsArray)) {
                                activeSession.questionsList = questionsArray;
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
                } else {
                    activeSession.cardsList = generateCustomCardsFromText(materialText);
                    activeSession.questionsList = generateCustomRecallQuestions(activeSession.cardsList);
                }
                
                // Register concepts in the database
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
                studyTimerDuration = 25 * 60;
                isTimerRunning = true;
                updateTimerDisplay();
                
                if (activeSessionTimer) clearInterval(activeSessionTimer);
                activeSessionTimer = setInterval(tickTimer, 1000);
                
                const playPauseBtn = document.getElementById('session-play-pause-btn');
                if (playPauseBtn) {
                    playPauseBtn.innerHTML = `<span>â¸ï¸</span> <span id="play-pause-text">Pause</span>`;
                }
                const timerDot = document.getElementById('timer-dot');
                if (timerDot) timerDot.classList.add('animate-pulse');

                renderCard();
                updateHighlightStats();
                
                incrementUsage('session');
                showNotification("Session Started", "Lesson Breakdown generated successfully!", "success");
            } catch (error) {
                console.error("Error generating study session:", error);
                showNotification("AI Failed", "Could not generate session using Gemini API. Using offline simulation.", "warning");
                
                // Fallback to local deconstruction
                activeSession.cardsList = generateCustomCardsFromText(materialText);
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
                studyTimerDuration = 25 * 60;
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
                    whyItMatters: whyItMatters
                };
            });
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
                    explanation: `As covered in the lesson: "${card.feynman.substring(0, 150)}..."`
                };
            });
        }

        function getActiveCardKey() {
            if (!activeCards || !activeCards[currentCardIndex] || !activeSession) return '';
            const currentCard = activeCards[currentCardIndex];
            return activeSession.courseKey + '_' + (currentCard.id || currentCardIndex);
        }

        function renderCard() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const card = activeCards[currentCardIndex];
            
            document.getElementById('active-card-title').innerText = card.title;
            
            const diffBadge = document.getElementById('active-card-difficulty');
            if (diffBadge) {
                diffBadge.innerText = card.difficulty;
                diffBadge.className = "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ";
                if (card.difficulty === 'Beginner') {
                    diffBadge.className += "bg-emerald-100 text-emerald-800 border border-emerald-200";
                } else if (card.difficulty === 'Intermediate') {
                    diffBadge.className += "bg-amber-100 text-amber-800 border border-amber-200";
                } else {
                    diffBadge.className += "bg-rose-100 text-rose-800 border border-rose-200";
                }
            }
            
            const explanationEl = document.getElementById('active-card-explanation');
            const key = getActiveCardKey();
            if (explanationEl) {
                if (savedCardHighlights[key]) {
                    explanationEl.innerHTML = savedCardHighlights[key];
                } else {
                    explanationEl.innerHTML = card.feynman;
                }
            }
            
            const analogyEl = document.getElementById('active-card-analogy');
            if (analogyEl) analogyEl.innerText = card.analogy;
            
            const mistakeEl = document.getElementById('active-card-mistake');
            if (mistakeEl) mistakeEl.innerText = card.mistake;
            
            const whyMattersEl = document.getElementById('active-card-why-matters');
            if (whyMattersEl) whyMattersEl.innerText = card.whyItMatters;
            
            const total = activeCards.length;
            const progressPercent = Math.round(((currentCardIndex + 1) / total) * 100);
            
            const progressText = document.getElementById('active-session-progress-text');
            if (progressText) progressText.innerText = `Concept ${currentCardIndex + 1} of ${total}`;
            
            const percentText = document.getElementById('active-session-percent-text');
            if (percentText) percentText.innerText = `${progressPercent}% complete`;
            
            const progressFill = document.getElementById('active-session-progress-fill');
            if (progressFill) progressFill.style.width = `${progressPercent}%`;
            
            const indexIndicator = document.getElementById('active-card-index-indicator');
            if (indexIndicator) indexIndicator.innerText = `Concept ${currentCardIndex + 1} of ${total}`;
            
            const prevBtn = document.getElementById('active-card-prev-btn');
            if (prevBtn) {
                if (currentCardIndex === 0) {
                    prevBtn.disabled = true;
                    prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    prevBtn.disabled = false;
                    prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
            
            const nextBtn = document.getElementById('active-card-next-btn');
            if (nextBtn) {
                if (currentCardIndex === total - 1) {
                    nextBtn.innerHTML = `Finish Session &rarr;`;
                } else {
                    nextBtn.innerHTML = `Next Concept &rarr;`;
                }
            }

            const cardContainer = document.getElementById('active-study-card');
            if (cardContainer) {
                cardContainer.className = "bg-white border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl ";
                const state = cardStates[currentCardIndex];
                if (state === 'learned') {
                    cardContainer.className += "border-emerald-300 bg-emerald-50/10 shadow-emerald-100/20 shadow-md";
                } else if (state === 'missed') {
                    cardContainer.className += "border-rose-300 bg-rose-50/10 shadow-rose-100/20 shadow-md";
                } else if (state === 'review') {
                    cardContainer.className += "border-amber-300 bg-amber-50/10 shadow-amber-100/20 shadow-md";
                } else {
                    cardContainer.className += "border-surface-300/80";
                }
            }
        }

        function nextCard() {
            const triggerQuestion = activeQuestions.find(q => q.cardIndexTrigger === currentCardIndex);
            
            if (triggerQuestion && cardStates[currentCardIndex] === 'neutral') {
                triggerRecallCheckpoint(triggerQuestion);
                return;
            }
            
            advanceNextCard();
        }

        function advanceNextCard() {
            const total = activeCards.length;
            if (currentCardIndex < total - 1) {
                currentCardIndex++;
                renderCard();
            } else {
                endActiveStudySessionAndShowSummary();
            }
        }

        function prevCard() {
            if (currentCardIndex > 0) {
                currentCardIndex--;
                renderCard();
            }
        }

        // ---- HIGHLIGHTS SYSTEM ----
        function handleHighlightToolbarPopup(e) {
            const toolbar = document.getElementById('highlight-floating-toolbar');
            const explanationEl = document.getElementById('active-card-explanation');
            
            if (!explanationEl || explanationEl.offsetParent === null) {
                if (toolbar) toolbar.classList.add('hidden');
                return;
            }
            
            const selection = window.getSelection();
            if (!selection.rangeCount || selection.isCollapsed) {
                if (toolbar && !toolbar.contains(e.target)) {
                    toolbar.classList.add('hidden');
                }
                return;
            }
            
            const range = selection.getRangeAt(0);
            if (!explanationEl.contains(range.commonAncestorContainer)) {
                if (toolbar) toolbar.classList.add('hidden');
                return;
            }
            
            const rect = range.getBoundingClientRect();
            const parent = document.getElementById('tab-workspace');
            const parentRect = parent ? parent.getBoundingClientRect() : { top: 0, left: 0 };
            
            if (toolbar) {
                toolbar.classList.remove('hidden');
                toolbar.style.top = `${rect.top - parentRect.top - toolbar.offsetHeight - 10}px`;
                toolbar.style.left = `${rect.left - parentRect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)}px`;
            }
        }

        function applySelectionHighlight(color) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            
            const explanationEl = document.getElementById('active-card-explanation');
            if (!explanationEl || !explanationEl.contains(range.commonAncestorContainer)) {
                showNotification("Invalid Selection", "Please select text inside the Feynman Explanation box.", "error");
                return;
            }
            
            const selectedText = selection.toString().trim();
            if (!selectedText) return;
            
            let bgClass = "bg-yellow-100 text-yellow-900";
            if (color === 'green') bgClass = "bg-emerald-100 text-emerald-900";
            else if (color === 'red') bgClass = "bg-rose-100 text-rose-900";
            else if (color === 'blue') bgClass = "bg-sky-100 text-sky-900";
            
            const span = document.createElement('span');
            span.className = `${bgClass} px-1 rounded transition-colors`;
            span.setAttribute('data-hl-color', color);
            span.innerText = selectedText;
            
            range.deleteContents();
            range.insertNode(span);
            
            selection.removeAllRanges();
            
            StudentUSync.saveHighlight({
                concept_id: getActiveCardKey(),
                course_id: activeSession ? activeSession.courseKey : 'neuro',
                color: color,
                selected_text: selectedText,
                full_html: explanationEl.innerHTML,
                label: color === 'yellow' ? 'Key Term' : (color === 'green' ? 'Understood' : (color === 'red' ? 'Got Wrong' : 'Review'))
            });
            
            saveHighlightsForCurrentCard();
            updateHighlightStats();
            
            const toolbar = document.getElementById('highlight-floating-toolbar');
            if (toolbar) toolbar.classList.add('hidden');
        }

        function clearSelectionHighlight() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const explanationEl = document.getElementById('active-card-explanation');
            if (!explanationEl || !explanationEl.contains(range.commonAncestorContainer)) return;
            
            const text = selection.toString();
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            
            selection.removeAllRanges();
            saveHighlightsForCurrentCard();
            updateHighlightStats();
            
            const toolbar = document.getElementById('highlight-floating-toolbar');
            if (toolbar) toolbar.classList.add('hidden');
        }

        function clearCurrentCardHighlights() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const currentCard = activeCards[currentCardIndex];
            const key = getActiveCardKey();
            delete savedCardHighlights[key];
            localStorage.setItem('savedCardHighlights', JSON.stringify(savedCardHighlights));
            
            const explanationEl = document.getElementById('active-card-explanation');
            if (explanationEl) explanationEl.innerHTML = currentCard.feynman;
            updateHighlightStats();
            showNotification("Highlights Cleared", "Highlights for this card have been reset.", "info");
        }

        function saveHighlightsForCurrentCard() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const key = getActiveCardKey();
            const explanationEl = document.getElementById('active-card-explanation');
            if (explanationEl) {
                savedCardHighlights[key] = explanationEl.innerHTML;
                localStorage.setItem('savedCardHighlights', JSON.stringify(savedCardHighlights));
            }
        }

        function updateHighlightStats() {
            let yellow = 0, green = 0, red = 0, blue = 0;
            const parser = new DOMParser();
            
            for (const key in savedCardHighlights) {
                const html = savedCardHighlights[key];
                const doc = parser.parseFromString(html, 'text/html');
                yellow += doc.querySelectorAll('span[data-hl-color="yellow"]').length;
                green += doc.querySelectorAll('span[data-hl-color="green"]').length;
                red += doc.querySelectorAll('span[data-hl-color="red"]').length;
                blue += doc.querySelectorAll('span[data-hl-color="blue"]').length;
            }
            
            const yEl = document.getElementById('stat-hl-yellow');
            if (yEl) yEl.innerText = yellow;
            const gEl = document.getElementById('stat-hl-green');
            if (gEl) gEl.innerText = green;
            const rEl = document.getElementById('stat-hl-red');
            if (rEl) rEl.innerText = red;
            const bEl = document.getElementById('stat-hl-blue');
            if (bEl) bEl.innerText = blue;
            
            const totalMastered = green;
            const totalAtRisk = red + blue;
            
            const masteredEl = document.getElementById('stat-half-life');
            if (masteredEl) masteredEl.innerText = totalMastered;
            const riskEl = document.getElementById('stat-risk');
            if (riskEl) riskEl.innerText = totalAtRisk;
        }

        function autoHighlightCardRed(cardIdx) {
            const card = activeCards[cardIdx];
            const key = activeSession.courseKey + '_' + (card.id || cardIdx);
            const text = card.feynman;
            savedCardHighlights[key] = `<span class="bg-rose-100 text-rose-900 px-1 rounded transition-colors" data-hl-color="red">${text}</span>`;
            localStorage.setItem('savedCardHighlights', JSON.stringify(savedCardHighlights));
            updateHighlightStats();
        }

        function autoHighlightCardGreen(cardIdx) {
            const card = activeCards[cardIdx];
            const key = activeSession.courseKey + '_' + (card.id || cardIdx);
            const text = card.feynman;
            savedCardHighlights[key] = `<span class="bg-emerald-100 text-emerald-900 px-1 rounded transition-colors" data-hl-color="green">${text}</span>`;
            localStorage.setItem('savedCardHighlights', JSON.stringify(savedCardHighlights));
            updateHighlightStats();
        }

        // ---- Spaced Recall Overlay ----
        function triggerRecallCheckpoint(q) {
            currentRecallQuestion = q;
            document.getElementById('recall-difficulty').innerText = q.difficulty;
            document.getElementById('recall-question-text').innerText = q.question;
            
            const container = document.getElementById('recall-options-container');
            container.innerHTML = '';
            
            document.getElementById('recall-feedback-box').classList.add('hidden');
            
            const continueBtn = document.getElementById('recall-continue-btn');
            if (continueBtn) {
                continueBtn.disabled = true;
                continueBtn.className = "bg-surface-200 text-ink-50 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-not-allowed";
            }
            
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left text-sm text-ink-200 border border-surface-300 hover:border-ink-200 focus:outline-none transition-all p-3 rounded-xl bg-surface-100/60";
                btn.innerText = opt;
                btn.onclick = () => submitRecallAnswer(idx);
                container.appendChild(btn);
            });
            
            document.getElementById('recall-checkpoint-overlay').classList.remove('hidden');
        }

        function submitRecallAnswer(selectedIdx) {
            if (!currentRecallQuestion) return;
            const q = currentRecallQuestion;
            
            const buttons = document.querySelectorAll('#recall-options-container button');
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
            const explanationText = document.getElementById('recall-feedback-explanation');
            
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
                
                // Update concept in database
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
                
                // Update concept in database
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
            
            document.getElementById('recall-feedback-box').classList.remove('hidden');
            
            const continueBtn = document.getElementById('recall-continue-btn');
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.className = "bg-accent-teal text-white hover:bg-teal-600 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer";
            }
        }

        function dismissRecallCheckpoint() {
            document.getElementById('recall-checkpoint-overlay').classList.add('hidden');
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
                if (btnIcon) btnIcon.innerText = "â¸ï¸";
                if (timerDot) timerDot.classList.add('animate-pulse');
            } else {
                if (btnText) btnText.innerText = "Resume";
                if (btnIcon) btnIcon.innerText = "â–¶ï¸";
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
            
            const listContainer = document.getElementById('break-recap-list');
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
            
            document.getElementById('break-recap-screen').classList.remove('hidden');
            
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
            document.getElementById('break-recap-screen').classList.add('hidden');
            
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

        function endActiveStudySessionAndShowSummary() {
            if (activeSessionTimer) clearInterval(activeSessionTimer);
            if (breakSessionTimer) clearInterval(breakSessionTimer);
            isTimerRunning = false;
            
            document.getElementById('study-desk-active').classList.add('hidden');
            
            const totalCount = activeCards.length;
            const solidCount = cardStates.filter(s => s === 'learned').length;
            const missedCount = cardStates.filter(s => s === 'missed').length;
            
            document.getElementById('summary-covered-count').innerText = totalCount;
            document.getElementById('summary-solid-count').innerText = solidCount;
            document.getElementById('summary-missed-count').innerText = missedCount;
            
            const pointsEarned = (solidCount * 10) + 5;
            document.getElementById('summary-points-earned').innerText = `+${pointsEarned} XP`;
            
            studentPoints += pointsEarned;
            updateDashboardStats();
            
            let motivation = "Incredible work today! You deconstructed this material into bite-sized retention blocks.";
            if (solidCount === totalCount) {
                motivation = "Perfect score! You have achieved absolute mastery of these concepts. Keep up the high retention streak! ðŸŒŸ";
            } else if (solidCount >= totalCount / 2) {
                motivation = "Superb effort! Most concepts are solid, and the spaced repetition loop will reinforce the rest automatically. ðŸš€";
            } else {
                motivation = "Great start! Don't worry about the mistakesâ€”spaced reviews are designed to build memory half-life precisely here. ðŸ’ª";
            }
            document.getElementById('summary-motivation-msg').innerText = motivation;
            
            const beforePercent = Math.max(50, Math.min(85, 70 + Math.floor(Math.random() * 8) - 4));
            const afterPercent = Math.min(99, beforePercent + Math.round((solidCount / totalCount) * 15));
            document.getElementById('readiness-before-percent').innerText = `${beforePercent}%`;
            document.getElementById('readiness-after-percent').innerText = `${afterPercent}%`;
            
            const speedEl = document.getElementById('stat-speed');
            if (speedEl) speedEl.innerText = `${afterPercent}%`;
            
            const forecastList = document.getElementById('forgetting-curve-list');
            if (forecastList) {
                forecastList.innerHTML = '';
                
                activeCards.forEach((card, idx) => {
                    const state = cardStates[idx];
                    let intervalDays = 3;
                    let recommendation = "Review in 3 days (Optimal spacing)";
                    let badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
                    
                    if (state === 'learned') {
                        intervalDays = 7;
                        recommendation = "Review in 7 days (Memory half-life is high)";
                        badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                    } else if (state === 'missed') {
                        intervalDays = 1;
                        recommendation = "Review tomorrow (Reinforce immediately)";
                        badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
                    }
                    
                    const reviewDate = new Date();
                    reviewDate.setDate(reviewDate.getDate() + intervalDays);
                    const dateString = reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    
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
            
            // Sync session stats to DB
            const durationSecs = Math.round((Date.now() - activeSession.startTime) / 1000);
            const passedCheckpoints = cardStates.filter(s => s === 'learned').length;
            const failedCheckpoints = cardStates.filter(s => s === 'missed').length;

            StudentUSync.saveStudySession({
                course_id: activeSession.courseKey,
                started_at: new Date(activeSession.startTime).toISOString(),
                ended_at: new Date().toISOString(),
                duration_seconds: durationSecs,
                cards_covered: totalCount,
                cards_learned: solidCount,
                cards_missed: missedCount,
                points_earned: pointsEarned,
                readiness_before: beforePercent,
                readiness_after: afterPercent,
                recall_checkpoints_passed: passedCheckpoints,
                recall_checkpoints_failed: failedCheckpoints,
                highlights_saved: 0
            });
            
            StudentUSync.saveUser({
                points: studentPoints,
                badges: studentBadges,
                sessions_this_week: (currentUser?.sessions_this_week || 0) + 1,
                total_sessions: (currentUser?.total_sessions || 0) + 1,
                last_active: new Date().toISOString()
            });
            
            document.getElementById('session-summary-screen').classList.remove('hidden');
        }

        function returnToSetupPane() {
            document.getElementById('session-summary-screen').classList.add('hidden');
            document.getElementById('study-desk-setup').classList.remove('hidden');
        }

        function drillWeakSpots() { switchTab('workspace'); setTimeout(() => { generateAdaptiveQuiz(); showNotification("Focused Practice", "Targeting your weakest topics.", "info"); }, 300); }
        function rescheduleReminders() { showNotification("Schedule Updated", "Study plan adjusted around your exams.", "success"); }

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

        function handleHeroAction(actionType) {
            switchTab('workspace');
            if (actionType === 'demo') { 
                document.getElementById('course-selector').value = 'neuro'; 
                handleCourseChange(); 
                setTimeout(() => {
                    startStudySession();
                }, 300);
            }
            else { 
                document.getElementById('study-material').focus(); 
                showNotification("Ready to Go", "Paste your class notes to get started.", "info"); 
            }
        }

