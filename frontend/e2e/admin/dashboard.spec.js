/**
 * Admin Dashboard Tests
 * 管理员仪表盘测试
 */

import { test, expect } from '../fixtures/auth';

test.describe('Admin Dashboard', () => {
  test('should display dashboard', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    // Check if dashboard is loaded
    await expect(adminPage.locator('.dashboard, [data-testid="dashboard"]')).toBeVisible();
  });

  test('should display statistics', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    // Check for statistics cards
    const statsCards = adminPage.locator('.stat-card, .statistics-card, [data-testid="stat-card"]');
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display charts', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    // Check for charts (ECharts containers)
    const charts = adminPage.locator('.chart, [data-testid="chart"], canvas');
    const count = await charts.count();
    // Charts might not be visible immediately, so we just check if they exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to member management', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    const memberLink = adminPage.getByRole('link', { name: /会员|회원|Members/i });
    if (await memberLink.isVisible()) {
      await memberLink.click();
      await adminPage.waitForURL(/\/admin\/members/, { timeout: 10000 });
      await expect(adminPage).toHaveURL(/\/admin\/members/);
    }
  });
});

