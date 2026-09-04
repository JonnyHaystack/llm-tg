import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ModelMessage } from "ai";

const testDir = join(import.meta.dir, "../../.test-data/chats");

// Point persistence at the test directory before importing
process.env.CHAT_DATA_DIR = testDir;

const { initPersistence, loadChatState, saveChatState } = await import(
  "./persistence"
);

function cleanup() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
}

beforeEach(() => {
  cleanup();
  initPersistence();
});

afterAll(cleanup);

describe("persistence", () => {
  test("loadChatState returns null for nonexistent chat", () => {
    const result = loadChatState("nonexistent");
    expect(result).toBeNull();
  });

  test("round-trips a simple chat state", async () => {
    const history: ModelMessage[] = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      { role: "assistant", content: [{ type: "text", text: "hi there" }] },
    ];

    saveChatState("chat-1", {
      history,
      modelId: "test-model",
      summary: "test summary",
      tokenUsage: { totalInputTokens: 100, totalOutputTokens: 50 },
      lastContextTokens: 150,
    });

    // Wait for the async write to flush
    await Bun.sleep(50);

    const loaded = loadChatState("chat-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.history).toEqual(history);
    expect(loaded!.modelId).toBe("test-model");
    expect(loaded!.summary).toBe("test summary");
    expect(loaded!.tokenUsage).toEqual({
      totalInputTokens: 100,
      totalOutputTokens: 50,
    });
    expect(loaded!.lastContextTokens).toBe(150);
  });

  test("round-trips messages with image content", async () => {
    const history: ModelMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "look at this" },
          { type: "file", data: "iVBORw0KGgo=", mediaType: "image/png" },
        ],
      },
    ];

    saveChatState("chat-img", { history });
    await Bun.sleep(50);

    const loaded = loadChatState("chat-img");
    expect(loaded!.history).toEqual(history);
  });

  test("round-trips messages with tool calls", async () => {
    const history: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "googleSearch",
            args: { query: "bun runtime" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "googleSearch",
            result: { text: "search results" },
          },
        ],
      },
    ];

    saveChatState("chat-tools", { history });
    await Bun.sleep(50);

    const loaded = loadChatState("chat-tools");
    expect(loaded!.history).toEqual(history);
  });

  test("save overwrites existing file", async () => {
    saveChatState("chat-overwrite", {
      history: [{ role: "user", content: [{ type: "text", text: "v1" }] }],
      summary: "old",
    });
    await Bun.sleep(50);

    saveChatState("chat-overwrite", {
      history: [{ role: "user", content: [{ type: "text", text: "v2" }] }],
      summary: "new",
    });
    await Bun.sleep(50);

    const loaded = loadChatState("chat-overwrite");
    expect(loaded!.summary).toBe("new");
    expect(loaded!.history[0].content).toEqual([{ type: "text", text: "v2" }]);
  });

  test("handles corrupted JSON gracefully", async () => {
    const path = join(testDir, "corrupted.json");
    await Bun.write(path, "not valid json {{{");

    const loaded = loadChatState("corrupted");
    expect(loaded).toBeNull();
  });

  test("handles state with optional fields omitted", async () => {
    saveChatState("chat-minimal", { history: [] });
    await Bun.sleep(50);

    const loaded = loadChatState("chat-minimal");
    expect(loaded).not.toBeNull();
    expect(loaded!.history).toEqual([]);
    expect(loaded!.modelId).toBeUndefined();
    expect(loaded!.summary).toBeUndefined();
    expect(loaded!.tokenUsage).toBeUndefined();
    expect(loaded!.lastContextTokens).toBeUndefined();
  });
});
