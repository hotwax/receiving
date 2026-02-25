import { test as base } from "@playwright/test";

import { getTestUser, type Credentials } from "../data/users";
import { LoginPage } from "../pages/login.page";
import { PurchaseOrdersPage } from "../pages/purchase-orders.page";
import { SettingsPage } from "../pages/settings.page";
import { TransferOrdersPage } from "../pages/transfer-orders.page";

type TestFixtures = {
  credentials: Credentials;
  loginPage: LoginPage;
  transferOrdersPage: TransferOrdersPage;
  purchaseOrdersPage: PurchaseOrdersPage;
  settingsPage: SettingsPage;
};

export const test = base.extend<TestFixtures>({
  credentials: [async ({}, use) => {
    await use(getTestUser());
  }, { scope: "worker" }],
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  transferOrdersPage: async ({ page }, use) => {
    await use(new TransferOrdersPage(page));
  },
  purchaseOrdersPage: async ({ page }, use) => {
    await use(new PurchaseOrdersPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
});

export { expect } from "@playwright/test";
