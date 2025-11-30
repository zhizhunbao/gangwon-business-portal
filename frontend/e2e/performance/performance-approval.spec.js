/**
 * Performance Approval Flow Tests (Admin)
 * 绩效审批流程测试（管理员）
 */

import { test, expect } from '../fixtures/auth';

test.describe('Performance Approval Flow', () => {
  test('should view performance records list', async ({ adminPage }) => {
    await adminPage.goto('/admin/performance');
    
    // Check if performance list is displayed
    await expect(adminPage.locator('table, .performance-list, [data-testid="performance-list"]')).toBeVisible();
  });

  test('should approve performance record', async ({ adminPage }) => {
    await adminPage.goto('/admin/performance');
    
    // Find a submitted performance record
    const submittedRecord = adminPage.locator('tr:has-text("submitted"), tr:has-text("已提交"), tr:has-text("제출됨")').first();
    
    if (await submittedRecord.isVisible()) {
      // Click to view details
      await submittedRecord.click();
      await adminPage.waitForURL(/\/admin\/performance\/\w+/, { timeout: 10000 });
      
      // Click approve button
      const approveButton = adminPage.getByRole('button', { name: /批准|승인|Approve/i });
      await approveButton.click();
      
      // Wait for success message
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should request revision for performance record', async ({ adminPage }) => {
    await adminPage.goto('/admin/performance');
    
    const submittedRecord = adminPage.locator('tr:has-text("submitted"), tr:has-text("已提交")').first();
    
    if (await submittedRecord.isVisible()) {
      await submittedRecord.click();
      await adminPage.waitForURL(/\/admin\/performance\/\w+/, { timeout: 10000 });
      
      // Click reject/revision button
      const rejectButton = adminPage.getByRole('button', { name: /拒绝|补正|거부|Revision/i });
      await rejectButton.click();
      
      // Fill revision reason if needed
      const reasonInput = adminPage.locator('textarea[name="reason"], input[name="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('E2E Test Revision Request');
      }
      
      // Confirm
      await adminPage.click('button:has-text("确认"), button:has-text("확인"), button[type="submit"]');
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should export performance data', async ({ adminPage }) => {
    await adminPage.goto('/admin/performance');
    
    // Find export button
    const exportButton = adminPage.getByRole('button', { name: /导出|내보내기|Export/i });
    
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = adminPage.waitForEvent('download');
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/);
    }
  });
});

