import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Purchase Order quantity update and close", async ({
  page,
  purchaseOrdersPage,
}) => {
  await purchaseOrdersPage.openPurchaseOrdersTab();
  await expect(page).toHaveURL(/\/purchase-orders/);
  await expect(purchaseOrdersPage.firstOrderRow()).toBeVisible();
  await purchaseOrdersPage.openFirstOrder();
  await expect(page).toHaveURL(/\/purchase-order-detail\/.*/);
  await expect(purchaseOrdersPage.qtyInputs().first()).toBeVisible();
  await purchaseOrdersPage.fillAllQuantities("0");

  await expect(purchaseOrdersPage.submitReceiveAndCloseButton()).toBeVisible();
  await expect(purchaseOrdersPage.submitReceiveAndCloseButton()).toBeEnabled();
  await purchaseOrdersPage.submitReceiveAndCloseButton().click({ force: true });

  await expect(purchaseOrdersPage.closeItemsModal()).toBeVisible();
  await purchaseOrdersPage.clickSelectAllCloseItems();
  const closeItemsCount = await purchaseOrdersPage.closeItemsCheckboxes().count();
  if (closeItemsCount > 0) {
    expect(await purchaseOrdersPage.closeItemsCheckedCount()).toBeGreaterThan(0);
  }

  await purchaseOrdersPage.clickCloseItemsSave();
  await expect(purchaseOrdersPage.closeItemsProceedAlert()).toBeVisible();
  await expect(purchaseOrdersPage.closeItemsProceedButton()).toBeVisible();
  await purchaseOrdersPage.confirmProceedIfPresent();

  await expect(page).toHaveURL(/\/purchase-orders/);
});
