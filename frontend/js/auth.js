        function getStudentUUserId() {
            const saved = localStorage.getItem('studentu_user_id');
            if (saved) return saved;
            const generated = `student_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('studentu_user_id', generated);
            return generated;
        }

        async function getStudentUAuthHeaders(extra = {}) {
            const headers = {
                ...extra,
                'x-studentu-user-id': getStudentUUserId(),
            };
            const token = await window.StudentUFirebase?.getIdToken?.();
            if (token) headers.Authorization = `Bearer ${token}`;
            return headers;
        }

        async function studentUFetch(url, options = {}) {
            const headers = await getStudentUAuthHeaders(options.headers || {});
            return fetch(url, { ...options, headers });
        }

        async function signInWithGoogle() {
            if (window.StudentUFirebase?.ready) {
                try {
                    const firebaseUser = await window.StudentUFirebase.signIn();
                    if (firebaseUser) {
                        window.StudentUStore?.setGuestMode?.(false) ?? sessionStorage.removeItem('studentu_guest_mode');
                        currentUser = {
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || '',
                            plan: 'free',
                        };
                        window.StudentUStore?.setCurrentUser?.(currentUser);
                        updateAuthUI();
                        window.refreshWorkspaceModeUI?.();
                        showNotification('Signed In', 'Your study space is now connected.', 'success');
                        routeToStudyHome?.();
                        setTimeout(() => showNewUserOnboarding?.(), 300);
                        return;
                    }
                } catch (error) {
                    console.warn('Firebase sign-in failed, falling back to local mode:', error);
                }
            }

            try {
                const res = await studentUFetch('/api/users/me');
                if (res.ok) {
                    const data = await res.json();
                    currentUser = data.user;
                    window.StudentUStore?.setCurrentUser?.(currentUser);
                } else {
                    currentUser = {
                        id: getStudentUUserId(),
                        email: 'guest@studentu.local',
                        name: 'Guest Student',
                        plan: 'free',
                    };
                    window.StudentUStore?.setCurrentUser?.(currentUser);
                }
                updateAuthUI();
                window.refreshWorkspaceModeUI?.();
                showNotification('Study Space Ready', 'Your study space is ready on this device.', 'success');
                routeToStudyHome?.();
                setTimeout(() => showNewUserOnboarding?.(), 300);
            } catch (error) {
                console.warn('Local sign-in failed, enabling offline fallback:', error);
                currentUser = {
                    id: getStudentUUserId(),
                    email: 'guest@studentu.local',
                    name: 'Guest Student',
                    plan: 'free',
                };
                window.StudentUStore?.setCurrentUser?.(currentUser);
                updateAuthUI();
                window.refreshWorkspaceModeUI?.();
                showNotification('Study Space Ready (Offline)', 'Your study space is ready offline on this device.', 'success');
                routeToStudyHome?.();
                setTimeout(() => showNewUserOnboarding?.(), 300);
            }
        }

        function signOut() {
            currentUser = null;
            window.StudentUStore?.setCurrentUser?.(null);
            localStorage.removeItem('studentu_user_id');
            window.StudentUStore?.setGuestMode?.(false) ?? sessionStorage.removeItem('studentu_guest_mode');
            window.StudentUFirebase?.signOut?.();
            window.StudentUCloudSync?.updateStatus?.('offline', 'Sign in to sync progress across devices.');
            document.getElementById('auth-signed-in')?.classList.add('hidden');
            document.getElementById('auth-signed-out')?.classList.remove('hidden');
            updateAuthUI();
            window.refreshWorkspaceModeUI?.();
            showNotification('Signed Out', 'You have been signed out.', 'info');
            switchTab?.('landing');
        }

        function updateAuthUI() {
            const authButton = document.getElementById('auth-action-button');
            if (!authButton) return;
            if (currentUser) {
                const label = currentUser.name || currentUser.email || 'Signed in';
                authButton.textContent = label.length > 18 ? `${label.slice(0, 17)}...` : label;
                authButton.onclick = signOut;
            } else {
                authButton.textContent = 'Sign in';
                authButton.onclick = signInWithGoogle;
            }

            const verifiedEmail = localStorage.getItem('studentu_verified_email');
            const verifiedSchool = localStorage.getItem('studentu_verified_school');
            const verifyButton = document.getElementById('verify-button');
            if (verifyButton) {
                if (verifiedEmail && verifiedSchool) {
                    verifyButton.textContent = 'Verified';
                    verifyButton.className = 'text-xs border border-emerald-500 text-emerald-700 px-3 sm:px-4 py-2 rounded-lg font-medium';
                    verifyButton.onclick = null;
                } else {
                    verifyButton.textContent = 'Verify .edu';
                    verifyButton.className = 'text-xs btn-outline px-3 sm:px-4 py-2 rounded-lg font-medium';
                    verifyButton.onclick = openVerificationModal;
                }
            }

            const accountVerifyButton = document.getElementById('account-verify-button');
            if (accountVerifyButton) {
                if (verifiedEmail && verifiedSchool) {
                    accountVerifyButton.textContent = 'Verified Student';
                    accountVerifyButton.className = 'border border-emerald-500 text-emerald-700 rounded-xl px-4 py-2.5 text-xs font-semibold';
                    accountVerifyButton.onclick = null;
                } else {
                    accountVerifyButton.textContent = 'Verify .edu Email';
                    accountVerifyButton.className = 'btn-outline rounded-xl px-4 py-2.5 text-xs font-semibold';
                    accountVerifyButton.onclick = openVerificationModal;
                }
            }

            window.StudentUClassPortfolio?.renderAccount?.();
            window.updateUserTierDisplay?.();
            window.refreshDashboard?.();
        }

        async function refreshStudyServiceStatus() {
            const panel = document.getElementById('ai-status-panel');
            const text = document.getElementById('ai-status-text');
            const accountStatus = document.getElementById('account-study-status');
            const setAccountStatus = (className, message) => {
                if (!accountStatus) return;
                accountStatus.className = className;
                accountStatus.textContent = message;
            };
            if (!panel || !text) return;
            try {
                const res = await fetch('/api/gemini/status');
                const status = await res.json();
                if (status.configured) {
                    panel.className = 'mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2';
                    text.className = 'text-[10px] text-emerald-700 font-semibold';
                    text.textContent = `Live study generation ready (${status.model}).`;
                    setAccountStatus('bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 font-semibold', 'Live study generation is ready.');
                } else {
                    panel.className = 'mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2';
                    text.className = 'text-[10px] text-amber-700 font-semibold';
                    text.textContent = 'Demo mode: saved study tools are available. Live generation is not connected yet.';
                    setAccountStatus('bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-semibold', 'Demo mode: saved study tools are available. Live generation is not connected yet.');
                }
            } catch (error) {
                panel.className = 'mt-3 rounded-xl border border-surface-300 bg-surface-100 px-3 py-2';
                text.className = 'text-[10px] text-ink-100 font-semibold';
                // FIX: Soften backend-dependent empty states - explain offline/demo state without implying the student did something wrong.
                text.textContent = 'Offline demo mode: sample guides and local study tools are still available.';
                setAccountStatus('bg-surface-100 border border-surface-300 rounded-xl px-4 py-3 text-xs text-ink-100', 'Offline demo mode: sample guides and local study tools are still available.');
            }
        }

        function enableStudentUDevMode() {
            localStorage.removeItem('studentu_dev_mode');
            showNotification('Settings', 'There is nothing to change here right now.', 'info');
        }

        function disableStudentUDevMode() {
            localStorage.removeItem('studentu_dev_mode');
            showNotification('Settings', 'There is nothing to change here right now.', 'info');
        }

        async function callGeminiAPI(prompt, systemInstruction = '', jsonMode = false) {
            const res = await studentUFetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, systemInstruction, jsonMode })
            });
            if (!res.ok) {
                let message = 'Study guide generation is temporarily unavailable.';
                try {
                    const errorBody = await res.json();
                    if (errorBody.error) message = errorBody.error;
                } catch (error) {
                    // Keep the status-based message when the service returns non-JSON.
                }
                throw new Error(message);
            }
            const data = await res.json();
            return data.text || '';
        }

        window.addEventListener('DOMContentLoaded', () => {
            updateAuthUI();
            refreshStudyServiceStatus();
        });
