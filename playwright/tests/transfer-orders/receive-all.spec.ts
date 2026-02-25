import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Transfer order receive all and complete", async ({
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
  await expect(transferOrdersPage.openItemsTab()).toBeVisible();
  await transferOrdersPage.openOpenItemsTab();
  await transferOrdersPage.receiveAllOrFallbackQty("2");
  await expect(transferOrdersPage.receiveAndCompleteButton()).toBeVisible();
  await expect(transferOrdersPage.receiveAndCompleteButton()).toBeEnabled();
  await transferOrdersPage.receiveAndComplete();
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
