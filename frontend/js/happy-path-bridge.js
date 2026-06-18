(function () {
  if (window.StudentUHappyPathCore) return;

  const bridge = document.createElement('script');
  bridge.type = 'module';
  bridge.textContent = `
    import * as StudentUHappyPathCore from '../../shared/happy-path.core.js';
    window.StudentUHappyPathCore = StudentUHappyPathCore;
    window.dispatchEvent(new Event('studentu:happy-path-ready'));
  `;
  document.head.appendChild(bridge);
})();
