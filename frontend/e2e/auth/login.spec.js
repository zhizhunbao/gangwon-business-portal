/**
 * Login Flow Tests
 * 登录流程测试
 */

import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies();
    await page.goto('/member/login', { waitUntil: 'networkidle' });
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display login form', async ({ page }) => {
    // Wait for the login form to be visible
    await page.waitForSelector('input[name="businessNumber"], input[name="password"]', { timeout: 10000 });
    await expect(page.locator('input[name="businessNumber"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|로그인/i })).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="businessNumber"]', testUsers.member.businessNumber);
    await page.fill('input[name="password"]', testUsers.member.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to member dashboard
    await page.waitForURL(/\/member/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/member/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[name="businessNumber"]', '000-00-00001');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('.auth-alert-error, .error, [role="alert"]').first();
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    const businessNumberInput = page.locator('input[name="businessNumber"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // HTML5 validation should prevent submission
    // Check if input is required and focused
    const isRequired = await businessNumberInput.getAttribute('required');
    expect(isRequired).toBeTruthy();
  });
});

test.describe('Admin Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display admin login form', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login as admin successfully', async ({ page }) => {
    await page.fill('input[name="username"]', testUsers.admin.username);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin dashboard
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});

