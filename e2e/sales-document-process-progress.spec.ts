import { expect, test, type Page } from '@playwright/test';

type DocumentScenario = {
  label: 'Talebi' | 'Siparişi';
  route: 'DEMAND' | 'ORDER';
  documentNo: string;
};

const scenarios: DocumentScenario[] = [
  { label: 'Talebi', route: 'DEMAND', documentNo: 'TLP202600000501' },
  { label: 'Siparişi', route: 'ORDER', documentNo: 'SIP202600000701' },
];

async function openHarness(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/quotation-process-progress.html');
  await expect(page.getByRole('heading', { name: 'Quotation process progress test harness' })).toBeVisible();
}

for (const scenario of scenarios) {
  test(`${scenario.label} onaya gönderme gerçek onay bekleme sonucunu gösterir`, async ({ page }) => {
    await openHarness(page);
    await page.getByRole('button', { name: `${scenario.label} Onaya Gönder`, exact: true }).click();

    await expect(page.getByText(`CRM://APPROVAL/ERP/${scenario.route}`, { exact: true })).toBeVisible();
    await expect(page.getByText(scenario.documentNo)).toBeVisible();
    await page.evaluate(() => window.quotationProcessHarness.succeed());
    await expect(page.getByRole('heading', { name: 'ONAY AKIŞI BAŞLATILDI' })).toBeVisible();
    await expect(page.getByText('ONAY BEKLİYOR')).toBeVisible();
    await expect(page.getByText('NETSİS BELGE NO')).toHaveCount(0);
  });

  test(`${scenario.label} ara onayı sonraki kullanıcıyı bekler ve ERP başarısı göstermez`, async ({ page }) => {
    await openHarness(page);
    await page.getByRole('button', { name: `${scenario.label} Onayla`, exact: true }).click();

    await expect(page.getByText(`CRM://APPROVAL/ERP/${scenario.route}/DECISION`, { exact: true })).toBeVisible();
    await page.evaluate(() => window.quotationProcessHarness.continueApproval());
    await expect(page.getByRole('heading', { name: 'ONAYINIZ KAYDEDİLDİ' })).toBeVisible();
    await expect(page.getByText('SONRAKİ ONAY BEKLENİYOR')).toBeVisible();
    await expect(page.getByText('NETSİS BELGE NO')).toHaveCount(0);
  });

  test(`${scenario.label} nihai ERP sonucunu gerçek Netsis numarasıyla gösterir`, async ({ page }) => {
    await openHarness(page);
    await page.getByRole('button', { name: `${scenario.label} Onayla`, exact: true }).click();
    await page.evaluate(() => window.quotationProcessHarness.succeed('NTS202600009991'));

    await expect(page.getByRole('heading', { name: 'NETSİS AKTARIMI TAMAMLANDI' })).toBeVisible();
    await expect(page.getByText('NTS202600009991')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  test(`${scenario.label} hata ve tekrar deneme durumunu korur`, async ({ page }) => {
    await openHarness(page);
    await page.getByRole('button', { name: `${scenario.label} Onayla`, exact: true }).click();
    await page.waitForTimeout(250);
    await page.evaluate(() => window.quotationProcessHarness.fail());

    await expect(page.getByRole('heading', { name: 'NETSİS AKTARIMI TAMAMLANAMADI' })).toBeVisible();
    await expect(page.locator('[data-step-status="error"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Tekrar Dene' }).click();
    await expect.poll(() => page.evaluate(() => window.quotationProcessHarness.retryCount())).toBe(1);
  });

  test(`${scenario.label} kritik işlem modalı mobil genişlikte kalır ve ESC ile kapanmaz`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHarness(page);
    await page.getByRole('button', { name: `${scenario.label} Onaya Gönder`, exact: true }).click();

    const modal = page.locator('[data-process-progress-modal]');
    await page.keyboard.press('Escape');
    await expect(modal).toBeVisible();
    const bounds = await modal.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
  });
}
