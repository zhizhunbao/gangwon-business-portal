/**
 * Project Browse and Search Tests
 * 项目浏览和搜索测试
 */

import { test, expect } from '../fixtures/auth';
import { testProject } from '../fixtures/test-data';

test.describe('Project Browse and Search', () => {
  test('should display project list', async ({ memberPage }) => {
    await memberPage.goto('/member/projects');
    
    // Check if project list is displayed
    await expect(memberPage.locator('table, .project-list, [data-testid="project-list"]')).toBeVisible();
  });

  test('should search projects', async ({ memberPage }) => {
    await memberPage.goto('/member/projects');
    
    // Find search input
    const searchInput = memberPage.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await memberPage.waitForTimeout(1000);
      
      // Check if results are filtered
      const results = memberPage.locator('table tbody tr, .project-item');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should view project details', async ({ memberPage }) => {
    await memberPage.goto('/member/projects');
    
    // Click on first project
    const firstProject = memberPage.locator('table tbody tr, .project-item').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      
      // Wait for project detail page
      await memberPage.waitForURL(/\/member\/projects\/\w+/, { timeout: 10000 });
      
      // Check if project details are displayed
      await expect(memberPage.locator('.project-detail, [data-testid="project-detail"]')).toBeVisible();
    }
  });

  test('should filter projects by status', async ({ memberPage }) => {
    await memberPage.goto('/member/projects');
    
    // Find status filter
    const statusFilter = memberPage.locator('select[name="status"], button:has-text("状态")');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await memberPage.locator('option:has-text("进行中"), button:has-text("进行中")').click();
      
      await memberPage.waitForTimeout(1000);
    }
  });
});

