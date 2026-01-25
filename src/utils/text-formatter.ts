import md from "telegramify-markdown";

export function createFormatter() {
  return async function format(raw: string) {
    return md(raw, "escape");
  };
}
