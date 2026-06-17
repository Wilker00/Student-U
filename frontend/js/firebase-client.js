const StudentUFirebase = {
  app: null,
  auth: null,
  db: null,
  provider: null,
  user: null,
  ready: false,

  async init() {
    const config = window.STUDENTU_FIREBASE_CONFIG;
    if (!config || !config.projectId) return false;

    try {
      const appModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const authModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      this.app = appModule.initializeApp(config);
      this.auth = authModule.getAuth(this.app);
      this.db = firestoreModule.getFirestore(this.app);
      this.provider = new authModule.GoogleAuthProvider();
      this.ready = true;

      authModule.onAuthStateChanged(this.auth, async (user) => {
        this.user = user;
        if (user) {
          localStorage.setItem('studentu_user_id', user.uid);
          StudentUSync?.init(this.db, user.uid);
          await StudentUSync?.saveUser({
            id: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            photoURL: user.photoURL || '',
            lastSeenAt: new Date().toISOString(),
          });
          if (typeof currentUser !== 'undefined' && !currentUser) {
            currentUser = {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || '',
              plan: 'free',
            };
            window.StudentUStore?.setCurrentUser?.(currentUser);
            window.updateAuthUI?.();
          }
          await window.StudentUCloudSync?.pull?.();
        } else {
          window.StudentUCloudSync?.updateStatus?.('offline', 'Sign in to sync progress across devices.');
        }
      });

      return true;
    } catch (error) {
      console.warn('StudentUFirebase init failed:', error);
      return false;
    }
  },

  async signIn() {
    if (!this.ready || !this.auth || !this.provider) return null;
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const result = await authModule.signInWithPopup(this.auth, this.provider);
    this.user = result.user;
    return result.user;
  },

  async signOut() {
    if (!this.ready || !this.auth) return;
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    await authModule.signOut(this.auth);
    this.user = null;
  },

  async getIdToken() {
    if (!this.user) return '';
    return this.user.getIdToken();
  },
};

window.StudentUFirebase = StudentUFirebase;
window.addEventListener('DOMContentLoaded', () => StudentUFirebase.init());
