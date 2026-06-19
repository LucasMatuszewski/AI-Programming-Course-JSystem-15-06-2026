import type { RequestType } from "../../shared/contracts";
import { bundledPolicyContentByRequestType } from "./policy-content";

const policyFileByRequestType: Record<RequestType, string> = {
  RETURN: "polityka-zwrotow.md",
  COMPLAINT: "polityka-reklamacji.md"
};

export type LoadedPolicy = {
  requestType: RequestType;
  content: string;
  sourcePath: string;
};

export type PolicyLoaderOptions = {
  policyContentByRequestType?: Partial<Record<RequestType, string>>;
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
  const sourcePath = `docs/policies/${policyFileByRequestType[requestType]}`;
  const contentByRequestType = options.policyContentByRequestType ?? bundledPolicyContentByRequestType;
  const content = contentByRequestType[requestType]?.trim();

  if (!content) {
    throw new PolicyLoadError(requestType);
  }

  return {
    requestType,
    content,
    sourcePath
  };
};
