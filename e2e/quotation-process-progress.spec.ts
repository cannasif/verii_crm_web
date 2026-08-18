import { expect, test, type Page } from '@playwright/test';

async function openHarness(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/quotation-process-progress.html');
  await expect(page.getByRole('heading', { name: 'Quotation process progress test harness' })).toBeVisible();
}

test('Onaya Gönder işlemi modalı hemen açar ve son adımda gerçek yanıtı bekler', async ({ page }) => {
  await openHarness(page);
  await page.getByRole('button', { name: 'Onaya Gönder', exact: true }).click();

  const modal = page.locator('[data-process-progress-modal]');
  await expect(modal).toBeVisible({ timeout: 300 });
  await expect(page.getByText('CRM://APPROVAL/ERP/QUOTATION', { exact: true })).toBeVisible();
  await expect(page.getByText('GEN2026000000000000250')).toBeVisible();
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  await expect(page.locator('[data-step-status="completed"]')).toHaveCount(7, { timeout: 1_500 });
  await expect(page.locator('[data-step-status="active"]')).toContainText('ERP/Netsis');
  await expect(page.locator('main button').filter({ hasText: /^Onaya Gönder$/ })).toBeDisabled();
});

test('gerçek Netsis sonucu başarı görünümünde belge numarasıyla gösterilir', async ({ page }) => {
  await openHarness(page);
  await page.getByRole('button', { name: 'Onaya Gönder', exact: true }).click();
  await page.evaluate(() => window.quotationProcessHarness.succeed('GEN202600000210'));

  await expect(page.getByRole('heading', { name: 'NETSİS AKTARIMI TAMAMLANDI' })).toBeVisible();
  await expect(page.getByText('GEN202600000210')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('[data-step-status="completed"]')).toHaveCount(8);
});

test('backend onay akışı seçerse ERP sonucu göstermeden bekleyen onayı bildirir', async ({ page }) => {
  await openHarness(page);
  await page.getByRole('button', { name: 'Onaya Gönder', exact: true }).click();
  await page.evaluate(() => window.quotationProcessHarness.succeed());

  await expect(page.getByRole('heading', { name: 'ONAY AKIŞI BAŞLATILDI' })).toBeVisible();
  await expect(page.getByText('ONAY BEKLİYOR')).toBeVisible();
  await expect(page.getByText('NETSİS BELGE NO')).toHaveCount(0);
});

test('ara onay kaydedildiğinde başka kullanıcı onayını beklediğini açıkça gösterir', async ({ page }) => {
  await openHarness(page);
  await page.getByRole('button', { name: 'Onayla', exact: true }).click();
  await page.evaluate(() => window.quotationProcessHarness.continueApproval());

  await expect(page.getByRole('heading', { name: 'ONAYINIZ KAYDEDİLDİ' })).toBeVisible();
  await expect(page.getByText('SONRAKİ ONAY BEKLENİYOR')).toBeVisible();
  await expect(page.getByText(/sıradaki yetkili kullanıcıların kararını bekliyor/i)).toBeVisible();
  await expect(page.getByText('NETSİS BELGE NO')).toHaveCount(0);
});

test('hata adımı korunur, teknik detay açılır ve tekrar deneme akışı yeniden başlar', async ({ page }) => {
  await openHarness(page);
  await page.getByRole('button', { name: 'Onayla', exact: true }).click();
  await expect(page.getByText('CRM://APPROVAL/ERP/QUOTATION/DECISION', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.quotationProcessHarness.fail());

  await expect(page.getByRole('heading', { name: 'NETSİS AKTARIMI TAMAMLANAMADI' })).toBeVisible();
  await expect(page.locator('[data-step-status="completed"]')).not.toHaveCount(0);
  await expect(page.locator('[data-step-status="error"]')).toHaveCount(1);
  await page.getByText('Teknik Detay').click();
  await expect(page.getByText(/quotation-test-trace/)).toBeVisible();
  await page.getByRole('button', { name: 'Tekrar Dene' }).click();
  await expect(page.getByRole('heading', { name: 'TEKLİF ONAYLANIYOR' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.quotationProcessHarness.retryCount())).toBe(1);
});

test('kritik onay işlemi ESC ile kapanmaz ve mobil ekrana sığar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page.getByRole('button', { name: 'Onaya Gönder', exact: true }).click();
  const modal = page.locator('[data-process-progress-modal]');
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();

  const bounds = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: document.documentElement.clientWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
});
