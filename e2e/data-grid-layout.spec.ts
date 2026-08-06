import { expect, test, type Locator, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(150_000);
test.use({ viewport: { width: 1920, height: 1080 } });

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

async function viewportHeight(grid: Locator): Promise<number> {
  const viewport = grid.locator('.crm-data-grid-viewport');
  await expect(viewport).toBeVisible();
  await expect.poll(async () => Math.round((await viewport.boundingBox())?.height ?? 0)).toBeGreaterThan(400);
  return Math.round((await viewport.boundingBox())?.height ?? 0);
}

test('yönetim gridleri dolu, az kayıtlı ve boş durumda aynı yüzeyi korur', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const failedApiRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) {
      failedApiRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await login(page);
  await page.goto('/activity-management');
  await expect(page.getByRole('heading', { name: 'Aktivite Yönetimi' })).toBeVisible();
  const activityGrid = page.locator('[data-grid-root="true"]').first();
  const populatedHeight = await viewportHeight(activityGrid);

  const activitySearch = page.locator('main input[placeholder="Ara"]:visible').first();
  await activitySearch.fill(`CODEX-NO-ROWS-${Date.now()}`);
  await expect(activityGrid.locator('tbody tr')).toHaveCount(1, { timeout: 20_000 });
  const emptyHeight = await viewportHeight(activityGrid);
  expect(Math.abs(populatedHeight - emptyHeight)).toBeLessThanOrEqual(2);

  const activityChrome = await activityGrid.evaluate((element) => {
    const rootStyle = getComputedStyle(element);
    const viewport = element.querySelector<HTMLElement>('.crm-data-grid-viewport');
    const content = element.closest<HTMLElement>('[data-slot="card-content"]');
    return {
      rootBorder: rootStyle.borderTopWidth,
      viewportBorder: viewport ? getComputedStyle(viewport).borderTopWidth : null,
      contentPaddingTop: content ? getComputedStyle(content).paddingTop : null,
      contentPaddingLeft: content ? getComputedStyle(content).paddingLeft : null,
    };
  });
  expect(activityChrome).toEqual({
    rootBorder: '0px',
    viewportBorder: '0px',
    contentPaddingTop: '0px',
    contentPaddingLeft: '0px',
  });

  await page.screenshot({ path: testInfo.outputPath('activity-empty-grid.png'), fullPage: true });

  await page.goto('/activity-type-management');
  await expect(page.getByRole('heading', { name: 'Aktivite Tipi Yönetimi' })).toBeVisible();
  const activityTypeGrid = page.locator('[data-grid-root="true"]').first();
  const shortListHeight = await viewportHeight(activityTypeGrid);
  expect(Math.abs(populatedHeight - shortListHeight)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('activity-type-grid.png'), fullPage: true });

  expect(failedApiRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});
