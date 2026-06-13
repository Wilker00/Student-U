# StudentU

StudentU is an AI study coach prototype for turning class notes into explanations, quizzes, and personalized study plans.

## Structure

- `frontend/` contains the static app, styles, client JavaScript, assets, and future component partials.
- `backend/` contains the Express API scaffold for Gemini, Firebase, sessions, courses, and usage enforcement.
- `tools/recovery/` contains scratch recovery and verification scripts from earlier rebuild work.
- `firebase.json`, `.firebaserc`, and `firestore.rules` are deployment/security scaffolds.

## Run Locally

Open `frontend/index.html` directly in a browser for the static prototype. Offline/demo flows work without backend services.

Live AI generation is handled by the backend only. Put secrets in `backend/.env`, using `backend/.env.example` as the template:

```bash
cd backend
npm install
npm start
```

The frontend calls `/api/gemini/generate`; it does not store Gemini or Firebase secrets in browser storage.
