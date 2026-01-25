export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogError = {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
};

export type LogContext = Record<string, unknown>;
export type LogFields = Record<string, unknown>;

export type LogEvent = {
  ts: string;
  level: LogLevel;
  event: string;
  ctx?: LogContext;
  fields?: LogFields;
  err?: LogError;
};

export type Logger = {
  child: (ctx: LogContext) => Logger;
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, errorOrFields?: unknown, fields?: LogFields) => void;
};

function normalizeError(error: unknown): LogError {
  if (error instanceof Error) {
    const err: LogError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    const anyErr = error as unknown as { cause?: unknown };
    if ("cause" in anyErr) {
      err.cause = anyErr.cause;
    }

    return err;
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Non-Error thrown",
    cause: error,
  };
}

function emit(
  level: LogLevel,
  event: string,
  data: Omit<LogEvent, "ts" | "level" | "event">,
) {
  const logEvent = {
    ts: new Date().toISOString(),
    event,
    ...data,
  };

  const serialized = JSON.stringify(logEvent, null, 2);

  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(serialized);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(serialized);
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized);
  }
}

export function createLogger(baseContext?: LogContext): Logger {
  const child = (ctx: LogContext) => createLogger({ ...baseContext, ...ctx });

  return {
    child,

    debug(event, fields) {
      emit("debug", event, { ctx: baseContext, fields });
    },

    info(event, fields) {
      emit("info", event, { ctx: baseContext, fields });
    },

    warn(event, fields) {
      emit("warn", event, { ctx: baseContext, fields });
    },

    error(event, errorOrFields, fields) {
      if (
        errorOrFields &&
        typeof errorOrFields === "object" &&
        !Array.isArray(errorOrFields) &&
        !(errorOrFields instanceof Error)
      ) {
        emit("error", event, {
          ctx: baseContext,
          fields: { ...(errorOrFields as LogFields), ...(fields ?? {}) },
        });
        return;
      }

      emit("error", event, {
        ctx: baseContext,
        fields,
        err:
          errorOrFields === undefined
            ? undefined
            : normalizeError(errorOrFields),
      });
    },
  };
}

export const logger = createLogger();
