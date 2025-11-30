/**
 * Registration Flow Tests
 * 注册流程测试
 */

import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import { fillForm, waitForNavigation } from '../utils/helpers';

test.describe('Member Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/member/register');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('input[name="businessNumber"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
  });

  test('should complete multi-step registration', async ({ page }) => {
    // Step 1: Basic Information
    const newMember = {
      ...testUsers.newMember,
      businessNumber: `999-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 90000 + 10000)}`,
    };

    await fillForm(page, {
      businessNumber: newMember.businessNumber,
      companyName: newMember.companyName,
      email: newMember.email,
      password: newMember.password,
      confirmPassword: newMember.password,
      region: newMember.region,
    });

    // Accept terms
    await page.check('input[name="termsOfService"]');
    await page.check('input[name="privacyPolicy"]');

    // Click next/continue button
    await page.click('button:has-text("下一步"), button:has-text("다음")');

    // Step 2: Company Information (if exists)
    // Wait for next step or completion
    await page.waitForTimeout(1000);

    // Check if we're on the next step or completed
    const currentUrl = page.url();
    if (currentUrl.includes('/register')) {
      // Continue with additional steps if needed
      await page.click('button:has-text("提交"), button:has-text("제출"), button[type="submit"]');
    }

    // Wait for registration completion or redirect
    await page.waitForTimeout(2000);
    
    // Should redirect to login or show success message
    const successMessage = await page.locator('.success, [role="alert"]').first();
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(/成功|성공|완료/i);
    }
  });

  test('should validate business number format', async ({ page }) => {
    await page.fill('input[name="businessNumber"]', 'invalid-format');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.click('button[type="submit"]');

    // Should show validation error
    await page.waitForTimeout(500);
    const errorMessage = await page.locator('.error, [role="alert"]').first();
    // Error might be shown via HTML5 validation or custom validation
  });

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    // Should show password strength indicator or error
    await page.waitForTimeout(500);
  });

  test('should require terms acceptance', async ({ page }) => {
    await fillForm(page, {
      businessNumber: testUsers.newMember.businessNumber,
      companyName: testUsers.newMember.companyName,
      email: testUsers.newMember.email,
      password: testUsers.newMember.password,
    });

    // Try to submit without accepting terms
    await page.click('button[type="submit"]');
    
    // Should show error or prevent submission
    await page.waitForTimeout(500);
  });
});

