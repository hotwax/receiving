import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(username: string, password: string): Promise<void> {
    await this.page.goto("/transfer-orders");

    const usernameInput = this.page.locator("ion-input input").nth(0);
    const passwordInput = this.page.locator("ion-input input").nth(1);

    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(username);
    await passwordInput.fill(password);

    await this.page.getByRole("button", { name: "Login" }).click();
    await expect(this.page.getByText("Transfer Orders")).toBeVisible();
  }
}
