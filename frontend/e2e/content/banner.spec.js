/**
 * Banner Management Tests
 * 横幅管理测试
 */

import { test, expect } from '../fixtures/auth';
import { testContent } from '../fixtures/test-data';
import { fillForm, uploadFile } from '../utils/helpers';

test.describe('Banner Management (Admin)', () => {
  test('should view banners list', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/banners');
    
    await expect(adminPage.locator('table, .banner-list, [data-testid="banner-list"]')).toBeVisible();
  });

  test('should create new banner', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/banners');
    
    const createButton = adminPage.getByRole('button', { name: /新建|생성|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await adminPage.waitForTimeout(1000);
      
      await fillForm(adminPage, {
        title: testContent.banner.title,
        type: testContent.banner.type,
      });
      
      // Upload image if file input exists
      const fileInput = adminPage.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Note: In real test, you would provide an actual image file path
        // await uploadFile(adminPage, 'input[type="file"]', './test-fixtures/test-image.png');
      }
      
      await adminPage.click('button:has-text("提交"), button:has-text("제출")');
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should toggle banner active status', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/banners');
    
    const firstBanner = adminPage.locator('table tbody tr, .banner-item').first();
    if (await firstBanner.isVisible()) {
      // Find toggle switch or checkbox
      const toggle = firstBanner.locator('input[type="checkbox"][name*="active"], .toggle-switch');
      if (await toggle.isVisible()) {
        const isChecked = await toggle.isChecked();
        await toggle.click();
        await adminPage.waitForTimeout(1000);
        
        // Verify state changed
        const newState = await toggle.isChecked();
        expect(newState).toBe(!isChecked);
      }
    }
  });
});

