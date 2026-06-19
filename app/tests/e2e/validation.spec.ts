import { expect, test } from "@playwright/test";

import { invalidImagePath, uploadValidImage } from "./support/intake-form";

test.describe("Walidacja formularza zgłoszenia", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("wymaga powodu reklamacji", async ({ page }) => {
    await page.getByRole("radio", { name: "Reklamacja" }).check();
    await page.getByLabel(/Kategoria sprzętu/).selectOption("Laptop");
    await page.getByLabel(/Nazwa lub model sprzętu/).fill("Laptop testowy X1");
    await page.getByLabel(/Data zakupu/).fill("2026-06-10");
    await uploadValidImage(page);

    const reason = page.getByLabel(/Powód reklamacji/);
    await reason.focus();
    await page.getByLabel(/Nazwa lub model sprzętu/).focus();

    await expect(page.getByText("Opisz powód reklamacji.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Przygotuj ocenę/ })).toBeDisabled();
  });

  test("odrzuca datę zakupu z przyszłości", async ({ page }) => {
    await page.getByRole("radio", { name: "Zwrot" }).check();
    await page.getByLabel(/Kategoria sprzętu/).selectOption("Laptop");
    await page.getByLabel(/Nazwa lub model sprzętu/).fill("Laptop testowy X1");
    await page.getByLabel(/Data zakupu/).fill("2099-01-01");
    await page.getByLabel(/Data zakupu/).blur();
    await uploadValidImage(page);

    await expect(page.getByText("Data zakupu nie może być z przyszłości.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Przygotuj ocenę/ })).toBeDisabled();
  });

  test("odrzuca nieobsługiwany format obrazu", async ({ page }) => {
    await page.getByRole("radio", { name: "Zwrot" }).check();
    await page.getByLabel(/Kategoria sprzętu/).selectOption("Laptop");
    await page.getByLabel(/Nazwa lub model sprzętu/).fill("Laptop testowy X1");
    await page.getByLabel(/Data zakupu/).fill("2026-06-10");
    await page.getByLabel(/Zdjęcie sprzętu/).setInputFiles(invalidImagePath);

    await expect(page.getByText("Zdjęcie musi być w formacie JPEG, PNG albo WebP.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Przygotuj ocenę/ })).toBeDisabled();
  });

  test("blokuje wysłanie do czasu uzupełnienia wymaganych pól", async ({ page }) => {
    const submit = page.getByRole("button", { name: /Przygotuj ocenę/ });

    await expect(submit).toBeDisabled();
    await page.getByRole("radio", { name: "Zwrot" }).check();
    await page.getByLabel(/Kategoria sprzętu/).selectOption("Laptop");
    await page.getByLabel(/Nazwa lub model sprzętu/).fill("Laptop testowy X1");
    await page.getByLabel(/Data zakupu/).fill("2026-06-10");
    await uploadValidImage(page);

    await expect(submit).toBeEnabled();
  });
});
