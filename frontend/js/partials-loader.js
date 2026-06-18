/** Loads HTML partials into placeholder slots (legacy script-tag mode). */
(function () {
  const partialMap = {
    'modals-slot': 'partials/modals.html',
  };

  async function loadPartials() {
    await Promise.all(Object.entries(partialMap).map(async ([slotId, url]) => {
      const slot = document.getElementById(slotId);
      if (!slot || slot.children.length > 0) return;
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        slot.innerHTML = await response.text();
      } catch (_error) {
        // Partials are optional when opened without a local server.
      }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPartials);
  } else {
    loadPartials();
  }
})();
