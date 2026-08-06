import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:5001';

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

test('hedef ve tahmin raporu satış KPI ve müşteri 360 bağlamına doğru yerleşir', async ({ page, request }, testInfo) => {
  const browserErrors: string[] = [];
  const failedApiRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) {
      failedApiRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await login(page);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/salesmen-360/me');
  const planningTab = page.getByRole('tab', { name: /Hedef ve tahmin|Targets and forecast/i });
  await expect(planningTab).toBeVisible({ timeout: 30_000 });
  await planningTab.click();
  await expect(page.getByTestId('sales-plan-context-report')).toBeVisible();
  await expect(page.getByText(/Hedef ve tahmin raporu|Target and forecast report/i)).toBeVisible();
  const contextReport = page.getByTestId('sales-plan-context-report');
  await contextReport.getByRole('tab', { name: /Tahmin|Forecast/i }).click();
  await expect(contextReport).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sales-kpi-target-forecast.png'), fullPage: true });

  const token = await page.evaluate(() => localStorage.getItem('access_token') || sessionStorage.getItem('access_token'));
  expect(token).toBeTruthy();
  const branchCode = await page.evaluate(() => {
    const persisted = localStorage.getItem('auth-storage');
    if (!persisted) return null;
    return JSON.parse(persisted)?.state?.branch?.code ?? null;
  });
  expect(branchCode).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}`, 'X-Branch-Code': String(branchCode) };
  const customerListResponse = await request.post(`${apiUrl}/api/Customer/query`, {
    headers,
    data: {
      pageNumber: 1,
      pageSize: 50,
      search: '',
      sortBy: 'Id',
      sortDirection: 'asc',
      filterLogic: 'and',
      filters: [],
    },
  });
  expect(
    customerListResponse.ok(),
    `Müşteri listesi ${customerListResponse.status()} döndü: ${await customerListResponse.text()}`,
  ).toBeTruthy();
  const customerListBody = await customerListResponse.json();
  const customers = customerListBody.data?.data ?? customerListBody.data?.items ?? [];
  expect(customers.length).toBeGreaterThan(0);
  const candidates = customers.filter((customer: { salesRepCode?: string | null }) => customer.salesRepCode?.trim()).slice(0, 8);
  const fallbackCustomer = candidates[0] ?? customers[0];
  let selectedCustomer = fallbackCustomer;
  let selectedProfile: { salesRepUsers?: Array<{ userId: number; userName: string }> } | null = null;

  for (const customer of candidates.length > 0 ? candidates : [fallbackCustomer]) {
    const overviewResponse = await request.get(`${apiUrl}/api/customers/${customer.id}/overview`, { headers });
    if (!overviewResponse.ok()) continue;
    const overviewBody = await overviewResponse.json();
    const profile = overviewBody.data?.profile;
    expect(Array.isArray(profile?.salesRepUsers)).toBeTruthy();
    selectedCustomer = customer;
    selectedProfile = profile;
    if ((profile.salesRepUsers?.length ?? 0) > 0) break;
  }

  expect(selectedProfile).not.toBeNull();
  await page.goto(`/customer-360/${selectedCustomer.id}`);
  const customerPlanningTab = page.getByRole('tab', { name: /Hedef ve Tahmin|Targets and Forecast/i });
  if ((selectedProfile?.salesRepUsers?.length ?? 0) > 0) {
    await expect(customerPlanningTab).toBeVisible({ timeout: 30_000 });
    await customerPlanningTab.click();
    await expect(customerPlanningTab).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('tab', { name: /Özet|Overview/i })).toHaveAttribute('data-state', 'inactive');
    await expect(page.getByTestId('sales-plan-context-report')).toBeVisible();
    await expect(page.getByText(/sorumlu satışçıların|responsible for this customer/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('customer-360-target-forecast.png'), fullPage: true });
  } else {
    await expect(customerPlanningTab).toHaveCount(0);
  }

  expect(failedApiRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});
