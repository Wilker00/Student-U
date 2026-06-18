/**
 * Fallback silent algorithms for non-Vite script loads.
 * When Vite main.js runs first, window.StudentUSilent is already set.
 */
(function () {
  if (window.StudentUSilent) return;

  const bridge = document.createElement('script');
  bridge.type = 'module';
  bridge.textContent = `
    import * as StudentUSilent from '../../shared/silent-algorithms.core.js';
    window.StudentUSilent = StudentUSilent;
    window.dispatchEvent(new Event('studentu:silent-ready'));
  `;
  document.head.appendChild(bridge);
})();
