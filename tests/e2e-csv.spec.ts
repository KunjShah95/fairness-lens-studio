import { test, expect } from '@playwright/test';
import path from 'path';

const APP_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080';

test.describe('EquityLens E2E - CSV Tool Test', () => {
  
  test('Full E2E Flow: Login -> Upload CSV -> Analysis -> Report', async ({ page }) => {
    // 1. Navigate to Login
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // 2. Perform Demo Login
    const demoButton = page.getByRole('button', { name: /Demo/i });
    await demoButton.waitFor({ state: 'visible' });
    await demoButton.click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    console.log('✓ Login Successful');

    // 3. Navigate to Upload Page
    await page.goto(`${APP_URL}/upload`);
    await page.waitForLoadState('networkidle');
    
    // 4. Upload CSV
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('sample-data.csv');
    
    // Fill in required fields
    await page.fill('input[placeholder*="Dataset Name"]', 'E2E Test Dataset');
    await page.selectOption('select:near(label:text("Label Column"))', { index: 1 });
    
    // Click Analyze
    await page.click('button:has-text("Analyze")');
    console.log('✓ CSV Uploaded and Analysis Started');

    // 5. Wait for Analysis to complete
    await page.waitForURL(/.*analysis/);
    await page.waitForLoadState('networkidle');
    
    // Check for metrics
    const overallScore = page.locator('text=/Overall Score/i');
    await expect(overallScore).toBeVisible();
    console.log('✓ Analysis Results Displayed');

    // 6. Verify Transparency Page
    await page.goto(`${APP_URL}/transparency`);
    await page.waitForLoadState('networkidle');
    
    // Check for Model Card
    await expect(page.locator('text=/Public Model Card/i')).toBeVisible();
    await expect(page.locator('text=/Bias Nutrition Label/i')).toBeVisible();
    console.log('✓ Transparency Report Verified');
  });
});
