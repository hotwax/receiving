import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";
import dotenv from "dotenv";

import { getTestUser } from "../data/users";
import { LoginPage } from "../pages/login.page";

dotenv.config();

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const { username, password } = getTestUser();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const loginPage = new LoginPage(page);
  await loginPage.login(username, password);
  await page.context().storageState({ path: authFile });
});
