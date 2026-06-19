import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RequestType } from "../../shared/contracts";

const policyFileByRequestType: Record<RequestType, string> = {
  RETURN: "polityka-zwrotow.md",
  COMPLAINT: "polityka-reklamacji.md"
};

const defaultPolicyRootPath = join(/*turbopackIgnore: true*/ process.cwd(), "..", "docs", "policies");

export type LoadedPolicy = {
  requestType: RequestType;
  content: string;
  sourcePath: string;
};

export type PolicyLoaderOptions = {
  policyRootPath?: string;
};

export class PolicyLoadError extends Error {
  readonly requestType: RequestType;

  constructor(requestType: RequestType) {
    super(`Brak wymaganej polityki dla typu zgłoszenia ${requestType}.`);
    this.name = "PolicyLoadError";
    this.requestType = requestType;
  }
}

export const loadPolicyForRequestType = async (
  requestType: RequestType,
  options: PolicyLoaderOptions = {}
): Promise<LoadedPolicy> => {
  const policyRootPath = options.policyRootPath ?? defaultPolicyRootPath;
  const sourcePath = resolve(policyRootPath, policyFileByRequestType[requestType]);

  try {
    const content = await readFile(sourcePath, "utf8");
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      throw new PolicyLoadError(requestType);
    }

    return {
      requestType,
      content: trimmedContent,
      sourcePath
    };
  } catch (error) {
    if (error instanceof PolicyLoadError) {
      throw error;
    }

    throw new PolicyLoadError(requestType);
  }
};
