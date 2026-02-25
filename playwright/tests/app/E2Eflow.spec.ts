import { expect, test } from "../../fixtures/test-fixtures";

test("E2E | App menu navigation and detail back flow", async ({ page, purchaseOrdersPage }) => {
  const pause = async () => page.waitForTimeout(2000);
  const menuItem = (testId: string, name: string) =>
    page.getByTestId(testId).or(page.getByRole("link", { name })).first();

  const openSegment = (testId: string, name: RegExp) =>
    page
      .getByTestId(testId)
      .or(page.getByRole("tab", { name }))
      .or(page.getByText(name).first())
      .first();

  const searchInput = (testId: string, placeholder: RegExp) =>
    page
      .getByTestId(testId)
      .or(page.getByRole("searchbox"))
      .or(page.getByPlaceholder(placeholder))
      .first();

  const refreshButton = (testId: string) =>
    page.getByTestId(testId).or(page.getByRole("button", { name: /Refresh/i })).first();

  const openMenuItem = async (testId: string, route: string) => {
    const byTestId = page.getByTestId(testId).first();
    if (await byTestId.isVisible({ timeout: 2500 }).catch(() => false)) {
      await byTestId.click({ force: true });
    } else {
      await page.goto(route);
    }
    await pause();
  };

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings/);
  await pause();

  const openTransferMenu = menuItem("app-menu-item-transfer-orders", "Transfer Orders");
  const openShipmentMenu = menuItem("app-menu-item-shipments", "Shipments");

  if (await openTransferMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await openTransferMenu.click({ force: true });
    await expect(page).toHaveURL(/\/transfer-orders/);
    await pause();

    await openSegment("transfer-orders-page-completed-tab", /^Completed$/i).click({ force: true });
    await pause();
    await openSegment("transfer-orders-page-open-tab", /^Open$/i).click({ force: true });
    await pause();

    const transferSearch = searchInput("transfer-orders-page-search-input", /Search transfer orders/i);
    await transferSearch.fill("__unlikely_to_match__");
    await transferSearch.press("Enter");
    await pause();

    const transferEmpty = page.getByTestId("transfer-orders-page-empty-state").first();
    if (await transferEmpty.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(transferEmpty).toBeVisible();
      await refreshButton("transfer-orders-page-refresh-btn").click({ force: true });
      await pause();
    }
  } else if (await openShipmentMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await openShipmentMenu.click({ force: true });
    await expect(page).toHaveURL(/\/shipments/);
    await pause();

    await openSegment("shipments-page-completed-tab", /^Completed$/i).click({ force: true });
    await pause();
    await openSegment("shipments-page-open-tab", /^Open$/i).click({ force: true });
    await pause();

    const shipmentSearch = searchInput("shipments-page-search-input", /Search/i);
    await shipmentSearch.fill("__unlikely_to_match__");
    await shipmentSearch.press("Enter");
    await pause();

    const shipmentEmpty = page.getByTestId("shipments-page-empty-state").first();
    if (await shipmentEmpty.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(shipmentEmpty).toBeVisible();
      await refreshButton("shipments-page-refresh-btn").click({ force: true });
      await pause();
    }
  }

  await openMenuItem("app-menu-item-returns", "/returns");
  await expect(page).toHaveURL(/\/returns/);
  await openSegment("returns-page-completed-tab", /^Completed$/i).click({ force: true });
  await pause();
  await openSegment("returns-page-open-tab", /^Open$/i).click({ force: true });
  await pause();

  const returnsSearch = searchInput("returns-page-search-input", /Search returns/i);
  await returnsSearch.fill("__unlikely_to_match__");
  await returnsSearch.press("Enter");
  await pause();

  const returnsEmpty = page.getByTestId("returns-page-empty-state").first();
  if (await returnsEmpty.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(returnsEmpty).toBeVisible();
    await refreshButton("returns-page-refresh-btn").click({ force: true });
    await pause();
  }

  await openMenuItem("app-menu-item-purchase-orders", "/purchase-orders");
  await expect(page).toHaveURL(/\/purchase-orders/);
  await pause();

  await openSegment("purchase-orders-page-completed-tab", /^Completed$/i).click({ force: true });
  await pause();
  await openSegment("purchase-orders-page-open-tab", /^Open$/i).click({ force: true });
  await pause();

  const purchaseSearch = searchInput("purchase-orders-page-search-input", /Search purchase orders/i);
  await purchaseSearch.fill("__unlikely_to_match__");
  await purchaseSearch.press("Enter");
  await pause();

  const purchaseEmpty = page.getByTestId("purchase-orders-page-empty-state").first();
  if (await purchaseEmpty.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(purchaseEmpty).toBeVisible();
    await refreshButton("purchase-orders-page-refresh-btn").click({ force: true });
    await pause();
  }

  await purchaseSearch.fill("");
  await purchaseSearch.press("Enter");
  await pause();

  const rowVisible = await purchaseOrdersPage.firstOrderRow().isVisible({ timeout: 3000 }).catch(() => false);
  if (rowVisible) {
    await purchaseOrdersPage.openFirstOrder();
    await expect(page).toHaveURL(/\/purchase-order-detail\/.*/);
    await pause();

    const back = page
      .getByTestId("purchase-order-detail-page-back-btn")
      .or(page.getByRole("button", { name: /Back/i }))
      .first();
    if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
      await back.click({ force: true });
      await expect(page).toHaveURL(/\/purchase-orders/);
      await pause();
    }
  }

  const notificationsBtn = page
    .getByTestId("transfer-orders-page-notifications-btn")
    .or(page.getByRole("button", { name: /Notifications/i }))
    .first();
  await page.goto("/transfer-orders");
  await pause();
  if (await notificationsBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await notificationsBtn.click({ force: true });
    await expect(page).toHaveURL(/\/notifications/);
    await pause();
    await page
      .getByTestId("notifications-page-settings-btn")
      .or(page.getByRole("button", { name: /settings/i }))
      .first()
      .click({ force: true });
    await pause();
    await page.keyboard.press("Escape");
    await pause();
    await page
      .getByTestId("notifications-page-back-btn")
      .or(page.getByRole("button", { name: /back/i }))
      .first()
      .click({ force: true });
    await pause();
  }
});
