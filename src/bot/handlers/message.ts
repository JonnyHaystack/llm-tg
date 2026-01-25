import type { Context } from "grammy";
import { handleChatCommand } from "../commands/chat";

/**
 * Check if a message is a reply to this bot.
 */
function isReplyToBot(ctx: Context): boolean {
  return (
    ctx.message?.reply_to_message?.from?.is_bot === true &&
    ctx.message.reply_to_message.from.id === ctx.me.id
  );
}

/**
 * Handle incoming text messages.
 * Checks if it's a direct reply to the bot and forwards to chat command if so.
 */
export async function handleMessage(ctx: Context) {
  if (isReplyToBot(ctx)) {
    await handleChatCommand(ctx);
  }
}

/**
 * Handle incoming photo messages.
 * Checks for /g command in caption or if it's a direct reply to the bot.
 */
export async function handlePhoto(ctx: Context) {
  const isGCommand = ctx.message?.caption?.startsWith("/g");
  if (isGCommand || isReplyToBot(ctx)) {
    await handleChatCommand(ctx);
  }
}
