import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type LogLevel = "error" | "warn" | "info" | "debug";

export type LogFields = Record<string, unknown> & { error?: unknown };

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
} & Record<string, unknown>;

export type LogRecord = {
  time: string;
  level: LogLevel;
  msg: string;
  error?: SerializedError;
} & Record<string, unknown>;

export type LogSink = (record: LogRecord) => void;

export type Logger = {
  error: (msg: string, fields?: LogFields) => void;
  warn: (msg: string, fields?: LogFields) => void;
  info: (msg: string, fields?: LogFields) => void;
  debug: (msg: string, fields?: LogFields) => void;
};

export type CreateLoggerOptions = {
  level?: LogLevel;
  sinks?: LogSink[];
  // Minimum contiguous base64 run length to redact. Set to 0 to disable.
  redactBase64MinLength?: number;
};

// Default threshold: long enough that stack traces / paths / prose never trip
// it, short enough that any real image/file payload is caught.
export const DEFAULT_BASE64_MIN_LENGTH = 256;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Reserved keys that the record owns; never let context fields overwrite them.
const RESERVED_FIELDS = new Set(["time", "level", "msg", "error"]);

export const serializeError = (input: unknown): SerializedError | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (!(input instanceof Error)) {
    return { name: "NonError", message: String(input) };
  }

  const extras: Record<string, unknown> = {};
  const source = input as unknown as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    if (key === "name" || key === "message" || key === "stack" || key === "cause") {
      continue;
    }
    extras[key] = source[key];
  }

  return {
    name: input.name,
    message: input.message,
    stack: input.stack,
    ...extras,
    ...(input.cause !== undefined ? { cause: serializeError(input.cause) } : {})
  };
};

/**
 * Recursively replace long base64 runs (image/file payloads) inside any
 * string, array or object with a compact placeholder that keeps the length
 * plus head/tail so you can still confirm it was real base64 data.
 */
export const redactBase64 = (
  value: unknown,
  minLength: number = DEFAULT_BASE64_MIN_LENGTH
): unknown => {
  if (minLength <= 0) {
    return value;
  }
  return redactValue(value, minLength, new WeakSet());
};

const redactValue = (value: unknown, minLength: number, seen: WeakSet<object>): unknown => {
  if (typeof value === "string") {
    return redactBase64InString(value, minLength);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, minLength, seen));
  }

  if (value !== null && typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = redactValue(item, minLength, seen);
    }
    return result;
  }

  return value;
};

const redactBase64InString = (input: string, minLength: number): string => {
  const pattern = new RegExp(`[A-Za-z0-9+/]{${minLength},}={0,2}`, "g");

  return input.replace(pattern, (match) => {
    const head = match.slice(0, 8);
    const tail = match.slice(-8);
    return `[base64 omitted len=${match.length} ${head}…${tail}]`;
  });
};

export const createLogger = ({
  level = "info",
  sinks = [],
  redactBase64MinLength = DEFAULT_BASE64_MIN_LENGTH
}: CreateLoggerOptions = {}): Logger => {
  const threshold = LEVEL_WEIGHT[level];

  const emit = (recordLevel: LogLevel, msg: string, fields: LogFields = {}) => {
    if (LEVEL_WEIGHT[recordLevel] > threshold) {
      return;
    }

    const { error, ...context } = fields;
    const record: LogRecord = {
      time: new Date().toISOString(),
      level: recordLevel,
      msg
    };

    for (const [key, value] of Object.entries(context)) {
      if (!RESERVED_FIELDS.has(key)) {
        record[key] = value;
      }
    }

    if (error !== undefined) {
      record.error = serializeError(error);
    }

    // Strip bulky base64 payloads (images, files) before anything is written,
    // so every sink benefits and logs stay readable.
    const safeRecord = redactBase64(record, redactBase64MinLength) as LogRecord;

    for (const sink of sinks) {
      sink(safeRecord);
    }
  };

  return {
    error: (msg, fields) => emit("error", msg, fields),
    warn: (msg, fields) => emit("warn", msg, fields),
    info: (msg, fields) => emit("info", msg, fields),
    debug: (msg, fields) => emit("debug", msg, fields)
  };
};

// ---------------------------------------------------------------------------
// Default sinks + singleton wiring
// ---------------------------------------------------------------------------

export const consoleSink: LogSink = (record) => {
  const line = JSON.stringify(record);
  if (record.level === "error" || record.level === "warn") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
};

export const createFileSink = (directory: string): LogSink => {
  let ensured = false;

  const ensureDir = async () => {
    if (!ensured) {
      await mkdir(directory, { recursive: true });
      ensured = true;
    }
  };

  return (record) => {
    const date = record.time.slice(0, 10); // YYYY-MM-DD
    const file = path.join(directory, `app-${date}.log`);

    // Fire-and-forget: logging must never block or crash the request path.
    void ensureDir()
      .then(() => appendFile(file, `${JSON.stringify(record)}\n`))
      .catch((cause) => {
        process.stderr.write(
          `${JSON.stringify({
            time: new Date().toISOString(),
            level: "error",
            msg: "logger.file_sink_failed",
            error: serializeError(cause)
          })}\n`
        );
      });
  };
};

const resolveDefaultLevel = (env: NodeJS.ProcessEnv): LogLevel => {
  const configured = env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && configured in LEVEL_WEIGHT) {
    return configured as LogLevel;
  }
  return env.NODE_ENV === "production" ? "info" : "debug";
};

const resolveDefaultSinks = (env: NodeJS.ProcessEnv): LogSink[] => {
  const isProduction = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test" || Boolean(env.VITEST);

  // Keep test output pristine: the singleton stays silent under the test runner.
  // Unit tests exercise createLogger directly with their own injected sinks.
  if (isTest) {
    return [];
  }

  const sinks: LogSink[] = [consoleSink];

  // File logging is dev-only by default; opt in/out explicitly via LOG_TO_FILE.
  const fileEnabledByDefault = !isProduction && !isTest;
  const fileToggle = env.LOG_TO_FILE?.trim().toLowerCase();
  const fileEnabled = fileToggle ? fileToggle === "true" || fileToggle === "1" : fileEnabledByDefault;

  if (fileEnabled) {
    sinks.push(createFileSink(path.join(process.cwd(), "logs")));
  }

  return sinks;
};

export const logger = createLogger({
  level: resolveDefaultLevel(process.env),
  sinks: resolveDefaultSinks(process.env)
});
