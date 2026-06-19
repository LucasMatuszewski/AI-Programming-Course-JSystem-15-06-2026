import { expect, type Locator, type Page } from "@playwright/test";

type CaseFormData = {
  requestType: "Reklamacja" | "Zwrot";
  category: string;
  equipmentName: string;
  purchaseDate: string;
  reason?: string;
  imagePath: string;
};

export class CaseFlowPage {
  constructor(private readonly page: Page) {}

  readonly submitButton: Locator = this.page.getByRole("button", {
    name: /wyślij|zgłoś|prześlij/i
  });

  async open() {
    await this.page.goto("/");
    await expect(
      this.page.getByRole("heading", {
        name: /zgłoszenie reklamacji lub zwrotu/i
      })
    ).toBeVisible();
  }

  async submitCase(data: CaseFormData) {
    await this.page.getByText(data.requestType, { exact: true }).click();
    await this.page
      .getByLabel(/kategoria sprzętu/i)
      .selectOption(data.category);
    await this.page.getByLabel(/model lub nazwa/i).fill(data.equipmentName);
    await this.page.getByLabel(/data zakupu/i).fill(data.purchaseDate);

    if (data.reason) {
      await this.page.getByLabel(/powód|opis|uzasadnienie/i).fill(data.reason);
    }

    await this.page
      .getByLabel("Zdjęcie sprzętu")
      .setInputFiles(data.imagePath);
    await this.submitButton.click();
  }

  async uploadRetryImage(imagePath: string) {
    await this.page
      .getByLabel("Nowe zdjęcie sprzętu")
      .setInputFiles(imagePath);
    await this.page
      .getByRole("button", { name: /ponów|prześlij|wyślij/i })
      .click();
  }

  async sendChatMessage(message: string) {
    await this.page
      .getByRole("textbox", { name: /wiadomość|czat/i })
      .fill(message);
    await this.page.getByRole("button", { name: /wyślij/i }).click();
  }

  async expectChatDecision(statusText: RegExp) {
    await expect(this.page.getByRole("main")).toContainText(/dzień dobry|witaj/i);
    await expect(this.page.getByRole("main")).toContainText(statusText);
    await expect(this.page.getByRole("main")).toContainText(/uzasadnienie/i);
    await expect(this.page.getByRole("main")).toContainText(/dalsze kroki/i);
  }
}
