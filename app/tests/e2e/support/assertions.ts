import { expect, type Locator, type Page } from "@playwright/test";

const polishDecisionKeywords = [
  /decyzj/i,
  /ocen/i,
  /wstępn/i,
  /niewiążąc/i,
  /serwis/i,
  /reklamacj/i,
  /zwrot/i,
  /zaakcept/i,
  /odrzu/i,
  /informacj/i,
  /przygot/i,
  /zdj/i,
  /wysył|wysyl/i,
  /towar/i
];

export async function expectDecisionCard(page: Page) {
  const card = page.getByTestId("decision-card");
  const errorState = page.getByRole("alert").filter({ hasText: /Nie możemy|Brakuje zmiennych|problem techniczny/i });

  await expect(card.or(errorState).first()).toBeVisible({ timeout: 120_000 });

  if (await errorState.first().isVisible()) {
    throw new Error(`Real assessment did not reach a decision card: ${await errorState.first().innerText()}`);
  }

  await expect(card).toContainText(/Uzasadnienie/);
  await expect(card).toContainText(/Następne kroki/);
  await expect(page.getByTestId("decision-disclaimer")).toContainText(/wstępn|niewiążąc|ostateczn/i);
  await expectPolishSignal(card);
}

export async function expectPolishSignal(locator: Locator) {
  const text = (await locator.innerText()).replace(/\s+/g, " ").trim();

  expect(text.length).toBeGreaterThanOrEqual(50);
  expect(polishDecisionKeywords.some((keyword) => keyword.test(text))).toBe(true);
}
