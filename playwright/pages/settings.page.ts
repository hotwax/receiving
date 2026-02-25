import { expect, type Locator, type Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  logoutButton(): Locator {
    return this.page
      .getByTestId("settings-page-logout-btn")
      .or(this.page.getByRole("button", { name: /Logout/i }))
      .first();
  }

  async openSettings(): Promise<void> {
    await this.page.goto("/settings");
    await expect(this.page).toHaveURL(/\/settings/);
  }

  async logout(): Promise<void> {
    await this.logoutButton().click({ force: true });
  }

  async expectRedirectAfterLogout(): Promise<void> {
    await this.page.waitForURL(/launchpad\.hotwax\.io|\/login|isLoggedOut=true/i, {
      timeout: 30000,
    });
  }
}
