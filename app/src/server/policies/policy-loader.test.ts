import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

  it("fails closed when the selected policy file is missing", async () => {
    const policyRootPath = await mkdtemp(join(tmpdir(), "policy-loader-"));

    try {
      await writeFile(join(policyRootPath, "polityka-reklamacji.md"), "REKLAMACJA", "utf8");

      await expect(
        loadPolicyForRequestType("RETURN", { policyRootPath })
      ).rejects.toThrow("Brak wymaganej polityki dla typu zgłoszenia RETURN.");
    } finally {
      await rm(policyRootPath, { force: true, recursive: true });
    }
  });
});
