import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(90_000);

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');

  const branchSelect = page.locator('form').getByRole('combobox').first();
  await expect(branchSelect).toBeEnabled({ timeout: 30_000 });
  await branchSelect.click();
  await page.getByRole('option').first().click();
  await page.locator('input[type="email"]').fill(username ?? '');
  await page.locator('input[type="password"]').fill(password ?? '');

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.locator('button[type="submit"]').click();
  expect((await loginResponsePromise).ok()).toBeTruthy();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

test('NDI rule catalog is served by the API and rendered by the web page', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await login(page);

  const rulesResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/NetsisRead/getNdiTransferRules') &&
    response.request().method() === 'GET',
  );
  await page.goto('/ndi/order-line-selection');

  const rulesResponse = await rulesResponsePromise;
  expect(rulesResponse.ok()).toBeTruthy();

  const responseBody = await rulesResponse.json() as {
    data?: Array<{
      code: string;
      title: string;
      targetNetsisCompany: string;
      guideItems?: string[];
      validationRules?: string[];
      scenarios?: Array<{ key: string; mode: 'automatic' | 'manual' }>;
    }>;
  };
  const rules = responseBody.data ?? [];
  expect(rules).toHaveLength(4);
  expect(rules.map(({ code, targetNetsisCompany }) => ({ code, targetNetsisCompany }))).toEqual([
    { code: 'NUR', targetNetsisCompany: 'NURAY24' },
    { code: 'VIN', targetNetsisCompany: 'WIN24' },
    { code: 'DIS', targetNetsisCompany: 'SIRKET24' },
    { code: 'SIP', targetNetsisCompany: 'SIRKET24' },
  ]);
  expect(rules.every((rule) => (rule.guideItems?.length ?? 0) > 0)).toBeTruthy();
  expect(rules.every((rule) => (rule.validationRules?.length ?? 0) > 0)).toBeTruthy();
  expect(rules.reduce((total, rule) => total + (rule.scenarios?.length ?? 0), 0)).toBe(18);

  for (const rule of rules) {
    await expect(page.getByText(rule.title, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(rule.targetNetsisCompany, { exact: false }).first()).toBeVisible();
  }

  const matrix = page.getByTestId('ndi-rule-scenario-matrix');
  for (const rule of rules) {
    await page.getByRole('button').filter({ hasText: rule.title }).first().click();
    await expect(matrix).toBeVisible();
    await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(rule.scenarios?.length ?? 0);

    const manualCount = rule.scenarios?.filter((scenario) => scenario.mode === 'manual').length ?? 0;
    await matrix.getByRole('button', { name: /Manuel/ }).click();
    await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(manualCount);
  }

  expect(pageErrors).toEqual([]);
});
