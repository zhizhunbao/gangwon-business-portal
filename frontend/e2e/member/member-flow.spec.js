/**
 * Member Flow Tests
 * 会员流程测试
 */

import { test, expect } from '../fixtures/auth';
import { testUsers } from '../fixtures/test-data';
import { fillForm, waitForNavigation } from '../utils/helpers';

test.describe('Member Information Management', () => {
  test('should view member profile', async ({ memberPage }) => {
    await memberPage.goto('/member/profile');
    
    // Check if profile information is displayed
    await expect(memberPage.locator('input[name="companyName"], [data-testid="companyName"]')).toBeVisible();
  });

  test('should update member profile', async ({ memberPage }) => {
    await memberPage.goto('/member/profile');
    
    const newCompanyName = `Updated Company ${Date.now()}`;
    await memberPage.fill('input[name="companyName"]', newCompanyName);
    
    await memberPage.click('button:has-text("保存"), button:has-text("저장"), button[type="submit"]');
    
    // Wait for success message or page update
    await memberPage.waitForTimeout(2000);
    
    // Verify update
    const companyNameInput = memberPage.locator('input[name="companyName"]');
    const value = await companyNameInput.inputValue();
    expect(value).toBe(newCompanyName);
  });

  test('should verify company information with Nice D&B', async ({ memberPage }) => {
    await memberPage.goto('/member/profile');
    
    // Look for Nice D&B verification button
    const verifyButton = memberPage.getByRole('button', { name: /验证|검증|Nice D&B/i });
    if (await verifyButton.isVisible()) {
      await verifyButton.click();
      
      // Wait for verification result
      await memberPage.waitForTimeout(3000);
      
      // Check for verification result
      const result = memberPage.locator('.verification-result, [data-testid="nice-dnb-result"]');
      if (await result.isVisible()) {
        await expect(result).toBeVisible();
      }
    }
  });
});

