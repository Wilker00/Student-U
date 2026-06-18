/** Loads optional HTML partials into placeholder slots (Phase 3 shell extraction). */
const partialMap = {
  'modals-slot': '/partials/modals.html',
};

export async function loadPartials() {
  await Promise.all(Object.entries(partialMap).map(async ([slotId, url]) => {
    const slot = document.getElementById(slotId);
    if (!slot || slot.children.length > 0) return;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      slot.innerHTML = await response.text();
    } catch (_error) {
      // Partials are optional when opened without Vite dev server.
    }
  }));
}
