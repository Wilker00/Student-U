        // Session cards module
        function renderCard() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const card = activeCards[currentCardIndex];

            setTextForIds(['active-card-title', 'card-title'], card.title);

            const diffBadge = document.getElementById('active-card-difficulty') || document.getElementById('card-difficulty-badge');
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

            const explanationEl = getCardExplanationElement();
            const key = getActiveCardKey();
            if (explanationEl) {
                if (savedCardHighlights[key]) {
                    explanationEl.innerHTML = savedCardHighlights[key];
                } else {
                    explanationEl.innerHTML = card.feynman;
                }
            }

            const analogyEl = document.getElementById('active-card-analogy') || document.getElementById('card-analogy');
            if (analogyEl) analogyEl.innerText = card.analogy;

            const mistakeEl = document.getElementById('active-card-mistake') || document.getElementById('card-mistake');
            if (mistakeEl) mistakeEl.innerText = card.mistake;

            const whyMattersEl = document.getElementById('active-card-why-matters') || document.getElementById('card-why');
            if (whyMattersEl) whyMattersEl.innerText = card.whyItMatters;

            const sourcePanel = document.getElementById('active-card-source-panel') || document.getElementById('card-source-panel');
            if (sourcePanel) {
                const source = card.sourceLabel || 'Class packet';
                const confidence = card.confidence || 'Medium';
                sourcePanel.innerHTML = '';
                [
                    `Source: ${source}`,
                    `Confidence: ${confidence}`,
                ].forEach(label => {
                    const badge = document.createElement('span');
                    badge.className = 'bg-white border border-surface-300 rounded-md px-2 py-1 font-semibold';
                    badge.textContent = label;
                    sourcePanel.appendChild(badge);
                });
            }

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

            const cardCounter = document.getElementById('card-counter');
            if (cardCounter) cardCounter.innerText = `${currentCardIndex + 1} / ${total}`;

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

            const cardContainer = document.getElementById('active-study-card') || document.getElementById('card-container');
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
            inspectCurrentComprehensionGap();
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
