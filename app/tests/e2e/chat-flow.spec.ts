import { expect, test } from "@playwright/test";

import { expectDecisionCard, expectPolishSignal } from "./support/assertions";
import { fillBaseIntakeForm, submitAssessment } from "./support/intake-form";

test.describe("Rozmowa po decyzji", () => {
  test("wysyła pytanie uzupełniające i pokazuje odpowiedź asystenta", async ({ page }) => {
    await fillBaseIntakeForm(page, { requestType: "RETURN" });
    await submitAssessment(page);
    await expectDecisionCard(page);

    await page.getByRole("textbox", { name: "Wiadomość" }).fill("Co powinienem przygotować przed wysyłką?");
    await page.getByRole("button", { name: "Wyślij" }).click();

    await expect(page.getByTestId("user-message").last()).toContainText("Co powinienem przygotować");
    const assistantMessage = page.getByTestId("assistant-message").last();
    await expect(assistantMessage).toBeVisible({ timeout: 120_000 });
    await expectPolishSignal(assistantMessage);
  });

  test("nowe zgłoszenie czyści poprzedni kontekst", async ({ page }) => {
    await fillBaseIntakeForm(page, { requestType: "RETURN" });
    await submitAssessment(page);
    await expectDecisionCard(page);

    await page.getByRole("button", { name: "Nowe zgłoszenie" }).click();

    await expect(page.getByText("Przygotuj zgłoszenie")).toBeVisible();
    await expect(page.getByLabel(/Nazwa lub model sprzętu/)).toHaveValue("");
    await expect(page.getByTestId("decision-card")).toHaveCount(0);
  });
});
