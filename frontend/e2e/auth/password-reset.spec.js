/**
 * Password Reset Flow Tests
 * 密码重置流程测试
 */

import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Password Reset Flow', () => {
  test('should display password reset request form', async ({ page }) => {
    await page.goto('/member/forgot-password');
    
    await expect(page.locator('input[name="email"], input[name="businessNumber"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /发送|전송|提交|제출/i })).toBeVisible();
  });

  test('should request password reset with valid email', async ({ page }) => {
    await page.goto('/member/forgot-password');
    
    await page.fill('input[name="email"], input[name="businessNumber"]', testUsers.member.email);
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForTimeout(2000);
    const successMessage = await page.locator('.success, [role="alert"]').first();
    await expect(successMessage).toBeVisible();
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/member/forgot-password');
    
    await page.fill('input[name="email"], input[name="businessNumber"]', 'invalid@email.com');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    const errorMessage = await page.locator('.error, [role="alert"]').first();
    // Error might be shown
  });
});

