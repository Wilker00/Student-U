# Firebase Auth + Firestore Setup

Use this when you are ready to connect StudentU to a real Firebase project.

## 1. Create The Firebase Project

1. Go to the Firebase Console.
2. Create a project named `StudentU` or connect the existing Google Cloud project.
3. Add a Web App.
4. Copy the Firebase web config.

## 2. Add The Web Config

Open `frontend/js/firebase-config.js` and replace `null` with the config from Firebase:

```js
window.STUDENTU_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

The web config is not a backend secret, but keep backend service-account values out of the frontend.

## 3. Enable Google Sign-In

In Firebase Console:

1. Go to Authentication.
2. Open Sign-in method.
3. Enable Google.
4. Add your local and hosted domains under authorized domains.

## 4. Create Firestore

In Firebase Console:

1. Go to Firestore Database.
2. Create the database.
3. Start in production mode.
4. Deploy `firestore.rules`.

Current rule shape:

```txt
users/{userId}/...
```

Only the signed-in user can read/write their own documents.

## 5. Backend Token Verification

The backend can verify Firebase ID tokens after you install dependencies and add service-account env vars.

```bash
cd backend
npm install
```

Set these in `backend/.env`:

```txt
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

For `FIREBASE_PRIVATE_KEY`, keep the newline escapes as `\n`.

## 6. What Works After This

- Google sign-in in the frontend.
- Firestore sync for user profile data, concepts, quiz results, sessions, highlights, and class portfolios.
- Backend routes receive Firebase ID tokens through the `Authorization` header.
- Backend verifies Firebase ID tokens when service-account env vars are present.
- Backend stores users, study sessions, course materials, and class memory in Firestore when configured.
- Backend falls back to local study-space mode if Firebase is not configured.

## 7. Firestore Data Shape

```txt
users/{userId}
users/{userId}/concepts/{conceptId}
users/{userId}/quiz_results/{autoId}
users/{userId}/sessions/{sessionId}
users/{userId}/highlights/{autoId}
users/{userId}/studyData/classPortfolios
users/{userId}/courses/{courseId}/materials/{materialId}
users/{userId}/courses/{courseId}/system/classMemory
```

## 8. Next Step After Auth + Firestore

After this is running, the next integration should be Firebase Storage or Google Cloud Storage for uploaded files.
