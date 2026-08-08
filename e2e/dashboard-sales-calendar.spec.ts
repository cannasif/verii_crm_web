import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(120_000);

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

test('satış takvimi sorumlu görünürlüğünü uygular ve belge kalemlerini ayrıntılı getirir', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await login(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');

  const calendarResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/Dashboard/sales-calendar/Quotation') && response.request().method() === 'GET');
  await page.getByRole('tab', { name: /Teklifler|Quotations/i }).click();
  const calendarResponse = await calendarResponsePromise;
  expect(calendarResponse.ok(), await calendarResponse.text()).toBeTruthy();

  const calendarBody = await calendarResponse.json();
  const calendar = calendarBody.data;
  expect(calendar.isSystemAdmin).toBe(true);
  expect(calendar.items.length).toBeGreaterThan(0);

  const firstEvent = page.getByTestId('sales-calendar-event').first();
  await expect(firstEvent).toBeVisible({ timeout: 30_000 });
  const firstLabel = await firstEvent.getAttribute('aria-label');
  expect(firstLabel).toBeTruthy();
  expect(firstLabel).not.toBe(calendar.items.find((item: { documentNumber: string }) => firstLabel?.endsWith(item.documentNumber))?.documentNumber);

  const headerResponsePromise = page.waitForResponse((response) =>
    /\/api\/quotation\/\d+$/i.test(new URL(response.url()).pathname) && response.request().method() === 'GET');
  const linesResponsePromise = page.waitForResponse((response) =>
    /\/api\/QuotationLine\/by-quotation\/\d+$/i.test(new URL(response.url()).pathname) && response.request().method() === 'GET');
  await firstEvent.click();
  const [headerResponse, linesResponse] = await Promise.all([headerResponsePromise, linesResponsePromise]);
  expect(headerResponse.ok(), await headerResponse.text()).toBeTruthy();
  expect(linesResponse.ok(), await linesResponse.text()).toBeTruthy();

  const linesBody = await linesResponse.json();
  const lines = linesBody.data ?? [];
  const detailDialog = page.getByTestId('sales-document-detail-dialog');
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog.getByText(/Belge kalemleri|Document lines/i)).toBeVisible();
  await expect(detailDialog.getByTestId('sales-document-line')).toHaveCount(lines.length);
  await page.waitForTimeout(350);
  await page.screenshot({ path: testInfo.outputPath('sales-document-detail.png'), fullPage: true });

  await page.keyboard.press('Escape');
  const ownerSelector = page.getByRole('button', { name: /Tüm kullanıcılar|All users/i });
  await ownerSelector.click();
  const firstOwner = page.getByTestId('sales-calendar-owner-option').first();
  await expect(firstOwner).toBeVisible();
  await firstOwner.click();

  const filteredEvent = page.getByTestId('sales-calendar-event').first();
  await expect(filteredEvent).toBeVisible();
  const filteredText = (await filteredEvent.textContent())?.trim();
  const filteredLabel = await filteredEvent.getAttribute('aria-label');
  expect(filteredText).toBe(filteredLabel);
  expect(browserErrors).toEqual([]);
});

test('aktivite sekmesi takvim verisini API hatası olmadan yükler', async ({ page }) => {
  const activityResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/Activity/calendar/admin') && response.request().method() === 'GET');

  await login(page);
  const activityResponse = await activityResponsePromise;

  expect(activityResponse.ok(), await activityResponse.text()).toBeTruthy();
  await expect(page.getByText(/Aktivite takvimim|My activity calendar/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Takvim aktiviteleri yüklenemedi|Calendar activities could not be loaded/i)).toHaveCount(0);
});
