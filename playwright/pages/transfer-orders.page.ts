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
    return this.page
      .getByRole("button", { name: /^Open$/i })
      .or(this.page.locator("ion-segment-button", { hasText: "Open" }));
  }

  firstOrderRow(): Locator {
    return this.page
      .locator("main ion-item[button]")
      .or(this.page.getByRole("button"))
      .first();
  }

  openItemsTab(): Locator {
    return this.page
      .getByRole("button", { name: /^Open$/i })
      .or(this.page.locator('ion-segment-button[content-id="open"]'));
  }

  saveProgressButton(): Locator {
    return this.page.getByRole("button", { name: /Save Progress/i });
  }

  confirmOkButton(): Locator {
    return this.page.getByRole("button", { name: "Ok" });
  }

  confirmProceedButton(): Locator {
    return this.page.getByRole("button", { name: /Proceed|Confirm|Save/i });
  }

  receiveModalSaveButton(): Locator {
    return this.page
      .getByTestId("transfer-order-receive-modal-save-btn")
      .or(this.page.getByRole("button", { name: /Save|Proceed|Receive and complete/i }));
  }

  discrepancyCheckboxes(): Locator {
    return this.page.locator('[data-testid^="transfer-order-receive-modal-discrepancy-checkbox-"]');
  }

  qtyInput(index: number): Locator {
    return this.page
      .getByLabel(/^Qty$/i)
      .nth(index)
      .or(this.page.locator('ion-input input[type="number"]').nth(index));
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
    const tab = this.openItemsTab().first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tab.click();
    }
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

  async confirmProceedIfPresent(timeout = 5000): Promise<void> {
    const modalSave = this.receiveModalSaveButton().first();
    if (await modalSave.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.selectAllDiscrepancyItemsIfPresent();
      await modalSave.click({ force: true }).catch(() => {});
    }

    const alert = this.page.getByRole("alertdialog").last();
    const alertAction = alert.getByRole("button", {
      name: /Proceed|Confirm|Save/i,
    }).first();

    if (await alertAction.isVisible({ timeout }).catch(() => false)) {
      await alertAction.click({ force: true }).catch(() => {});
      return;
    }

    const button = this.page
      .locator("ion-alert button, .alert-button")
      .filter({ hasText: /Proceed|Confirm|Save/i })
      .first();
    if (await button.isVisible({ timeout }).catch(() => false)) {
      await button.click({ force: true }).catch(() => {});
      return;
    }

    const fallback = this.confirmProceedButton().first();
    if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fallback.click({ force: true }).catch(() => {});
    }
  }

  async setQtyForItem(index: number, quantity: string): Promise<void> {
    await this.qtyInput(index).fill(quantity);
  }

  async qtyInputCount(): Promise<number> {
    const labelCount = await this.page.getByLabel(/^Qty$/i).count();
    if (labelCount > 0) return labelCount;
    return this.page.locator('ion-input input[type="number"]').count();
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

  async selectAllDiscrepancyItemsIfPresent(): Promise<void> {
    const checkboxes = this.discrepancyCheckboxes();
    const count = await checkboxes.count();
    for (let i = 0; i < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      const isChecked =
        (await checkbox.getAttribute("aria-checked").catch(() => null)) === "true" ||
        ((await checkbox.getAttribute("class").catch(() => "")) ?? "").includes("checkbox-checked");
      if (!isChecked) {
        await checkbox.click({ force: true });
      }
    }
  }

  private async canClickButton(button: Locator): Promise<boolean> {
    if ((await button.count()) === 0) {
      return false;
    }

    return await button.isEnabled();
  }
}
