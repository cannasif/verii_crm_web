import { expect, test, type Page } from '@playwright/test';

interface DialogMetrics {
  height: number;
  top: number;
  bottom: number;
}

async function openHarness(page: Page): Promise<void> {
  await page.goto('/e2e/fixtures/selection-dialog-sizing.html');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await waitForDialogMotion(page);
}

async function waitForDialogMotion(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
  });
}

async function getDialogMetrics(page: Page): Promise<DialogMetrics> {
  return page.getByRole('dialog').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, top: rect.top, bottom: rect.bottom };
  });
}

async function expectStableHeight(page: Page, expectedHeight: number): Promise<void> {
  const current = await getDialogMetrics(page);
  expect(Math.abs(current.height - expectedHeight)).toBeLessThanOrEqual(1);
}

test('search result count never changes the selection dialog geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHarness(page);
  const initial = await getDialogMetrics(page);
  await expect(page.getByTestId('selection-result')).toHaveCount(30);

  await page.getByLabel('Sonuç ara').fill('Kayıt 30');
  await expect(page.getByTestId('selection-result')).toHaveCount(1);
  await expectStableHeight(page, initial.height);

  await page.getByLabel('Sonuç ara').fill('bulunamayan');
  await expect(page.getByText('Sonuç bulunamadı')).toBeVisible();
  await expectStableHeight(page, initial.height);

  await page.getByLabel('Sonuç ara').fill('');
  await expect(page.getByTestId('selection-result')).toHaveCount(30);
  await expectStableHeight(page, initial.height);

  const scrollMetrics = await page.getByTestId('selection-results').evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
});

test('each feature profile keeps its own stable desktop size', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHarness(page);
  const heights: Record<string, number> = {};

  for (const size of ['customer', 'compact', 'medium', 'catalog']) {
    await page.getByLabel('Modal boyutu').selectOption(size);
    await expect(page.getByRole('dialog')).toHaveAttribute('data-selection-dialog-size', size);
    await waitForDialogMotion(page);
    heights[size] = (await getDialogMetrics(page)).height;
    await page.getByLabel('Sonuç ara').fill('Kayıt 30');
    await expect(page.getByTestId('selection-result')).toHaveCount(1);
    await expectStableHeight(page, heights[size]);
    await page.getByLabel('Sonuç ara').fill('');
  }

  expect(heights.compact).toBeLessThan(heights.medium);
  expect(heights.medium).toBeLessThan(heights.catalog);
  expect(heights.catalog).toBeLessThan(heights.customer);
});

test('large selection dialogs stay inside a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);

  for (const size of ['customer', 'catalog']) {
    await page.getByLabel('Modal boyutu').selectOption(size);
    const initial = await getDialogMetrics(page);
    expect(initial.top).toBeGreaterThanOrEqual(0);
    expect(initial.bottom).toBeLessThanOrEqual(844);

    await page.getByLabel('Sonuç ara').fill('bulunamayan');
    await expect(page.getByText('Sonuç bulunamadı')).toBeVisible();
    await expectStableHeight(page, initial.height);
    await page.getByLabel('Sonuç ara').fill('');
  }
});
