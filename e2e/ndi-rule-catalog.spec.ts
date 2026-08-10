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

function apiEnvelope<T>(data: T, message = 'ok') {
  return {
    success: true,
    message,
    exceptionMessage: '',
    data,
    errors: [],
    statusCode: 200,
  };
}

test('NDI rule catalog is served by the API and rendered by the web page', async ({ page }, testInfo) => {
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

  await page.getByRole('button', { name: 'Kuralları genişlet' }).click();
  const matrix = page.getByTestId('ndi-rule-scenario-matrix');
  await expect(matrix).toBeVisible();
  await expect(matrix.getByText("API'den 18 ayrı kural", { exact: true })).toBeVisible();
  await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(18);

  for (const rule of rules) {
    await matrix.getByRole('button', { name: `Kural grubu ${rule.code}` }).click();
    await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(rule.scenarios?.length ?? 0);
    await expect(matrix.getByText(rule.targetNetsisCompany, { exact: false }).first()).toBeVisible();
  }

  await matrix.getByRole('button', { name: 'Tüm kural grupları' }).click();
  await matrix.getByRole('button', { name: 'Manuel kurallar' }).click();
  await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(8);

  await matrix.getByRole('button', { name: 'Otomatik kurallar' }).click();
  await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(10);

  await matrix.getByRole('button', { name: 'Tüm çalışma modları' }).click();
  await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(18);
  await matrix.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('ndi-rule-catalog-desktop.png') });

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  const closeSidebarButton = page.getByRole('button', { name: 'Menüyü kapat' });
  if (await closeSidebarButton.isVisible()) {
    await closeSidebarButton.click();
    await expect(page.locator('aside[data-sidebar-open="false"]')).toBeVisible();
    await page.waitForTimeout(300);
  }
  await expect(matrix).toBeVisible();
  await expect(matrix.getByTestId('ndi-rule-scenario-row')).toHaveCount(18);
  await matrix.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('ndi-rule-catalog-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  expect(pageErrors).toEqual([]);
});

test('NDI transfer is safely blocked when customer document series cannot be verified', async ({ page }) => {
  const sourceDocumentNo = 'SIP202600000001';
  const customerCode = '120-01-27-017';

  await login(page);
  await page.route('**/api/NetsisRead/getCustomerDispatches', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(apiEnvelope([{
      irsaliyeNo: sourceDocumentNo,
      cariKodu: customerCode,
      cariIsim: 'NDI REGRESYON CARISI',
      tarih: '2026-08-10T00:00:00',
      tipi: '6',
      ozelKod1: 'N',
    }])),
  }));
  await page.route('**/api/NetsisRead/getCustomerDispatchOrderChecks*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(apiEnvelope([{
      fatirsNo: sourceDocumentNo,
      siparisNo: sourceDocumentNo,
      tipi: 6,
    }])),
  }));
  await page.route('**/api/NetsisRead/getCustomerDispatchLines*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(apiEnvelope([{
      fisNo: sourceDocumentNo,
      cariKodu: customerCode,
      stokKodu: 'TEST-STOK-001',
      stokAdi: 'NDI Regresyon Stoku',
      depoKodu: 100,
      miktar: 10,
      bakiye: 10,
      tlFiyat: 125,
      teslimMiktari: 0,
    }])),
  }));
  await page.route('**/api/NetsisNdiTransfer/transferred', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(apiEnvelope([])),
  }));
  await page.route('**/api/NetsisRead/getCustomerDocumentSeries*', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({
      ...apiEnvelope(null, 'Belge serileri şu anda doğrulanamıyor.'),
      success: false,
      exceptionMessage: `${customerCode} carisinin belge serileri okunamadı. Aktarım güvenliğiniz için işlem durduruldu.`,
      errorCode: 'NDI_DOCUMENT_SERIES_UNAVAILABLE',
      statusCode: 503,
    }),
  }));

  await page.goto('/ndi/order-line-selection');
  await page.getByText(sourceDocumentNo, { exact: true }).first().click();

  const alert = page.getByRole('alert').filter({ hasText: 'Belge serileri doğrulanamadı' });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Aktarım güvenliğiniz için işlem durduruldu');
  await expect(alert.getByRole('button', { name: 'Tekrar dene' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seçili Kalemleri Hazırla' })).toBeDisabled();

  await page.getByRole('button', { name: 'Kuralları genişlet' }).click();
  await expect(page.getByText('Seri bekleniyor', { exact: true })).toBeVisible();
  await expect(page.getByText('Seçim gerekli', { exact: true })).toBeVisible();
});
