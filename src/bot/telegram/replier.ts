import type { Context } from "grammy";
import type { SendMessageResult } from "../../ai/chat";
import { sendResponse } from "./response";

/**
 * How a handler talks back to Telegram. The normal path replies in a chat the
 * bot is a member of; the guest path (see `guest-reply.ts`) can only edit the
 * single inline message it is allowed to post, so both hide behind this.
 */
export type Replier = {
  /** Show a chat action while the model works. May be a no-op. */
  typing(): Promise<void>;
  /** Deliver the model's answer, text and images. */
  send(response: SendMessageResult): Promise<void>;
  /** Plain-text out-of-band message: errors, compaction notices. */
  notice(text: string): Promise<void>;
};

/**
 * Replier for chats the bot is a member of - today's behaviour, unchanged.
 */
export function createChatReplier(ctx: Context): Replier {
  return {
    async typing() {
      await ctx.replyWithChatAction("typing");
    },
    async send(response) {
      await sendResponse(ctx, response);
    },
    async notice(text) {
      await ctx.reply(text);
    },
  };
}
