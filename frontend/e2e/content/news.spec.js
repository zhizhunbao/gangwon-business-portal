/**
 * News Management Tests
 * 新闻管理测试
 */

import { test, expect } from '../fixtures/auth';
import { testContent } from '../fixtures/test-data';
import { fillForm } from '../utils/helpers';

test.describe('News Viewing (Member)', () => {
  test('should display news list', async ({ memberPage }) => {
    await memberPage.goto('/member/news');
    
    await expect(memberPage.locator('table, .news-list, [data-testid="news-list"]')).toBeVisible();
  });

  test('should view news details', async ({ memberPage }) => {
    await memberPage.goto('/member/news');
    
    const firstNews = memberPage.locator('table tbody tr, .news-item').first();
    if (await firstNews.isVisible()) {
      await firstNews.click();
      await memberPage.waitForURL(/\/member\/news\/\w+/, { timeout: 10000 });
      
      await expect(memberPage.locator('.news-detail, [data-testid="news-detail"]')).toBeVisible();
    }
  });
});

test.describe('News Management (Admin)', () => {
  test('should create new news', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/news');
    
    const createButton = adminPage.getByRole('button', { name: /新建|생성|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await adminPage.waitForTimeout(1000);
      
      await fillForm(adminPage, {
        title: testContent.news.title,
        content: testContent.news.content,
      });
      
      await adminPage.click('button:has-text("提交"), button:has-text("제출")');
      await adminPage.waitForTimeout(2000);
    }
  });

  test('should edit news', async ({ adminPage }) => {
    await adminPage.goto('/admin/content/news');
    
    const firstNews = adminPage.locator('table tbody tr, .news-item').first();
    if (await firstNews.isVisible()) {
      await firstNews.locator('button:has-text("编辑"), button:has-text("수정")').click();
      await adminPage.waitForTimeout(1000);
      
      const titleInput = adminPage.locator('input[name="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Updated ${testContent.news.title}`);
        await adminPage.click('button:has-text("保存"), button:has-text("저장")');
        await adminPage.waitForTimeout(2000);
      }
    }
  });
});

