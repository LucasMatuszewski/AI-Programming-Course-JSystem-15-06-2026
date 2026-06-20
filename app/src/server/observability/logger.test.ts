import { describe, expect, it } from "vitest";

import { createLogger, serializeError, type LogRecord } from "./logger";

const memorySink = () => {
  const records: LogRecord[] = [];

  return {
    records,
    sink: (record: LogRecord) => {
      records.push(record);
    }
  };
};

describe("createLogger", () => {
  it("emits records at or above the configured level", () => {
    const { records, sink } = memorySink();
    const logger = createLogger({ level: "info", sinks: [sink] });

    logger.debug("suppressed");
    logger.info("kept-info");
    logger.warn("kept-warn");
    logger.error("kept-error");

    expect(records.map((record) => record.msg)).toEqual([
      "kept-info",
      "kept-warn",
      "kept-error"
    ]);
  });

  it("attaches structured context fields to the record", () => {
    const { records, sink } = memorySink();
    const logger = createLogger({ level: "debug", sinks: [sink] });

    logger.info("assess.start", { operation: "imageAnalysis", caseId: "abc" });

    expect(records[0]).toMatchObject({
      level: "info",
      msg: "assess.start",
      operation: "imageAnalysis",
      caseId: "abc"
    });
    expect(typeof records[0].time).toBe("string");
  });

  it("serializes an error together with its cause chain", () => {
    const root = new Error("HTTP 401 Unauthorized");
    const wrapped = new Error("provider failed", { cause: root });

    const { records, sink } = memorySink();
    const logger = createLogger({ level: "debug", sinks: [sink] });

    logger.error("ai.failed", { error: wrapped });

    const serialized = records[0].error as ReturnType<typeof serializeError>;
    expect(serialized?.message).toBe("provider failed");
    expect(serialized?.cause).toMatchObject({ message: "HTTP 401 Unauthorized" });
  });
});

describe("serializeError", () => {
  it("captures custom fields from AIOrchestrationError-like errors", () => {
    class AppError extends Error {
      code = "ai_generation_failed";
      kind = "AI_PROVIDER";
      retryable = true;
    }

    const serialized = serializeError(new AppError("boom"));

    expect(serialized).toMatchObject({
      name: "Error",
      message: "boom",
      code: "ai_generation_failed",
      kind: "AI_PROVIDER",
      retryable: true
    });
    expect(typeof serialized?.stack).toBe("string");
  });

  it("returns undefined for nullish input", () => {
    expect(serializeError(undefined)).toBeUndefined();
    expect(serializeError(null)).toBeUndefined();
  });
});
