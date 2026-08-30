import type { Context } from "grammy";
import { sendMessage } from "../../ai/chat";
import { formatCompactionNotice, maybeAutoCompact } from "../../ai/compaction";
import { logger } from "../../utils/logger";
import { sendResponse } from "../telegram/response";
import { extractImagesFromCtx } from "../telegram/files";

/**
 * Handle /g command and reply-to-bot chat messages.
 * Supports images from the current message or replied-to message.
 */
export async function handleChatCommand(ctx: Context) {
  if (!ctx.chat || !ctx.from || !ctx.message) {
    return;
  }

  const chatId = ctx.chat.id.toString();
  const log = logger.child({
    chatId,
    handler: "command.chat",
    messageId: ctx.message.message_id,
  });

  log.info("command.chat.start");
  try {
    await ctx.replyWithChatAction("typing");

    // Check if this message is a reply to another message
    const repliedMessage = ctx.message.reply_to_message;

    // Collect images from the current message or replied message
    const images = await extractImagesFromCtx(ctx);

    const response = await sendMessage({
      chatId,
      messageContext: {
        firstname: ctx.from.first_name || ctx.from.username,
        userId: ctx.from.id.toString(),
        timestamp: new Date().toUTCString(),
        replyingTo: repliedMessage?.text,
      },
      message:
        ctx.match?.toString() || ctx.message.text || ctx.message.caption || "",
      images: images.length > 0 ? images : undefined,
    });

    await sendResponse(ctx, response);

    log.info("command.chat.success");
  } catch (e) {
    await ctx.reply("Couldn't generate a response");
    log.error("command.chat.error", e);
    return;
  }

  try {
    const compaction = await maybeAutoCompact({ chatId });
    if (compaction) {
      await ctx.reply(formatCompactionNotice(compaction));
    }
  } catch (e) {
    log.error("command.chat.autocompact.error", e);
  }
}
