import { expect, test } from "@playwright/test";

test("formularz reklamacji jest widoczny", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /zgłoś reklamację roweru/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/marka/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /wyślij zgłoszenie/i }),
  ).toBeVisible();
});
