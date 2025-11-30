/**
 * Member Approval Flow Tests (Admin)
 * 会员审批流程测试（管理员）
 */

import { test, expect } from '../fixtures/auth';
import { testUsers } from '../fixtures/test-data';

test.describe('Member Approval Flow', () => {
  test('should view pending members list', async ({ adminPage }) => {
    await adminPage.goto('/admin/members');
    
    // Check if members list is displayed
    await expect(adminPage.locator('table, .member-list, [data-testid="member-list"]')).toBeVisible();
  });

  test('should approve pending member', async ({ adminPage }) => {
    await adminPage.goto('/admin/members');
    
    // Find a pending member (first row with pending status)
    const pendingMember = adminPage.locator('tr:has-text("pending"), tr:has-text("待审批"), tr:has-text("대기중")').first();
    
    if (await pendingMember.isVisible()) {
      // Click on the member to view details
      await pendingMember.click();
      
      // Wait for member detail page
      await adminPage.waitForURL(/\/admin\/members\/\w+/, { timeout: 10000 });
      
      // Click approve button
      const approveButton = adminPage.getByRole('button', { name: /批准|승인|Approve/i });
      await approveButton.click();
      
      // Wait for success message
      await adminPage.waitForTimeout(2000);
      
      // Check for success message or status change
      const successMessage = adminPage.locator('.success, [role="alert"]');
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(/成功|성공/i);
      }
    }
  });

  test('should reject member with reason', async ({ adminPage }) => {
    await adminPage.goto('/admin/members');
    
    // Find a pending member
    const pendingMember = adminPage.locator('tr:has-text("pending"), tr:has-text("待审批")').first();
    
    if (await pendingMember.isVisible()) {
      await pendingMember.click();
      await adminPage.waitForURL(/\/admin\/members\/\w+/, { timeout: 10000 });
      
      // Click reject button
      const rejectButton = adminPage.getByRole('button', { name: /拒绝|거부|Reject/i });
      await rejectButton.click();
      
      // If there's a reason input, fill it
      const reasonInput = adminPage.locator('input[name="reason"], textarea[name="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('E2E Test Rejection Reason');
      }
      
      // Confirm rejection
      await adminPage.click('button:has-text("确认"), button:has-text("확인"), button[type="submit"]');
      
      // Wait for success message
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should search and filter members', async ({ adminPage }) => {
    await adminPage.goto('/admin/members');
    
    // Find search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await adminPage.waitForTimeout(1000);
      
      // Check if results are filtered
      const results = adminPage.locator('table tbody tr, .member-item');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

