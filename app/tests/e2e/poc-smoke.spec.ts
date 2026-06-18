import { expect, test } from "@playwright/test";

test("formularz reklamacji jest pierwszym widokiem aplikacji", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /zgłoś reklamację roweru/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/marka/i)).toBeVisible();
  await expect(page.getByLabel(/model/i)).toBeVisible();
  await expect(page.getByLabel(/opis problemu/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /wyślij zgłoszenie/i }),
  ).toBeVisible();
});

test("panel obsługi jest dostępny jako osobny widok", async ({ page }) => {
  await page.goto("/service");

  await expect(
    page.getByRole("heading", { name: /panel sprzedawcy i serwisu/i }),
  ).toBeVisible();
  await expect(page.getByText(/Po zalogowaniu panel pobierze zgłoszenia/i)).toBeVisible();
});
