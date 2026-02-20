import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Purchase Order quantity update and close", async ({
  purchaseOrdersPage,
}) => {
  await expect(purchaseOrdersPage.purchaseOrdersTab()).toBeVisible();
  await purchaseOrdersPage.openPurchaseOrdersTab();
  await expect(purchaseOrdersPage.firstOrderRow()).toBeVisible();
  await purchaseOrdersPage.openFirstOrder();
  await expect(purchaseOrdersPage.qtyInputs().first()).toBeVisible();
  await purchaseOrdersPage.fillAllQuantities("5");
  await expect(purchaseOrdersPage.confirmProceedButton()).toBeVisible();
  await purchaseOrdersPage.confirmProceed();
});
