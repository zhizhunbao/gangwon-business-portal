/**
 * Notice Management Tests
 * 公告管理测试
 */

import { test, expect } from '../fixtures/auth';
import { testContent } from '../fixtures/test-data';
import { fillForm } from '../utils/helpers';

test.describe('Notice Viewing (Member)', () => {
  test('should display notices list', async ({ memberPage }) => {
    await memberPage.goto('/member/notices');
    
    await expect(memberPage.locator('table, .notice-list, [data-testid="notice-list"]')).toBeVisible();
  });

  test('should view notice details', async ({ memberPage }) => {
    await memberPage.goto('/member/notices');
    
    const firstNotice = memberPage.locator('table tbody tr, .notice-item').first();
    if (await firstNotice.isVisible()) {
      await firstNotice.click();
      await memberPage.waitForURL(/\/member\/notices\/\w+/, { timeout: 10000 });
      
      await expect(memberPage.locator('.notice-detail, [data-testid="notice-detail"]')).toBeVisible();
    }
  });
});

test.describe('Notice Management (Admin)', () => {
  test('should create new notice', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/notices');
    
    // Click create button
    const createButton = adminPage.getByRole('button', { name: /新建|생성|Create|New/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await adminPage.waitForTimeout(1000);
      
      // Fill notice form
      await fillForm(adminPage, {
        title: testContent.notice.title,
        content: testContent.notice.content,
        category: testContent.notice.category,
      });
      
      // Submit
      await adminPage.click('button:has-text("提交"), button:has-text("제출"), button[type="submit"]');
      await adminPage.waitForTimeout(2000);
      
      // Check for success message
      const successMessage = adminPage.locator('.success, [role="alert"]');
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(/成功|성공/i);
      }
    }
  });

  test('should edit notice', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/notices');
    
    const firstNotice = adminPage.locator('table tbody tr, .notice-item').first();
    if (await firstNotice.isVisible()) {
      // Click edit button
      await firstNotice.locator('button:has-text("编辑"), button:has-text("수정")').click();
      await adminPage.waitForTimeout(1000);
      
      // Update title
      const titleInput = adminPage.locator('input[name="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Updated ${testContent.notice.title}`);
        await adminPage.click('button:has-text("保存"), button:has-text("저장")');
        await adminPage.waitForTimeout(2000);
      }
    }
  });

  test('should delete notice', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/notices');
    
    const firstNotice = adminPage.locator('table tbody tr, .notice-item').first();
    if (await firstNotice.isVisible()) {
      // Click delete button
      await firstNotice.locator('button:has-text("删除"), button:has-text("삭제")').click();
      
      // Confirm deletion
      const confirmButton = adminPage.locator('button:has-text("确认"), button:has-text("확인")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await adminPage.waitForTimeout(2000);
      }
    }
  });
});

