import { expect, test } from '@playwright/test';

test('aktivite gün eşleşmesi yarı açık aralık ve anlık kayıt semantiğini korur', async ({ page }) => {
  await page.goto('/e2e/fixtures/activity-calendar-range.html');

  await expect(page.locator('#ends-at-start')).toHaveText('false');
  await expect(page.locator('#spans-start')).toHaveText('true');
  await expect(page.locator('#point-at-start')).toHaveText('true');
  await expect(page.locator('#starts-next-day')).toHaveText('false');
});
