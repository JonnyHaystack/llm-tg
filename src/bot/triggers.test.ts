import { describe, expect, test } from "bun:test";
import type { Context } from "grammy";
import type { Message, MessageEntity } from "grammy/types";
import { extractPrompt, isMentioningBot, stripBotMention } from "./triggers";

const BOT_ID = 42;

function ctxWith(msg?: Partial<Message>): Context {
  return { msg, me: { id: BOT_ID, username: "MyBot" } } as Context;
}

function entity(
  type: "mention" | "bot_command",
  offset: number,
  length: number,
): MessageEntity {
  return { type, offset, length };
}

describe("isMentioningBot", () => {
  test("matches a mention of this bot, case-insensitively", () => {
    const ctx = ctxWith({
      text: "@mybot hello",
      entities: [entity("mention", 0, 6)],
    });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("ignores a mention of a different user", () => {
    const ctx = ctxWith({
      text: "@otherbot hi",
      entities: [entity("mention", 0, 9)],
    });
    expect(isMentioningBot(ctx)).toBe(false);
  });

  test("ignores a username Telegram didn't mark as a mention", () => {
    expect(isMentioningBot(ctxWith({ text: "@MyBot hello" }))).toBe(false);
  });

  test("matches a text_mention linking to this bot", () => {
    const ctx = ctxWith({
      text: "hey you",
      entities: [
        {
          type: "text_mention",
          offset: 4,
          length: 3,
          user: { id: BOT_ID, is_bot: true, first_name: "MyBot" },
        },
      ],
    });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("reads caption entities on a photo", () => {
    const ctx = ctxWith({
      caption: "@MyBot what is this",
      caption_entities: [entity("mention", 0, 6)],
    });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("handles an update without a message", () => {
    expect(isMentioningBot(ctxWith())).toBe(false);
  });
});

describe("stripBotMention", () => {
  test.each([
    ["a leading mention", "@MyBot what is 2+2", [0], "what is 2+2"],
    ["a trailing mention", "what is 2+2 @MyBot", [12], "what is 2+2"],
    ["a bare mention", "@MyBot", [0], ""],
  ])("removes %s", (_, text, offsets, expected) => {
    const ctx = ctxWith({
      text,
      entities: offsets.map((offset) => entity("mention", offset, 6)),
    });
    expect(stripBotMention(ctx)).toBe(expected);
  });

  test("removes every mention of this bot but leaves others", () => {
    const ctx = ctxWith({
      text: "@MyBot ask @someone then @MyBot again",
      entities: [
        entity("mention", 0, 6),
        entity("mention", 11, 8),
        entity("mention", 25, 6),
      ],
    });
    expect(stripBotMention(ctx)).toBe("ask @someone then  again");
  });

  test("splices by UTF-16 offset, so earlier emoji don't shift the cut", () => {
    // "🎉" is two UTF-16 code units, which is how Telegram counts offsets.
    const ctx = ctxWith({
      text: "🎉 @MyBot hi",
      entities: [entity("mention", 3, 6)],
    });
    expect(stripBotMention(ctx)).toBe("🎉  hi");
  });
});

describe("extractPrompt", () => {
  test("returns the argument of a /g command", () => {
    const ctx = ctxWith({
      text: "/g what is 2+2",
      entities: [entity("bot_command", 0, 2)],
    });
    expect(extractPrompt(ctx)).toBe("what is 2+2");
  });

  test("accepts a /g command addressed to this bot", () => {
    const ctx = ctxWith({
      text: "/g@mybot hi",
      entities: [entity("bot_command", 0, 8)],
    });
    expect(extractPrompt(ctx)).toBe("hi");
  });

  test("ignores a /g command addressed to another bot", () => {
    const ctx = ctxWith({
      text: "/g@otherbot hi",
      entities: [entity("bot_command", 0, 11)],
    });
    expect(extractPrompt(ctx)).toBeUndefined();
  });

  test("ignores other commands that start with g", () => {
    const ctx = ctxWith({
      text: "/giphy cats",
      entities: [entity("bot_command", 0, 6)],
    });
    expect(extractPrompt(ctx)).toBeUndefined();
  });

  test("reads a /g command in a photo caption, without the command", () => {
    const ctx = ctxWith({
      caption: "/g what is this",
      caption_entities: [entity("bot_command", 0, 2)],
    });
    expect(extractPrompt(ctx)).toBe("what is this");
  });

  test("returns the text around a mention of this bot", () => {
    const ctx = ctxWith({
      text: "hey @MyBot what's up",
      entities: [entity("mention", 4, 6)],
    });
    expect(extractPrompt(ctx)).toBe("hey  what's up");
  });

  test("returns the whole text of a reply to this bot", () => {
    const ctx = ctxWith({
      text: "and then?",
      reply_to_message: {
        from: { id: BOT_ID, is_bot: true, first_name: "MyBot" },
      } as Message["reply_to_message"],
    });
    expect(extractPrompt(ctx)).toBe("and then?");
  });

  test("ignores a reply to someone else", () => {
    const ctx = ctxWith({
      text: "agreed",
      reply_to_message: {
        from: { id: 7, is_bot: false, first_name: "Sam" },
      } as Message["reply_to_message"],
    });
    expect(extractPrompt(ctx)).toBeUndefined();
  });

  test("ignores a message not addressed to the bot", () => {
    expect(extractPrompt(ctxWith({ text: "just chatting" }))).toBeUndefined();
  });
});
