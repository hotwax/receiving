import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getClientConfig } from '../config/clients';
import { switchFacility, ensureFacilityWithAvailableOrders } from '../utils/facilityHelper';

/**
 * Perform login using the OMS backend (webtools) first, then navigate to Launchpad / Receiving
 */
async function performLogin(page: any, config: any) {
  // Log all console errors and failed network requests
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') console.log(`Page [Type: error] - Encountered error: ${msg.text()}`);
  });
  page.on('requestfailed', (request: any) => {
    console.log(`Request [URL: ${request.url()}] - Failed: ${request.failure()?.errorText}`);
  });
  page.on('response', (response: any) => {
    if (response.status() >= 400) {
      console.log(`API [URL: ${response.url()}, Status: ${response.status()}] - Error returned`);
    }
  });

  // Mock the appVersions API to prevent the 404 error on UAT from crashing the Login UI
  await page.route('**/appVersions**', (route: any) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({})
  }));

  const { clientId, username, password, oms, baseUrl } = config;

  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nAuthentication [Client: ${clientId}] - Starting direct login flow for Receiving`);
  
  // Handle existing sessions by trying to logout first
  await page.goto(`${baseUrl}/settings`);
  await page.waitForLoadState('domcontentloaded');
  const logoutBtn = page.locator('ion-button:has-text("Logout"), button:has-text("Logout")').first();
  if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    console.log(`  → Logging out from previous instance on ${clientId}...`);
    await logoutBtn.click({ force: true });
    await page.waitForURL(/.*login/, { timeout: 5000 }).catch(() => {});
  }

  await page.goto(`${baseUrl}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Give Vue router time to settle

  // Handle Launchpad redirect for OMS input
  const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  if (await nextBtn.isVisible().catch(() => false)) {
    console.log(`Authentication [Client: ${clientId}] - Launchpad OMS screen detected, filling OMS`);
    // Locate the OMS input.
    const omsInput = page.locator('ion-input, input[type="text"]').first();
    // Pass the full URL to prevent the frontend from auto-appending .hotwax.io
    const omsUrl = oms || `https://${clientId}.hotwax.io`;
    
    await omsInput.click();
    await page.keyboard.type(omsUrl, { delay: 50 });
    await page.waitForTimeout(500); // Wait for Vue to detect input and enable the NEXT button
    
    await nextBtn.click({ force: true }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
  }

  // Fill login form (either Launchpad step 2 or direct Ionic login)
  // Ensure we specifically look for a username field, NOT just any text input
  const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  await expect(userField).toBeVisible({ timeout: 10000 });
  
  console.log(`Authentication [Client: ${clientId}] - Filling credentials`);
  await userField.click();
  await page.keyboard.type(username, { delay: 50 });
  
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  await passField.click();
  await page.keyboard.type(password, { delay: 50 });
  await passField.press('Enter');
  
  // Try to find OMS field if it's on the same screen (for non-Launchpad direct logins)
  const omsField = page.locator('input[name="oms"]').first();
  if (await omsField.isVisible().catch(() => false)) {
    await omsField.click();
    await page.keyboard.type(oms || `https://${clientId}.hotwax.io`, { delay: 50 });
  }

  await page.waitForTimeout(500);
  const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login"), ion-button:has-text("LOGIN"), button:has-text("LOGIN")').first();
  await loginBtn.click({ force: true }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Give time for tokens to be saved in LocalStorage

  // Final verification that we are successfully logged in
  try {
    // Wait for the URL to change away from the login page, or wait for the main menu to appear
    await Promise.any([
      page.waitForURL(/.*\/(transfer-orders|settings|returns|purchase-orders)/, { timeout: 15000 }),
      page.waitForSelector('ion-menu', { state: 'visible', timeout: 15000 })
    ]);
  } catch (e) {
     // Check for permission errors on screen
     const permissionError = page.locator(':has-text("You do not have permission")').first();
     if (await permissionError.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: You do not have permission to access the app.`);
     }
     
     const invalidAuth = page.locator(':has-text("Invalid username or password")').first();
     if (await invalidAuth.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: Invalid username or password.`);
     }

     throw new Error(`Login Failed for ${clientId}: Did not reach the dashboard after login.`);
  }

  console.log(`Authentication [Client: ${clientId}] - Successfully logged into Receiving`);
}

setup('authenticate', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const clientId = projectName.replace('setup-', '');
  
  const config = getClientConfig(clientId);
  const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);

  await performLogin(page, config);

  // 5. Select facility in Settings (respecting user input or discovering facility with open data)
  const initialFacility = process.env.FACILITY_NAME || '';
  if (initialFacility) {
    console.log(`  → Setting user-specified facility: "${initialFacility}"...`);
    await switchFacility(page, initialFacility);
  } else {
    console.log('  → Ensuring facility has open orders...');
    const result = await ensureFacilityWithAvailableOrders(page, 'transfer-orders');
    console.log(`  ✔ Selected initial facility with open data: "${result.facilityName}".`);
  }

  // 6. Ensure Receive by fulfillment is OFF (strictly order-based receiving)
  console.log('  → Ensuring standard Order-based receiving mode (Receive by fulfillment = OFF)...');
  await page.goto(`${config.baseUrl}/settings`);
  await page.waitForLoadState('domcontentloaded');
  const fulfillmentToggle = page.locator('ion-toggle').filter({ hasText: /receive by fulfillment|fulfillment/i })
    .or(page.locator('ion-item').filter({ hasText: /receive by fulfillment|fulfillment/i }).locator('ion-toggle'));
  if (await fulfillmentToggle.first().isVisible({ timeout: 4000 }).catch(() => false)) {
    const isChecked = (await fulfillmentToggle.first().getAttribute('aria-checked')) === 'true' ||
                      (await fulfillmentToggle.first().getAttribute('class'))?.includes('toggle-checked');
    if (isChecked) {
      console.log('  → Toggling Receive by fulfillment to OFF...');
      await fulfillmentToggle.first().click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // Save storage state for all test specs
  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  await page.context().storageState({ path: authFilePath });
  console.log(`  ✔ Authentication state saved to ${authFilePath}.\n`);
});
