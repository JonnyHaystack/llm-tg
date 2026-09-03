import { describe, expect, test } from "bun:test";
import type { Context } from "grammy";
import type { MessageEntity } from "grammy/types";
import { isMentioningBot, stripBotMention } from "./mentions";

function ctxWith(
  msg: {
    text?: string;
    caption?: string;
    entities?: MessageEntity[];
    caption_entities?: MessageEntity[];
  } | null,
): Context {
  return {
    msg: msg ?? undefined,
    me: { id: 42, username: "MyBot" },
  } as Context;
}

function mention(offset: number, length: number): MessageEntity {
  return { type: "mention", offset, length };
}

describe("isMentioningBot", () => {
  test("matches a mention of this bot, case-insensitively", () => {
    const ctx = ctxWith({ text: "@mybot hello", entities: [mention(0, 6)] });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("ignores a mention of a different bot", () => {
    const ctx = ctxWith({ text: "@otherbot hi", entities: [mention(0, 9)] });
    expect(isMentioningBot(ctx)).toBe(false);
  });

  test("does not match a bare username in plain text", () => {
    expect(isMentioningBot(ctxWith({ text: "@MyBot hello" }))).toBe(false);
  });

  test("matches a text_mention linking to this bot", () => {
    const ctx = ctxWith({
      text: "hey you",
      entities: [
        { type: "text_mention", offset: 4, length: 3, user: { id: 42 } },
      ] as MessageEntity[],
    });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("reads caption entities on a photo", () => {
    const ctx = ctxWith({
      caption: "@MyBot what is this",
      caption_entities: [mention(0, 6)],
    });
    expect(isMentioningBot(ctx)).toBe(true);
  });

  test("handles a message with no entities at all", () => {
    expect(isMentioningBot(ctxWith(null))).toBe(false);
  });
});

describe("stripBotMention", () => {
  test("removes a leading mention", () => {
    const ctx = ctxWith({
      text: "@MyBot what is 2+2",
      entities: [mention(0, 6)],
    });
    expect(stripBotMention(ctx)).toBe("what is 2+2");
  });

  test("removes a trailing mention", () => {
    const ctx = ctxWith({
      text: "what is 2+2 @MyBot",
      entities: [mention(12, 6)],
    });
    expect(stripBotMention(ctx)).toBe("what is 2+2");
  });

  test("removes every mention of this bot but leaves others", () => {
    const ctx = ctxWith({
      text: "@MyBot ask @someone then @MyBot again",
      entities: [mention(0, 6), mention(11, 8), mention(25, 6)],
    });
    expect(stripBotMention(ctx)).toBe("ask @someone then  again");
  });

  test("splices by UTF-16 offset, so emoji before the mention do not shift it", () => {
    // "🎉" is two UTF-16 code units, which is how Telegram counts offsets.
    const text = "🎉 @MyBot hi";
    const ctx = ctxWith({ text, entities: [mention(3, 6)] });
    expect(stripBotMention(ctx)).toBe("🎉  hi");
  });

  test("returns an empty string for a bare mention", () => {
    const ctx = ctxWith({ text: "@MyBot", entities: [mention(0, 6)] });
    expect(stripBotMention(ctx)).toBe("");
  });
});
