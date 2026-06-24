import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadPolicyForRequestType } from "./policy-loader";

describe("loadPolicyForRequestType", () => {
  it("loads only the return policy for return requests", async () => {
    const policy = await loadPolicyForRequestType("RETURN");

    expect(policy.requestType).toBe("RETURN");
    expect(policy.content).toContain("ZWROT");
    expect(policy.content).toContain("14 dni");
    expect(policy.content).not.toContain("REKLAMACJA");
    expect(policy.content).not.toContain("2 lat");
  });

  it("loads only the complaint policy for complaint requests", async () => {
    const policy = await loadPolicyForRequestType("COMPLAINT");

    expect(policy.requestType).toBe("COMPLAINT");
    expect(policy.content).toContain("REKLAMACJA");
    expect(policy.content).toContain("2 lat");
    expect(policy.content).not.toContain("ZWROT");
    expect(policy.content).not.toContain("14 dni kalendarzowych");
  });

  it("fails closed when the selected policy content is missing", async () => {
    await expect(
      loadPolicyForRequestType("RETURN", {
        policyContentByRequestType: {
          COMPLAINT: "REKLAMACJA"
        }
      })
    ).rejects.toThrow("Brak wymaganej polityki dla typu zgłoszenia RETURN.");
  });
});
