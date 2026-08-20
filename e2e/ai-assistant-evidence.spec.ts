import { expect, test, type Page } from '@playwright/test';

async function openHarness(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/ai-assistant-evidence.html');
  await expect(page.getByRole('heading', { name: 'AI assistant evidence test harness' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

test('yetenek, birleşik sonuç, kaynak ve kısmi hata izini birlikte gösterir', async ({ page }) => {
  await openHarness(page);

  await expect(page.getByText('HYBRID')).toBeVisible();
  await expect(page.getByText('En fazla 3 birleşik sorgu')).toBeVisible();
  const evidence = page.locator('[data-ai-evidence-panel]');
  await expect(evidence).toHaveAttribute('open', '');
  await expect(page.locator('[data-ai-interpretation-status="completed"]')).toHaveCount(1);
  await expect(page.locator('[data-ai-interpretation-status="failed"]')).toContainText('Stok servisine ulaşılamadı.');
  await expect(page.locator('[data-ai-structured-result="customer-search"]')).toContainText('Ege Metal');
  await expect(page.locator('[data-ai-structured-result="quotation-search"]')).toContainText('125.000,5');
  await expect(page.getByText('CRM Customers')).toBeVisible();
  await expect(page.getByRole('link', { name: '/customer-360/42' })).toHaveAttribute('href', '/customer-360/42');
});

test('kanıt paneli klavyeyle açılıp kapanır ve mobilde kart düzenine geçer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);

  const evidence = page.locator('[data-ai-evidence-panel]');
  const summary = evidence.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(evidence).not.toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(evidence).toHaveAttribute('open', '');
  await expect(page.locator('[data-ai-structured-result="customer-search"] dl')).toBeVisible();
  await expect(page.locator('[data-ai-structured-result="customer-search"] table')).toBeHidden();
  await expectNoHorizontalOverflow(page);
});

test('birleşik sonuç Excel ve PDF olarak indirilebilir', async ({ page }) => {
  await openHarness(page);

  const excelDownloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.aiAssistantEvidenceHarness.exportExcel());
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toMatch(/^crm-ai-compound-read-.+\.xlsx$/);
  expect(await excelDownload.path()).toBeTruthy();

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.aiAssistantEvidenceHarness.exportPdf());
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/^crm-ai-compound-read-.+\.pdf$/);
  expect(await pdfDownload.path()).toBeTruthy();
});
