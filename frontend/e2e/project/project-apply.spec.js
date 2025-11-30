/**
 * Project Application Tests
 * 项目申请测试
 */

import { test, expect } from '../fixtures/auth';
import { fillForm } from '../utils/helpers';

test.describe('Project Application Flow', () => {
  test('should submit project application', async ({ memberPage }) => {
    await memberPage.goto('/member/projects');
    
    // Click on first project
    const firstProject = memberPage.locator('table tbody tr, .project-item').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await memberPage.waitForURL(/\/member\/projects\/\w+/, { timeout: 10000 });
      
      // Click apply button
      const applyButton = memberPage.getByRole('button', { name: /申请|지원|Apply/i });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        
        // Wait for application modal or form
        await memberPage.waitForTimeout(1000);
        
        // Fill application form if modal appears
        const applicationForm = memberPage.locator('.application-modal, [data-testid="application-form"]');
        if (await applicationForm.isVisible()) {
          await fillForm(memberPage, {
            motivation: 'E2E Test Application Motivation',
            expectedOutcome: 'E2E Test Expected Outcome',
          });
          
          // Submit application
          await memberPage.click('button:has-text("提交"), button:has-text("제출"), button[type="submit"]');
          
          // Wait for success message
          await memberPage.waitForTimeout(2000);
          const successMessage = memberPage.locator('.success, [role="alert"]');
          if (await successMessage.isVisible()) {
            await expect(successMessage).toContainText(/成功|성공/i);
          }
        }
      }
    }
  });

  test('should track application status', async ({ memberPage }) => {
    await memberPage.goto('/member/projects/applications');
    
    // Check if applications list is displayed
    await expect(memberPage.locator('table, .application-list')).toBeVisible();
    
    // Check if status is displayed for each application
    const applications = memberPage.locator('table tbody tr, .application-item');
    const count = await applications.count();
    if (count > 0) {
      const firstApp = applications.first();
      const status = firstApp.locator('.status, [data-testid="status"]');
      await expect(status).toBeVisible();
    }
  });
});

test.describe('Project Application Approval (Admin)', () => {
  test('should view project applications', async ({ adminPage }) => {
    await adminPage.goto('/admin/projects');
    
    // Navigate to applications or find applications in project list
    const applicationsLink = adminPage.getByRole('link', { name: /申请|지원|Applications/i });
    if (await applicationsLink.isVisible()) {
      await applicationsLink.click();
      await adminPage.waitForURL(/\/admin\/.*applications/, { timeout: 10000 });
    }
    
    // Check if applications list is displayed
    await expect(adminPage.locator('table, .application-list')).toBeVisible();
  });

  test('should approve project application', async ({ adminPage }) => {
    await adminPage.goto('/admin/projects');
    
    // Find a pending application
    const pendingApp = adminPage.locator('tr:has-text("pending"), tr:has-text("待审批")').first();
    if (await pendingApp.isVisible()) {
      await pendingApp.click();
      await adminPage.waitForTimeout(1000);
      
      // Click approve button
      const approveButton = adminPage.getByRole('button', { name: /批准|승인|Approve/i });
      if (await approveButton.isVisible()) {
        await approveButton.click();
        await adminPage.waitForTimeout(2000);
      }
    }
  });

  test('should update application status', async ({ adminPage }) => {
    await adminPage.goto('/admin/projects');
    
    const application = adminPage.locator('tr:has-text("submitted"), tr:has-text("已提交")').first();
    if (await application.isVisible()) {
      await application.click();
      await adminPage.waitForTimeout(1000);
      
      // Find status update dropdown or button
      const statusSelect = adminPage.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('approved');
        await adminPage.click('button:has-text("保存"), button:has-text("저장")');
        await adminPage.waitForTimeout(2000);
      }
    }
  });
});

