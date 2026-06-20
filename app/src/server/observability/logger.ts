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
};

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

export const createLogger = ({ level = "info", sinks = [] }: CreateLoggerOptions = {}): Logger => {
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

    for (const sink of sinks) {
      sink(record);
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
