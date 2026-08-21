import { expect, test } from '@playwright/test';

test('development runtime dosyasına düşmeden local API adresini kullanır', async ({ page }) => {
  let runtimeConfigRequestCount = 0;

  page.on('request', (request) => {
    if (request.url().endsWith('/runtime-settings.json')) {
      runtimeConfigRequestCount += 1;
    }
  });

  await page.goto('/e2e/fixtures/local-api-config.html');

  await expect(page.locator('#api-url')).toHaveText(/^http:\/\/(?:localhost|127\.0\.0\.1):5001$/);
  expect(runtimeConfigRequestCount).toBe(0);
});
