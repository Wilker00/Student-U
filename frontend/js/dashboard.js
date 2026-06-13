        function switchDayTab(btn, day) {
            document.querySelectorAll('#day-tabs button').forEach(b => b.classList.remove('active-day-tab'));
            btn.classList.add('active-day-tab');
        }

        function updateDashboardStats() {
            const pointsEl = document.getElementById('dash-stat-points');
            const badgesEl = document.getElementById('dash-stat-badges');
            const leaderboardEl = document.getElementById('dash-leaderboard-points');
            if (pointsEl) pointsEl.innerText = studentPoints;
            if (badgesEl) badgesEl.innerText = studentBadges;
            if (leaderboardEl) leaderboardEl.innerText = `${studentPoints} pts`;
        }
