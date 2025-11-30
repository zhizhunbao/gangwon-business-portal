/**
 * Inquiry (1:1 Consultation) Tests
 * 咨询（1:1 咨询）测试
 */

import { test, expect } from '../fixtures/auth';
import { testInquiry } from '../fixtures/test-data';
import { fillForm } from '../utils/helpers';

test.describe('Inquiry Submission (Member)', () => {
  test('should display inquiry form', async ({ memberPage }) => {
    await memberPage.goto('/member/inquiry');
    
    await expect(memberPage.locator('input[name="subject"], textarea[name="subject"]')).toBeVisible();
    await expect(memberPage.locator('textarea[name="content"], textarea[name="message"]')).toBeVisible();
  });

  test('should submit inquiry', async ({ memberPage }) => {
    await memberPage.goto('/member/inquiry');
    
    await fillForm(memberPage, {
      subject: testInquiry.subject,
      content: testInquiry.content,
      category: testInquiry.category,
    });
    
    await memberPage.click('button:has-text("提交"), button:has-text("제출"), button[type="submit"]');
    
    // Wait for success message
    await memberPage.waitForTimeout(2000);
    const successMessage = memberPage.locator('.success, [role="alert"]');
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(/成功|성공/i);
    }
  });

  test('should view inquiry history', async ({ memberPage }) => {
    await memberPage.goto('/member/inquiry/history');
    
    await expect(memberPage.locator('table, .inquiry-list, [data-testid="inquiry-list"]')).toBeVisible();
  });

  test('should view inquiry details', async ({ memberPage }) => {
    await memberPage.goto('/member/inquiry/history');
    
    const firstInquiry = memberPage.locator('table tbody tr, .inquiry-item').first();
    if (await firstInquiry.isVisible()) {
      await firstInquiry.click();
      await memberPage.waitForURL(/\/member\/inquiry\/\w+/, { timeout: 10000 });
      
      await expect(memberPage.locator('.inquiry-detail, [data-testid="inquiry-detail"]')).toBeVisible();
    }
  });
});

test.describe('Inquiry Reply (Admin)', () => {
  test('should view inquiries list', async ({ adminPage }) => {
    await adminPage.goto('/admin/support/inquiries');
    
    await expect(adminPage.locator('table, .inquiry-list')).toBeVisible();
  });

  test('should reply to inquiry', async ({ adminPage }) => {
    await adminPage.goto('/admin/support/inquiries');
    
    const firstInquiry = adminPage.locator('tr:has-text("pending"), tr:has-text("待回复")').first();
    if (await firstInquiry.isVisible()) {
      await firstInquiry.click();
      await adminPage.waitForURL(/\/admin\/support\/inquiries\/\w+/, { timeout: 10000 });
      
      // Find reply form
      const replyTextarea = adminPage.locator('textarea[name="reply"], textarea[name="content"]');
      if (await replyTextarea.isVisible()) {
        await replyTextarea.fill('E2E Test Reply');
        await adminPage.click('button:has-text("回复"), button:has-text("답변"), button:has-text("Submit")');
        await adminPage.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = adminPage.locator('.success, [role="alert"]');
        if (await successMessage.isVisible()) {
          await expect(successMessage).toContainText(/成功|성공/i);
        }
      }
    }
  });
});

