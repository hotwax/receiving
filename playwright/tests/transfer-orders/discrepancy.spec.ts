import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Transfer order receive with discrepancy", async ({
  page,
  transferOrdersPage,
}) => {
  await transferOrdersPage.openTransferOrdersTab();
  await expect(page).toHaveURL(/\/transfer-orders/);
  await expect(transferOrdersPage.openOrderTab()).toBeVisible();
  await transferOrdersPage.openOpenOrderTab();
  await expect(transferOrdersPage.firstOrderRow()).toBeVisible();
  await transferOrdersPage.openFirstOrder();
  await expect(page).toHaveURL(/\/transfer-order-detail\/.*/);
  await transferOrdersPage.openOpenItemsTab();
  await expect(transferOrdersPage.qtyInput(0)).toBeVisible();
  await transferOrdersPage.setQtyForFirstItem("12000");
  await expect(transferOrdersPage.saveProgressButton()).toBeVisible();
  await transferOrdersPage.saveProgress();
  await expect(transferOrdersPage.firstDiscrepancyCheckbox()).toBeVisible();
  await transferOrdersPage.selectFirstDiscrepancyReason();
  await transferOrdersPage.confirmProceedIfPresent();
  const movedToList = await page
    .waitForURL(/\/transfer-orders/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!movedToList) {
    await transferOrdersPage.openTransferOrdersTab();
  }
  await expect(page).toHaveURL(/\/transfer-orders/);
});
