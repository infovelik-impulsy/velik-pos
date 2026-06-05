import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // Navigate to app
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Wait for login page
  await page.waitForSelector('input[placeholder*="PIN"]', { timeout: 5000 });
  
  // Enter PIN (admin pin is 1234)
  await page.fill('input[placeholder*="PIN"]', '1234');
  await page.click('button:has-text("Ingresar")');
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Navigate to facturación
  await page.click('a[href="/facturacion"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
  
  // Wait for charts to load
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/dashboard.png' });
  console.log('✅ Screenshot saved to /tmp/dashboard.png');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  await page.screenshot({ path: '/tmp/dashboard-error.png' });
  console.log('Error screenshot saved to /tmp/dashboard-error.png');
} finally {
  await browser.close();
}
