/**
 * E2E Test Helpers
 * 测试辅助函数
 */

/**
 * Wait for API response
 * 等待 API 响应完成
 */
export async function waitForAPIResponse(page, urlPattern, timeout = 10000) {
  await page.waitForResponse(
    (response) => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Wait for navigation
 * 等待页面导航完成
 */
export async function waitForNavigation(page, urlPattern, timeout = 10000) {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Fill form fields
 * 填充表单字段
 */
export async function fillForm(page, fields) {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`).first();
    await input.fill(value);
  }
}

/**
 * Click button by text
 * 通过文本点击按钮
 */
export async function clickButtonByText(page, text) {
  await page.getByRole('button', { name: text }).click();
}

/**
 * Wait for element to be visible
 * 等待元素可见
 */
export async function waitForElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if element exists
 * 检查元素是否存在
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content safely
 * 安全获取文本内容
 */
export async function getTextContent(page, selector) {
  try {
    const element = page.locator(selector).first();
    return await element.textContent();
  } catch {
    return null;
  }
}

/**
 * Upload file
 * 上传文件
 */
export async function uploadFile(page, inputSelector, filePath) {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Select option from dropdown
 * 从下拉菜单选择选项
 */
export async function selectOption(page, selectName, optionValue) {
  await page.selectOption(`select[name="${selectName}"]`, optionValue);
}

/**
 * Check checkbox or radio
 * 勾选复选框或单选按钮
 */
export async function checkInput(page, inputName, checked = true) {
  const input = page.locator(`input[name="${inputName}"]`);
  if (checked) {
    await input.check();
  } else {
    await input.uncheck();
  }
}

/**
 * Wait for loading to complete
 * 等待加载完成
 */
export async function waitForLoading(page, loadingSelector = '.loading, [data-loading="true"]') {
  try {
    // Wait for loading indicator to appear
    await page.waitForSelector(loadingSelector, { timeout: 1000 });
    // Wait for it to disappear
    await page.waitForSelector(loadingSelector, { state: 'hidden', timeout: 10000 });
  } catch {
    // Loading indicator might not exist, continue
  }
}

/**
 * Take screenshot with timestamp
 * 带时间戳截图
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png`, fullPage: true });
}

