import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(120_000);

async function loginWithPremiumSkin(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.evaluate(() => {
    window.localStorage.setItem('vite-ui-crm-skin', 'premium');
    window.localStorage.setItem('crm:premiumTopNav:collapsed', '0');
  });
  await page.reload();

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

async function expectPremiumWorkspaceToUseViewport(page: Page): Promise<void> {
  const metrics = await page.locator('.crm-main-workspace').evaluate((workspace) => {
    const workspaceRect = workspace.getBoundingClientRect();
    const main = workspace.closest<HTMLElement>('.crm-main-scroll');
    const mainRect = main?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      workspaceLeft: workspaceRect.left,
      workspaceRight: document.documentElement.clientWidth - workspaceRect.right,
      workspaceWidth: workspaceRect.width,
      mainTop: mainRect?.top ?? 0,
    };
  });

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.workspaceLeft).toBeLessThanOrEqual(28);
  expect(metrics.workspaceRight).toBeLessThanOrEqual(28);
  expect(metrics.workspaceWidth).toBeGreaterThanOrEqual(metrics.viewportWidth - 56);
  expect(metrics.mainTop).toBeLessThanOrEqual(140);
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`premium kabuk ${viewport.width}x${viewport.height} ekranda calisma alanini doldurur`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await loginWithPremiumSkin(page);
    await page.goto('/product-pricing-group-by-management');

    await expect(page.locator('html')).toHaveClass(/skin-premium/);
    await expect(page.locator('[data-grid-root="true"]').first()).toBeVisible({ timeout: 30_000 });
    await expectPremiumWorkspaceToUseViewport(page);

    const shellHeights = await page.evaluate(() => ({
      navbar: document.querySelector<HTMLElement>('.app-navbar-panel')?.getBoundingClientRect().height ?? 0,
      navigation: document.querySelector<HTMLElement>('.crm-premium-nav')?.getBoundingClientRect().height ?? 0,
    }));
    expect(shellHeights.navbar).toBeLessThanOrEqual(68);
    expect(shellHeights.navigation).toBeLessThanOrEqual(68);

    await page.screenshot({
      path: testInfo.outputPath(`premium-shell-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });

    if (viewport.width === 1920) {
      await page.goto('/demands/create');
      await expect(page.locator('.crm-main-workspace h1').first()).toBeVisible({ timeout: 30_000 });
      await expectPremiumWorkspaceToUseViewport(page);

      const formWidth = await page.locator('.crm-main-workspace > div').first().evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      );
      expect(formWidth).toBeLessThanOrEqual(1660);

      await page.goto('/');
      await expect(page.locator('.crm-main-scroll--dashboard')).toBeVisible({ timeout: 30_000 });
      await expectPremiumWorkspaceToUseViewport(page);
    }
  });
}
