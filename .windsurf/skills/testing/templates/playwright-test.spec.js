/**
 * {{FeatureName}} E2E Tests
 * 
 * @description Playwright E2E tests for {{feature_name}} feature
 * @author {{author}}
 * @created {{date}}
 */

import { test, expect } from '@playwright/test';

// Test data
const mock{{FeatureName}}Data = {
  name: 'Test {{FeatureName}}',
  description: 'Test description for E2E testing',
  code: 'e2e-test-{{feature_name}}',
};

test.describe('{{FeatureName}} Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to {{feature_name}} page
    await page.goto('/{{feature_route}}');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display {{feature_name}} page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/{{FeatureName}}/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('{{FeatureName}}');
    
    // Check if page elements are visible
    await expect(page.locator('.{{feature-name}}-container')).toBeVisible();
  });

  test('should display {{feature_name}} list', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Check if list items are displayed
    const listItems = page.locator('.{{feature-name}}-item');
    await expect(listItems.first()).toBeVisible();
    
    // Check if search input exists
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();
  });

  test('should search {{feature_name}} items', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Get initial count
    const initialCount = await page.locator('.{{feature-name}}-item').count();
    
    // Enter search term
    await page.fill('input[placeholder*="搜索"]', 'Test');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check if search worked (results should be filtered)
    const searchResults = page.locator('.{{feature-name}}-item');
    expect(searchResults).toBeVisible();
  });

  test('should filter {{feature_name}} by status', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Click on status filter
    await page.click('select[name="status"]');
    
    // Select 'active' status
    await page.selectOption('select[name="status"]', 'active');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check if filter worked
    const filteredResults = page.locator('.{{feature-name}}-item');
    expect(filteredResults).toBeVisible();
  });

  test('should open create modal', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("创建{{FeatureName}}")');
    
    // Check if modal is open
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('创建{{FeatureName}}');
    
    // Check form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="code"]')).toBeVisible();
  });

  test('should create new {{feature_name}}', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("创建{{FeatureName}}")');
    
    // Fill form fields
    await page.fill('input[name="name"]', mock{{FeatureName}}Data.name);
    await page.fill('textarea[name="description"]', mock{{FeatureName}}Data.description);
    await page.fill('input[name="code"]', mock{{FeatureName}}Data.code);
    
    // Submit form
    await page.click('button:has-text("保存")');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('创建成功');
    
    // Check if new item appears in list
    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + mock{{FeatureName}}Data.name)).toBeVisible();
  });

  test('should edit existing {{feature_name}}', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Click edit button on first item
    await page.click('.{{feature-name}}-item:first-child .edit-button');
    
    // Check if edit modal is open
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('编辑{{FeatureName}}');
    
    // Update name field
    const updatedName = 'Updated {{FeatureName}}';
    await page.fill('input[name="name"]', updatedName);
    
    // Submit form
    await page.click('button:has-text("保存")');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('更新成功');
    
    // Check if updated name appears in list
    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + updatedName)).toBeVisible();
  });

  test('should delete {{feature_name}}', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Get initial count
    const initialCount = await page.locator('.{{feature-name}}-item').count();
    
    // Click delete button on first item
    await page.click('.{{feature-name}}-item:first-child .delete-button');
    
    // Check if delete confirmation modal is open
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('删除{{FeatureName}}');
    
    // Confirm deletion
    await page.click('button:has-text("确认")');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('删除成功');
    
    // Check if item was removed from list
    await page.waitForTimeout(1000);
    const finalCount = await page.locator('.{{feature-name}}-item').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should handle form validation', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("创建{{FeatureName}}")');
    
    // Try to submit empty form
    await page.click('button:has-text("保存")');
    
    // Check validation errors
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Fill only name field
    await page.fill('input[name="name"]', 'Test');
    
    // Try to submit again
    await page.click('button:has-text("保存")');
    
    // Check if code validation error appears
    await expect(page.locator('input[name="code"] + .error-message')).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.{{feature-name}}-item');
    
    // Check if pagination controls exist
    const pagination = page.locator('.pagination');
    if (await pagination.isVisible()) {
      // Click next page
      await page.click('button:has-text("下一页")');
      
      // Wait for page to load
      await page.waitForTimeout(500);
      
      // Check if page changed
      await expect(pagination).toBeVisible();
    }
  });

  test('should export {{feature_name}} data', async ({ page }) => {
    // Click export button
    await page.click('button:has-text("导出{{FeatureName}}")');
    
    // Wait for download to start
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("确认导出")');
    
    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('/api/{{feature_route}}', route => route.abort());
    
    // Reload page
    await page.reload();
    
    // Wait for error message
    await expect(page.locator('.error-boundary')).toBeVisible();
    await expect(page.locator('.error-boundary')).toContainText('网络错误');
  });

  test('should be accessible', async ({ page }) => {
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Check ARIA labels
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await expect(searchInput).toHaveAttribute('aria-label');
    
    // Check semantic HTML
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check mobile navigation
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Check desktop layout
    await expect(page.locator('.desktop-layout')).toBeVisible();
  });
});

test.describe('{{FeatureName}} Performance Tests', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/{{feature_route}}');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    // Mock large dataset
    await page.route('/api/{{feature_route}}', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `{{FeatureName}} ${i + 1}`,
          description: `Description ${i + 1}`,
          code: `code-${i + 1}`,
          status: 'active'
        })))
      });
    });

    await page.goto('/{{feature_route}}');
    await page.waitForLoadState('networkidle');
    
    // Should handle large datasets without crashing
    await expect(page.locator('.{{feature-name}}-container')).toBeVisible();
  });
});
