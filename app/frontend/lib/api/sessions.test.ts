import { createSession } from "./sessions";

describe("klient sesji", () => {
  it("wysyła multipart zgodny z ADR-001", async () => {
    const image = new File(["obraz"], "monitor.png", { type: "image/png" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: "session-1" })
    });

    await createSession(
      {
        requestType: "return",
        equipmentCategory: "monitor",
        equipmentNameOrModel: "Dell U2720Q",
        purchaseDate: "2026-06-01",
        reason: "",
        image
      },
      { fetcher: fetchMock, apiBaseUrl: "http://localhost:8080" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData)
      })
    );
    const formData = fetchMock.mock.calls[0][1].body as FormData;
    expect(formData.get("requestType")).toBe("return");
    expect(formData.get("equipmentCategory")).toBe("monitor");
    expect(formData.get("equipmentNameOrModel")).toBe("Dell U2720Q");
    expect(formData.get("purchaseDate")).toBe("2026-06-01");
    expect(formData.get("reason")).toBe("");
    expect(formData.get("image")).toBe(image);
  });
});
