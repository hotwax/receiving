import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Transfer order receive with discrepancy", async ({
  transferOrdersPage,
}) => {
  await transferOrdersPage.openTransferOrdersTab();
  await expect(transferOrdersPage.openOrderTab()).toBeVisible();
  await transferOrdersPage.openOpenOrderTab();
  await expect(transferOrdersPage.firstOrderRow()).toBeVisible();
  await transferOrdersPage.openFirstOrder();
  await expect(transferOrdersPage.openItemsTab()).toBeVisible();
  await transferOrdersPage.openOpenItemsTab();
  await expect(transferOrdersPage.qtyInput(0)).toBeVisible();
  await transferOrdersPage.setQtyForFirstItem("12000");
  await expect(transferOrdersPage.saveProgressButton()).toBeVisible();
  await transferOrdersPage.saveProgress();
  await expect(transferOrdersPage.firstDiscrepancyCheckbox()).toBeVisible();
  await transferOrdersPage.selectFirstDiscrepancyReason();
  await expect(transferOrdersPage.confirmProceedButton()).toBeVisible();
  await transferOrdersPage.confirmProceed();
});
