import { env } from "bun";
import type { Context, NextFunction } from "grammy";
import { logger } from "../utils/logger";

export const allowedChatIds = new Set(
  (env.ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isChatAuthorized(chatId: string): boolean {
  return allowedChatIds.has(chatId);
}

/**
 * Middleware gating everything registered after it. Unauthorized chats are
 * dropped silently: the update is logged and `next` is never called.
 */
export async function requireAuthorizedChat(ctx: Context, next: NextFunction) {
  const chatId = ctx.chat?.id.toString();

  if (chatId && isChatAuthorized(chatId)) {
    await next();
    return;
  }

  logger.warn("auth.denied", {
    chatId,
    userId: ctx.from?.id.toString(),
    chatType: ctx.chat?.type,
  });
}
