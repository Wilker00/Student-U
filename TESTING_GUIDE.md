# Quick Testing Guide - Verify Algorithms Are Working

## How to Test All 7 Algorithms

### Setup
1. Open `index.html` in a browser (Chrome recommended)
2. Open DevTools (F12  Console tab)
3. Close DevTools's auto-scroll so you can see logs

---

## Algorithm 1: Dependency Graph 
**How to test:** Start a study session

```
1. Click "Macroeconomics" in Course Selector
2. Click "Generate Study Guide" button
3. EXPECTED: First card shown is "What is Fiscal Policy?" (prerequisite)
   Second card is "The Multiplier Effect" (depends on fiscal policy)
   
4. LOOK IN CONSOLE:
   - activeSession.dependencyGraph should log graph structure
   
5. VERIFY: Cards are in correct prerequisite order, not random
```

---

## Algorithm 2: Comprehension Gap Analysis 
**How to test:** Highlight only part of a card

```
1. During study session, select "Feynman Explanation" text
2. Highlight ONLY ONE WORD (e.g., just "government")
3. Click "Highlight Yellow"
4. Move to next card (leave most of explanation unhighlighted)

5. EXPECTED: Console logs gap analysis:
   findComprehensionGaps() output showing:
   - gapPercentage: ~90%
   - gapSeverity: "critical"
   - unhighlightedSegments: [list of unhighlighted parts]

6. UI INDICATOR: Card container might have data-gapSeverity attribute
```

---

## Algorithm 3: Performance Velocity 
**How to test:** Complete a full session and check summary

```
1. Start a study session with 3-5 cards
2. Answer all questions (mix correct and incorrect)
3. Wait for session to complete

4. LOOK AT SESSION SUMMARY:
   - Should see motivation message
   - If improving: "Your accuracy is improving rapidly..."
   - If declining: "Your accuracy is slipping..."

5. OPEN CONSOLE AND RUN:
   getPerformanceHistory()
   // Should return array with your session

6. RUN:
   calculatePerformanceVelocity(getPerformanceHistory())
   // Should return:
   // {
   //   velocity: 0.123,
   //   trend: "improving_slowly",
   //   currentAccuracy: 75.5,
   //   difficultyAdjustment: "maintain",
   //   ...
   // }

7. VERIFY: Velocity is calculated correctly based on your answers
```

---

## Algorithm 4: Optimal Spacing Calculator 
**How to test:** Check review dates in session summary

```
1. Finish a study session (answer questions)
2. Look at "Forgetting Curve Forecast" section

3. EXPECTED: Each concept shows different review date:
   - Learned concepts: "Review on Jun 20" (7 days away)
   - Missed concepts: "Review on Jun 14" (1 day away)
   - Advanced concepts: shorter intervals
   - Beginner concepts: longer intervals

4. OPEN CONSOLE AND RUN:
   calculateOptimalReviewDate(
       { difficulty: 'Intermediate' },
       'learned',
       []
   )
   // Should return something like:
   // {
   //   interval: 7,
   //   reviewDate: Date,
   //   dateString: "Jun 20",
   //   reasoning: "Base: 7  difficulty: 1.0  repetitions: 1.0..."
   // }

5. VERIFY: Intervals make sense (learned > missed, etc.)
```

---

## Algorithm 5: Weak Spot Clustering 
**How to test:** Get multiple answers wrong, then check console

```
1. Start a study session with at least 3 cards
2. Intentionally get 2-3 questions WRONG
3. Complete the session

4. OPEN CONSOLE AND RUN:
   const history = getPerformanceHistory();
   const lastSession = history[history.length - 1];
   const missedIndices = lastSession.cardStates
       .map((s, i) => s === 'missed' ? i : null)
       .filter(Boolean);
   const activeCards = [...]; // (copy from active session)
   clusterWeakSpots(missedIndices, activeCards)

5. EXPECTED: Returns array of clusters like:
   // [
   //   {
   //     focusArea: "Multiplier + Fiscal",
   //     cardIds: ["m2", "m1"],
   //     suggestedDrill: "Generate 3 questions connecting..."
   //   }
   // ]

6. VERIFY: Related concepts are grouped together
```

---

## Algorithm 6: Difficulty Calibration 
**How to test:** Run in console (quiz integration pending)

```
1. In console, run:
   calibrateDifficulty(getPerformanceByDifficulty(), calculatePerformanceVelocity(getPerformanceHistory()))

2. EXPECTED: Returns object like:
   {
     primaryDifficulty: "MEDIUM",
     difficultyMix: { EASY: 0.3, MEDIUM: 0.6, HARD: 0.1 },
     aiPromptModifier: "Generate mostly MEDIUM questions (60%), with 30% EASY..."
   }

3. VERIFY: Difficulty adjusts based on your performance
```

---

## Algorithm 7: Material Coherence Validator 
**How to test:** Run in console (quiz validation pending)

```
1. In console, manually test:
   const card = {
       id: 'test',
       title: 'Backpropagation',
       feynman: 'Backprop computes gradients...'
   };
   
   const goodQuestion = {
       question: 'How does backpropagation work?',
       options: ['Using gradients', 'Random', 'Forward only', 'No learning'],
       correct: 0,
       explanation: 'Backprop propagates error gradients backward'
   };
   
   const badQuestion = {
       question: 'What color is the sky?',
       options: ['Blue', 'Green', 'Red', 'Yellow'],
       correct: 0,
       explanation: 'The sky appears blue'
   };

2. RUN:
   validateQuestionCoherence(card, goodQuestion)
   // Should return: { isCoherent: true, ... }
   
   validateQuestionCoherence(card, badQuestion)
   // Should return: { isCoherent: false, reason: "Low coherence: only 0% overlap" }

3. VERIFY: Coherent questions pass, incoherent ones fail
```

---

## Full Integration Test (All Algorithms)

```javascript
// Paste this in console to run all algorithms at once:

const allTests = () => {
    console.log("=== TESTING ALL 7 ALGORITHMS ===\n");
    
    // Algorithm 1
    console.log("1. DEPENDENCY GRAPH:");
    console.log(activeSession.dependencyGraph ? " Graph exists" : " No graph");
    
    // Algorithm 2
    console.log("\n2. COMPREHENSION GAP:");
    const gap = findComprehensionGaps('test', '<span data-hl-color="yellow">hello</span> world text', 'hello world text');
    console.log(gap ? ` Gap: ${gap.gapPercentage}%` : " No gap analysis");
    
    // Algorithm 3
    console.log("\n3. PERFORMANCE VELOCITY:");
    const history = getPerformanceHistory();
    const velocity = calculatePerformanceVelocity(history);
    console.log(velocity.trend !== 'insufficient_data' ? ` Trend: ${velocity.trend}` : " Need more data");
    
    // Algorithm 4
    console.log("\n4. OPTIMAL SPACING:");
    const spacing = calculateOptimalReviewDate({difficulty: 'Beginner'}, 'learned', []);
    console.log(` Review interval: ${spacing.interval} days`);
    
    // Algorithm 5
    console.log("\n5. WEAK SPOT CLUSTERING:");
    const clusters = clusterWeakSpots(['m2', 'm1'], activeCards || []);
    console.log(clusters.length > 0 ? ` ${clusters.length} clusters found` : " No clusters");
    
    // Algorithm 6
    console.log("\n6. DIFFICULTY CALIBRATION:");
    const calib = calibrateDifficulty(getPerformanceByDifficulty(), velocity);
    console.log(` Difficulty: ${calib.primaryDifficulty}`);
    
    // Algorithm 7
    console.log("\n7. COHERENCE VALIDATOR:");
    const card = {title: 'Test', feynman: 'Testing algorithm'};
    const q = {question: 'Test?', options: ['A','B','C','D'], correct: 0, explanation: 'Test'};
    const valid = validateQuestionCoherence(card, q);
    console.log(` Coherence: ${valid.isCoherent ? 'PASS' : 'FAIL'}`);
    
    console.log("\n=== ALL TESTS COMPLETE ===");
};

allTests();
```

---

## Console Commands for Quick Testing

```javascript
// See all performance history
getPerformanceHistory()

// See performance by difficulty (needs quiz tracking)
getPerformanceByDifficulty()

// See current session's dependency graph
activeSession.dependencyGraph

// Test dependency ordering
buildDependencyGraph(activeCards)

// Test all clusters for weak spots
const missedIds = activeCards.map((c, i) => cardStates[i] === 'missed' ? c.id : null).filter(Boolean);
clusterWeakSpots(missedIds, activeCards)

// Check performance velocity
calculatePerformanceVelocity(getPerformanceHistory())

// Check difficulty calibration
calibrateDifficulty(getPerformanceByDifficulty(), calculatePerformanceVelocity(getPerformanceHistory()))
```

---

## What to Look For

 **Success indicators:**
- Algorithms return expected data types
- No console errors
- Session summary shows velocity feedback
- Review dates vary by difficulty + performance
- Weak spots cluster by similarity
- Difficulty calibrates based on history

 **Problems to watch for:**
- `undefined` returns
- localStorage quota errors
- NaN values in calculations
- Circular dependencies in graph
- Infinite loops in clustering

---

## Debugging Tips

If something's not working:

1. **Check localStorage:**
   ```javascript
   localStorage.getItem('studentu_performance_history')
   localStorage.getItem('savedCardHighlights')
   ```

2. **Clear data:**
   ```javascript
   localStorage.clear()
   // Refresh page
   ```

3. **Log algorithms step-by-step:**
   ```javascript
   // Add console.logs in algorithms.js
   // Search for "console.log" and check output
   ```

4. **Check browser DevTools:**
   - Storage tab  localStorage
   - Network tab  API calls
   - Console  errors/warnings

---

**All algorithms are ready to test! Open index.html and try it out.**
