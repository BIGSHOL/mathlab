import { test, expect } from '@playwright/test';

test.describe('Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.getByPlaceholder('학원에서 부여받은 아이디').fill('student01');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');
  });

  test('can navigate to subjects page', async ({ page }) => {
    await page.goto('/subjects');
    await expect(page.getByText('단원 목록')).toBeVisible();
  });

  test('can navigate to a concept', async ({ page }) => {
    await page.goto('/subjects');
    // Click on first concept
    const firstConcept = page.locator('a[href^="/concepts/"]').first();
    if (await firstConcept.isVisible()) {
      await firstConcept.click();
      await expect(page.getByText('개념 읽기')).toBeVisible();
    }
  });
});
