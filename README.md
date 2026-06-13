# StudentU

StudentU is an AI study coach prototype for turning class notes into explanations, quizzes, and personalized study plans.

The core product direction is class-aware studying: each course keeps a portfolio of syllabus context, uploaded notes, lecture photos, professor comments, chapters, weak topics, and practice history so AI generation can prepare better questions inside the real class context.

## Core Architecture: Algorithms + AI

StudentU uses a **hybrid approach** where 7 core algorithms drive personalization logic, and AI handles content generation:

### The 7 Core Algorithms

1. **Dependency Graph**  Orders concepts by prerequisites (student learns prerequisites first)
2. **Comprehension Gap Analysis**  Detects which parts of material student didn't engage with
3. **Performance Velocity**  Tracks if student is improving, plateauing, or declining
4. **Optimal Spacing Calculator**  Determines when to review each concept (SM-2 inspired)
5. **Weak Spot Clustering**  Groups related missed concepts for focused drills
6. **Difficulty Calibration**  Adapts question difficulty based on real-time performance
7. **Material Coherence Validator**  QA check: ensures AI questions relate to material

**Key Principle:** Algorithms decide WHAT to do (when to review, what order, what difficulty). AI decides HOW to explain it (analogies, phrasing, depth).

See [ALGORITHMS_API_REFERENCE.md](ALGORITHMS_API_REFERENCE.md) for complete API documentation.
See [ALGORITHM_AI_INTEGRATION.md](ALGORITHM_AI_INTEGRATION.md) for integration examples.

## Structure

- `frontend/` contains the static app, styles, client JavaScript, assets, and future component partials.
  - `js/algorithms.js`  Core algorithms (all 7, client-side, no dependencies)
  - `js/study-session.js`  Study session controller (integrated with algorithms)
  - Other modules: auth, dashboard, profile, quiz, planner, etc.
- `backend/` contains the Express API scaffold for Gemini, Firebase, sessions, courses, material metadata, and usage enforcement.
- `tools/recovery/` contains scratch recovery and verification scripts from earlier rebuild work.
- `firebase.json`, `.firebaserc`, and `firestore.rules` are deployment/security scaffolds.

## Run Locally

Open `frontend/index.html` directly in a browser for the static prototype. Offline/demo flows work without backend services.

Live AI generation is handled by the backend only. Put secrets in `backend/.env`, using `backend/.env.example` as the template. If the backend AI key is missing, the frontend keeps working through offline simulation instead of exposing client-side keys.

```bash
cd backend
npm install
npm start
```

The frontend calls `/api/gemini/generate`; it does not store Gemini or Firebase secrets in browser storage.

Class materials are modeled through `/api/courses/:courseId/materials`. The current prototype stores material metadata in `backend/data/studentu.db.json` locally, with Firebase Storage and Firestore as the next production persistence step.

Student sign-ups are modeled through `/api/signups`; there is no waitlist gate in the product flow.
