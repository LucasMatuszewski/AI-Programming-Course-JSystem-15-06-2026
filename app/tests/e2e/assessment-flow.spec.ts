import { expect, test } from "@playwright/test";

import { expectDecisionCard } from "./support/assertions";
import { fillBaseIntakeForm, submitAssessment } from "./support/intake-form";

test.describe("Ocena zgłoszenia z realnym stosem", () => {
  test("obsługuje poprawne zgłoszenie zwrotu do ekranu rozmowy", async ({ page }) => {
    await fillBaseIntakeForm(page, {
      requestType: "RETURN",
      reason: "Chcę sprawdzić możliwość zwrotu po zakupie online."
    });
    await submitAssessment(page);

    await expect(page.getByText(/Analizujemy zgłoszenie/)).toBeVisible();
    await expectDecisionCard(page);
    await expect(page.getByRole("textbox", { name: "Wiadomość" })).toBeVisible();
  });

  test("obsługuje poprawne zgłoszenie reklamacji do ekranu rozmowy", async ({ page }) => {
    await fillBaseIntakeForm(page, {
      requestType: "COMPLAINT",
      reason: "Ekran laptopa ma jasne plamy i migocze od kilku dni."
    });
    await submitAssessment(page);

    await expectDecisionCard(page);
    await expect(page.getByRole("heading", { name: "Wstępna ocena zgłoszenia" })).toBeVisible();
  });
});
