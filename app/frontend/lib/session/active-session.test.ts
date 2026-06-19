import {
  clearActiveSessionId,
  getActiveSessionId,
  saveActiveSessionId
} from "./active-session";

describe("aktywna sesja", () => {
  it("przywraca identyfikator sesji po odświeżeniu", () => {
    saveActiveSessionId("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    expect(getActiveSessionId()).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("czyści aktywną sesję", () => {
    saveActiveSessionId("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    clearActiveSessionId();

    expect(getActiveSessionId()).toBeNull();
  });
});
