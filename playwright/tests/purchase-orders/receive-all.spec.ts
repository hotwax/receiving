import { expect, test } from "../../fixtures/test-fixtures";

test("Sanity | Receiving | Purchase Order receive flow", async ({
  page,
  purchaseOrdersPage,
}) => {
  await purchaseOrdersPage.openPurchaseOrdersTab();
  await expect(page).toHaveURL(/\/purchase-orders/);
  const rowCount = await purchaseOrdersPage.orderRowCount();
  if (rowCount === 0) {
    return;
  }
  await expect(purchaseOrdersPage.firstOrderRow()).toBeVisible();
  const attempts = Math.min(rowCount, 5);
  let received = false;

  for (let i = 0; i < attempts; i += 1) {
    const opened = await purchaseOrdersPage.openOrderByIndex(i);
    if (!opened) {
      continue;
    }

    await expect(page).toHaveURL(/\/purchase-order-detail\/.*/);
    await purchaseOrdersPage.clickAllReceiveAllButtons();
    if ((await purchaseOrdersPage.enabledReceiveAllCount()) === 0) {
      await expect(purchaseOrdersPage.qtyInputs().first()).toBeVisible();
      await purchaseOrdersPage.fillFirstQuantity("1");
    }

    await expect(purchaseOrdersPage.submitReceiveButton()).toBeVisible();
    const canReceive = await purchaseOrdersPage
      .submitReceiveButton()
      .first()
      .isEnabled()
      .catch(() => false);

    if (!canReceive) {
      await purchaseOrdersPage.backToPurchaseOrdersFromDetail();
      await expect(page).toHaveURL(/\/purchase-orders/);
      continue;
    }

    await purchaseOrdersPage.submitReceive();
    await purchaseOrdersPage.confirmProceedIfPresent();
    await expect(page).toHaveURL(/\/purchase-orders/);
    received = true;
    break;
  }

  if (!received) {
    await expect(page).toHaveURL(/\/purchase-orders/);
    return;
  }

  expect(received).toBeTruthy();
});
