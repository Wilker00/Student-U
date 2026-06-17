        function switchDayTab(btn, day) {
            document.querySelectorAll('#day-tabs button').forEach(b => b.classList.remove('active-day-tab'));
            btn.classList.add('active-day-tab');
            window.setDashboardDayFilter?.(day);
        }

        function updateDashboardStats() {
            window.loadGamificationState?.();
            const state = window.getGamificationState?.() || { points: studentPoints, streak: 0 };
            const earnedBadges = typeof studentBadges === 'number' ? studentBadges : 0;

            const pointsEl = document.getElementById('dash-stat-points');
            const badgesEl = document.getElementById('dash-stat-badges');
            const leaderboardEl = document.getElementById('dash-leaderboard-points');
            if (pointsEl) pointsEl.innerText = state.points ?? studentPoints;
            if (badgesEl) badgesEl.innerText = earnedBadges;
            if (leaderboardEl) leaderboardEl.innerText = `${state.points ?? studentPoints} pts`;
            window.refreshDashboard?.();
        }
