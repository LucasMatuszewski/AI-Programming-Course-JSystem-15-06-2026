import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const validImagePath = path.join(process.cwd(), "tests", "fixtures", "images", "valid-device.png");
export const invalidImagePath = path.join(process.cwd(), "tests", "fixtures", "images", "invalid.txt");

export async function fillBaseIntakeForm(
  page: Page,
  options: {
    requestType?: "RETURN" | "COMPLAINT";
    reason?: string;
  } = {}
) {
  const requestType = options.requestType ?? "RETURN";

  await page.goto("/");
  await page.getByRole("radio", { name: requestType === "RETURN" ? "Zwrot" : "Reklamacja" }).check();
  await page.getByLabel(/Kategoria sprzętu/).selectOption("Laptop");
  await page.getByLabel(/Nazwa lub model sprzętu/).fill("Laptop testowy X1");
  await page.getByLabel(/Data zakupu/).fill("2026-06-10");

  if (requestType === "COMPLAINT") {
    await page.getByLabel(/Powód reklamacji/).fill(options.reason ?? "Ekran ma jasne plamy po kilku dniach używania.");
  } else if (options.reason) {
    await page.getByLabel(/Powód zwrotu/).fill(options.reason);
  }

  await uploadValidImage(page);
}

export async function uploadValidImage(page: Page) {
  await page.getByLabel(/Zdjęcie sprzętu/).setInputFiles(validImagePath);
  await expect(page.getByText("valid-device.png")).toBeVisible();
}

export async function submitAssessment(page: Page) {
  await page.getByRole("button", { name: /Przygotuj ocenę/ }).click();
}
