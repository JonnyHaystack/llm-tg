import { beforeEach, describe, expect, test } from "bun:test";
import { Api, Context, type Filter } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { generateText, uniqueChatId } from "../test-setup";
import { handleGuestMessage, handleMessage } from "./conversation";

type ApiCall = { method: string; payload: Record<string, unknown> };

const BOT = { id: 42, is_bot: true, first_name: "MyBot", username: "MyBot" };
const SAM = { id: 7, is_bot: false, first_name: "Sam" };

let calls: ApiCall[];
/** Turns a call into a Telegram error by returning its description. */
let failCall: (call: ApiCall) => string | undefined;

// Records every Telegram call instead of sending it.
const api = new Api("test");
api.config.use(async (_prev, method, payload) => {
  const call = { method, payload: payload as Record<string, unknown> };
  calls.push(call);
  const description = failCall(call);
  const response = description
    ? { ok: false, error_code: 400, description }
    : {
        ok: true,
        result:
          method === "answerGuestQuery"
            ? { inline_message_id: "inline" }
            : true,
      };
  return response as never;
});

beforeEach(() => {
  calls = [];
  failCall = () => undefined;
  generateText.mockReset();
});

function contextFor<C extends Context>(update: Omit<Update, "update_id">) {
  return new Context(
    { update_id: 1, ...update },
    api,
    BOT as UserFromGetMe,
  ) as C;
}

function gCommand(chatId: number, prompt: string) {
  return contextFor<Filter<Context, "message">>({
    message: {
      message_id: 1,
      date: 0,
      chat: { id: chatId, type: "group", title: "Test" },
      from: SAM,
      text: `/g ${prompt}`,
      entities: [{ type: "bot_command", offset: 0, length: 2 }],
    },
  });
}

function guestMention(chatId: number, messageId: number) {
  return contextFor<Filter<Context, "guest_message">>({
    guest_message: {
      message_id: messageId,
      guest_query_id: `query-${messageId}`,
      date: 0,
      chat: { id: chatId, type: "group", title: "Test" },
      from: SAM,
      text: "@MyBot hi",
      entities: [{ type: "mention", offset: 0, length: 6 }],
    },
  });
}

function modelAnswer(text: string, contextTokens = 20) {
  const usage = { inputTokens: contextTokens - 10, outputTokens: 10 };
  return {
    text,
    response: { messages: [{ role: "assistant", content: text }] },
    usage,
    totalUsage: usage,
  };
}

function payloadsOf(method: string) {
  return calls.filter((call) => call.method === method).map((c) => c.payload);
}

describe("handleMessage", () => {
  test("replies to the message with the answer as HTML", async () => {
    const chatId = uniqueChatId();
    generateText.mockResolvedValueOnce(modelAnswer("**hello**"));

    await handleMessage(gCommand(chatId, "hi"));

    expect(payloadsOf("sendMessage")).toMatchObject([
      {
        chat_id: chatId,
        text: "<b>hello</b>",
        parse_mode: "HTML",
        reply_parameters: { message_id: 1 },
      },
    ]);
  });

  test("resends the answer as plain text when Telegram rejects the HTML", async () => {
    failCall = ({ payload }) =>
      payload.parse_mode === "HTML"
        ? "Bad Request: can't parse entities: Unmatched end tag"
        : undefined;
    generateText.mockResolvedValueOnce(modelAnswer("~~old **price~~ new**"));

    await handleMessage(gCommand(uniqueChatId(), "hi"));

    const [, plain] = payloadsOf("sendMessage");
    expect(plain).toMatchObject({
      text: "~~old **price~~ new**",
      reply_parameters: { message_id: 1 },
    });
    expect(plain.parse_mode).toBeUndefined();
  });

  test("tells the chat when no answer could be generated", async () => {
    generateText.mockRejectedValueOnce(new Error("rate limited"));

    await handleMessage(gCommand(uniqueChatId(), "hi"));

    expect(payloadsOf("sendMessage")).toMatchObject([
      { text: "Couldn't generate a response" },
    ]);
  });

  test("announces an automatic compaction after the answer", async () => {
    generateText
      .mockResolvedValueOnce(modelAnswer("hello", 1200))
      .mockResolvedValueOnce(modelAnswer("the summary", 950));

    await handleMessage(gCommand(uniqueChatId(), "hi"));

    expect(payloadsOf("sendMessage").map((payload) => payload.text)).toEqual([
      "hello",
      "Compacted conversation history (~1200 → ~10 tokens). Earlier messages are now a summary.",
    ]);
  });
});

describe("handleGuestMessage", () => {
  test("claims a reply before queueing behind an earlier mention", async () => {
    const chatId = uniqueChatId();
    generateText
      .mockResolvedValueOnce(modelAnswer("first"))
      .mockResolvedValueOnce(modelAnswer("second"));

    await Promise.all([
      handleGuestMessage(guestMention(chatId, 1)),
      handleGuestMessage(guestMention(chatId, 2)),
    ]);

    expect(calls.map((call) => call.method)).toEqual([
      "answerGuestQuery",
      "answerGuestQuery",
      "editMessageText",
      "editMessageText",
    ]);
    expect(payloadsOf("editMessageText")).toMatchObject([
      { inline_message_id: "inline", text: "first", parse_mode: "HTML" },
      { inline_message_id: "inline", text: "second", parse_mode: "HTML" },
    ]);
  });
});
