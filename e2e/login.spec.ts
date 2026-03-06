import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByPlaceholder('학원에서 부여받은 아이디')).toBeVisible();
    await expect(page.getByPlaceholder('비밀번호를 입력하세요')).toBeVisible();
  });

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('학원에서 부여받은 아이디').fill('wronguser');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('wrongpass');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByText('아이디 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
  });

  test('redirects to dashboard on successful student login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('학원에서 부여받은 아이디').fill('student01');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');
    await expect(page.getByText('대시보드')).toBeVisible();
  });

  test('redirects to students page on teacher login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('학원에서 부여받은 아이디').fill('teacher01');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('pass1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/students');
    await expect(page.getByText('학생 관리')).toBeVisible();
  });
});
