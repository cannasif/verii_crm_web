import { expect, test, type Page } from '@playwright/test';

async function openCloneDialog(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/permission-group-clone.html');
  await page.getByRole('button', { name: 'Kopyalama Penceresini Aç' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('system template clone dialog creates an editable named copy', async ({ page }) => {
  await openCloneDialog(page);
  await expect(page.getByRole('heading', { name: 'Yetki Grubunu Kopyala' })).toBeVisible();
  const name = page.getByLabel('Ad');
  await expect(name).toHaveValue('Satış Temsilcisi - Kopya');
  await name.fill('Bölge Satış Ekibi');
  await page.getByLabel('Açıklama').fill('Ege bölgesi için özel yetki seti');
  await page.getByRole('button', { name: 'Kopyayı Oluştur' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => window.clonePermissionGroupHarness.lastPayload())).toEqual({
    name: 'Bölge Satış Ekibi',
    description: 'Ege bölgesi için özel yetki seti',
  });
});

test('clone dialog is keyboard accessible and fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCloneDialog(page);
  const dialog = page.getByRole('dialog');
  const metrics = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, viewportWidth: innerWidth };
  });
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.width).toBeLessThanOrEqual(390);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
