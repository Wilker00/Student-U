import { test, expect } from '@playwright/test';
import { resetStudentU } from './helpers.js';

test.describe('Explore sample path', () => {
  test.beforeEach(async ({ page }) => {
    await resetStudentU(page);
  });

  test('loads demo class without persistent explore banner', async ({ page }) => {
    await page.getByTestId('enter-explore-path').click();

    await expect(page.locator('#tab-workspace')).toBeVisible();
    await expect(page.locator('#study-material')).not.toHaveValue('');
    await expect(page.getByTestId('flow-compass')).toHaveCount(0);
  });

  test('explore path opens the study desk guide step', async ({ page }) => {
    await page.getByTestId('enter-explore-path').click();

    await expect(page.locator('#tab-workspace')).toBeVisible();
    await expect(page.locator('#study-guide-panel')).toBeVisible();
  });
});
