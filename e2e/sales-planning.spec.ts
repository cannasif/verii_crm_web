import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(90_000);

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');

  const branchSelect = page.locator('form').getByRole('combobox').first();
  await expect(branchSelect).toBeEnabled();
  await branchSelect.click();
  await page.getByRole('option').first().click();

  await page.locator('input[type="email"]').fill(username ?? '');
  await page.locator('input[type="password"]').fill(password ?? '');

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.locator('button[type="submit"]').click();
  const loginResponse = await loginResponsePromise;

  expect(loginResponse.ok()).toBeTruthy();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });
}

async function removeStaleQaPlans(page: Page): Promise<void> {
  const staleRows = page.getByRole('row').filter({ hasText: 'CODEX QA ' });

  while ((await staleRows.count()) > 0) {
    const previousCount = await staleRows.count();
    await staleRows.first().getByRole('button', { name: /Sil|Delete/i }).click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    const deleteResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/sales-plans/') &&
      response.url().includes('/delete') &&
      response.request().method() === 'POST',
    );
    await confirmation.getByRole('button', { name: /Taslağı Sil|Delete Draft/i }).click();
    expect((await deleteResponsePromise).ok()).toBeTruthy();
    await expect(staleRows).toHaveCount(previousCount - 1);
  }
}

test('satış planı oluşturulur, gerçekleşme ekranında okunur, güncellenir ve silinir', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const failedApiRequests: string[] = [];
  const planName = `CODEX QA ${Date.now()}`;

  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) {
      failedApiRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await login(page);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/sales-planning');

  await expect(page.getByRole('heading', { name: /Satış Planlama|Sales Planning/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /Satış Planlama|Sales Planning/i }).getByRole('link')).toHaveCount(3);
  await removeStaleQaPlans(page);
  await page.getByRole('button', { name: /Yeni Plan|New Plan/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())?.width).toBeGreaterThan(900);
  await dialog.locator('#sales-plan-name').fill(planName);
  await dialog.locator('#sales-plan-description').fill('Playwright uçtan uca doğrulama kaydı');

  await dialog.getByRole('button', { name: /Yıllık|Yearly/i }).click();
  await expect(dialog.getByText(/Plan tarih aralığı|Full plan date range/i).first()).toBeVisible();
  await dialog.getByRole('button', { name: /Aylık|Monthly/i }).click();

  const salespersonCombobox = dialog.getByRole('combobox').nth(1);
  const dialogBox = await dialog.boundingBox();
  await salespersonCombobox.click();
  const salespersonSearch = page.getByPlaceholder(/Satışçı ara|Search salesperson/i).first();
  await expect(salespersonSearch).toBeVisible();
  const dropdownBox = await salespersonSearch.locator('xpath=../..').boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dropdownBox).not.toBeNull();
  expect(dropdownBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
  expect(dropdownBox!.x + dropdownBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width);
  await page.screenshot({ path: testInfo.outputPath('sales-plan-salesperson-dropdown.png'), fullPage: true });
  await page.keyboard.press('Escape');

  await dialog.locator('#sales-plan-quick-target-value').fill('125000.50');
  await dialog.getByRole('button', { name: /Hedef Ekle|Add Target/i }).click();

  const targetRow = dialog.locator('input[name="targets.0.targetValue"]').locator('..');
  await dialog.locator('input[name="targets.0.notes"]').fill('Aylık net sipariş hedefi');
  await expect(targetRow).toBeVisible();
  await dialog.getByRole('button', { name: /Kalan Aylara Kopyala|Copy to Remaining Months/i }).first().click();
  await expect(dialog.locator('input[name$=".targetValue"]')).toHaveCount(12);
  await page.screenshot({ path: testInfo.outputPath('sales-plan-guided-targets.png'), fullPage: true });

  const createResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/sales-plans') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: /Planı Oluştur|Create Plan/i }).click();
  const createResponse = await createResponsePromise;
  expect(
    createResponse.ok(),
    `Plan oluşturma isteği ${createResponse.status()} döndü. İstek: ${createResponse.request().postData()}. Yanıt: ${await createResponse.text()}`,
  ).toBeTruthy();

  const row = page.getByRole('row').filter({ hasText: planName });
  await expect(row).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sales-planning-list.png'), fullPage: true });

  await page.getByRole('button', { name: /Yeni Plan|New Plan/i }).click();
  await dialog.locator('#sales-plan-name').fill(`${planName} OVERLAP`);
  await dialog.locator('#sales-plan-quick-target-value').fill('100');
  await dialog.getByRole('button', { name: /Hedef Ekle|Add Target/i }).click();
  const overlapResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/sales-plans') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: /Planı Oluştur|Create Plan/i }).click();
  const overlapResponse = await overlapResponsePromise;
  expect(overlapResponse.status()).toBe(409);
  const overlapBody = await overlapResponse.json();
  expect(overlapBody.errorCode ?? overlapBody.ErrorCode).toBe('sales_plan_target_overlap');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Kapat|Close/i }).first().click();

  const attainmentStartedAt = Date.now();
  const attainmentResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/sales-plans/') &&
    response.url().includes('/attainment') &&
    response.request().method() === 'GET',
  );
  await page.goto('/sales-planning/performance');
  const attainmentResponse = await attainmentResponsePromise;
  expect(
    attainmentResponse.ok(),
    `Hedef gerçekleşme isteği ${attainmentResponse.status()} döndü: ${await attainmentResponse.text()}`,
  ).toBeTruthy();
  expect(Date.now() - attainmentStartedAt).toBeLessThan(10_000);
  await expect(page.getByRole('heading', { name: /Hedef Gerçekleşmeleri|Target Attainment/i })).toBeVisible();
  const performancePlanSelect = page.getByRole('combobox', { name: /Satış planı|Sales plan/i });
  if (!(await performancePlanSelect.textContent())?.includes(planName)) {
    await performancePlanSelect.click();
    const selectedAttainmentResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/sales-plans/') &&
      response.url().includes('/attainment') &&
      response.request().method() === 'GET',
    );
    await page.getByRole('option', { name: planName, exact: true }).click();
    expect((await selectedAttainmentResponsePromise).ok()).toBeTruthy();
  }
  await expect(page.getByText(planName, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: /Net sipariş tutarı|Net order amount/i })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sales-plan-performance.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /Hedef Gerçekleşmeleri|Target Attainment/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });

  const forecastStartedAt = Date.now();
  const forecastResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/sales-forecasts/plans/') &&
    response.request().method() === 'GET',
  );
  await page.goto('/sales-planning/forecast');
  const forecastResponse = await forecastResponsePromise;
  expect(
    forecastResponse.ok(),
    `Satış tahmini isteği ${forecastResponse.status()} döndü: ${await forecastResponse.text()}`,
  ).toBeTruthy();
  expect(Date.now() - forecastStartedAt).toBeLessThan(10_000);
  await expect(page.getByRole('heading', { name: /Satış Tahmini ve Pipeline Coverage|Sales Forecast and Pipeline Coverage/i })).toBeVisible();
  const forecastPlanSelect = page.getByRole('combobox', { name: /Satış planı|Sales plan/i });
  if (!(await forecastPlanSelect.textContent())?.includes(planName)) {
    await forecastPlanSelect.click();
    const selectedForecastResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/sales-forecasts/plans/') &&
      response.request().method() === 'GET',
    );
    await page.getByRole('option', { name: planName, exact: true }).click();
    expect((await selectedForecastResponsePromise).ok()).toBeTruthy();
  }
  await expect(page.getByText(planName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Ağırlıklı tahmin|Weighted forecast/i).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sales-plan-forecast.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /Satış Tahmini ve Pipeline Coverage|Sales Forecast and Pipeline Coverage/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('/sales-planning');
  const updatedRow = page.getByRole('row').filter({ hasText: planName });
  await expect(updatedRow).toBeVisible();
  await updatedRow.getByRole('button', { name: /Düzenle|Edit/i }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#sales-plan-name')).toHaveValue(planName);
  await dialog.locator('#sales-plan-description').fill('Playwright tarafından güncellendi');

  const updateResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/sales-plans/') &&
    response.url().endsWith('/update') &&
    response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: /Değişiklikleri Kaydet|Save Changes/i }).click();
  const updateResponse = await updateResponsePromise;
  expect(
    updateResponse.ok(),
    `Plan güncelleme isteği ${updateResponse.status()} döndü: ${await updateResponse.text()}`,
  ).toBeTruthy();

  await expect(updatedRow).toBeVisible();
  await updatedRow.getByRole('button', { name: /Sil|Delete/i }).click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toBeVisible();

  const deleteResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/sales-plans/') &&
    response.url().includes('/delete') &&
    response.request().method() === 'POST',
  );
  await confirmation.getByRole('button', { name: /Taslağı Sil|Delete Draft/i }).click();
  const deleteResponse = await deleteResponsePromise;
  expect(
    deleteResponse.ok(),
    `Plan silme isteği ${deleteResponse.status()} döndü: ${await deleteResponse.text()}`,
  ).toBeTruthy();
  await expect(updatedRow).toHaveCount(0);

  expect(failedApiRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});
