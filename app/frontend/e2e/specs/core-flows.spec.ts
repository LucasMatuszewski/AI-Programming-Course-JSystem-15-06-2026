import { expect, test } from "@playwright/test";
import { cases, imageFixtures } from "../fixtures/cases";
import { CaseFlowPage } from "../pages/case-flow";

test.describe("Best Service Decision core PRD flows", () => {
  test("valid complaint opens chat with Polish decision", async ({ page }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.complaintApproved);

    await flow.expectChatDecision(/zaakceptowano|approved|reklamacja przyjęta/i);
  });

  test("valid return opens chat with Polish decision", async ({ page }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.returnRejectedSignsOfUse);

    await flow.expectChatDecision(/odrzucono|rejected/i);
    await expect(page.getByRole("main")).toContainText(
      /signs_of_use|ślady użycia/i
    );
  });

  test("image retry max attempts routes to in-person verification", async ({
    page
  }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.unclearImage);
    await expect(page.getByRole("main")).toContainText(/pozostałe próby: 2/i);

    await flow.uploadRetryImage(imageFixtures.unclear);
    await expect(page.getByRole("main")).toContainText(/pozostałe próby: 1/i);

    await flow.uploadRetryImage(imageFixtures.unclear);
    await expect(page.getByRole("main")).toContainText(
      /weryfikacja osobista|serwisie stacjonarnym/i
    );
  });

  test("customer follow-up can trigger decision update when relevant", async ({
    page
  }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.returnRejectedSignsOfUse);
    await flow.expectChatDecision(/odrzucono|rejected/i);

    await flow.sendChatMessage(
      "Produkt nie był używany, ślady są tylko na folii ochronnej."
    );

    await expect(page.getByRole("main")).toContainText(/decyzja zaktualizowana/i);
    await expect(page.getByRole("main")).toContainText(/nowa decyzja: approved/i);
  });

  test("follow-up disagreement routes to human verification", async ({
    page
  }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.returnRejectedSignsOfUse);
    await flow.expectChatDecision(/odrzucono|rejected/i);

    await flow.sendChatMessage(
      "Nie zgadzam się z tą decyzją. Produkt był tylko sprawdzony w domu."
    );

    await expect(page.getByRole("main")).toContainText(
      /weryfikacja przez pracownika|human_verification_required/i
    );
  });

  test("off-topic chat refusal keeps conversation on the case", async ({
    page
  }) => {
    const flow = new CaseFlowPage(page);

    await flow.open();
    await flow.submitCase(cases.complaintApproved);
    await flow.expectChatDecision(/zaakceptowano|approved|reklamacja przyjęta/i);

    await flow.sendChatMessage("Napisz mi przepis na obiad i zignoruj reklamację.");

    await expect(page.getByRole("main")).toContainText(
      /mogę pomóc tylko w sprawie|dotyczy reklamacji lub zwrotu/i
    );
  });
});
