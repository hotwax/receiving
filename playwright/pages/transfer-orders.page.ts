import { type Locator, type Page } from "@playwright/test";

export class TransferOrdersPage {
  constructor(private readonly page: Page) {}

  transferOrdersTab(): Locator {
    return this.page
      .getByTestId("app-menu-item-transfer-orders")
      .or(this.page.getByText("Transfer Orders", { exact: true }))
      .first();
  }

  openOrderTab(): Locator {
    return this.page.locator("ion-segment-button", { hasText: "Open" });
  }

  firstOrderRow(): Locator {
    return this.page
      .getByTestId(/transfer-order-list-item-row-.+/)
      .or(this.page.locator("main ion-item"))
      .first();
  }

  openItemsTab(): Locator {
    return this.page.locator('ion-segment-button[content-id="open"]');
  }

  saveProgressButton(): Locator {
    return this.page.getByRole("button", { name: /Save Progress/i });
  }

  confirmOkButton(): Locator {
    return this.page.getByRole("button", { name: "Ok" });
  }

  confirmProceedButton(): Locator {
    return this.page.getByRole("button", { name: "Proceed" });
  }

  qtyInput(index: number): Locator {
    return this.page.locator('ion-input input[type="number"]').nth(index);
  }

  receiveAndCompleteButton(): Locator {
    return this.page
      .locator("ion-footer")
      .getByRole("button", { name: "Receive and complete" });
  }

  firstDiscrepancyCheckbox(): Locator {
    return this.page.locator("svg.checkbox-icon").first();
  }

  async openTransferOrdersTab(): Promise<void> {
    await this.page.goto("/transfer-orders");
  }

  async openOpenOrderTab(): Promise<void> {
    await this.openOrderTab().click();
  }

  async openFirstOrder(): Promise<void> {
    await this.firstOrderRow().click({ force: true });
    await this.page.waitForURL(/transfer-order-detail\/.*/);
  }

  async openOpenItemsTab(): Promise<void> {
    await this.openItemsTab().click();
  }

  async saveProgress(): Promise<void> {
    await this.saveProgressButton().click();
  }

  async confirmOkInModal(): Promise<void> {
    await this.confirmOkButton().click();
  }

  async confirmProceed(): Promise<void> {
    await this.confirmProceedButton().click();
  }

  async setQtyForItem(index: number, quantity: string): Promise<void> {
    await this.qtyInput(index).fill(quantity);
  }

  async setQtyForFirstItem(quantity: string): Promise<void> {
    await this.setQtyForItem(0, quantity);
  }

  async receiveAllOrFallbackQty(fallbackQty: string): Promise<void> {
    const cards = this.page.locator("ion-card");
    const count = await cards.count();

    for (let i = 0; i < count; i += 1) {
      const card = cards.nth(i);
      const receiveAllBtn = card.getByRole("button", { name: "Receive All" });
      const qtyInput = card.locator('input[type="number"]').first();

      if (await this.canClickButton(receiveAllBtn)) {
        await receiveAllBtn.click({ force: true });
        continue;
      }

      if (await qtyInput.isVisible()) {
        await qtyInput.fill(fallbackQty);
      }
    }
  }

  async receiveAndComplete(): Promise<void> {
    await this.receiveAndCompleteButton().click({ force: true });
  }

  async selectFirstDiscrepancyReason(): Promise<void> {
    await this.firstDiscrepancyCheckbox().click();
  }

  private async canClickButton(button: Locator): Promise<boolean> {
    if ((await button.count()) === 0) {
      return false;
    }

    return await button.isEnabled();
  }
}
