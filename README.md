# StudentU

StudentU is an AI study coach prototype for turning class notes into explanations, quizzes, and personalized study plans.

## Structure

- `frontend/` contains the static app, styles, client JavaScript, assets, and future component partials.
- `backend/` contains the Express API scaffold for Gemini, Firebase, sessions, courses, and usage enforcement.
- `tools/recovery/` contains scratch recovery and verification scripts from earlier rebuild work.
- `firebase.json`, `.firebaserc`, and `firestore.rules` are deployment/security scaffolds.

## Run Locally

Open `frontend/index.html` directly in a browser for the current static prototype.

The backend is scaffolded but not wired to production services yet:

```bash
cd backend
npm install
npm start
```
