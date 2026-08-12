import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(150_000);

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  const branchSelect = page.locator('form').getByRole('combobox').first();
  await expect(branchSelect).toBeEnabled({ timeout: 30_000 });
  await branchSelect.click();
  await page.getByRole('option').first().click();
  await page.locator('input[type="email"]').fill(username ?? '');
  await page.locator('input[type="password"]').fill(password ?? '');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page.locator('button[type="submit"]').click(),
  ]);
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('satış KPI rapor sekmeleri hazır pivot düzenleriyle açılır', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const failedApiRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) {
      failedApiRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await login(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/salesmen-360/me');
  const currentPeriod = page.getByText('Bu ay', { exact: true });
  await expect(currentPeriod).toBeVisible({ timeout: 30_000 });

  const reportToolbar = page.getByTestId('salesmen360-report-toolbar');
  const reportTabsToolbar = page.getByTestId('salesmen360-report-tabs');
  await expect(reportToolbar).toBeVisible();
  await expect(reportTabsToolbar).toBeVisible();
  const reportToolbarBox = await reportToolbar.boundingBox();
  const reportTabsToolbarBox = await reportTabsToolbar.boundingBox();
  expect(reportToolbarBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(150);
  expect(reportTabsToolbarBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(52);

  await currentPeriod.click();
  await page.getByRole('option', { name: 'Bu yıl', exact: true }).click();

  const reportTabs = [
    { tab: /Satış performansı/i, title: 'Satış performansı pivotu' },
    { tab: /Talep performansı/i, title: 'Talep performansı pivotu' },
    { tab: /Teklif performansı/i, title: 'Teklif performansı pivotu' },
    { tab: /Sipariş performansı/i, title: 'Sipariş performansı pivotu' },
    { tab: /Aktivite performansı/i, title: 'Aktivite performansı pivotu' },
    { tab: /Cari analizi/i, title: 'Cari bazlı satış analizi pivotu' },
    { tab: /Stok analizi/i, title: 'Stok bazlı satış analizi pivotu' },
  ];

  for (const report of reportTabs) {
    await test.step(report.title, async () => {
      const tab = page.getByRole('tab', { name: report.tab });
      await tab.click();
      await expect(tab).toHaveAttribute('data-state', 'active');
      await expect(page.getByText(report.title, { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: /Önerilen düzen/i })).toBeVisible();
      await expect(page.getByText('Genel toplam', { exact: true }).first()).toBeVisible();
    });
  }

  const stockPivot = page.getByText('Stok bazlı satış analizi pivotu', { exact: true }).locator('xpath=ancestor::section[1]');
  await stockPivot.screenshot({ path: testInfo.outputPath('sales-kpi-stock-pivot.png') });
  expect(failedApiRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});
