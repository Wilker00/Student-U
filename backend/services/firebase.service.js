let adminApp = null;

function getFirebaseAdmin() {
  if (adminApp) return adminApp;
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    adminApp = admin;
    return adminApp;
  } catch (error) {
    return null;
  }
}

function getFirestore() {
  const admin = getFirebaseAdmin();
  return admin ? admin.firestore() : null;
}

module.exports = { getFirebaseAdmin, getFirestore };
