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
                target.classList.remove('tab-enter');
                void target.offsetWidth;
                target.classList.add('tab-enter');
                document.getElementById('main-scroll').scrollTop = 0;
                setTimeout(() => {
                    target.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                }, 50);
            }

            document.querySelectorAll('.nav-btn').forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('active-tab', isActive);
                btn.classList.toggle('bg-white', isActive);
                btn.classList.toggle('shadow-sm', isActive);
                btn.classList.toggle('font-semibold', isActive);
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('text-ink-100', !isActive);
                btn.classList.toggle('font-medium', !isActive);
            });

            document.querySelectorAll('#mobile-nav button').forEach(btn => {
                const isActive = btn.dataset.tab === tabName || btn.id === 'nav-btn-' + tabName;
                btn.classList.toggle('active-tab-mobile', isActive);
                btn.classList.toggle('text-ink-400', isActive);
                btn.classList.toggle('text-ink-50', !isActive);
            });
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
