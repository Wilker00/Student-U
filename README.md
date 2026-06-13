# StudentU

StudentU is an AI study coach prototype for turning class notes into explanations, quizzes, and personalized study plans.

The core product direction is class-aware studying: each course keeps a portfolio of syllabus context, uploaded notes, lecture photos, professor comments, chapters, weak topics, and practice history so AI generation can prepare better questions inside the real class context.

## Structure

- `frontend/` contains the static app, styles, client JavaScript, assets, and future component partials.
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
