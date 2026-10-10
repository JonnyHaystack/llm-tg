import { beforeEach, describe, expect, test } from "bun:test";
import type { ModelMessage } from "ai";
import { generateText, uniqueChatId } from "../test-setup";
import { sendMessage, type UserMessage } from "./chat";
import { getChat, updateChat } from "./chat-store";

const message: UserMessage = {
  text: "hello",
  context: { firstname: "Sam", userId: "7", timestamp: "now" },
  images: [],
};

const reply: ModelMessage = {
  role: "assistant",
  content: [{ type: "text", text: "Hi!" }],
};

beforeEach(() => generateText.mockReset());

describe("sendMessage", () => {
  test("appends the turn to history and records usage", async () => {
    const chatId = uniqueChatId();
    generateText.mockResolvedValueOnce({
      text: "Hi!",
      response: { messages: [reply] },
      usage: { inputTokens: 300, outputTokens: 20 },
      totalUsage: { inputTokens: 500, outputTokens: 40 },
    });

    expect(await sendMessage(chatId, message)).toBe("Hi!");

    const chat = getChat(chatId);
    expect(chat.history).toEqual([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Context: {"firstname":"Sam","userId":"7","timestamp":"now"}\nMessage: hello',
          },
        ],
      },
      reply,
    ]);
    expect(chat.tokenUsage).toEqual({
      totalInputTokens: 500,
      totalOutputTokens: 40,
    });
    // The final step alone, not the sum across tool-call steps.
    expect(chat.lastContextTokens).toBe(320);
  });

  test("sends the chat's model, summary and history", async () => {
    const chatId = uniqueChatId();
    const earlier: ModelMessage = { role: "user", content: "earlier" };
    updateChat(chatId, (chat) => {
      chat.history.push(earlier);
      chat.modelId = "chosen-model";
      chat.summary = "they like cats";
    });
    generateText.mockResolvedValueOnce({
      text: "Hi!",
      response: { messages: [reply] },
      usage: { inputTokens: 1, outputTokens: 1 },
      totalUsage: { inputTokens: 1, outputTokens: 1 },
    });

    await sendMessage(chatId, message);

    const request = generateText.mock.calls[0][0];
    expect(request.model.modelId).toBe("chosen-model");
    expect(request.system).toContain(
      "<conversation_summary>\nthey like cats\n</conversation_summary>",
    );
    expect(request.messages[0]).toEqual(earlier);
    expect(request.messages).toHaveLength(2);
  });

  test("leaves the chat untouched when the model call fails", async () => {
    const chatId = uniqueChatId();
    generateText.mockRejectedValueOnce(new Error("rate limited"));

    await expect(sendMessage(chatId, message)).rejects.toThrow("rate limited");
    expect(getChat(chatId).history).toEqual([]);
  });
});
