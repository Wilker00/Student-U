        const USAGE_LIMITS = {
            free: { session: 1, quiz: 10, explanation: 5, upload: 2 },
            edu: { session: 3, quiz: 20, explanation: 10, upload: 5 },
            premium: { session: Infinity, quiz: Infinity, explanation: Infinity, upload: Infinity }
        };

        let billingConfigured = false;
        let billingPriceLabel = '$10/month';

        function getUserTier() { return localStorage.getItem('studentu_tier') || 'free'; }
        window.getUserTier = getUserTier;

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

        function openUpgradeModal() {
            updateUpgradeModalCopy();
            document.getElementById('upgrade-modal')?.classList.remove('hidden');
        }
        function closeUpgradeModal() { document.getElementById('upgrade-modal')?.classList.add('hidden'); }

        function activatePremiumTier(source = 'preview') {
            localStorage.setItem('studentu_tier', 'premium');
            localStorage.setItem('studentu_billing_source', source);
            closeUpgradeModal();
            updateUserTierDisplay();
            window.StudentUCloudSync?.schedulePush?.();
        }

        function simulateStripeCheckout() {
            showNotification('Enabling preview…', 'Unlocking premium limits on this device.', 'info');
            setTimeout(() => {
                activatePremiumTier('preview');
                showNotification('Preview enabled', 'Premium limits are active on this device.', 'success');
            }, 800);
        }

        async function startStripeCheckout() {
            showNotification('Opening checkout…', 'Redirecting to secure payment.', 'info');
            try {
                const res = await studentUFetch('/api/billing/create-checkout-session', { method: 'POST' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (data.fallback) {
                        showNotification('Stripe unavailable', 'Using preview access on this device.', 'info');
                        simulateStripeCheckout();
                        return;
                    }
                    throw new Error(data.error || 'Checkout failed');
                }
                if (data.url) {
                    window.location.href = data.url;
                    return;
                }
                throw new Error('No checkout URL returned');
            } catch (error) {
                console.warn('Stripe checkout failed:', error);
                showNotification('Checkout unavailable', 'Using preview access on this device.', 'info');
                simulateStripeCheckout();
            }
        }

        async function refreshBillingStatus() {
            try {
                const res = await studentUFetch('/api/billing/status');
                if (!res.ok) return;
                const data = await res.json();
                billingConfigured = Boolean(data.configured);
                billingPriceLabel = data.priceLabel || billingPriceLabel;
                updateUpgradeModalCopy();
            } catch (_error) {
                billingConfigured = false;
            }
        }

        function updateUpgradeModalCopy() {
            const btn = document.querySelector('#upgrade-modal [data-action="startStripeCheckout"], #upgrade-modal [data-action="simulateStripeCheckout"]');
            const note = document.querySelector('#upgrade-modal .upgrade-modal-note');
            if (btn) {
                btn.textContent = billingConfigured ? `Subscribe — ${billingPriceLabel}` : 'Enable preview access';
                btn.dataset.action = billingConfigured ? 'startStripeCheckout' : 'simulateStripeCheckout';
            }
            if (note) {
                note.textContent = billingConfigured
                    ? 'Secure checkout powered by Stripe. Premium syncs to your account when signed in.'
                    : 'Billing is not connected yet — this unlocks premium limits on this device only.';
            }
        }

        async function handleBillingReturn() {
            const params = new URLSearchParams(window.location.search);
            const billing = params.get('billing');
            const sessionId = params.get('session_id');
            if (!billing) return;

            params.delete('billing');
            params.delete('session_id');
            const nextQuery = params.toString();
            const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
            window.history.replaceState({}, '', nextUrl);

            if (billing === 'cancelled') {
                showNotification('Checkout cancelled', 'You can upgrade anytime from Billing.', 'info');
                return;
            }

            if (billing === 'success' && sessionId) {
                try {
                    const res = await studentUFetch(`/api/billing/session/${encodeURIComponent(sessionId)}`);
                    const data = await res.json();
                    if (data.paid) {
                        activatePremiumTier('stripe');
                        showNotification('Premium active', 'Your subscription is now active.', 'success');
                        switchTab?.('dashboard');
                        return;
                    }
                } catch (error) {
                    console.warn('Could not verify billing session:', error);
                }
                showNotification('Payment received', 'Premium may take a moment to activate.', 'info');
            }
        }

        function getTierLabel(tier) {
            if (tier === 'premium') {
                return localStorage.getItem('studentu_billing_source') === 'stripe' ? 'Premium' : 'Premium (preview)';
            }
            if (tier === 'edu') return 'Verified Student';
            return 'Free';
        }

        function updateUserTierDisplay() {
            const tier = getUserTier();
            const label = getTierLabel(tier);
            document.querySelectorAll('#user-tier-display').forEach(el => { el.textContent = label; });
            const school = localStorage.getItem('studentu_verified_school');
            document.querySelectorAll('#user-university-display').forEach(el => {
                el.textContent = school || '—';
            });
        }
        window.updateUserTierDisplay = updateUserTierDisplay;
        window.startStripeCheckout = startStripeCheckout;
        window.simulateStripeCheckout = simulateStripeCheckout;
        window.handleBillingReturn = handleBillingReturn;

        document.addEventListener('DOMContentLoaded', () => {
            updateUserTierDisplay();
            refreshBillingStatus();
            handleBillingReturn();
        });
