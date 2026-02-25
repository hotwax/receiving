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
      .or(this.page.locator("main main > button, main ion-item[button]"))
      .or(this.page.getByRole("button", { name: /Created|Approved|Completed/i }))
      .first();
  }

  orderRows(): Locator {
    return this.page
      .getByTestId(/purchase-order-list-item-row-.+/)
      .or(this.page.locator("main main > button, main ion-item[button]"))
      .or(this.page.getByRole("button", { name: /Created|Approved|Completed/i }));
  }

  detailBackButton(): Locator {
    return this.page.getByTestId("purchase-order-detail-page-back-btn");
  }

  receiveAllButtons(): Locator {
    return this.page.getByRole("button", { name: "Receive All" });
  }

  submitReceiveButton(): Locator {
    return this.page
      .getByTestId("purchase-order-detail-page-receive-btn")
      .or(this.page.getByRole("button", { name: /^Receive$/ }));
  }

  submitReceiveAndCloseButton(): Locator {
    return this.page
      .getByTestId("purchase-order-detail-page-receive-close-btn")
      .or(this.page.getByRole("button", { name: /Receive And Close/i }));
  }

  confirmProceedButton(): Locator {
    return this.page.getByRole("button", { name: /Proceed|Confirm/i });
  }

  closeItemsProceedAlert(): Locator {
    return this.page
      .locator("ion-alert")
      .filter({ hasText: /Close purchase order items|selected items won't be available/i })
      .first();
  }

  closeItemsProceedButton(): Locator {
    return this.page
      .locator("ion-alert .alert-button-role-proceed, .alert-button-role-proceed")
      .first()
      .or(
        this.page
          .locator("ion-alert button, ion-alert .alert-button, .alert-button")
          .filter({ hasText: /Proceed/i })
          .first(),
      );
  }

  closeItemsModal(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Close purchase order items|To close the purchase order, select all\./i })
      .first()
      .or(this.page.getByRole("dialog").last());
  }

  closeItemsSaveButton(): Locator {
    return this.page
      .locator('ion-fab-button[data-testid="purchase-order-close-items-save-btn"]')
      .or(this.closeItemsModal().locator("ion-fab-button").first())
      .or(this.closeItemsModal().getByRole("button").last());
  }

  closeItemsSelectAllButton(): Locator {
    return this.page
      .getByTestId("purchase-order-close-items-select-all-btn")
      .or(this.page.getByRole("button", { name: /Select all/i }).first());
  }

  closeItemsBackButton(): Locator {
    return this.page.getByTestId("purchase-order-close-items-modal-back-btn");
  }

  closeItemsCheckboxes(): Locator {
    return this.page
      .locator('[data-testid^="purchase-order-close-items-select-checkbox-"]')
      .or(this.closeItemsModal().locator('ion-checkbox[aria-label="itemStatus"], [role="checkbox"][aria-label="itemStatus"]'))
      .or(this.closeItemsModal().getByRole("checkbox", { name: /itemStatus/i }));
  }

  qtyInputs(): Locator {
    return this.page
      .getByLabel(/^Qty$/i)
      .or(this.page.locator('ion-item input.native-input[type="number"]'));
  }

  async openPurchaseOrdersTab(): Promise<void> {
    await this.page.goto("/purchase-orders");
  }

  async openFirstOrder(): Promise<void> {
    await this.firstOrderRow().click();
  }

  async openOrderByIndex(index: number): Promise<boolean> {
    const rows = this.orderRows();
    const count = await rows.count();
    if (count === 0) return false;
    const safeIndex = Math.min(Math.max(index, 0), Math.max(count - 1, 0));
    await rows.nth(safeIndex).click({ force: true });
    return await this.page
      .waitForURL(/\/purchase-order-detail\/.*/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }

  async orderRowCount(): Promise<number> {
    return this.orderRows().count();
  }

  async clickAllReceiveAllButtons(): Promise<void> {
    const count = await this.receiveAllButtons().count();

    for (let i = 0; i < count; i += 1) {
      const button = this.receiveAllButtons().nth(i);
      if (await button.isEnabled().catch(() => false)) {
        await button.click({ force: true });
      }
    }
  }

  async enabledReceiveAllCount(): Promise<number> {
    const count = await this.receiveAllButtons().count();
    let enabled = 0;
    for (let i = 0; i < count; i += 1) {
      if (await this.receiveAllButtons().nth(i).isEnabled().catch(() => false)) {
        enabled += 1;
      }
    }
    return enabled;
  }

  async fillAllQuantities(quantity: string): Promise<void> {
    const count = await this.qtyInputs().count();

    for (let i = 0; i < count; i += 1) {
      const input = this.qtyInputs().nth(i);
      await input.click();
      await input.fill(quantity);
    }
  }

  async fillFirstQuantity(quantity: string): Promise<void> {
    const input = this.qtyInputs().first();
    await input.click();
    await input.fill(quantity);
  }

  async submitReceive(): Promise<void> {
    const receiveButtons = this.submitReceiveButton();
    const count = await receiveButtons.count();

    for (let i = 0; i < count; i += 1) {
      const button = receiveButtons.nth(i);
      if (await button.isEnabled().catch(() => false)) {
        await button.click({ force: true });
        return;
      }
    }

    const receiveButton = this.submitReceiveButton().first();
    if (await receiveButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await receiveButton.click({ force: true });
    }
  }

  async submitReceiveAndClose(): Promise<void> {
    const receiveAndCloseButtons = this.page.getByRole("button", {
      name: /Receive And Close/i,
    });
    const count = await receiveAndCloseButtons.count();
    let clicked = false;

    for (let i = 0; i < count; i += 1) {
      const button = receiveAndCloseButtons.nth(i);
      if (await button.isEnabled().catch(() => false)) {
        await button.click({ force: true });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      await this.submitReceiveAndCloseButton().click({ force: true });
    }

    if (await this.closeItemsModal().isVisible({ timeout: 5000 }).catch(() => false)) {
      for (let i = 0; i < 5; i += 1) {
        await this.selectAllCloseItemsIfPresent();
        await this.clickCloseItemsSave();
        await this.confirmProceedIfPresent(5000);
        const movedToList = await this.page
          .waitForURL(/\/purchase-orders/, { timeout: 2000 })
          .then(() => true)
          .catch(() => false);
        if (movedToList) break;
        if (!(await this.closeItemsModal().isVisible({ timeout: 1000 }).catch(() => false))) {
          break;
        }
      }
    }
  }

  async confirmProceed(): Promise<void> {
    await this.confirmProceedButton().click();
  }

  async confirmProceedIfPresent(timeout = 5000): Promise<void> {
    const proceedByRoleClass = this.page
      .locator("ion-alert .alert-button-role-proceed, .alert-button-role-proceed")
      .first();
    if (await proceedByRoleClass.isVisible({ timeout: 1500 }).catch(() => false)) {
      await proceedByRoleClass.click({ force: true }).catch(() => {});
      return;
    }

    const proceedByText = this.page
      .locator("ion-alert button, ion-alert .alert-button, .alert-button")
      .filter({ hasText: /proceed/i })
      .first();
    if (await proceedByText.isVisible({ timeout: 1500 }).catch(() => false)) {
      await proceedByText.click({ force: true }).catch(() => {});
      return;
    }

    const alertButton = this.page
      .locator("ion-alert")
      .getByRole("button", { name: /Proceed|Confirm|Yes|Save/i })
      .first();
    if (await alertButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await alertButton.click({ force: true });
      return;
    }

    const ionicAlertFallback = this.page
      .locator("ion-alert button, .alert-button")
      .filter({ hasText: /Proceed|Confirm|Yes|Save/i })
      .first();
    if (await ionicAlertFallback.isVisible({ timeout: 1500 }).catch(() => false)) {
      await ionicAlertFallback.click({ force: true });
      return;
    }

    const button = this.confirmProceedButton().first();
    if (await button.isVisible({ timeout }).catch(() => false)) {
      await button.click({ force: true });
    }
  }

  async selectAllCloseItemsIfPresent(): Promise<void> {
    const checkboxes = this.closeItemsCheckboxes();
    const count = await checkboxes.count();

    for (let i = 0; i < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      const isDisabled =
        (await checkbox.getAttribute("disabled").catch(() => null)) !== null ||
        ((await checkbox.getAttribute("aria-disabled").catch(() => null)) === "true");
      const isChecked =
        (await checkbox.getAttribute("aria-checked").catch(() => null)) === "true" ||
        ((await checkbox.getAttribute("class").catch(() => "")) ?? "").includes("checkbox-checked");

      if (!isDisabled && !isChecked) {
        await checkbox.click({ force: true });
      }
    }
  }

  async clickSelectAllCloseItems(): Promise<void> {
    const selectAllButton = this.closeItemsSelectAllButton().first();
    if (await selectAllButton.isVisible({ timeout: 1200 }).catch(() => false)) {
      await selectAllButton.click({ force: true }).catch(() => {});
    }
    await this.selectAllCloseItemsIfPresent();
  }

  async closeItemsCheckedCount(): Promise<number> {
    const checkboxes = this.closeItemsCheckboxes();
    const count = await checkboxes.count();
    let checked = 0;

    for (let i = 0; i < count; i += 1) {
      const checkbox = checkboxes.nth(i);
      const isChecked =
        (await checkbox.getAttribute("aria-checked").catch(() => null)) === "true" ||
        ((await checkbox.getAttribute("class").catch(() => "")) ?? "").includes("checkbox-checked");
      if (isChecked) checked += 1;
    }

    return checked;
  }

  async clickCloseItemsSave(): Promise<void> {
    const modal = this.closeItemsModal();
    const dialog = this.page.getByRole("dialog").last();
    const dialogLastButton = dialog.getByRole("button").last();
    if (await dialogLastButton.isVisible({ timeout: 1200 }).catch(() => false)) {
      await dialogLastButton.click({ force: true }).catch(() => {});
      if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
    }

    const modalAnyButton = this.page.locator("ion-modal button, ion-modal ion-fab-button").last();
    if (await modalAnyButton.isVisible({ timeout: 1200 }).catch(() => false)) {
      await modalAnyButton.click({ force: true }).catch(() => {});
      if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
    }

    const saveByTestId = this.closeItemsSaveButton().first();
    if (await saveByTestId.isVisible({ timeout: 1200 }).catch(() => false)) {
      const isDisabled =
        (await saveByTestId.getAttribute("disabled").catch(() => null)) !== null ||
        ((await saveByTestId.getAttribute("aria-disabled").catch(() => null)) === "true");
      if (!isDisabled) {
        await saveByTestId.click({ force: true }).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
        await saveByTestId.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
      }
    }

    const fabSaveHost = modal.locator("ion-fab-button").first();
    if (await fabSaveHost.isVisible({ timeout: 1200 }).catch(() => false)) {
      const fabDisabled =
        (await fabSaveHost.getAttribute("disabled").catch(() => null)) !== null ||
        ((await fabSaveHost.getAttribute("aria-disabled").catch(() => null)) === "true");
      if (!fabDisabled) {
        await fabSaveHost.click({ force: true }).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
        await fabSaveHost.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
      }
    }

    const saveHost = this.closeItemsSaveButton().first();

    if (await saveHost.isVisible({ timeout: 1200 }).catch(() => false)) {
      const hostDisabled =
        (await saveHost.getAttribute("disabled").catch(() => null)) !== null ||
        ((await saveHost.getAttribute("aria-disabled").catch(() => null)) === "true");
      if (!hostDisabled) {
        await saveHost.click({ force: true }).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
      }
    }

    const saveByRole = modal.getByRole("button", { name: /save/i }).first();
    if (await saveByRole.isVisible({ timeout: 1200 }).catch(() => false)) {
      await saveByRole.click({ force: true }).catch(() => {});
      if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
    }

    const saveNativeButton = this.closeItemsSaveButton().locator("button.button-native").first();
    if (await saveNativeButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      const disabled =
        (await saveNativeButton.getAttribute("disabled").catch(() => null)) !== null ||
        ((await saveNativeButton.getAttribute("aria-disabled").catch(() => null)) === "true");
      if (!disabled) {
        await saveNativeButton.click({ force: true }).catch(() => {});
        if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
      }
    }

    const modalButtonSave = modal.locator("button.button-native").last();
    if (await modalButtonSave.isVisible({ timeout: 1500 }).catch(() => false)) {
      for (let i = 0; i < 8; i += 1) {
        const disabled =
          (await modalButtonSave.getAttribute("disabled").catch(() => null)) !== null ||
          ((await modalButtonSave.getAttribute("aria-disabled").catch(() => null)) === "true");
        if (!disabled) break;
        await this.page.waitForTimeout(250);
      }
      await modalButtonSave.click({ force: true }).catch(() => {});
      if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
      await modalButtonSave.evaluate((el) => (el as HTMLButtonElement).click()).catch(() => {});
    }
  }

  async closeCloseItemsModalIfPresent(timeout = 1500): Promise<void> {
    if (await this.closeItemsModal().isVisible({ timeout }).catch(() => false)) {
      await this.closeItemsBackButton().click({ force: true }).catch(() => {});
    }
  }

  async backToPurchaseOrdersFromDetail(): Promise<void> {
    if (await this.detailBackButton().isVisible({ timeout: 1200 }).catch(() => false)) {
      await this.detailBackButton().click({ force: true });
      return;
    }
    await this.page.goto("/purchase-orders");
  }
}
