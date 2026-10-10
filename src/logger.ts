type Fields = Record<string, unknown>;

export type Logger = {
  child(context: Fields): Logger;
  info(event: string, fields?: Fields): void;
  error(event: string, error: unknown, fields?: Fields): void;
};

function serializeError(error: unknown): Fields {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause === undefined ? undefined : serializeError(error.cause),
  };
}

function write(level: "info" | "error", event: string, fields: Fields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function createLogger(context: Fields): Logger {
  return {
    child: (extra) => createLogger({ ...context, ...extra }),
    info: (event, fields) => write("info", event, { ...context, ...fields }),
    error: (event, error, fields) =>
      write("error", event, {
        ...context,
        ...fields,
        error: serializeError(error),
      }),
  };
}

export const logger = createLogger({});
