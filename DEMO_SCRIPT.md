# StudentU Local Demo Script

Use this script for the 1-week demo-readiness walkthrough.

## Setup

Terminal 1:

```bash
cd backend
npm install
npm start
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Expected Ports

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Gemini status: `http://localhost:3000/api/gemini/status`

## Walkthrough

1. Start from the landing page.
2. Click **Try Demo**.
3. Confirm Study Desk opens with **Neural Networks & Backpropagation** selected.
4. Confirm the study material field is populated with class packet/demo notes.
5. Click **Generate Study Guide**.
6. Walk through the recall cards:
   - Mark one card **Got It**.
   - Mark one card **Missed**.
   - Answer any recall checkpoint that appears.
7. Click the session end control.
8. Confirm the summary shows:
   - Concepts covered.
   - Solid/missed counts.
   - Review dates.
   - Weak-topic or focused-practice guidance.
9. Return to Study Desk and click **Generate Practice Quiz**.
10. Answer the quiz questions and confirm explanations and source labels appear.

## Gemini Fallback

The demo works with or without a Gemini key.

- With `GEMINI_API_KEY`: StudentU uses live Gemini generation.
- Without `GEMINI_API_KEY`: `/api/gemini/generate` returns deterministic demo cards and quiz questions.

The status panel should say demo mode when the key is missing, but the guide and quiz should still run.

## Reset Between Runs

In browser DevTools, run:

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then click **Try Demo** again.

## Pass Criteria

- The demo path has no dead-end screens.
- Missing Gemini configuration does not block the walkthrough.
- The selected class always has visible source context.
- The guide, quiz, and review summary all produce useful visible output.
