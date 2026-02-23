import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Transfer order receive all and complete", async ({
  transferOrdersPage,
}) => {
  await transferOrdersPage.openTransferOrdersTab();
  await expect(transferOrdersPage.openOrderTab()).toBeVisible();
  await transferOrdersPage.openOpenOrderTab();
  await expect(transferOrdersPage.firstOrderRow()).toBeVisible();
  await transferOrdersPage.openFirstOrder();
  await expect(transferOrdersPage.openItemsTab()).toBeVisible();
  await transferOrdersPage.openOpenItemsTab();
  await transferOrdersPage.receiveAllOrFallbackQty("2");
  await expect(transferOrdersPage.receiveAndCompleteButton()).toBeVisible();
  await expect(transferOrdersPage.receiveAndCompleteButton()).toBeEnabled();
  await transferOrdersPage.receiveAndComplete();
});
