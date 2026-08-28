import { test as setup, expect } from '@playwright/test';
import { switchFacility, ensureFacilityWithAvailableOrders } from '../utils/facilityHelper';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('\n==================================================');
  console.log('▶ [AUTH SETUP] Logging into krewe-uat');
  console.log('==================================================');

  await page.goto('/settings');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // If already in an active session, logout first to switch instance cleanly
  const logoutBtn = page.locator('ion-button:has-text("Logout"), button:has-text("Logout")').first();
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  → Logging out from previous instance...');
    await logoutBtn.click({ force: true });
    await page.waitForURL(/.*login/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  // 1. OMS instanceUrl step (if shown)
  const omsInput = page.locator('input[name="instanceUrl"]').first();
  if (await omsInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('  → Setting OMS instance to krewe-uat...');
    await omsInput.fill('krewe-uat');
    await omsInput.press('Enter');
    await page.waitForTimeout(500);

    const nextBtn = page.getByRole('button', { name: /next/i }).or(page.locator('ion-button:has-text("Next")')).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click({ force: true }).catch(() => {});
    }
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // 2. Username & Password step
  const usernameInput = page.locator('input[name="username"], input[autocomplete*="username"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
  console.log('  → Entering username and password...');
  await usernameInput.fill('swati.pandey');

  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill('hotwax@786');

  // 3. Click Login
  const loginBtn = page.locator('ion-button, button').filter({ hasText: /(login|sign in)/i }).first();
  if (await loginBtn.isVisible().catch(() => false)) {
    await loginBtn.click({ force: true });
  } else {
    await passwordInput.press('Enter');
  }

  // 4. Wait for redirect to the app
  await page.waitForURL(/.*transfer-orders|.*settings|.*returns|.*purchase-orders/, { timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('  ✔ Logged in successfully to krewe-uat.');

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
  await page.goto('/settings');
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
  await page.context().storageState({ path: authFile });
  console.log('  ✔ Authentication state saved.\n');
});
