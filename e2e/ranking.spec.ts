import { test, expect } from '@playwright/test';

test.describe('Ranking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('학원에서 부여받은 아이디').fill('student01');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');
  });

  test('shows ranking board', async ({ page }) => {
    await page.goto('/ranking');
    await expect(page.getByText('랭킹 보드')).toBeVisible();
  });
});
