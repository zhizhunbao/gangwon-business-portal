/**
 * Authentication Helpers
 * 认证辅助函数 - 用于 E2E 测试中的登录/登出
 */

import { test as base } from '@playwright/test';

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend({
  // Authenticated page as admin
  adminPage: async ({ page }, use) => {
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', '000-00-00000');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    // Wait for navigation after login
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await use(page);
    // Cleanup: logout
    await page.goto('/admin/logout');
  },

  // Authenticated page as member
  memberPage: async ({ page }, use) => {
    await page.goto('/member/login');
    await page.fill('input[name="businessNumber"]', '999-99-99999');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    // Wait for navigation after login
    await page.waitForURL(/\/member/, { timeout: 10000 });
    await use(page);
    // Cleanup: logout
    await page.goto('/member/logout');
  },
});

export { expect } from '@playwright/test';

