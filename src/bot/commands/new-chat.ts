import type { CommandContext, Context } from "grammy";
import { logger } from "../../utils/logger";
import { newChat } from "../../ai/chat";
import { sendResponse } from "../telegram/response";

/**
 * Handle /newchat command to start a fresh conversation.
 */
export async function handleNewChatCommand(ctx: CommandContext<Context>) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const log = logger.child({
    chatId: ctx.chat.id.toString(),
    handler: "command.newchat",
    messageId: ctx.message.message_id,
  });

  log.info("command.newchat.start");
  try {
    await ctx.replyWithChatAction("typing");

    const response = await newChat({
      chatId: ctx.chat.id.toString(),
      messageContext: {
        firstname: ctx.from.first_name || ctx.from.username,
        timestamp: new Date().toUTCString(),
      },
    });

    await sendResponse(ctx, response);
    log.info("command.newchat.success");
  } catch (e) {
    log.error("command.newchat.error", e);
    await ctx.reply("Couldn't generate a response");
  }
}
