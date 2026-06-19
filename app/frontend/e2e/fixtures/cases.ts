import path from "node:path";

const fixtureDir = path.join(__dirname, "images");

export const imageFixtures = {
  defectVisible: path.join(fixtureDir, "complaint-visible-defect.png"),
  signsOfUse: path.join(fixtureDir, "return-signs-of-use.png"),
  unclear: path.join(fixtureDir, "unclear-equipment.png")
} as const;

export const cases = {
  complaintApproved: {
    requestType: "Reklamacja",
    category: "laptop",
    equipmentName: "Laptop Lenovo ThinkPad T14",
    purchaseDate: "2026-05-12",
    reason: "Ekran miga i widoczna jest wada matrycy po uruchomieniu.",
    imagePath: imageFixtures.defectVisible
  },
  returnRejectedSignsOfUse: {
    requestType: "Zwrot",
    category: "smartphone",
    equipmentName: "Smartfon Pixel 9",
    purchaseDate: "2026-06-10",
    reason: "Chcę zwrócić produkt.",
    imagePath: imageFixtures.signsOfUse
  },
  unclearImage: {
    requestType: "Zwrot",
    category: "monitor",
    equipmentName: "Monitor Dell 27",
    purchaseDate: "2026-06-11",
    reason: "",
    imagePath: imageFixtures.unclear
  }
} as const;
