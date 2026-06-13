        const USAGE_LIMITS = {
            free: { session: 1, quiz: 10, explanation: 5, upload: 2 },
            edu: { session: 3, quiz: 20, explanation: 10, upload: 5 },
            premium: { session: Infinity, quiz: Infinity, explanation: Infinity, upload: Infinity }
        };

        function getUserTier() { return localStorage.getItem('studentu_tier') || 'free'; }

        function checkUsageLimit(type) {
            const tier = getUserTier();
            const limits = USAGE_LIMITS[tier] || USAGE_LIMITS.free;
            const key = `studentu_usage_${type}_${new Date().toISOString().split('T')[0]}`;
            const used = parseInt(localStorage.getItem(key) || '0');
            if (used >= limits[type]) {
                openUpgradeModal();
                showNotification('Limit Reached', `You've hit your ${type} limit for today. Upgrade to continue.`, 'warning');
                return false;
            }
            return true;
        }

        function incrementUsage(type) {
            const key = `studentu_usage_${type}_${new Date().toISOString().split('T')[0]}`;
            const used = parseInt(localStorage.getItem(key) || '0');
            localStorage.setItem(key, used + 1);
        }

        function openUpgradeModal() { document.getElementById('upgrade-modal').classList.remove('hidden'); }
        function closeUpgradeModal() { document.getElementById('upgrade-modal').classList.add('hidden'); }

        function simulateStripeCheckout() {
            showNotification('Processing...', 'Opening secure checkout.', 'info');
            setTimeout(() => {
                localStorage.setItem('studentu_tier', 'premium');
                closeUpgradeModal();
                showNotification('Upgraded!', 'Welcome to StudentU Premium. All limits removed.', 'success');
                updateUserTierDisplay();
            }, 2000);
        }

        function updateUserTierDisplay() {
            const tier = getUserTier();
            const el = document.getElementById('user-tier-display');
            if (el) el.textContent = tier === 'premium' ? 'Premium *' : tier === 'edu' ? 'Verified .edu Study' : 'Free';
        }
