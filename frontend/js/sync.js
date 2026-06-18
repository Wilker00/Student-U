        // ---- STUDENTSYNC: saved progress bridge ----
        const StudentUSync = {
            _db: null,
            _userId: null,
            init(db, userId) { this._db = db; this._userId = userId; },
            localAppend(key, value, limit = 200) {
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                items.unshift({ ...value, savedAt: new Date().toISOString() });
                localStorage.setItem(key, JSON.stringify(items.slice(0, limit)));
            },
            async postProgress(collectionName, payload) {
                try {
                    await studentUFetch(`/api/progress/${collectionName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                } catch (e) {
                    this.localAppend(`studentu_${collectionName}`, payload);
                }
            },
            async saveConcept(concept) {
                this.localAppend('studentu_concepts', concept);
                this.postProgress('concepts', concept);
                if (!this._db || !this._userId) return;
                try {
                    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await setDoc(doc(this._db, 'users', this._userId, 'concepts', concept.id), concept, { merge: true });
                } catch (e) { console.warn('StudentUSync.saveConcept failed:', e); }
            },
            async saveQuizResult(result) {
                this.localAppend('studentu_quiz_results', result);
                this.postProgress('quiz-results', result);
                if (!this._db || !this._userId) return;
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'quiz_results'), { ...result, timestamp: serverTimestamp() });
                } catch (e) { console.warn('StudentUSync.saveQuizResult failed:', e); }
            },
            async saveSession(session) {
                const normalized = {
                    id: session.id || `session_${Date.now()}`,
                    courseKey: session.courseKey || session.courseId || session.course_id || 'general',
                    durationMs: Number(session.durationMs ?? session.duration_ms ?? (session.durationSeconds ?? session.duration_seconds ?? session.duration ?? 0) * 1000) || 0,
                    cardStates: session.cardStates || {},
                    quizResults: session.quizResults || [],
                    createdAt: session.createdAt || session.created_at || session.ended_at || new Date().toISOString(),
                };
                this.localAppend('studentu_sessions', normalized);
                try {
                    await studentUFetch('/api/sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(normalized),
                    });
                } catch (e) {
                    // Local history above is the fallback.
                }
                if (!this._db || !this._userId) return;
                try {
                    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await addDoc(collection(this._db, 'users', this._userId, 'sessions'), { ...normalized, timestamp: serverTimestamp() });
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
            },
            async saveClassPortfolios(portfolios, activeClassId) {
                if (!this._db || !this._userId) return;
                try {
                    const { setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await setDoc(doc(this._db, 'users', this._userId, 'studyData', 'classPortfolios'), {
                        portfolios,
                        activeClassId,
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                } catch (e) { console.warn('StudentUSync.saveClassPortfolios failed:', e); }
            },
            async getClassPortfolios() {
                if (!this._db || !this._userId) return null;
                try {
                    const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    const snap = await getDoc(doc(this._db, 'users', this._userId, 'studyData', 'classPortfolios'));
                    return snap.exists() ? snap.data() : null;
                } catch (e) { return null; }
            },
            async saveUserProfile(profile) {
                if (!this._db || !this._userId) return false;
                try {
                    const { setDoc, doc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    await setDoc(doc(this._db, 'users', this._userId, 'studyData', 'userProfile'), {
                        ...profile,
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                    return true;
                } catch (e) {
                    console.warn('StudentUSync.saveUserProfile failed:', e);
                    return false;
                }
            },
            async getUserProfile() {
                if (!this._db || !this._userId) return null;
                try {
                    const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                    const snap = await getDoc(doc(this._db, 'users', this._userId, 'studyData', 'userProfile'));
                    return snap.exists() ? snap.data() : null;
                } catch (e) { return null; }
            },
            isCloudReady() {
                return Boolean(this._db && this._userId);
            },
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
            this.localAppend('studentu_highlights_saved', highlight);
            this.postProgress('highlights', highlight);
            if (!this._db || !this._userId) return;
            try {
                const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                await addDoc(collection(this._db, 'users', this._userId, 'highlights'), { ...highlight, timestamp: serverTimestamp() });
            } catch (e) { console.warn('StudentUSync.saveHighlight failed:', e); }
        };

        StudentUSync.savePerformance = async function savePerformance(record) {
            this.localAppend('studentu_performance_records', record);
            await this.postProgress('performance', record);
        };

        window.StudentUSync = StudentUSync;
