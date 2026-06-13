        function showNotification(title, body, type = 'info') {
            const box = document.getElementById('alert-box');
            const icon = document.getElementById('alert-icon');
            const titleEl = document.getElementById('alert-title');
            const bodyEl = document.getElementById('alert-body');
            const icons = { success: '&check;', error: '&times;', warning: '!', info: 'i', primary: '*' };
            const colors = { success: 'bg-emerald-100 text-emerald-600', error: 'bg-rose-100 text-rose-600', warning: 'bg-amber-100 text-amber-700', info: 'bg-accent-blue/10 text-accent-blue', primary: 'bg-ink-400 text-white' };
            icon.className = `w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${colors[type] || colors.info}`;
            icon.textContent = icons[type] || 'i';
            titleEl.textContent = title;
            bodyEl.textContent = body;
            box.classList.remove('hidden');
            setTimeout(() => box.classList.add('hidden'), 4000);
        }
