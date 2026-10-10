import { beforeEach, describe, expect, test } from "bun:test";
import type { ModelMessage } from "ai";
import { generateText, uniqueChatId } from "../test-setup";
import { getChat, updateChat } from "./chat-store";
import { autoCompact, compactChat } from "./compaction";

function summaryResult(text: string) {
  return {
    text,
    usage: { inputTokens: 900, outputTokens: 50 },
    totalUsage: { inputTokens: 900, outputTokens: 50 },
  };
}

function chatWithHistory(...messages: string[]): number {
  const chatId = uniqueChatId();
  updateChat(chatId, (chat) => {
    chat.history.push(
      ...messages.map((content): ModelMessage => ({ role: "user", content })),
    );
    chat.lastContextTokens = 1200;
  });
  return chatId;
}

beforeEach(() => generateText.mockReset());

describe("compactChat", () => {
  test("replaces the history with a summary", async () => {
    const chatId = chatWithHistory("hello", "how are you");
    generateText.mockResolvedValueOnce(summaryResult("the summary"));

    expect(await compactChat(chatId)).toEqual({
      tokensBefore: 1200,
      tokensAfter: 50,
    });

    const chat = getChat(chatId);
    expect(chat.summary).toBe("the summary");
    expect(chat.history).toEqual([]);
    expect(chat.lastContextTokens).toBeUndefined();
    expect(chat.tokenUsage).toEqual({
      totalInputTokens: 900,
      totalOutputTokens: 50,
    });
  });

  test("folds the previous summary into the new one", async () => {
    const chatId = chatWithHistory("hello");
    updateChat(chatId, (chat) => {
      chat.summary = "earlier summary";
    });
    generateText.mockResolvedValueOnce(summaryResult("the summary"));

    await compactChat(chatId);

    expect(generateText.mock.calls[0][0].prompt).toContain(
      "<previous_summary>\nearlier summary\n</previous_summary>",
    );
  });

  test("reports a failed summary call and keeps the history", async () => {
    const chatId = chatWithHistory("hello");
    generateText.mockRejectedValueOnce(new Error("rate limited"));

    await expect(compactChat(chatId)).rejects.toThrow("rate limited");
    expect(getChat(chatId).history).toHaveLength(1);

    generateText.mockResolvedValueOnce(summaryResult("the summary"));
    expect(await compactChat(chatId)).toBeDefined();
  });

  test("treats an empty summary as a failure", async () => {
    const chatId = chatWithHistory("hello");
    generateText.mockResolvedValueOnce(summaryResult("   "));

    await expect(compactChat(chatId)).rejects.toThrow("empty summary");
    expect(getChat(chatId).history).toHaveLength(1);
  });

  test("does nothing for an empty chat", async () => {
    expect(await compactChat(uniqueChatId())).toBeUndefined();
    expect(generateText).not.toHaveBeenCalled();
  });
});

describe("autoCompact", () => {
  test("compacts once the context reaches the threshold", async () => {
    const chatId = chatWithHistory("hello");
    generateText.mockResolvedValueOnce(summaryResult("the summary"));

    expect(await autoCompact(chatId)).toBeDefined();
  });

  test("leaves a chat below the threshold alone", async () => {
    const chatId = chatWithHistory("hello");
    updateChat(chatId, (chat) => {
      chat.lastContextTokens = 999;
    });

    expect(await autoCompact(chatId)).toBeUndefined();
    expect(generateText).not.toHaveBeenCalled();
  });
});
