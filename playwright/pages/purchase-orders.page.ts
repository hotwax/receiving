import { type Locator, type Page } from "@playwright/test";

export class PurchaseOrdersPage {
  constructor(private readonly page: Page) {}

  purchaseOrdersTab(): Locator {
    return this.page
      .getByTestId("app-menu-item-purchase-orders")
      .or(this.page.getByText("Purchase Orders", { exact: true }))
      .first();
  }

  firstOrderRow(): Locator {
    return this.page
      .getByTestId(/purchase-order-list-item-row-.+/)
      .or(this.page.locator("ion-item:has(ion-label h3)"))
      .first();
  }

  receiveAllButtons(): Locator {
    return this.page.getByRole("button", { name: "Receive All" });
  }

  submitReceiveButton(): Locator {
    return this.page.getByText("Receive", { exact: true });
  }

  confirmProceedButton(): Locator {
    return this.page.getByRole("button", { name: "Proceed" });
  }

  qtyInputs(): Locator {
    return this.page.locator('ion-item input.native-input[type="number"]');
  }

  async openPurchaseOrdersTab(): Promise<void> {
    await this.page.goto("/purchase-orders");
  }

  async openFirstOrder(): Promise<void> {
    await this.firstOrderRow().click();
  }

  async clickAllReceiveAllButtons(): Promise<void> {
    const count = await this.receiveAllButtons().count();

    for (let i = 0; i < count; i += 1) {
      await this.receiveAllButtons().nth(i).click();
    }
  }

  async fillAllQuantities(quantity: string): Promise<void> {
    const count = await this.qtyInputs().count();

    for (let i = 0; i < count; i += 1) {
      const input = this.qtyInputs().nth(i);
      await input.click();
      await input.fill(quantity);
    }
  }

  async submitReceive(): Promise<void> {
    const receiveButtons = this.page.getByRole("button", { name: /^Receive$/ });
    const count = await receiveButtons.count();

    for (let i = 0; i < count; i += 1) {
      const button = receiveButtons.nth(i);
      if (await button.isEnabled().catch(() => false)) {
        await button.click({ force: true });
        return;
      }
    }

    await this.submitReceiveButton().click({ force: true });
  }

  async confirmProceed(): Promise<void> {
    await this.confirmProceedButton().click();
  }
}
