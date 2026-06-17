export async function resetStudentU(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

export async function waitForFlowCompass(page, pathKey) {
  const compass = page.locator('[data-testid="flow-compass"]');
  await compass.waitFor({ state: 'visible' });
  if (pathKey) {
    await page.waitForSelector(`[data-testid="flow-compass"][data-flow-path="${pathKey}"]`);
  }
  return compass;
}
