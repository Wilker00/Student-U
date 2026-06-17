# StudentU

StudentU is an AI study coach prototype for turning class notes into explanations, quizzes, and personalized study plans.

The core product direction is class-aware studying: each course keeps a portfolio of syllabus context, uploaded notes, lecture photos, professor comments, chapters, weak topics, and practice history so AI generation can prepare better questions inside the real class context. The first-user path is now: add a class, upload the syllabus, add notes or photos, then generate a class-specific study plan.

## Core Architecture: Algorithms + AI

StudentU uses a **hybrid approach** where 7 core algorithms drive personalization logic, and AI handles content generation:

### The 7 Core Algorithms

1. **Dependency Graph**  Orders concepts by prerequisites (student learns prerequisites first)
2. **Comprehension Gap Analysis**  Detects which parts of material student didn't engage with
3. **Performance Velocity**  Tracks if student is improving, plateauing, or declining
4. **Optimal Spacing Calculator**  FSRS-backed review dates (via `shared/fsrs.core.js`)
5. **Weak Spot Clustering**  Groups related missed concepts for focused drills
6. **Difficulty Calibration**  Adapts question difficulty based on real-time performance
7. **Material Coherence Validator**  QA check: ensures AI questions relate to material

**Key Principle:** Algorithms decide WHAT to do (when to review, what order, what difficulty). AI decides HOW to explain it (analogies, phrasing, depth).

**Recommended stack (local + hybrid):**

| Layer | Tool | Role |
|-------|------|------|
| OCR | Tesseract.js → Gemini Vision | Read lecture photos cheaply first |
| Spacing | FSRS (`shared/fsrs.core.js`) | Smarter review scheduling |
| Context | MiniSearch | Pick the best note chunks for AI prompts |
| Documents | Mammoth + pdf-parse | Syllabus/DOCX/PDF text extraction |
| Generation | Gemini | Explanations, quizzes, chat only |

See [DEV_GUIDE.md](DEV_GUIDE.md) for the current developer setup, API map, and deploy checklist.
See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the local walkthrough path used to demo StudentU.
See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase Auth and Firestore setup.

## Structure

- `shared/algorithms.core.js` — canonical algorithm implementations + tests
- `frontend/` — Vite app (`src/main.js`), legacy JS modules, styles, assets
  - `js/algorithms.js` — client-only: dependency graph + comprehension gaps
  - `js/api/analytics.js` — server analytics API client
  - `js/profile/` — context, views, store, init
  - `js/session/` — recall, timer, summary module
- `backend/` — Express API (Gemini, Firebase, sessions, courses, analytics)
- `firebase.json`, `.firebaserc`, and `firestore.rules` — deployment/security scaffolds

## Run Locally

Backend is required for AI generation and personalization analytics.

```bash
# Terminal 1
cd backend
npm install
npm start

# Terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` (Vite proxies `/api` to port 3000).

Put secrets in `backend/.env`, using `backend/.env.example` as the template.

For local demos, StudentU still works when `GEMINI_API_KEY` is empty: the backend returns deterministic sample study-guide cards and quiz questions for the demo path. When a Gemini key is configured, live generation is used instead.

Class materials are modeled through authenticated `/api/courses/:courseId/materials` routes. Local development assigns a stable study-space id to the browser and sends it as a user identity header; production should replace this with verified Firebase bearer tokens in `backend/middleware/auth.middleware.js`.

Local development stores material records in `backend/data/studentu.db.json` and uploaded files in `backend/data/uploads/`; both are ignored by git so student material is not committed. Text uploads get an extracted preview immediately, while images, PDFs, Word docs, and slide decks are saved with processing status for the production extraction pipeline.

Syllabus uploads are parsed into class memory: important dates, chapter/topic lines, grading signals, professor policy hints, and mapped concepts. The class page shows what StudentU found and the study packet includes that structured context before generating study guides or quizzes.

Student-facing upload controls include permission confirmation and reminders to avoid sensitive personal records. Production deployments should pair this with authenticated accounts, per-user storage paths, signed download URLs, file scanning, retention controls, and clear privacy policy language before accepting real student materials.

Student sign-ups are modeled through `/api/signups`; there is no waitlist gate in the product flow.
