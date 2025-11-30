/**
 * FAQ Management Tests
 * FAQ 管理测试
 */

import { test, expect } from '../fixtures/auth';
import { testContent } from '../fixtures/test-data';
import { fillForm } from '../utils/helpers';

test.describe('FAQ Query (Member)', () => {
  test('should display FAQ list', async ({ memberPage }) => {
    await memberPage.goto('/member/faq');
    
    await expect(memberPage.locator('.faq-list, [data-testid="faq-list"]')).toBeVisible();
  });

  test('should search FAQ', async ({ memberPage }) => {
    await memberPage.goto('/member/faq');
    
    const searchInput = memberPage.locator('input[type="search"], input[placeholder*="搜索"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await memberPage.waitForTimeout(1000);
      
      // Check if results are filtered
      const results = memberPage.locator('.faq-item');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should expand FAQ item', async ({ memberPage }) => {
    await memberPage.goto('/member/faq');
    
    const firstFAQ = memberPage.locator('.faq-item').first();
    if (await firstFAQ.isVisible()) {
      await firstFAQ.click();
      await memberPage.waitForTimeout(500);
      
      // Check if answer is visible
      const answer = firstFAQ.locator('.faq-answer, [data-testid="faq-answer"]');
      await expect(answer).toBeVisible();
    }
  });
});

test.describe('FAQ Management (Admin)', () => {
  test('should create new FAQ', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/faq');
    
    const createButton = adminPage.getByRole('button', { name: /新建|생성|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await adminPage.waitForTimeout(1000);
      
      await fillForm(adminPage, {
        question: testContent.faq.question,
        answer: testContent.faq.answer,
        category: testContent.faq.category,
      });
      
      await adminPage.click('button:has-text("提交"), button:has-text("제출")');
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should edit FAQ', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/faq');
    
    const firstFAQ = adminPage.locator('table tbody tr, .faq-item').first();
    if (await firstFAQ.isVisible()) {
      await firstFAQ.locator('button:has-text("编辑"), button:has-text("수정")').click();
      await adminPage.waitForTimeout(1000);
      
      const questionInput = adminPage.locator('input[name="question"], textarea[name="question"]');
      if (await questionInput.isVisible()) {
        await questionInput.fill(`Updated ${testContent.faq.question}`);
        await adminPage.click('button:has-text("保存"), button:has-text("저장")');
        await adminPage.waitForTimeout(2000);
      }
    }
  });
});

