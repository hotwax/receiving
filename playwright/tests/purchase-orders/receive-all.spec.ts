import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Purchase Order receive flow", async ({
  purchaseOrdersPage,
}) => {
  await purchaseOrdersPage.openPurchaseOrdersTab();
  await expect(purchaseOrdersPage.firstOrderRow()).toBeVisible();
  await purchaseOrdersPage.openFirstOrder();
  await purchaseOrdersPage.clickAllReceiveAllButtons();
  await expect(purchaseOrdersPage.submitReceiveButton()).toBeVisible();
  await purchaseOrdersPage.submitReceive();
  await expect(purchaseOrdersPage.confirmProceedButton()).toBeVisible();
  await purchaseOrdersPage.confirmProceed();
});
