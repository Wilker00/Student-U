# StudentU Documentation Index

## Start Here

- `README.md` - product overview, current architecture, and local setup.
- `DEMO_SCRIPT.md` - exact local walkthrough for the class-to-quiz demo.
- `DEV_GUIDE.md` - API map, environment notes, tests, and deploy checklist.
- `FIREBASE_SETUP.md` - Firebase Auth and Firestore setup.

## Architecture References

- `shared/algorithms.core.js` - canonical personalization algorithms used by backend services and tests.
- `backend/server.js` - Express API entrypoint, static frontend serving, and route registration.
- `frontend/index.html` - main app shell and legacy script bundle host.
- `frontend/src/main.js` - Vite entrypoint, shared store wiring, demo data, and partial loading.

## Feature References

- `ALGORITHMS_API_REFERENCE.md` - algorithm input/output reference.
- `ALGORITHM_AI_INTEGRATION.md` - how deterministic algorithms and AI generation work together.
- `IMPLEMENTATION_SUMMARY.md` - historical implementation notes.
- `TESTING_GUIDE.md` - manual algorithm verification and console checks.

## Current Demo Path

The supported demo is:

1. Run the backend on `http://localhost:3000`.
2. Run Vite on `http://localhost:5173`.
3. Click `Try Demo`.
4. Generate a study guide from the seeded Neural Networks class.
5. Take the adaptive quiz or end the study session to see the review summary.

If `GEMINI_API_KEY` is not configured, `/api/gemini/generate` returns deterministic demo cards and questions so the walkthrough still works locally.
