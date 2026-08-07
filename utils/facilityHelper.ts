import { type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface FacilityInfo {
  id: string;
  name: string;
}

const authFile = 'playwright/.auth/user.json';
const facilityConfigFile = 'playwright/.auth/facility_cache.json';

function getCachedFacility(moduleType: string): string | null {
  try {
    if (fs.existsSync(facilityConfigFile)) {
      const data = JSON.parse(fs.readFileSync(facilityConfigFile, 'utf-8'));
      return data[moduleType] || null;
    }
  } catch {
    // fallback
  }
  return null;
}

function setCachedFacility(moduleType: string, facilityName: string) {
  try {
    const dir = path.dirname(facilityConfigFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let data: Record<string, string> = {};
    if (fs.existsSync(facilityConfigFile)) {
      try {
        data = JSON.parse(fs.readFileSync(facilityConfigFile, 'utf-8'));
      } catch {}
    }
    data[moduleType] = facilityName;
    fs.writeFileSync(facilityConfigFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

/**
 * Retrieves the currently active facility name from Settings.
 */
export async function getCurrentFacility(page: Page): Promise<string> {
  try {
    if (!page.url().includes('/settings')) {
      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }

    const facilityCard = page.locator('ion-card').filter({ hasText: /Specify which facility|Facility/i }).first();
    if (await facilityCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      const label = facilityCard.locator('ion-item ion-label').first();
      const text = await label.innerText().catch(() => '');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines[0] || '';
    }
  } catch {
    // fallback
  }
  return '';
}

/**
 * Opens the facility switcher modal on /settings and returns all available facilities.
 */
export async function getAvailableFacilities(page: Page): Promise<FacilityInfo[]> {
  const facilities: FacilityInfo[] = [];

  try {
    if (!page.url().includes('/settings')) {
      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }

    const changeFacilityBtn = page.locator('#open-facility-modal, ion-button:has-text("Change")').first();
    if (!await changeFacilityBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      const current = await getCurrentFacility(page);
      return current ? [{ id: '', name: current }] : [];
    }

    await changeFacilityBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const modal = page.locator('ion-modal');
    await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Clear searchbar to ensure all facilities are listed
    const searchInput = modal.locator('ion-searchbar input').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.clear();
      await page.waitForTimeout(500);
    }

    const items = modal.locator('ion-radio-group ion-item, ion-list ion-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const radio = item.locator('ion-radio').first();
      const facilityId = (await radio.getAttribute('value').catch(() => '')) || '';
      const text = (await item.innerText().catch(() => '')).trim();
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      const facilityName = lines[0] || facilityId;

      if (facilityName && !facilities.some(f => f.name.toLowerCase() === facilityName.toLowerCase())) {
        facilities.push({ id: facilityId, name: facilityName });
      }
    }

    // Close modal
    const closeBtn = modal.locator('ion-toolbar ion-buttons ion-button').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(400);
    }
  } catch (error) {
    console.log(`  ⚠ Failed to retrieve facilities: ${error}`);
  }

  return facilities;
}

/**
 * Switches the active facility to the target facility name or ID via Settings and persists state.
 */
export async function switchFacility(page: Page, facilityNameOrId: string): Promise<boolean> {
  const target = facilityNameOrId.trim();
  if (!target) return false;

  console.log(`  → Switching facility to "${target}"...`);

  try {
    if (!page.url().includes('/settings')) {
      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }

    const changeFacilityBtn = page.locator('#open-facility-modal, ion-button:has-text("Change")').first();
    if (!await changeFacilityBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('  ℹ Single facility environment.');
      return true;
    }

    await changeFacilityBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const modal = page.locator('ion-modal');
    await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Search for facility
    const searchInput = modal.locator('ion-searchbar input').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(target);
      await searchInput.press('Enter');
      await page.waitForTimeout(500);
    }

    // Find matching item
    const facilityItem = modal.locator('ion-radio-group ion-item, ion-list ion-item')
      .filter({ hasText: new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .first();

    if (await facilityItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await facilityItem.click({ force: true });
      await page.waitForTimeout(400);

      const saveFab = modal.locator('ion-fab-button').first();
      if (await saveFab.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isDisabled = await saveFab.getAttribute('disabled');
        if (!isDisabled && isDisabled !== 'true') {
          await saveFab.click({ force: true });
          await page.waitForTimeout(1500);
        } else {
          // Already selected
          const closeBtn = modal.locator('ion-toolbar ion-buttons ion-button').first();
          await closeBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      console.log(`  ✔ Facility switched to "${target}".`);
      return true;
    } else {
      console.log(`  ⚠ Facility "${target}" not found in modal list.`);
      const closeBtn = modal.locator('ion-toolbar ion-buttons ion-button').first();
      await closeBtn.click({ force: true }).catch(() => {});
      return false;
    }
  } catch (error) {
    console.log(`  ⚠ Error switching facility to "${target}": ${error}`);
    return false;
  }
}

/**
 * Checks if the given module has open orders available in the OPEN tab.
 */
export async function checkIfOrdersAvailableInOpenTab(
  page: Page,
  moduleType: 'transfer-orders' | 'purchase-orders' | 'returns'
): Promise<boolean> {
  const urlMap = {
    'transfer-orders': '/transfer-orders',
    'purchase-orders': '/purchase-orders',
    'returns': '/returns',
  };

  try {
    await page.goto(urlMap[moduleType]);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Make sure Open segment tab is active
    const openTab = page.locator('ion-segment-button[value="open"], [data-testid*="open-tab"]').first();
    if (await openTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openTab.click({ force: true });
      await page.waitForTimeout(500);
    }

    const rowSelector = '[data-testid*="list-item-row"], main ion-item[button="true"]';
    const count = await page.locator(rowSelector).count();
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Ensures that the active facility contains orders in the OPEN section.
 * If user specified a facility (via parameter or FACILITY_NAME env var), it validates that facility.
 * If a working facility with open orders was already discovered, it re-uses that facility immediately.
 * Otherwise, it searches across facilities once, finds one with open orders, and persists it.
 */
export async function ensureFacilityWithAvailableOrders(
  page: Page,
  moduleType: 'transfer-orders' | 'purchase-orders' | 'returns',
  userFacilityInput?: string
): Promise<{ facilityName: string; hasOrders: boolean }> {
  const preferredFacility = userFacilityInput || process.env.FACILITY_NAME || '';

  // 1. If user explicitly provided a facility input, use it
  if (preferredFacility) {
    console.log(`  → Using user-specified facility: "${preferredFacility}" for ${moduleType}...`);
    await switchFacility(page, preferredFacility);
    const hasOrders = await checkIfOrdersAvailableInOpenTab(page, moduleType);
    console.log(`  → User facility "${preferredFacility}" has open orders in ${moduleType}: ${hasOrders}`);
    return { facilityName: preferredFacility, hasOrders };
  }

  // 2. Check if a working facility was already cached/discovered for this module
  const cachedFacility = getCachedFacility(moduleType);
  if (cachedFacility) {
    const currentFacility = await getCurrentFacility(page);
    if (currentFacility.toLowerCase() !== cachedFacility.toLowerCase()) {
      console.log(`  → Re-using discovered facility with open data: "${cachedFacility}"...`);
      await switchFacility(page, cachedFacility);
    }
    return { facilityName: cachedFacility, hasOrders: true };
  }

  // 3. Check if the currently active facility already has orders in the OPEN tab
  const currentFacility = await getCurrentFacility(page);
  console.log(`  → Checking active facility "${currentFacility || 'Default'}" for open ${moduleType}...`);
  const currentHasOpenOrders = await checkIfOrdersAvailableInOpenTab(page, moduleType);

  if (currentHasOpenOrders && currentFacility) {
    console.log(`  ✔ Active facility "${currentFacility}" has available open orders in ${moduleType}.`);
    setCachedFacility(moduleType, currentFacility);
    return { facilityName: currentFacility, hasOrders: true };
  }

  console.log(`  ℹ Active facility "${currentFacility}" has NO open orders in ${moduleType}. Searching for next facility with open data...`);

  // 4. Dynamically discover all facilities and switch until one with open orders is found
  const allFacilities = await getAvailableFacilities(page);
  console.log(`  → Discovered ${allFacilities.length} facilities: ${allFacilities.map(f => f.name).join(', ')}`);

  for (const facility of allFacilities) {
    if (currentFacility && facility.name.toLowerCase() === currentFacility.toLowerCase()) {
      continue;
    }

    console.log(`  → Checking facility "${facility.name}" for open ${moduleType}...`);
    const switched = await switchFacility(page, facility.name);
    if (!switched) continue;

    const hasOpenOrders = await checkIfOrdersAvailableInOpenTab(page, moduleType);
    if (hasOpenOrders) {
      console.log(`  ✔ Found facility with open ${moduleType}: "${facility.name}"! Keeping and persisting this facility for all tests.`);
      setCachedFacility(moduleType, facility.name);
      return { facilityName: facility.name, hasOrders: true };
    } else {
      console.log(`  ℹ Facility "${facility.name}" has 0 open orders in ${moduleType}.`);
    }
  }

  console.log(`  ⚠ No facility with open orders found for ${moduleType}. Operating under current facility.`);
  if (currentFacility) {
    setCachedFacility(moduleType, currentFacility);
  }
  return { facilityName: currentFacility, hasOrders: false };
}
