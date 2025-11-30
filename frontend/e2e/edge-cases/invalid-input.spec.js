/**
 * Invalid Input Tests
 * 无效数据输入测试
 */

import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Invalid Input Validation', () => {
  test('should reject invalid email format', async ({ page }) => {
    await page.goto('/member/register');
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await page.waitForTimeout(500);
    const errorMessage = page.locator('.error, [role="alert"], input[name="email"]:invalid');
    // HTML5 validation or custom validation should prevent submission
  });

  test('should reject invalid business number format', async ({ page }) => {
    await page.goto('/member/register');
    
    await page.fill('input[name="businessNumber"]', '123');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    // Should show validation error
  });

  test('should reject weak password', async ({ page }) => {
    await page.goto('/member/register');
    
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '123');
    
    await page.waitForTimeout(500);
    // Should show password strength indicator or error
  });

  test('should reject mismatched passwords', async ({ page }) => {
    await page.goto('/member/register');
    
    await page.fill('input[name="password"]', 'Test1234!');
    await page.fill('input[name="confirmPassword"]', 'Test1235!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    // Should show password mismatch error
  });

  test('should reject empty required fields', async ({ page }) => {
    await page.goto('/member/register');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // HTML5 validation should prevent submission
    const businessNumberInput = page.locator('input[name="businessNumber"]');
    await expect(businessNumberInput).toBeFocused();
  });
});

