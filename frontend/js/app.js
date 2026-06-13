// ---- GLOBAL STATE ----
        let studentPoints = 100;
        let studentBadges = 32;
        let currentUser = null;
        let activeSession = null;
        let currentQuizIndex = 0;
        let currentQuizData = [];
        let highlights = JSON.parse(localStorage.getItem('studentu_highlights') || '{}');
        let selectedRange = null;
        let savedCardHighlights = JSON.parse(localStorage.getItem('savedCardHighlights') || '{}');

        // ---- NAVIGATION ----
        function switchTab(tabName) {
            document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById('tab-' + tabName);
            if (target) {
                target.classList.remove('hidden');
                document.getElementById('main-scroll').scrollTop = 0;
                setTimeout(() => {
                    target.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }
            document.querySelectorAll('#main-nav button, #mobile-nav button').forEach(btn => {
                btn.classList.remove('active-tab-mobile', 'text-ink-400');
                btn.classList.add('text-ink-50');
            });
            const navBtn = document.getElementById('nav-btn-' + tabName);
            if (navBtn) {
                navBtn.classList.add('active-tab-mobile', 'text-ink-400');
                navBtn.classList.remove('text-ink-50');
            }
        }

        function initRevealSections() {
            const revealEls = document.querySelectorAll('.reveal');
            if (!revealEls.length) return;

            document.body.classList.add('reveal-ready');

            if (!('IntersectionObserver' in window)) {
                revealEls.forEach(el => el.classList.add('visible'));
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: document.getElementById('main-scroll'),
                threshold: 0.08,
                rootMargin: '0px 0px -40px 0px'
            });

            revealEls.forEach(el => observer.observe(el));
            document.querySelectorAll('.tab-pane:not(.hidden) .reveal').forEach(el => el.classList.add('visible'));
        }

        document.addEventListener('DOMContentLoaded', initRevealSections);
