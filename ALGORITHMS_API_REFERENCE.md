# StudentU Algorithms - Quick Reference API

## All 7 Algorithms at a Glance

### 1. Build Dependency Graph
**What it does:** Orders concepts by prerequisites  
**Input:** `cards` (array of card objects)  
**Output:** `{ sortedCards, dependencies, dependents, graph }`  

```javascript
const result = buildDependencyGraph(courseCards);
// result.sortedCards = prereqs first, advanced last
```

**When to use:**
- At session start, after AI generates cards
- Before showing first card to student

---

### 2. Find Comprehension Gaps
**What it does:** Detects which parts of a concept student didn't engage with  
**Input:** `cardId`, `highlightedHTML`, `originalText`  
**Output:** `{ gapPercentage, gapSeverity, unhighlightedSegments, suggestedPrompt }`  

```javascript
const gap = findComprehensionGaps(
    'card_123',
    savedHighlights['key'],
    originalFeynmanText
);

if (gap.gapSeverity === 'critical') {
    // Show "Get Help" button
    // Use gap.suggestedPrompt for AI follow-up
}
```

**When to use:**
- After student moves to next card
- When you want targeted AI follow-up
- To detect confusion early

---

### 3. Calculate Performance Velocity
**What it does:** Analyzes accuracy trend across sessions  
**Input:** `sessionHistory` (array of session records)  
**Output:** `{ velocity, trend, currentAccuracy, difficultyAdjustment, recommendation }`  

```javascript
const history = getPerformanceHistory();
const velocity = calculatePerformanceVelocity(history);

// velocity.trend: 'improving_fast', 'improving_slowly', 'stable', 
//                 'declining_slowly', 'declining_fast', 'insufficient_data'
// velocity.difficultyAdjustment: 'increase', 'decrease', 'maintain'
```

**When to use:**
- After session ends
- To personalize motivation message
- To inform next session difficulty
- For progress reports

---

### 4. Calculate Optimal Review Date
**What it does:** Determines scientifically-grounded review intervals  
**Input:** `card`, `performance` ('learned'|'missed'|'review'|'neutral'), `reviewHistory`  
**Output:** `{ interval, reviewDate, dateString, reasoning }`  

```javascript
const card = activeCards[0];
const performance = cardStates[0]; // 'learned'
const review = calculateOptimalReviewDate(card, performance, []);

// review.interval = 7 (days)
// review.reviewDate = Date object
// review.dateString = "Jun 20"
// review.reasoning = "Base: 7 days  difficulty: 1.0  repetitions: 1.0  consistency: 1.0"
```

**When to use:**
- In session summary, for each card
- When scheduling reviews in Firebase
- For "forgetting curve" UI display

---

### 5. Cluster Weak Spots
**What it does:** Groups related missed concepts for focused drills  
**Input:** `missedCardIds` (array of card IDs), `allCards` (full card deck)  
**Output:** `[{ focusArea, cardIds, cards, count, suggestedDrill }]`  

```javascript
const missedIds = ['card_2', 'card_5', 'card_8'];
const clusters = clusterWeakSpots(missedIds, allCards);

// clusters[0] = {
//   focusArea: "Calculus + Derivatives",
//   cards: [...],
//   suggestedDrill: "Generate 3 questions connecting Gradient, Chain Rule, ..."
// }
```

**When to use:**
- After session, if student missed concepts
- To populate "Focus Drill" UI suggestions
- To pass `suggestedDrill` prompt to AI

---

### 6. Calibrate Difficulty
**What it does:** Determines optimal question difficulty for next session  
**Input:** `studentPerformanceData`, `historicalVelocity` (optional)  
**Output:** `{ primaryDifficulty, reason, difficultyMix, confidence, aiPromptModifier }`  

```javascript
const performanceData = getPerformanceByDifficulty();
const history = getPerformanceHistory();
const velocity = calculatePerformanceVelocity(history);

const calibration = calibrateDifficulty(performanceData, velocity);

// calibration.primaryDifficulty = 'HARD'
// calibration.difficultyMix = { EASY: 0.1, MEDIUM: 0.3, HARD: 0.6 }
// calibration.aiPromptModifier = "Generate mostly HARD questions (60%), 
//                                  with 30% MEDIUM and 10% EASY."
```

**When to use:**
- Before generating quiz questions
- Pass `aiPromptModifier` to your AI prompt
- For adaptive learning progression

---

### 7. Validate Question Coherence
**What it does:** Quality controlensures AI question relates to material  
**Input:** `card` (object), `question` (object)  
**Output:** `{ isCoherent, overlapPercentage, matchedKeywords, reason, suggestion }`  

```javascript
const question = {
    question: "What...",
    options: ["A", "B", "C", "D"],
    correct: 1,
    explanation: "..."
};

const validation = validateQuestionCoherence(card, question);

if (!validation.isCoherent) {
    console.warn(`Regenerate with: "${validation.suggestion}"`);
    // Regenerate question OR skip
}
```

**When to use:**
- After AI generates a question
- Before showing question to student
- To catch hallucinations/drift

---

## Supporting Functions

### Get Performance History
```javascript
const history = getPerformanceHistory();
// Returns: [{ timestamp, courseKey, correctAnswers, missedAnswers, ... }]
```

### Save Performance Record
```javascript
savePerformanceRecord({
    courseKey: 'neuro',
    correctAnswers: 3,
    missedAnswers: 2,
    cardStates: ['learned', 'missed', 'learned', 'missed', 'learned'],
    duration: 1500 // seconds
});
```

### Get Performance By Difficulty
```javascript
const byDifficulty = getPerformanceByDifficulty();
// Returns: { 
//   easy: { correct, total, accuracy },
//   medium: { correct, total, accuracy },
//   hard: { correct, total, accuracy }
// }
```

---

## Integration Checklist

- [ ] Include `algorithms.js` in index.html
- [ ] Call `buildDependencyGraph()` after AI generates cards
- [ ] Call `findComprehensionGaps()` when saving highlights
- [ ] Call `savePerformanceRecord()` at end of session
- [ ] Call `calculatePerformanceVelocity()` for session summary
- [ ] Call `calculateOptimalReviewDate()` for each card in summary
- [ ] Call `clusterWeakSpots()` for drill suggestions
- [ ] Call `calibrateDifficulty()` before generating next quiz
- [ ] Call `validateQuestionCoherence()` after AI generates questions
- [ ] Store all data in Firebase for persistence
- [ ] Connect to backend `/api/gemini/generate` for AI calls

---

## Example: Complete Session Workflow

```javascript
// 1. STUDENT STARTS SESSION
async function startStudySession() {
    const material = document.getElementById('study-material').value;
    
    // AI generates raw cards
    let cards = await generateCardsWithAI(material);
    
    // Algorithm 1: Order by prerequisites
    const { sortedCards } = buildDependencyGraph(cards);
    
    activeCards = sortedCards;
    cardStates = activeCards.map(() => 'neutral');
    renderCard();
}

// 2. STUDENT HIGHLIGHTS & MOVES TO NEXT CARD
function nextCard() {
    const key = getActiveCardKey();
    
    // Algorithm 2: Check for gaps
    const gap = findComprehensionGaps(
        activeCards[currentCardIndex].id,
        savedCardHighlights[key],
        activeCards[currentCardIndex].feynman
    );
    
    if (gap?.gapSeverity === 'critical') {
        console.log('Gap detected! AI follow-up:', gap.suggestedPrompt);
    }
    
    currentCardIndex++;
    renderCard();
}

// 3. SESSION ENDS
function endActiveStudySessionAndShowSummary() {
    // Save session
    const history = savePerformanceRecord({
        courseKey: activeSession.courseKey,
        correctAnswers: cardStates.filter(s => s === 'learned').length,
        missedAnswers: cardStates.filter(s => s === 'missed').length,
        cardStates,
        duration: studySessionSeconds
    });
    
    // Algorithm 3: Calculate velocity
    const velocity = calculatePerformanceVelocity(history);
    console.log(`Trend: ${velocity.trend}`);
    
    // Algorithm 4: Calculate review dates
    const forecastList = document.getElementById('forgetting-curve-list');
    activeCards.forEach((card, idx) => {
        const reviewData = calculateOptimalReviewDate(card, cardStates[idx], []);
        // Display reviewData.dateString
        // Save to Firebase: db.collection('users').doc(userId)
        //   .collection('studyPlan').doc(card.id).set(reviewData);
    });
    
    // Algorithm 5: Cluster weak spots
    const missedIds = activeCards
        .map((c, i) => cardStates[i] === 'missed' ? c.id : null)
        .filter(Boolean);
    
    if (missedIds.length > 0) {
        const clusters = clusterWeakSpots(missedIds, activeCards);
        console.log('Weak spot clusters:', clusters);
        // Show "Drill Weak Spots" button with suggestions
    }
    
    showSessionSummary();
}

// 4. STUDENT CLICKS "DRILL WEAK SPOTS" OR "NEXT SESSION"
async function generateAdaptiveQuiz() {
    // Algorithm 6: Calibrate difficulty
    const performanceData = getPerformanceByDifficulty();
    const history = getPerformanceHistory();
    const velocity = calculatePerformanceVelocity(history);
    
    const calibration = calibrateDifficulty(performanceData, velocity);
    
    console.log(`Next session difficulty: ${calibration.primaryDifficulty}`);
    console.log(`AI instruction: ${calibration.aiPromptModifier}`);
    
    // AI generates questions with calibrated difficulty
    let questions = await generateQuestionsWithAI(
        activeCards,
        calibration.aiPromptModifier
    );
    
    // Algorithm 7: Validate coherence
    questions = questions.filter(q => {
        const validation = validateQuestionCoherence(
            activeCards.find(c => c.id === q.cardId),
            q
        );
        
        if (!validation.isCoherent) {
            console.warn(`Skipping incoherent question: ${validation.reason}`);
            return false;
        }
        return true;
    });
    
    // Show questions to student
    activeQuizArray = questions;
    renderQuizQuestion();
}
```

---

## Notes

- All algorithms run **client-side** (no API calls needed)
- Data is stored in `localStorage` and Firebase
- AI calls are only for **generation** (questions, explanations)
- Algorithms handle **logic** (ordering, scheduling, validation)
- This separation keeps latency low and cost predictable
