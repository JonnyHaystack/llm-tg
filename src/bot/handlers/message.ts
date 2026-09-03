import type { Context } from "grammy";
import { handleChatCommand } from "../commands/chat";
import { isMentioningBot, stripBotMention } from "../telegram/mentions";

/**
 * Check if a message is a reply to this bot.
 */
function isReplyToBot(ctx: Context): boolean {
  return (
    ctx.msg?.reply_to_message?.from?.is_bot === true &&
    ctx.msg.reply_to_message.from.id === ctx.me.id
  );
}

/**
 * Handle incoming text messages.
 * Replies to the bot and @mentions of it are forwarded to the chat command.
 */
export async function handleMessage(ctx: Context) {
  if (isMentioningBot(ctx)) {
    await handleChatCommand(ctx, undefined, stripBotMention(ctx));
    return;
  }

  if (isReplyToBot(ctx)) {
    await handleChatCommand(ctx);
  }
}

/**
 * Handle incoming photo messages.
 * Triggers on a `/g` caption, an @mention of the bot, or a reply to the bot.
 */
export async function handlePhoto(ctx: Context) {
  if (isMentioningBot(ctx)) {
    await handleChatCommand(ctx, undefined, stripBotMention(ctx));
    return;
  }

  // Word boundary, so a caption like "/giphy cats" doesn't trigger the bot.
  const isGCommand = /^\/g(?:@\w+)?(?:\s|$)/.test(ctx.msg?.caption ?? "");
  if (isGCommand || isReplyToBot(ctx)) {
    await handleChatCommand(ctx);
  }
}
