import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(username: string, password: string): Promise<void> {
    await this.page.goto("https://launchpad.hotwax.io/home");

    const receivingAppTile = this.page
      .getByRole("button", { name: /^Receiving$/i })
      .or(this.page.getByRole("link", { name: /^Receiving$/i }))
      .or(this.page.getByText(/^Receiving$/i))
      .first();
    await expect(receivingAppTile).toBeVisible();
    await receivingAppTile.click();

    const omsInput = this.page.getByRole("textbox", {
      name: /OMS|instance|environment/i,
    }).first();
    const nextButton = this.page.getByRole("button", { name: /^Next$/i });
    await expect(omsInput).toBeVisible();
    await omsInput.fill("dev-oms");
    await nextButton.click();

    await this.page.waitForURL(/launchpad\.hotwax\.io\/login/);

    const loginUsernameInput = this.page.getByRole("textbox", {
      name: /^Username$/i,
    });
    const passwordInput = this.page
      .getByRole("textbox", { name: /^Password$/i })
      .or(this.page.locator('input[type="password"]'))
      .first();
    const loginButton = this.page.getByRole("button", { name: /Login|Sign in/i });

    await expect(loginUsernameInput).toBeVisible();
    await loginUsernameInput.fill(username);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);
    await loginButton.click();

    await this.page.waitForURL(/receiving(-dev)?\.hotwax\.io\/transfer-orders/);
  }
}
