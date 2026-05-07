import { describe, expect, test } from "bun:test";
import type { ModelMessage } from "ai";
import { buildCompactMessages } from "./chat";

describe("buildCompactMessages", () => {
  test("includes existing summary before recent history", () => {
    const history: ModelMessage[] = [
      { role: "user", content: "latest user turn" },
      { role: "assistant", content: "latest assistant turn" },
    ];

    const result = buildCompactMessages({
      history,
      existingSummary: "User 123 prefers concise answers.",
    });

    expect(result).toHaveLength(4);
    expect(result[0]?.role).toBe("user");
    expect(result[0]?.content).toContain(
      "Existing conversation memory summary to preserve and update:",
    );
    expect(result[0]?.content).toContain(
      "User 123 prefers concise answers.",
    );
    expect(result[1]).toEqual(history[0]);
    expect(result[2]).toEqual(history[1]);
    expect(result[3]?.role).toBe("user");
    expect(result[3]?.content).toContain(
      "Merge any existing memory summary provided earlier into one updated summary.",
    );
  });

  test("omits summary wrapper when no existing summary is present", () => {
    const history: ModelMessage[] = [{ role: "user", content: "latest turn" }];

    const result = buildCompactMessages({ history });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(history[0]);
    expect(result[1]?.role).toBe("user");
    expect(result[1]?.content).toContain(
      "Summarize the conversation so far into compact long-term memory.",
    );
  });
});