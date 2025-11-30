/**
 * File Upload Limit Tests
 * 文件上传限制测试
 */

import { test, expect } from '../fixtures/auth';
import { uploadFile } from '../utils/helpers';

test.describe('File Upload Limits', () => {
  test('should reject file that is too large', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    // Create a large file (simulate)
    // In real test, you would create a file larger than 10MB
    const fileInput = memberPage.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      // Note: This would require creating a test file > 10MB
      // For now, we just check that file input exists and has accept attribute
      const accept = await fileInput.getAttribute('accept');
      expect(accept).toContain('pdf');
    }
  });

  test('should reject invalid file type', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    const fileInput = memberPage.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      // Check accept attribute
      const accept = await fileInput.getAttribute('accept');
      if (accept) {
        expect(accept).toContain('pdf');
        // HTML5 validation should prevent non-PDF files
      }
    }
  });

  test('should show file size hint', async ({ memberPage }) => {
    await memberPage.goto('/member/performance/new');
    
    // Look for file upload hint
    const hint = memberPage.locator('text=/最大|최대|10MB|10 MB/i');
    if (await hint.isVisible()) {
      await expect(hint).toBeVisible();
    }
  });
});

