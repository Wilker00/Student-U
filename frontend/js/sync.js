        // ---- STUDENTSYNC: saved progress bridge ----
        const StudentUSync = {
            _db: null,
            _userId: null,
            init(db, userId) { this._db = db; this._userId = userId; },
            async saveConcept(concept) {
                if (!this._db || !this._userId) return; // offline mode &mdash; no-op
                try {
                    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await setDoc(doc(this._db, 'users', this._userId, 'concepts', concept.id), concept, { merge: true });
                } catch (e) { console.warn('StudentUSync.saveConcept failed:', e); }
            },
            async saveQuizResult(result) {
                if (!this._db || !this._userId) return; // offline mode &mdash; no-op
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'quiz_results'), { ...result, timestamp: serverTimestamp() });
                } catch (e) { console.warn('StudentUSync.saveQuizResult failed:', e); }
            },
            async saveSession(session) {
                if (!this._db || !this._userId) return;
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'sessions'), { ...session, timestamp: serverTimestamp() });
                } catch (e) { console.warn('StudentUSync.saveSession failed:', e); }
            },
            async getConcepts(courseId) {
                if (!this._db || !this._userId) return [];
                try {
                    const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    const q = query(collection(this._db, 'users', this._userId, 'concepts'), where('course_id', '==', courseId));
                    const snap = await getDocs(q);
                    return snap.docs.map(d => d.data());
                } catch (e) { return []; }
            }
        };


        // Compatibility aliases used by current study flows.
        StudentUSync.saveStudySession = StudentUSync.saveSession;
        StudentUSync.saveUser = async function saveUser(user) {
            if (!this._db || !this._userId) return;
            try {
                const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                await setDoc(doc(this._db, 'users', this._userId), user, { merge: true });
            } catch (e) { console.warn('StudentUSync.saveUser failed:', e); }
        };

        StudentUSync.saveHighlight = async function saveHighlight(highlight) {
            if (!this._db || !this._userId) return;
            try {
                const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                await addDoc(collection(this._db, 'users', this._userId, 'highlights'), { ...highlight, timestamp: serverTimestamp() });
            } catch (e) { console.warn('StudentUSync.saveHighlight failed:', e); }
        };
