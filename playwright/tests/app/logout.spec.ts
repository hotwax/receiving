import { expect, test } from "../../fixtures/test-fixtures";

test("Negative | App | Logout continues when notification token cleanup fails", async ({
  page,
  settingsPage,
}) => {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url().toLowerCase();
    const isApiCall = request.resourceType() !== "document";
    const isNotificationTokenDelete = isApiCall && request.method() === "DELETE" && url.includes("firebase/token");
    const isLogoutApiRequest = isApiCall && /(^|\/)logout([/?]|$)/.test(url);

    if (isNotificationTokenDelete) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced notification cleanup failure" }),
      });
      return;
    }

    // Mock logout to keep session valid for subsequent tests in this run.
    if (isLogoutApiRequest) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
      return;
    }

    await route.continue();
  });

  await settingsPage.openSettings();
  await settingsPage.logout();
  await settingsPage.expectRedirectAfterLogout();
  await expect(page).toHaveURL(/isLoggedOut=true/i);
});

test("Negative | App | Logout falls back when logout API fails", async ({
  page,
  settingsPage,
}) => {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url().toLowerCase();
    const isLogoutApiRequest =
      request.resourceType() !== "document" &&
      /(^|\/)logout([/?]|$)/.test(url);

    if (isLogoutApiRequest) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced logout failure" }),
      });
      return;
    }

    await route.continue();
  });

  await settingsPage.openSettings();
  await settingsPage.logout();
  await settingsPage.expectRedirectAfterLogout();
  await expect(page).toHaveURL(/isLoggedOut=true/i);
});

test("Sanity | App | Logout flow", async ({ settingsPage }) => {
  await settingsPage.openSettings();
  await settingsPage.logout();
  await settingsPage.expectRedirectAfterLogout();
});
