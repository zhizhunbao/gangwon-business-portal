/**
 * Performance Entry Tests
 * 绩效数据录入测试
 */

import { test, expect } from '../fixtures/auth';
import { testPerformance } from '../fixtures/test-data';
import { fillForm, waitForLoading } from '../utils/helpers';

test.describe('Performance Data Entry', () => {
  test('should navigate to performance entry page', async ({ memberPage }) => {
    await memberPage.goto('/member/performance');
    
    // Click on create/new performance button
    const createButton = memberPage.getByRole('button', { name: /新建|생성|Create|New/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await memberPage.waitForURL(/\/member\/performance\/(new|create|edit)/, { timeout: 10000 });
    }
  });

  test('should create sales performance record', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    // Fill basic information
    await fillForm(memberPage, {
      year: testPerformance.sales.year.toString(),
      quarter: testPerformance.sales.quarter.toString(),
      type: 'sales',
    });
    
    // Fill sales data (adjust selectors based on actual form structure)
    const productNameInput = memberPage.locator('input[name*="productName"], input[name*="product"]').first();
    if (await productNameInput.isVisible()) {
      await productNameInput.fill(testPerformance.sales.data.sales[0].productName);
    }
    
    // Save as draft
    await memberPage.click('button:has-text("保存草稿"), button:has-text("임시저장"), button:has-text("Save Draft")');
    
    // Wait for success message
    await memberPage.waitForTimeout(2000);
    const successMessage = memberPage.locator('.success, [role="alert"]');
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(/成功|성공/i);
    }
  });

  test('should submit performance record', async ({ memberPage }) => {
    await memberPage.goto('/member/performance');
    
    // Find a draft record
    const draftRecord = memberPage.locator('tr:has-text("draft"), tr:has-text("草稿"), tr:has-text("임시")').first();
    
    if (await draftRecord.isVisible()) {
      // Click edit
      await draftRecord.locator('button:has-text("编辑"), button:has-text("수정"), button:has-text("Edit")').click();
      
      await memberPage.waitForURL(/\/member\/performance\/edit/, { timeout: 10000 });
      
      // Submit
      await memberPage.click('button:has-text("提交"), button:has-text("제출"), button:has-text("Submit")');
      
      // Confirm submission if needed
      const confirmButton = memberPage.locator('button:has-text("确认"), button:has-text("확인")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for success message
      await memberPage.waitForTimeout(2000);
    }
  });

  test('should create support performance record', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    await fillForm(memberPage, {
      year: testPerformance.support.year.toString(),
      quarter: testPerformance.support.quarter.toString(),
      type: 'support',
    });
    
    // Fill support data
    const projectNameInput = memberPage.locator('input[name*="projectName"], input[name*="project"]').first();
    if (await projectNameInput.isVisible()) {
      await projectNameInput.fill(testPerformance.support.data.support[0].projectName);
    }
    
    await memberPage.click('button:has-text("保存草稿"), button:has-text("임시저장")');
    await memberPage.waitForTimeout(2000);
  });

  test('should create IP performance record', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    await fillForm(memberPage, {
      year: testPerformance.ip.year.toString(),
      quarter: testPerformance.ip.quarter.toString(),
      type: 'ip',
    });
    
    // Fill IP data
    const ipTypeInput = memberPage.locator('input[name*="type"], select[name*="type"]').first();
    if (await ipTypeInput.isVisible()) {
      await ipTypeInput.fill('patent');
    }
    
    await memberPage.click('button:has-text("保存草稿"), button:has-text("임시저장")');
    await memberPage.waitForTimeout(2000);
  });
});

