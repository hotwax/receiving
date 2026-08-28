import { type Locator, type Page } from '@playwright/test';

export class TabsPage {
  readonly page: Page;
  readonly transferOrdersTab: Locator;
  readonly purchaseOrdersTab: Locator;
  readonly returnsTab: Locator;
  readonly settingsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transferOrdersTab = page.getByRole('link', { name: /Transfer Orders/i }).first();
    this.purchaseOrdersTab = page.getByRole('link', { name: /Purchase Orders/i }).first();
    this.returnsTab = page.getByRole('link', { name: /Returns/i }).first();
    this.settingsTab = page.getByRole('link', { name: /Settings/i }).first();
  }

  async gotoTransferOrders() {
    await this.transferOrdersTab.click();
  }

  async gotoPurchaseOrders() {
    await this.purchaseOrdersTab.click();
  }

  async gotoReturns() {
    await this.returnsTab.click();
  }

  async gotoSettings() {
    await this.settingsTab.click();
  }
}
