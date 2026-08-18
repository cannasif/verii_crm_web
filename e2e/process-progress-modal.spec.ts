import { expect, test, type Page } from '@playwright/test';

type HarnessAction = 'start' | 'succeed' | 'fail' | 'fastSuccess';

async function openHarness(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/process-progress-modal.html');
  await expect(page.getByRole('heading', { name: 'Process progress test harness' })).toBeVisible();
}

async function runHarnessAction(page: Page, action: HarnessAction): Promise<void> {
  await page.evaluate((requestedAction) => {
    window.processProgressHarness[requestedAction]();
  }, action);
}

test('modal hemen açılır, adımlar son satıra kadar ilerler ve gerçek yanıtı bekler', async ({ page }) => {
  await openHarness(page);
  await runHarnessAction(page, 'fastSuccess');
  await expect(page.locator('[data-process-progress-modal]')).toBeVisible({ timeout: 300 });
  await expect(page.getByRole('heading', { name: 'ERP AKTARIMI TAMAMLANDI' })).toBeVisible();

  await page.reload();
  await runHarnessAction(page, 'start');
  await expect(page.locator('[data-process-progress-modal]')).toBeVisible({ timeout: 300 });

  const progress = page.getByRole('progressbar', { name: 'ERP aktarım ilerlemesi' });
  await expect(progress).not.toHaveAttribute('aria-valuenow');
  await expect(page.getByText('CRM://ERP/SYNC/CUSTOMER')).toBeVisible();
  await expect(page.locator('[data-step-status="active"]')).toHaveCount(1);
  await expect(page.locator('[data-step-status]')).toHaveCount(8);
  await expect(page.locator('[data-step-status="completed"]')).toHaveCount(7, { timeout: 1_500 });
  await expect(page.locator('[data-step-status="active"]')).toContainText('CRM senkronizasyon durumu güncelleniyor');
});

test('başarı durumu yüzde yüz ve ERP sonucunu gösterir', async ({ page }) => {
  await openHarness(page);
  await runHarnessAction(page, 'start');
  await expect(page.locator('[data-process-progress-modal]')).toBeVisible({ timeout: 1_000 });
  await runHarnessAction(page, 'succeed');

  await expect(page.getByRole('heading', { name: 'ERP AKTARIMI TAMAMLANDI' })).toBeVisible();
  await expect(page.getByText('120.01.0458')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('[data-step-status="completed"]')).toHaveCount(8);
  await page.getByRole('button', { name: 'Kaydı Görüntüle' }).click();
  await expect(page.locator('[data-process-progress-modal]')).toHaveCount(0);
});

test('hata, teknik detay ve aynı akışta tekrar denemeyi korur', async ({ page }) => {
  await openHarness(page);
  await runHarnessAction(page, 'start');
  await expect(page.locator('[data-process-progress-modal]')).toBeVisible({ timeout: 1_000 });
  await runHarnessAction(page, 'fail');

  await expect(page.getByRole('heading', { name: 'ERP AKTARIMI TAMAMLANAMADI' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('ERP servisine ulaşılamadı.');
  await expect(page.locator('[data-step-status="error"]')).toHaveCount(1);
  await expect(page.getByText('TRACE: test-trace-id')).toBeHidden();
  await page.getByText('Teknik Detay').click();
  await expect(page.getByText('TRACE: test-trace-id')).toBeVisible();
  await page.getByRole('button', { name: 'Tekrar Dene' }).click();
  await expect(page.getByRole('heading', { name: "KAYIT ERP'YE AKTARILIYOR" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.processProgressHarness.retryCount())).toBe(1);
});

test('kritik çalışan işlem ESC ile kapanmaz ve mobil genişliğe sığar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await runHarnessAction(page, 'start');
  const modal = page.locator('[data-process-progress-modal]');
  await expect(modal).toBeVisible({ timeout: 1_000 });
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();

  const metrics = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.clientHeight).toBeLessThanOrEqual(838);
});
