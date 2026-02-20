import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Transfer order save progress flow", async ({
  transferOrdersPage,
}) => {
  await transferOrdersPage.openTransferOrdersTab();
  await expect(transferOrdersPage.openOrderTab()).toBeVisible();
  await transferOrdersPage.openOpenOrderTab();
  await expect(transferOrdersPage.firstOrderRow()).toBeVisible();
  await transferOrdersPage.openFirstOrder();

  await expect(transferOrdersPage.saveProgressButton()).toBeVisible();
  await transferOrdersPage.saveProgress();
  await expect(transferOrdersPage.confirmOkButton()).toBeVisible();
  await transferOrdersPage.confirmOkInModal();

  await expect(transferOrdersPage.qtyInput(0)).toBeVisible();
  await transferOrdersPage.setQtyForItem(0, "1");
  await expect(transferOrdersPage.qtyInput(1)).toBeVisible();
  await transferOrdersPage.setQtyForItem(1, "1");
  await expect(transferOrdersPage.saveProgressButton()).toBeVisible();
  await transferOrdersPage.saveProgress();
  await expect(transferOrdersPage.confirmProceedButton()).toBeVisible();
  await transferOrdersPage.confirmProceed();
});
