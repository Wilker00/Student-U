        function signInWithGoogle() { showNotification('Sign In', 'Google sign-in will connect through backend-managed auth.', 'info'); }

        function signOut() {
            currentUser = null;
            document.getElementById('auth-signed-in').classList.add('hidden');
            document.getElementById('auth-signed-out').classList.remove('hidden');
            showNotification('Signed Out', 'You have been signed out.', 'info');
        }

        function enableStudentUDevMode() {
            localStorage.removeItem('studentu_dev_mode');
            showNotification('Developer Mode', 'Developer settings moved to backend/.env.', 'info');
        }

        function disableStudentUDevMode() {
            localStorage.removeItem('studentu_dev_mode');
            showNotification('Developer Mode', 'Developer settings stay off the frontend.', 'info');
        }

        async function callGeminiAPI(prompt, systemInstruction = '', jsonMode = false) {
            const res = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, systemInstruction, jsonMode })
            });
            if (!res.ok) {
                let message = `Backend Gemini error: ${res.status}`;
                try {
                    const errorBody = await res.json();
                    if (errorBody.error) message = errorBody.error;
                } catch (error) {
                    // Keep the status-based message when the backend returns non-JSON.
                }
                throw new Error(message);
            }
            const data = await res.json();
            return data.text || '';
        }
