import { test, expect } from '@playwright/test';
import { resetStudentU, waitForFlowCompass } from './helpers.js';

test.describe('Set up my class path', () => {
  test.beforeEach(async ({ page }) => {
    await resetStudentU(page);
  });

  test('starts setup flow with compass', async ({ page }) => {
    await page.getByTestId('enter-setup-path').click();

    const compass = await waitForFlowCompass(page, 'setup');
    await expect(compass.locator('.flow-compass__path')).toHaveText('Set up my class');
    await expect(page.locator('#tab-profile')).toBeVisible();
  });

  test('shows demo handoff when switching from explore to setup', async ({ page }) => {
    await page.getByTestId('enter-explore-path').click();
    await waitForFlowCompass(page, 'explore');

    await page.getByTestId('enter-setup-path').click();

    const modal = page.locator('#demo-handoff-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Demo stays separate');

    await page.locator('[data-action="dismissDemoHandoff"]').click();
    await expect(modal).toBeHidden();

    await waitForFlowCompass(page, 'setup');
  });

  test('restores setup path after reload', async ({ page }) => {
    await page.getByTestId('enter-setup-path').click();
    await waitForFlowCompass(page, 'setup');

    await page.reload();
    await waitForFlowCompass(page, 'setup');
    await expect(page.locator('#tab-profile')).toBeVisible();
    await expect(page.locator('.flow-compass__path')).toHaveText('Set up my class');
  });
});
