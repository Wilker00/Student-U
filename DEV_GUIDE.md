# StudentU Developer Guide

This guide reflects the current Express + Vite + shared-algorithm stack.

## Architecture

- Backend: `backend/server.js` serves the Express API, registers billing/Gemini/user/session/course/chat/progress/signup/analytics routes, and serves `frontend/dist` when available.
- Frontend: `frontend/index.html` hosts the main app shell and legacy script bundle; `frontend/src/main.js` is the Vite entry that wires shared store, demo data, and partial loading.
- Personalization: `shared/algorithms.core.js` is the canonical algorithm module. Backend analytics routes use it for session completion, recommendations, review scheduling, weak spot clustering, and question coherence checks.
- AI generation: `backend/routes/gemini.js` proxies Gemini through the backend. If `GEMINI_API_KEY` is empty, it returns deterministic demo cards/questions so the local walkthrough still works.

## Run Locally

```bash
cd backend
npm install
npm start
```

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://localhost:3000`.

## Local Demo

Use `DEMO_SCRIPT.md` for the click-by-click walkthrough. The supported hero path is:

1. Open the landing page.
2. Click **Try Demo**.
3. Generate the seeded Neural Networks study guide.
4. Take the adaptive quiz or finish the recall-card session.
5. Show the review summary, weak-topic updates, and planner/progress unlock.

## Tests

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

Manual smoke tests should cover the demo path with and without `GEMINI_API_KEY`.

## Environment

Use `backend/.env.example` as the template.

- `GEMINI_API_KEY` is optional for local demos and required for live AI generation.
- `ALLOW_LOCAL_AUTH=false` should be used with production Firebase Auth.
- `ALLOWED_ORIGINS` should include the frontend URL when CORS restrictions are enabled.
- Stripe and Firebase values are optional for local demo readiness.

## Deploy Checklist

- Backend tests pass.
- Frontend build passes.
- `ALLOWED_ORIGINS` includes the deployed frontend URL.
- Firebase Auth is enabled and local header auth is disabled in production.
- `frontend/dist` is built and served.
- Upload privacy, retention, and scanning policies are reviewed before accepting real student data.
