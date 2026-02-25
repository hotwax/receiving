import { expect, test } from "../../fixtures/test-fixtures";

test("Negative | Purchase Order | receive disabled when qty is zero", async ({
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
  await expect(purchaseOrdersPage.submitReceiveButton()).toBeVisible();
  await expect(purchaseOrdersPage.submitReceiveButton()).toBeDisabled();
});

test("Negative | Purchase Order | close modal save disabled without item selection", async ({
  page,
  purchaseOrdersPage,
}) => {
  await purchaseOrdersPage.openPurchaseOrdersTab();
  await expect(page).toHaveURL(/\/purchase-orders/);
  const rowCount = await purchaseOrdersPage.orderRowCount();
  if (rowCount === 0) return;
  await expect(purchaseOrdersPage.firstOrderRow()).toBeVisible();

  const attempts = Math.min(rowCount, 5);
  let modalVisible = false;

  for (let i = 0; i < attempts; i += 1) {
    const opened = await purchaseOrdersPage.openOrderByIndex(i);
    if (!opened) continue;
    await expect(page).toHaveURL(/\/purchase-order-detail\/.*/);

    const canClose = await purchaseOrdersPage
      .submitReceiveAndCloseButton()
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    if (!canClose) {
      await purchaseOrdersPage.backToPurchaseOrdersFromDetail();
      continue;
    }

    await purchaseOrdersPage.submitReceiveAndCloseButton().click({ force: true });
    modalVisible = await purchaseOrdersPage
      .closeItemsModal()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (modalVisible) break;
    await purchaseOrdersPage.backToPurchaseOrdersFromDetail();
  }

  if (!modalVisible) return;

  const checkboxes = purchaseOrdersPage.closeItemsCheckboxes();
  const total = await checkboxes.count();
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < total; i += 1) {
    const checkbox = checkboxes.nth(i);
    const isDisabled =
      (await checkbox.getAttribute("disabled").catch(() => null)) !== null ||
      ((await checkbox.getAttribute("aria-disabled").catch(() => null)) === "true");
    const isChecked =
      (await checkbox.getAttribute("aria-checked").catch(() => null)) === "true" ||
      ((await checkbox.getAttribute("class").catch(() => "")) ?? "").includes("checkbox-checked");

    if (!isDisabled && isChecked) {
      await checkbox.click({ force: true });
    }
  }

  const saveHost = purchaseOrdersPage.closeItemsSaveButton().first();
  const hostDisabled =
    (await saveHost.getAttribute("disabled").catch(() => null)) !== null ||
    ((await saveHost.getAttribute("aria-disabled").catch(() => null)) === "true");

  expect(hostDisabled).toBeTruthy();
});
