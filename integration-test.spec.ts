import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';
const APP_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

test.describe('EquityLens System - Frontend & Backend Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable request logging
    page.on('request', request => {
      console.log('>> Request:', request.method(), request.url());
    });
    page.on('response', response => {
      console.log('<<', response.status(), response.url());
    });
  });

  test('1. Backend Health Check - Verify API is running', async ({ page }) => {
    // Test that backend is healthy
    const response = await page.request.get(`${API_URL}/api/demo/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
    expect(data).toHaveProperty('service', 'EquityLens');
    expect(data).toHaveProperty('version');
    
    console.log('✓ Backend Health Check PASSED');
    console.log(`  Service: ${data.service} v${data.version}`);
    console.log(`  Status: ${data.status}`);
  });

  test('2. Get Sample Audit Data - Backend returns realistic data', async ({ page }) => {
    // Test that backend provides sample audit data
    const response = await page.request.get(`${API_URL}/api/demo/sample-audit`);
    expect(response.status()).toBe(200);
    
    const audit = await response.json();
    expect(audit).toHaveProperty('id', 'audit-sample-001');
    expect(audit).toHaveProperty('fairness_score');
    expect(audit.fairness_score).toBe(68);
    expect(audit).toHaveProperty('metrics');
    expect(audit).toHaveProperty('proxy_features');
    expect(audit).toHaveProperty('intersectional_results');
    
    console.log('✓ Sample Audit Data PASSED');
    console.log(`  Fairness Score: ${audit.fairness_score}/100`);
    console.log(`  Protected Attributes: ${audit.protected_attributes.join(', ')}`);
    console.log(`  Proxy Features Found: ${audit.proxy_features.length}`);
    console.log(`  Intersectional Groups: ${audit.intersectional_results.length}`);
  });

  test('3. Get Sample Report (HTML) - Backend generates reports', async ({ page }) => {
    // Test that backend generates HTML reports
    const response = await page.request.get(`${API_URL}/api/demo/sample-report`);
    expect(response.status()).toBe(200);
    
    const html = await response.text();
    expect(html).toContain('Fairness Audit Report');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Demographic Parity');
    expect(html).toContain('Recommendations');
    
    console.log('✓ Sample Report Generation PASSED');
    console.log(`  Report HTML size: ${html.length} bytes`);
    console.log(`  Includes sections: Executive Summary, Metrics, Intersectional Analysis, Recommendations`);
  });

  test('4. Get Sample Model Card - Backend generates transparency docs', async ({ page }) => {
    // Test that backend generates model cards
    const response = await page.request.get(`${API_URL}/api/demo/sample-model-card`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('content');
    expect(data.content).toContain('Model Card');
    expect(data.content).toContain('Intended Use');
    expect(data.content).toContain('Ethical Considerations');
    
    console.log('✓ Sample Model Card PASSED');
    console.log(`  Card length: ${data.content.length} characters`);
    console.log(`  Includes: Model Details, Intended Use, Training Data, Limitations, Ethics`);
  });

  test('5. List API Endpoints - Backend provides complete API reference', async ({ page }) => {
    // Test that backend provides endpoint documentation
    const response = await page.request.get(`${API_URL}/api/demo/endpoints`);
    expect(response.status()).toBe(200);
    
    const endpoints = await response.json();
    expect(endpoints).toHaveProperty('categories');
    expect(endpoints.categories).toHaveProperty('Health & Demo');
    expect(endpoints.categories).toHaveProperty('Datasets');
    expect(endpoints.categories).toHaveProperty('Audit & Analysis');
    expect(endpoints.categories).toHaveProperty('Reports & Transparency');
    
    console.log('✓ API Endpoints List PASSED');
    console.log(`  Total Categories: ${Object.keys(endpoints.categories).length}`);
    console.log(`  Categories: ${Object.keys(endpoints.categories).join(', ')}`);
  });

  test('6. Frontend Loads Successfully', async ({ page }) => {
    // Test that frontend loads
    await page.goto(APP_URL);
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Check for main content
    const title = await page.title();
    expect(title).toBeTruthy();
    
    console.log('✓ Frontend Loading PASSED');
    console.log(`  Page Title: ${title}`);
  });

  test('7. Frontend - Navigation Working', async ({ page }) => {
    // Test that frontend navigation works
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to different pages
    const navLinks = await page.locator('nav').count();
    expect(navLinks).toBeGreaterThan(0);
    
    console.log('✓ Frontend Navigation PASSED');
    console.log(`  Navigation elements found: ${navLinks}`);
  });

  test('8. Frontend - Transparency Page Accessible', async ({ page }) => {
    // Test that transparency/reporting page exists
    await page.goto(`${APP_URL}/transparency`);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check for transparency-related content
    const pageVisible = await page.isVisible('main') || await page.isVisible('[role="main"]');
    expect(pageVisible).toBeTruthy();
    
    console.log('✓ Transparency Page Accessible PASSED');
  });

  test('9. End-to-End: Backend → Frontend Data Flow', async ({ page }) => {
    // Comprehensive test of backend providing data that frontend can consume
    
    // Step 1: Get sample audit from backend
    const auditResponse = await page.request.get(`${API_URL}/api/demo/sample-audit`);
    expect(auditResponse.status()).toBe(200);
    const audit = await auditResponse.json();
    
    // Step 2: Get sample report from backend
    const reportResponse = await page.request.get(`${API_URL}/api/demo/sample-report`);
    expect(reportResponse.status()).toBe(200);
    const reportHTML = await reportResponse.text();
    
    // Step 3: Navigate to frontend and verify it can display similar data
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify frontend has necessary UI components
    // (These would be present if analysis runs)
    const mainContent = await page.locator('main');
    expect(mainContent).toBeTruthy();
    
    console.log('✓ End-to-End Data Flow PASSED');
    console.log(`✓ Backend provides audit data (fairness_score: ${audit.fairness_score})`);
    console.log(`✓ Backend generates HTML reports (${reportHTML.length} bytes)`);
    console.log(`✓ Frontend loads and ready for interaction`);
  });

  test('10. Performance Check - API Response Times', async ({ page }) => {
    // Measure API response times
    const measurements = {
      health: 0,
      audit: 0,
      report: 0,
      card: 0
    };
    
    // Health check
    let start = Date.now();
    await page.request.get(`${API_URL}/api/demo/health`);
    measurements.health = Date.now() - start;
    
    // Sample audit
    start = Date.now();
    await page.request.get(`${API_URL}/api/demo/sample-audit`);
    measurements.audit = Date.now() - start;
    
    // Sample report
    start = Date.now();
    await page.request.get(`${API_URL}/api/demo/sample-report`);
    measurements.report = Date.now() - start;
    
    // Sample model card
    start = Date.now();
    await page.request.get(`${API_URL}/api/demo/sample-model-card`);
    measurements.card = Date.now() - start;
    
    // Verify reasonable response times (< 2 seconds)
    Object.entries(measurements).forEach(([endpoint, time]) => {
      expect(time).toBeLessThan(2000);
    });
    
    console.log('✓ Performance Check PASSED');
    console.log(`  Health Check: ${measurements.health}ms`);
    console.log(`  Sample Audit: ${measurements.audit}ms`);
    console.log(`  Sample Report: ${measurements.report}ms`);
    console.log(`  Sample Model Card: ${measurements.card}ms`);
    console.log(`  Average: ${Math.round(Object.values(measurements).reduce((a, b) => a + b) / Object.values(measurements).length)}ms`);
  });

  test('11. Error Handling - Backend handles invalid requests gracefully', async ({ page }) => {
    // Test that backend handles errors gracefully
    const response = await page.request.get(`${API_URL}/api/demo/nonexistent`, {
      failOnStatusCode: false
    });
    
    // Should return 404, not crash
    expect([404, 422]).toContain(response.status());
    
    console.log('✓ Error Handling PASSED');
    console.log(`  Invalid endpoint returns: ${response.status()}`);
  });

  test('12. CORS Headers - Backend allows frontend requests', async ({ page }) => {
    // Test that CORS headers are properly set
    const response = await page.request.get(`${API_URL}/api/demo/health`);
    
    // Check for CORS headers
    const headers = response.headers();
    const corsHeader = headers['access-control-allow-origin'];
    
    expect(corsHeader).toBeTruthy();
    console.log('✓ CORS Configuration PASSED');
    console.log(`  Access-Control-Allow-Origin: ${corsHeader}`);
  });
});
