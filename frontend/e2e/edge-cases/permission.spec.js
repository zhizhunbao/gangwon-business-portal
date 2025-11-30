/**
 * Permission Tests
 * 权限测试
 */

import { test, expect } from '@playwright/test';

test.describe('Permission Checks', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/member/profile');
    
    // Should redirect to login
    await page.waitForURL(/\/member\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/member\/login/);
  });

  test('should prevent member from accessing admin routes', async ({ page }) => {
    // Login as member
    await page.goto('/member/login');
    await page.fill('input[name="businessNumber"]', '999-99-99999');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/member/, { timeout: 10000 });
    
    // Try to access admin route
    await page.goto('/admin/members');
    
    // Should redirect or show error
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    // Should not be on admin page
    expect(currentUrl).not.toContain('/admin/members');
  });

  test('should prevent unauthorized file access', async ({ page }) => {
    // Try to access file without authentication
    const response = await page.goto('/api/upload/00000000-0000-0000-0000-000000000000');
    
    // Should return 401 or 403
    expect([401, 403, 404]).toContain(response?.status() || 0);
  });
});

