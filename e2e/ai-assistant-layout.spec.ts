import { expect, test, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

test.skip(!username || !password, 'E2E_USERNAME ve E2E_PASSWORD gereklidir.');
test.setTimeout(90_000);

async function loginAndOpenAssistant(page: Page): Promise<void> {
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
  expect((await loginResponsePromise).ok()).toBeTruthy();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });

  await page.evaluate(() => {
    window.localStorage.setItem('ui-storage', JSON.stringify({
      state: {
        isSidebarOpen: true,
        isAiAssistantInSidebar: true,
        isAiAssistantWidgetVisible: false,
      },
      version: 0,
    }));
  });

  await page.goto('/ai-assistant');
  await expect(page.getByRole('heading', { name: /Bugün neyi birlikte inceleyelim|What should we review/i })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test('AI çalışma alanı masaüstünde konuşma geçmişi ve sohbeti birlikte gösterir', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAndOpenAssistant(page);

  await expect(page.getByRole('button', { name: /Yeni sohbet|New chat/i }).first()).toBeVisible();
  await expect(page.getByText(/Sohbet geçmişi|Conversation history/i).first()).toBeVisible();
  await expect(page.getByPlaceholder(/Günlük satış özetimi|daily sales brief/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Bekleyen onaylarımı göster|Show my pending approvals/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: 'test-results/ai-assistant-desktop.png', fullPage: true });
});

test('AI çalışma alanı mobil görünümde taşmadan kullanılabilir', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAndOpenAssistant(page);

  await expect(page.getByPlaceholder(/Günlük satış özetimi|daily sales brief/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Gönder|Send/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: 'test-results/ai-assistant-mobile.png', fullPage: true });
});
