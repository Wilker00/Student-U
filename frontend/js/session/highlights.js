        // Session highlights module
        function handleHighlightToolbarPopup(e) {
            const toolbar = getHighlightToolbarElement();
            const explanationEl = getCardExplanationElement();

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

            const explanationEl = getCardExplanationElement();
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

            const toolbar = getHighlightToolbarElement();
            if (toolbar) toolbar.classList.add('hidden');
        }

        function clearSelectionHighlight() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const explanationEl = getCardExplanationElement();
            if (!explanationEl || !explanationEl.contains(range.commonAncestorContainer)) return;

            const text = selection.toString();
            range.deleteContents();
            range.insertNode(document.createTextNode(text));

            selection.removeAllRanges();
            saveHighlightsForCurrentCard();
            updateHighlightStats();

            const toolbar = getHighlightToolbarElement();
            if (toolbar) toolbar.classList.add('hidden');
        }

        function clearCurrentCardHighlights() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const currentCard = activeCards[currentCardIndex];
            const key = getActiveCardKey();
            delete savedCardHighlights[key];
            localStorage.setItem('savedCardHighlights', JSON.stringify(savedCardHighlights));

            const explanationEl = getCardExplanationElement();
            if (explanationEl) explanationEl.innerHTML = currentCard.feynman;
            updateHighlightStats();
            showNotification("Highlights Cleared", "Highlights for this card have been reset.", "info");
        }

        function saveHighlightsForCurrentCard() {
            if (!activeCards || !activeCards[currentCardIndex]) return;
            const key = getActiveCardKey();
            const explanationEl = getCardExplanationElement();
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
