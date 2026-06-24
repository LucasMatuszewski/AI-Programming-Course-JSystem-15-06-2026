import { describe, expect, it } from "vitest";

import { createLogger, redactBase64, serializeError, type LogRecord } from "./logger";

const base64Of = (length: number) => "A".repeat(length - 4) + "b/9=";

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

describe("redactBase64", () => {
  it("replaces a long base64 run with a placeholder that keeps head, tail and length", () => {
    const payload = base64Of(2000);

    const result = redactBase64(payload, 256) as string;

    expect(result).not.toContain(payload);
    expect(result.length).toBeLessThan(120);
    expect(result).toContain("base64");
    expect(result).toContain("len=2000");
    expect(result).toContain(payload.slice(0, 8)); // head preserved
    expect(result).toContain(payload.slice(-8)); // tail preserved
  });

  it("preserves the data URI mime prefix and only redacts the payload", () => {
    const input = `data:image/png;base64,${base64Of(1500)}`;

    const result = redactBase64(input, 256) as string;

    expect(result).toContain("data:image/png;base64,");
    expect(result).not.toContain(base64Of(1500));
    expect(result).toContain("len=1500");
  });

  it("leaves short strings and ordinary prose untouched", () => {
    expect(redactBase64("HTTP 401 Unauthorized", 256)).toBe("HTTP 401 Unauthorized");
    expect(redactBase64("imageAnalysis", 256)).toBe("imageAnalysis");
  });

  it("redacts base64 nested inside objects, arrays and error causes", () => {
    const input = {
      messages: [{ image: base64Of(1000) }],
      error: serializeError(new Error(`body ${base64Of(900)}`))
    };

    const result = redactBase64(input, 256) as typeof input;

    expect(result.messages[0].image).not.toContain(base64Of(1000));
    expect(result.messages[0].image).toContain("len=1000");
    expect((result.error?.message as string)).toContain("len=900");
  });
});

describe("createLogger base64 redaction", () => {
  it("redacts base64 in emitted records by default", () => {
    const { records, sink } = memorySink();
    const logger = createLogger({ level: "debug", sinks: [sink] });

    logger.error("ai.failed", { error: new Error(`request ${base64Of(3000)}`) });

    const serialized = records[0].error as ReturnType<typeof serializeError>;
    expect(serialized?.message).not.toContain(base64Of(3000));
    expect(serialized?.message).toContain("len=3000");
  });
});
