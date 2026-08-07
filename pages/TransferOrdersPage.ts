import { type Locator, type Page, expect } from '@playwright/test';

export class TransferOrdersPage {
  readonly page: Page;
  readonly openSegment: Locator;
  readonly completedSegment: Locator;
  readonly searchInput: Locator;
  readonly emptyStateContainer: Locator;
  readonly transferOrderItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openSegment = page.getByTestId('transfer-orders-page-open-tab').or(page.locator('ion-segment-button[value="open"]')).first();
    this.completedSegment = page.getByTestId('transfer-orders-page-completed-tab').or(page.locator('ion-segment-button[value="completed"]')).first();
    this.searchInput = page.getByTestId('transfer-orders-page-search-input').locator('input').or(page.locator('ion-searchbar input')).first();
    this.emptyStateContainer = page.getByTestId('transfer-orders-page-empty-state').or(page.getByText(/There are no transfer orders/i)).or(page.locator('main:has(img[alt*="empty"]), .empty-state')).first();
    this.transferOrderItems = page.locator('[data-testid^="transfer-order-list-item-row-"], main ion-item[button="true"], main ion-card');
  }

  async goto() {
    await this.page.goto('/transfer-orders');
    await this.page.waitForLoadState('networkidle');
  }

  async selectOpenSegment() {
    await this.openSegment.click({ force: true });
  }

  async selectCompletedSegment() {
    await this.completedSegment.click({ force: true });
  }

  async search(query: string) {
    const input = this.page.locator('ion-searchbar input.searchbar-input, ion-searchbar input, [data-testid="transfer-orders-page-search-input"] input').first();
    await input.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await input.click({ force: true });
    await input.fill(query);
    await input.press('Enter');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async getFirstTransferOrderId(): Promise<string | null> {
    const count = await this.transferOrderItems.count();
    if (count > 0) {
      return await this.transferOrderItems.first().textContent();
    }
    return null;
  }

  async getFirstTransferOrderName(): Promise<string> {
    const firstItem = this.page.locator('main ion-item[button="true"], [data-testid^="transfer-order-list-item-row-"]').first();
    const isVisible = await firstItem.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) return '';
    const label = firstItem.locator('ion-label').first();
    const text = await label.innerText().catch(() => '');
    return text.split('\n')[0]?.trim() || '';
  }

  async hasOrders(): Promise<boolean> {
    const items = this.page.locator('main ion-item[button="true"], [data-testid^="transfer-order-list-item-row-"]');
    if (await items.first().isVisible({ timeout: 4000 }).catch(() => false)) {
      return true;
    }
    // Check completed tab
    await this.selectCompletedSegment();
    await this.page.waitForTimeout(1000);
    return await items.first().isVisible({ timeout: 4000 }).catch(() => false);
  }

  async openFirstTransferOrder(): Promise<boolean> {
    const firstItem = this.page.locator('main ion-item[button="true"], [data-testid^="transfer-order-list-item-row-"]').first();
    const isVisible = await firstItem.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      return false;
    }
    await firstItem.click({ force: true });
    await this.page.waitForURL(/.*transfer-order-detail\/.*/, { timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});
    return true;
  }

  async searchAndOpenTransferOrder(orderName: string): Promise<boolean> {
    const cleanName = orderName?.trim() || '';

    try {
      await this.goto();
      await this.page.waitForTimeout(1000);

      // 1. Search by TO Name in Open segment
      await this.selectOpenSegment();
      await this.page.waitForTimeout(1000);
      if (cleanName) {
        console.log(`  → Searching TO Name "${cleanName}" in Open Transfer Orders...`);
        await this.search(cleanName);
      }

      // Check if matching item appears in Open tab
      let listItems = this.page.locator('[data-testid^="transfer-order-list-item-row-"], main ion-item[button="true"]');
      let matchingItem = cleanName ? listItems.filter({ hasText: cleanName }).first() : listItems.first();
      let hasItem = await matchingItem.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasItem) {
        // 2. If not found in Open, switch to Completed segment tab and search by TO Name
        console.log(`  → Not found in Open. Searching TO Name "${cleanName}" in Completed Transfer Orders...`);
        await this.selectCompletedSegment();
        await this.page.waitForTimeout(1000);
        if (cleanName) {
          await this.search(cleanName);
        }

        listItems = this.page.locator('[data-testid^="transfer-order-list-item-row-"], main ion-item[button="true"]');
        matchingItem = cleanName ? listItems.filter({ hasText: cleanName }).first() : listItems.first();
        hasItem = await matchingItem.isVisible({ timeout: 4000 }).catch(() => false);
      }

      const rowToClick = hasItem ? matchingItem : this.page.locator('[data-testid^="transfer-order-list-item-row-"], main ion-item[button="true"], main ion-item').first();
      if (await rowToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`  → Clicking Transfer Order item to open detail...`);
        await rowToClick.click({ force: true });
        const navigated = await this.page.waitForURL(/.*transfer-order-detail\/.*/, { timeout: 6000 }).then(() => true).catch(() => false);
        if (!navigated) {
          const innerClickable = rowToClick.locator('button, a, ion-label, p, h2').first();
          if (await innerClickable.isVisible().catch(() => false)) {
            await innerClickable.click({ force: true });
          }
          await this.page.waitForURL(/.*transfer-order-detail\/.*/, { timeout: 10000 }).catch(() => {});
        }
      }

      await this.page.waitForLoadState('domcontentloaded');
      await this.page.locator('main ion-card, ion-content ion-card').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }
}
