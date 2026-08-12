import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(60_000);

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  const branchSelect = page.locator('form').getByRole('combobox').first();
  await expect(branchSelect).toBeEnabled({ timeout: 30_000 });
  await branchSelect.click();
  await page.getByRole('option').first().click();
  await page.locator('input[type="email"]').fill(username ?? '');
  await page.locator('input[type="password"]').fill(password ?? '');
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.locator('button[type="submit"]').click(),
  ]);
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('dinamik görseller yüklenirken iskelet, hata halinde anlaşılır boş durum gösterir', async ({ page }) => {
  const browserErrors: string[] = [];
  let slowImageRequestCount = 0;
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.route('http://127.0.0.1:6099/slow.png', async (route) => {
    slowImageRequestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.fulfill({ status: 200, contentType: 'image/png', body: onePixelPng });
  });
  await page.route('http://127.0.0.1:6099/broken.png', async (route) => {
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
  });

  await login(page);
  await page.goto('/report-designer/create');

  const imagePaletteItem = page.getByRole('button', { name: 'Logo resmi' });
  const headerDropTarget = page.getByText('Üst bilgi', { exact: true }).last();
  await expect(imagePaletteItem).toBeVisible({ timeout: 30_000 });
  await imagePaletteItem.dragTo(headerDropTarget);

  const imageElement = page.locator('[data-image-upload]').first();
  await expect(imageElement).toBeVisible();
  await page.getByRole('button', { name: 'Ayarlar' }).last().click();

  const imageUrlInput = page.getByPlaceholder('https://... veya /logo.png');
  await expect(imageUrlInput).toBeVisible();
  await imageUrlInput.fill('http://127.0.0.1:6099/slow.png');

  await expect.poll(() => page.locator('[data-image-loading="true"]').count()).toBeGreaterThan(0);
  await expect.poll(() => slowImageRequestCount).toBeGreaterThan(0);
  await expect.poll(() => page.locator('[data-image-state="loaded"]').count(), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect(page.locator('[data-image-loading="true"]')).toHaveCount(0);

  await imageUrlInput.fill('http://127.0.0.1:6099/broken.png');
  await expect.poll(() => page.locator('[data-image-state="error"]').count(), { timeout: 5_000 }).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});
