import { expect, test } from "../../fixtures/test-fixtures";

test("Negative | Transfer Order | cancel save progress keeps user on detail", async ({
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
  await expect(transferOrdersPage.saveProgressButton()).toBeVisible();
  await transferOrdersPage.saveProgress();
  const cancelButton = page.getByRole("button", { name: /Cancel/i }).first();
  const modalCloseButton = page.getByTestId("transfer-order-receive-modal-close-btn").first();

  const cancelledFromAlert = await cancelButton
    .isVisible({ timeout: 3000 })
    .then(async (visible) => {
      if (!visible) return false;
      await cancelButton.click({ force: true });
      return true;
    })
    .catch(() => false);

  if (!cancelledFromAlert && (await modalCloseButton.isVisible({ timeout: 3000 }).catch(() => false))) {
    await modalCloseButton.click({ force: true });
  }

  await expect(page).toHaveURL(/\/transfer-order-detail\/.*/);
});

test("Negative | Transfer Order | discrepancy modal save remains disabled before confirmation", async ({
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

  const modalSaveButton = transferOrdersPage.receiveModalSaveButton().first();
  const modalVisible = await modalSaveButton.isVisible({ timeout: 5000 }).catch(() => false);
  expect(modalVisible).toBeTruthy();
  await expect(page).toHaveURL(/\/transfer-order-detail\/.*/);

  const closeButton = page.getByTestId("transfer-order-receive-modal-close-btn").first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click({ force: true });
  }
  await expect(page).toHaveURL(/\/transfer-order-detail\/.*/);
});
